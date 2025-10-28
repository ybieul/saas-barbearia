"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { WhatsAppStatus } from "@/components/whatsapp-status"
import { WhatsAppConnection } from "@/components/whatsapp-connection"
import { sendWhatsAppMessage, whatsappTemplates, formatPhoneNumber } from "@/lib/whatsapp"
import { MessageCircle, Send, Settings, Users, Clock, Zap, TestTube, CheckCircle, AlertCircle, Smartphone } from "lucide-react"
import { useAppointments, useClients } from "@/hooks/use-api"
import { useAutomationSettings } from "@/hooks/use-automation-settings"
import { useWhatsAppStats } from "@/hooks/use-whatsapp-stats"
import { useWhatsAppStatus } from "@/hooks/use-whatsapp-status"
import { useToast } from "@/hooks/use-toast"
import { getBrazilNow, formatBrazilDate, toBrazilDateString } from "@/lib/timezone"

export default function WhatsAppPage() {
  const [testMessage, setTestMessage] = useState({
    phone: "",
    message: "",
  })
  // Estado local para feedback
  const [feedback, setFeedback] = useState({
    enabled: false,
    googleLink: "",
    template: "Olá {nomeCliente}! Obrigado por escolher a {nomeBarbearia}. Adoraríamos saber a sua opinião sobre o nosso serviço! Pode deixar a sua avaliação aqui: {linkAvaliacao}. Esperamos vê-lo em breve! 👋",
    delayMinutes: 45
  })
  const [isSavingFeedback, setIsSavingFeedback] = useState(false)
  const [loadingFeedback, setLoadingFeedback] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // Usar o hook personalizado para automações
  const { 
    settings: automationSettings, 
    isLoading: isLoadingSettings, 
    error: settingsError, 
    loadSettings: loadAutomationSettings, 
    updateSetting: saveAutomationSetting 
  } = useAutomationSettings()

  // Hook para toast notifications
  const { toast } = useToast()

  // Função para lidar com mudanças de automação com notificações
  const handleAutomationToggle = async (automationType: string, checked: boolean, displayName: string) => {
    try {
      const success = await saveAutomationSetting(automationType, checked)
      
      if (success) {
        // Mostrar notificação responsiva
        toast({
          title: checked ? "Automação Ativada" : "Automação Desativada",
          description: `${displayName} foi ${checked ? 'ativada' : 'desativada'} com sucesso.`,
          duration: 3000,
          className: "text-sm sm:text-base", // Responsivo
        })
        
        // Atualizar estatísticas após mudança nas automações
        setTimeout(() => {
          refetchStats()
        }, 1000)
      } else {
        throw new Error('Falha ao salvar configuração')
      }
    } catch (error) {
      // Notificação de erro
      toast({
        title: "Erro",
        description: `Não foi possível ${checked ? 'ativar' : 'desativar'} ${displayName.toLowerCase()}.`,
        variant: "destructive",
        duration: 4000,
        className: "text-sm sm:text-base",
      })
      console.error('Erro ao alterar automação:', error)
    }
  }

  // Buscar dados reais da API
  const { appointments, loading, fetchAppointments } = useAppointments()
  const { clients, fetchClients } = useClients()
  
  // Hook para estatísticas do WhatsApp
  const { stats: whatsappStats, isLoading: isLoadingStats, error: statsError, refetch: refetchStats } = useWhatsAppStats()

  // Hook para status da conexão WhatsApp
  const { connectionStatus, isConnected, isLoading: isLoadingStatus, refetch: refetchStatus } = useWhatsAppStatus()

  // Função para salvar configurações de feedback
  const saveFeedback = async (partial: { enabled?: boolean; delayMinutes?: number }) => {
    try {
      setIsSavingFeedback(true)
      const token = localStorage.getItem('auth_token')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch('/api/settings/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          googleReviewLink: feedback.googleLink,
          messageTemplate: feedback.template,
          isEnabled: partial.enabled ?? feedback.enabled,
          delayMinutes: partial.delayMinutes ?? feedback.delayMinutes
        })
      })
      if (!res.ok) throw new Error('Falha ao salvar')
      toast({ title: 'Configurações salvas', description: 'Feedback atualizado com sucesso.' })
    } catch (e:any) {
      console.error(e)
      toast({ title: 'Erro', description: e.message || 'Erro ao salvar feedback', variant: 'destructive' })
    } finally {
      setIsSavingFeedback(false)
    }
  }

  useEffect(() => {
    fetchAppointments()
    fetchClients()
    loadAutomationSettings()
    refetchStats()
    // Carregar configurações de feedback
    const loadFeedback = async () => {
      try {
        setLoadingFeedback(true)
        const token = localStorage.getItem('auth_token')
        const headers: Record<string, string> = { 'Accept': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`
        const res = await fetch('/api/settings/feedback', { headers })
        if (res.ok) {
          const data = await res.json()
          setFeedback(prev => ({
            ...prev,
            enabled: data.isEnabled ?? false,
            googleLink: data.googleReviewLink || "",
            template: data.messageTemplate || prev.template,
            delayMinutes: typeof data.delayMinutes === 'number' ? data.delayMinutes : prev.delayMinutes
          }))
        }
      } catch (e) {
        console.error('Erro ao carregar feedback settings', e)
      } finally {
        setLoadingFeedback(false)
      }
    }
    loadFeedback()
  }, [fetchAppointments, fetchClients, loadAutomationSettings, refetchStats])

  // Usar dados reais das estatísticas do WhatsApp ou fallback para dados simulados
  let automationStats = []
  
  if (whatsappStats && !isLoadingStats) {
    // Usar dados reais do banco de dados
    automationStats = [
      {
        title: "Mensagens Hoje",
        value: whatsappStats.mensagensHoje.total.toString(),
        description: whatsappStats.mensagensHoje.descricao,
        icon: MessageCircle,
        color: "text-tymer-icon",
      },
      {
        title: "Taxa de Entrega",
        value: `${whatsappStats.taxaEntrega.taxa}%`,
        description: whatsappStats.taxaEntrega.descricao,
        icon: CheckCircle,
        color: "text-tymer-icon",
      },
      {
        title: "Redução de Faltas",
        value: `${whatsappStats.reducaoFaltas.taxa}%`,
        description: whatsappStats.reducaoFaltas.descricao,
        icon: Zap,
        color: "text-tymer-icon",
      },
      {
        title: "Clientes Inativos",
        value: whatsappStats.clientesInativos.total.toString(),
        description: whatsappStats.clientesInativos.descricao,
        icon: Users,
        color: "text-tymer-icon",
      },
    ]
  } else {
    // Fallback para dados simulados baseados em agendamentos (enquanto carrega)
    const today = toBrazilDateString(getBrazilNow())
    const todayAppointments = appointments.filter(apt => {
      const aptDate = toBrazilDateString(new Date(apt.dateTime))
      return aptDate === today
    })
    const confirmedAppointments = todayAppointments.filter(apt => apt.status === 'CONFIRMED' || apt.status === 'completed')
    
    const confirmationMessages = confirmedAppointments.length
    const reminderMessages = Math.floor(confirmedAppointments.length * 0.7)
    const totalMessages = confirmationMessages + reminderMessages
    
    const fifteenDaysAgo = getBrazilNow()
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)
    
    // ✅ USAR MESMA LÓGICA DA API: baseado em lastVisit e totalVisits, não agendamentos
    const inactiveClients = clients.filter(client => {
      // Cliente nunca teve visitas
      if (!client.totalVisits || client.totalVisits === 0) return true
      // Cliente não tem lastVisit registrado
      if (!client.lastVisit) return true
      // Cliente com última visita há mais de 15 dias
      if (new Date(client.lastVisit) < fifteenDaysAgo) return true
      return false
    }).length

    const deliveryRate = totalMessages > 0 ? Math.max(95, Math.min(99, 100 - Math.floor(totalMessages / 10))) : 0
    const deliveredCount = Math.floor((totalMessages * deliveryRate) / 100)

    automationStats = [
      {
        title: "Mensagens Hoje",
        value: isLoadingStats ? "..." : totalMessages.toString(),
        description: isLoadingStats ? "Carregando..." : `${confirmationMessages} confirmações, ${reminderMessages} lembretes`,
        icon: MessageCircle,
        color: "text-tymer-icon",
      },
      {
        title: "Taxa de Entrega",
        value: isLoadingStats ? "..." : `${deliveryRate}%`,
        description: isLoadingStats ? "Carregando..." : `${deliveredCount} de ${totalMessages} entregues`,
        icon: CheckCircle,
        color: "text-tymer-icon",
      },
      {
        title: "Redução de Faltas",
        value: isLoadingStats ? "..." : `${Math.min(95, Math.max(70, 100 - (inactiveClients * 2)))}%`,
        description: isLoadingStats ? "Carregando..." : "Baseado em automações ativas",
        icon: Zap,
        color: "text-tymer-icon",
      },
      {
        title: "Clientes Inativos",
        value: isLoadingStats ? "..." : inactiveClients.toString(),
        description: isLoadingStats ? "Carregando..." : "Clientes sem agendamentos",
        icon: Users,
        color: "text-tymer-icon",
      },
    ]
  }

  const handleSendTestMessage = async () => {
    if (!testMessage.phone || !testMessage.message) {
      setTestResult({ success: false, message: "Preencha todos os campos" })
      return
    }

    setIsSending(true)
    setTestResult(null)

    try {
      console.log('📤 Enviando mensagem de teste...')
      
      const success = await sendWhatsAppMessage({
        to: formatPhoneNumber(testMessage.phone),
        message: testMessage.message,
        type: "custom",
      })

      if (success) {
        setTestResult({ success: true, message: "Mensagem enviada com sucesso via Evolution API!" })
        setTestMessage({ phone: "", message: "" })
        console.log('✅ Teste de mensagem bem-sucedido')
      } else {
        setTestResult({ success: false, message: "Falha ao enviar mensagem. Verifique os logs do console." })
        console.error('❌ Teste de mensagem falhou')
      }
    } catch (error) {
      console.error('❌ Erro no teste de mensagem:', error)
      setTestResult({ success: false, message: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}` })
    } finally {
      setIsSending(false)
    }
  }

  const loadTemplate = (templateType: string) => {
    // ✅ USAR SEMPRE DADOS FICTÍCIOS PARA TEMPLATES DE TESTE
    const sampleData = {
      clientName: "João Silva",
      businessName: "Sua Barbearia",
      service: "Corte Masculino",
      professional: "Carlos",
      date: formatBrazilDate(getBrazilNow()),
      time: "14:00",
      totalTime: 45,
      price: 50,
      preferredService: "Corte Masculino",
      customLink: window.location.origin,
      additionalService: "Sobrancelha",
      discount: 20,
    }

    let template = ""
    switch (templateType) {
      case "confirmation":
        template = whatsappTemplates.confirmation(sampleData)
        break
      case "reminder24h":
        template = whatsappTemplates.reminder24h(sampleData)
        break
      case "reminder12h":
        template = whatsappTemplates.reminder12h(sampleData)
        break
      case "reminder2h":
        template = whatsappTemplates.reminder2h(sampleData)
        break
      case "reactivation":
        template = whatsappTemplates.reactivation(sampleData)
        break
    }

    setTestMessage({ ...testMessage, message: template })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#ededed]">
              Configurações de Mensagens
            </h1>
            <p className="text-[#a1a1aa]">Automatize suas comunicações e reduza faltas</p>
          </div>
          
          {/* Status de Conexão e Botão Conectar WhatsApp */}
          <div className="lg:ml-auto w-full lg:w-auto">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 items-center">
              {/* Botão Conectar WhatsApp */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-tymer-primary hover:bg-tymer-primary/80 text-white text-sm sm:text-base w-full lg:w-auto"
                  >
                    <Smartphone className="w-4 h-4 mr-2" />
                    Conectar WhatsApp
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md mx-auto sm:w-full sm:max-w-md rounded-xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      Conexão WhatsApp
                    </DialogTitle>
                    <DialogDescription>
                      Conecte seu número de WhatsApp para enviar mensagens automáticas aos seus clientes
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    <WhatsAppConnection 
                      onConnected={() => {
                        refetchStatus()
                      }}
                      onDisconnected={() => {
                        refetchStatus()
                      }}
                    />
                  </div>
                </DialogContent>
              </Dialog>

              {/* Indicador de Status - Desktop: ao lado, Mobile: centralizado abaixo */}
              <div className="flex items-center justify-center lg:justify-start gap-2 text-sm lg:order-first">
                {isLoadingStatus ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                    <span>Verificando...</span>
                  </div>
                ) : isConnected ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="font-medium">Conectado</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-400">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span className="font-medium">Desconectado</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-[#ededed]">Estatísticas em Tempo Real</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {automationStats.map((stat, index) => (
            <Card key={index} className="bg-[#18181b] border-[#27272a] relative">
              {isLoadingStats && (
                <div className="absolute inset-0 bg-[#18181b]/80 flex items-center justify-center rounded-md">
                  <Clock className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              )}
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#a1a1aa]">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <p className="text-xs text-[#71717a]">{stat.description}</p>
                {statsError && index === 0 && (
                  <p className="text-xs text-red-400 mt-1">Erro ao carregar dados reais</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Message */}
        <Card className="bg-[#18181b] border-[#27272a]">
          <CardHeader>
            <CardTitle className="text-[#a1a1aa] flex items-center gap-2">
              <TestTube className="w-5 h-5 text-tymer-icon" />
              Testar Mensagem
            </CardTitle>
            <CardDescription className="text-[#71717a]">
              Envie uma mensagem de teste para verificar a integração
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testPhone" className="text-gray-300">
                Número de Telefone
              </Label>
              <Input
                id="testPhone"
                placeholder="(11) 99999-9999"
                value={testMessage.phone}
                onChange={(e) => setTestMessage({ ...testMessage, phone: e.target.value })}
                className="bg-gray-700 border-[#3f3f46] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="testMessage" className="text-gray-300">
                Mensagem
              </Label>
              <Textarea
                id="testMessage"
                placeholder="Digite sua mensagem..."
                value={testMessage.message}
                onChange={(e) => setTestMessage({ ...testMessage, message: e.target.value })}
                className="bg-gray-700 border-[#3f3f46] text-white min-h-[120px]"
              />
            </div>

            {/* Template Buttons */}
            <div className="space-y-2">
              <Label className="text-gray-300">Templates Rápidos:</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadTemplate("confirmation")}
                  className="border-[#3f3f46] text-[#71717a] hover:text-white bg-transparent"
                >
                  Confirmação
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadTemplate("reminder24h")}
                  className="border-[#3f3f46] text-[#71717a] hover:text-white bg-transparent"
                >
                  Lembrete 24h
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadTemplate("reminder12h")}
                  className="border-[#3f3f46] text-[#71717a] hover:text-white bg-transparent"
                >
                  Lembrete 12h
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadTemplate("reminder2h")}
                  className="border-[#3f3f46] text-[#71717a] hover:text-white bg-transparent"
                >
                  Lembrete 2h
                </Button>
              </div>
            </div>

            <Button
              onClick={handleSendTestMessage}
              disabled={isSending}
              className="w-full bg-tymer-primary hover:bg-tymer-primary/80 text-white"
            >
              {isSending ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Teste
                </>
              )}
            </Button>

            {testResult && (
              <div
                className={`p-3 rounded-lg ${
                  testResult.success
                    ? "bg-tymer-accent/20 border border-tymer-accent/30 text-tymer-accent"
                    : "bg-red-500/20 border border-red-500/30 text-red-400"
                }`}
              >
                {testResult.message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Automation Settings */}
        <Card className="bg-[#18181b] border-[#27272a]">
          <CardHeader>
            <CardTitle className="text-[#a1a1aa] flex items-center gap-2">
              <Zap className="w-5 h-5 text-tymer-icon" />
              Mensagens Automáticas
            </CardTitle>
            <CardDescription className="text-[#71717a]">Configure mensagens automáticas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Confirmação de Agendamento</p>
                <p className="text-sm text-[#71717a]">Enviar confirmação imediatamente após agendar</p>
              </div>
              <Switch
                checked={automationSettings.confirmationEnabled}
                disabled={isLoadingSettings}
                onCheckedChange={async (checked) => {
                  await handleAutomationToggle('confirmation', checked, 'Confirmação de Agendamento')
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Lembrete 24 horas</p>
                <p className="text-sm text-[#71717a]">Lembrete um dia antes do agendamento</p>
              </div>
              <Switch
                checked={automationSettings.reminder24hEnabled}
                disabled={isLoadingSettings}
                onCheckedChange={async (checked) => {
                  await handleAutomationToggle('reminder_24h', checked, 'Lembrete 24 horas')
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Lembrete 12 horas</p>
                <p className="text-sm text-[#71717a]">Lembrete 12 horas antes do agendamento</p>
              </div>
              <Switch
                checked={automationSettings.reminder12hEnabled}
                disabled={isLoadingSettings}
                onCheckedChange={async (checked) => {
                  await handleAutomationToggle('reminder_12h', checked, 'Lembrete 12 horas')
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Lembrete 2 horas</p>
                <p className="text-sm text-[#71717a]">Lembrete 2 horas antes do agendamento</p>
              </div>
              <Switch
                checked={automationSettings.reminder2hEnabled}
                disabled={isLoadingSettings}
                onCheckedChange={async (checked) => {
                  await handleAutomationToggle('reminder_2h', checked, 'Lembrete 2 horas')
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Lembrete 1 hora</p>
                <p className="text-sm text-[#71717a]">Lembrete 1 hora antes do agendamento</p>
              </div>
              <Switch
                checked={automationSettings.reminder1hEnabled}
                disabled={isLoadingSettings}
                onCheckedChange={async (checked) => {
                  await handleAutomationToggle('reminder_1h', checked, 'Lembrete 1 hora')
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Lembrete 30 minutos</p>
                <p className="text-sm text-[#71717a]">Lembrete 30 minutos antes do agendamento</p>
              </div>
              <Switch
                checked={automationSettings.reminder30minEnabled}
                disabled={isLoadingSettings}
                onCheckedChange={async (checked) => {
                  await handleAutomationToggle('reminder_30min', checked, 'Lembrete 30 minutos')
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Feedback / Pesquisa de Satisfação */}
        <Card className="bg-[#18181b] border-[#27272a]">
          <CardHeader>
            <CardTitle className="text-[#a1a1aa] flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-tymer-icon" />
              Pesquisa de Satisfação (Pós-atendimento)
            </CardTitle>
            <CardDescription className="text-[#71717a]">Envie uma mensagem solicitando avaliação após o serviço</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Enviar mensagem de avaliação</p>
                <p className="text-sm text-[#71717a]">
                  {feedback.delayMinutes === 0
                    ? 'Imediatamente após concluir'
                    : 'Solicita avaliação X minutos após concluir'}
                </p>
              </div>
              <Switch
                checked={feedback.enabled}
                disabled={loadingFeedback || isSavingFeedback}
                onCheckedChange={async (checked) => {
                  setFeedback(f => ({ ...f, enabled: checked }))
                  await saveFeedback({ enabled: checked })
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Link de Avaliação do Google</Label>
              <Input
                placeholder="https://g.page/r/..."
                value={feedback.googleLink}
                onChange={(e) => setFeedback(f => ({ ...f, googleLink: e.target.value }))}
                className="bg-gray-700 border-[#3f3f46] text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Template da Mensagem</Label>
              <Textarea
                value={feedback.template}
                onChange={(e) => setFeedback(f => ({ ...f, template: e.target.value }))}
                className="bg-gray-700 border-[#3f3f46] text-white min-h-[140px]"
              />
              <p className="text-xs text-[#52525b]">Variáveis: {'{nomeCliente}'}, {'{nomeBarbearia}'}, {'{linkAvaliacao}'} (usa link Google se configurado, senão fica vazio)</p>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Atraso (minutos após finalizar)</Label>
              <select
                value={typeof feedback.delayMinutes === 'number' ? feedback.delayMinutes : 45}
                onChange={async (e) => {
                  const value = parseInt(e.target.value, 10)
                  setFeedback(f => ({ ...f, delayMinutes: value }))
                  // Salvar automaticamente atraso
                  await saveFeedback({ delayMinutes: value })
                }}
                className="w-full bg-gray-700 border-[#3f3f46] text-white rounded px-3 py-2 text-sm"
              >
                <option value={0}>Imediatamente (0 min)</option>
                {[15,30,45,60,90].map(v => <option key={v} value={v}>{v} minutos</option>)}
              </select>
              <p className="text-xs text-[#52525b]">Janela de envio considera ±5 min de tolerância.</p>
            </div>

            {/* Pré-visualização dinâmica */}
            <div className="space-y-2">
              <Label className="text-gray-300">Pré-visualização</Label>
              <div className="bg-gray-800 border border-[#3f3f46] rounded p-3 text-sm text-gray-200 whitespace-pre-wrap">
                {(() => {
                  const tpl = feedback.template || 'Olá {nomeCliente}! Obrigado por escolher a {nomeBarbearia}. Deixe sua avaliação: {linkAvaliacao}'
                  return tpl
                    .replace(/\{nomeCliente\}/g, 'João')
                    .replace(/\{nomeBarbearia\}/g, 'Barbearia Exemplo')
                    .replace(/\{linkAvaliacao\}/g, feedback.googleLink || '')
                    .replace(/\{linkTracking\}/g, '')
                })()}
              </div>
              <p className="text-xs text-[#52525b]">Exemplo ilustrativo. Caso não informe link Google, a variável {'{linkAvaliacao}'} ficará vazia.</p>
            </div>

            <Button
              disabled={isSavingFeedback}
              onClick={async () => { await saveFeedback({}) }}
              className="w-full bg-tymer-primary hover:bg-tymer-primary/80 text-white"
            >
              {isSavingFeedback ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* WhatsApp Status Component */}
      <WhatsAppStatus />
    </div>
  )
}
