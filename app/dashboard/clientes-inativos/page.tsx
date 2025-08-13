"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { UserX, MessageCircle, Calendar, AlertTriangle, Send, Clock, X, Search, Gift } from "lucide-react"
import { useInactiveClients } from "@/hooks/use-api"
import { usePromotionTemplates } from "@/hooks/use-promotion-templates"
import { useNotification } from "@/hooks/use-notification"
import { getBrazilNow } from "@/lib/timezone"

export default function ClientesInativosPage() {
  const [sendingMessage, setSendingMessage] = useState<number | null>(null)
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [daysThreshold, setDaysThreshold] = useState(15)
  
  // ✅ USAR HOOK ESPECÍFICO PARA CLIENTES INATIVOS
  const { clients: inactiveClients, stats, loading, error, fetchInactiveClients } = useInactiveClients()
  const { templates: promotionTemplates, getTemplate } = usePromotionTemplates()
  const notification = useNotification()

  useEffect(() => {
    fetchInactiveClients(daysThreshold) // Buscar clientes inativos com threshold configurável
  }, [fetchInactiveClients, daysThreshold])

  // ✅ FILTRAR APENAS POR BUSCA - LÓGICA DE INATIVIDADE JÁ VEM DO BANCO
  const filteredClients = inactiveClients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  )

  // ✅ USAR ESTATÍSTICAS DO BANCO DE DADOS
  const potentialRevenue = stats.potentialRevenue

  const handleSelectClient = (clientId: string, checked: boolean) => {
    if (checked) {
      setSelectedClients([...selectedClients, clientId])
    } else {
      setSelectedClients(selectedClients.filter(id => id !== clientId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(filteredClients.map(client => client.id))
    } else {
      setSelectedClients([])
    }
  }

  const handleSendPromotion = () => {
    if (selectedClients.length === 0) {
      notification.warning("Selecione pelo menos um cliente!")
      return
    }
    if (!selectedTemplate) {
      notification.warning("Selecione um template de mensagem!")
      return
    }
    
    // ✅ USAR DADOS REAIS DO BACKEND - Não precisamos mais atualizar contadores locais
    // O backend já registra as promoções enviadas na tabela WhatsAppLog
    
    const selectedTemplateData = getTemplate(selectedTemplate)
    notification.success({
      title: "Promoção enviada!",
      description: `Template "${selectedTemplateData?.name}" enviado para ${selectedClients.length} cliente(s)!`
    })
    setSelectedClients([])
    setSelectedTemplate("")
    setIsPromotionModalOpen(false)
  }

  // Função para obter dados do template selecionado
  const getSelectedTemplateData = () => {
    return getTemplate(selectedTemplate)
  }

  const handleSendMessage = async (clientId: number) => {
    setSendingMessage(clientId)
    
    // Simular envio de mensagem
    setTimeout(() => {
      setSendingMessage(null)
      notification.success("Mensagem enviada com sucesso!")
    }, 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#10b981] mx-auto"></div>
          <p className="mt-2 text-[#71717a]">Carregando clientes inativos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg">
          Erro ao carregar clientes: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#ededed]">Clientes Inativos</h1>
          <p className="text-[#71717a]">Reative clientes com ofertas personalizadas</p>
        </div>
        {/* Botão desktop - apenas visível em telas médias e grandes */}
        <div className="hidden md:block">
          <Dialog open={isPromotionModalOpen} onOpenChange={setIsPromotionModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-[#ededed]">
                <Send className="w-4 h-4 mr-2" />
                Enviar Promoção ({selectedClients.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-2xl">
              <DialogHeader className="text-center pb-4">
                <DialogTitle className="text-xl font-semibold text-[#ededed] flex items-center justify-center gap-2">
                  <Send className="w-5 h-5 text-[#10b981]" />
                  Enviar Promoção
                </DialogTitle>
                <p className="text-[#71717a] text-sm">
                  Envie ofertas personalizadas para reativar clientes
                </p>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Clientes selecionados */}
                <div className="bg-[#0a0a0a]/50 rounded-lg p-4 border border-[#27272a]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-[#10b981] rounded-full"></div>
                    <p className="text-[#ededed] font-medium">
                      {selectedClients.length} cliente(s) selecionado(s)
                    </p>
                  </div>
                  <div className="bg-[#27272a]/50 p-3 rounded-lg max-h-24 overflow-y-auto space-y-1">
                    {selectedClients.map((clientId) => {
                      const client = filteredClients.find(c => c.id === clientId)
                      return (
                        <div key={clientId} className="flex items-center gap-2 text-sm">
                          <div className="w-1 h-1 bg-[#10b981] rounded-full"></div>
                          <span className="text-[#ededed] font-medium">{client?.name}</span>
                          <span className="text-[#71717a]">•</span>
                          <span className="text-[#71717a]">{client?.phone}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Seleção de template */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-[#ededed]">
                    Modelo de Mensagem
                  </label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="bg-[#27272a] border-[#3f3f46] text-[#ededed] h-11">
                      <SelectValue placeholder="Selecione um template de promoção" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#27272a] border-[#3f3f46]">
                      {promotionTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id} className="text-[#ededed]">
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{template.name}</span>
                            {template.title && (
                              <span className="text-xs text-[#71717a]">{template.title}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {promotionTemplates.length === 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                      <p className="text-amber-400 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Nenhum template encontrado
                      </p>
                      <p className="text-amber-400/80 text-xs mt-1">
                        Crie templates em Configurações → Promoções
                      </p>
                    </div>
                  )}
                </div>

                {/* Prévia da mensagem */}
                {selectedTemplate && getSelectedTemplateData() && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-[#ededed]">
                      Prévia da Mensagem
                    </label>
                    <div className="bg-gradient-to-br from-[#10b981]/10 to-[#059669]/5 border border-[#10b981]/20 rounded-lg p-4">
                      {getSelectedTemplateData()?.title && (
                        <div className="bg-[#10b981]/20 rounded-lg px-3 py-2 mb-3">
                          <p className="text-[#10b981] text-sm font-semibold">
                            📢 {getSelectedTemplateData()?.title}
                          </p>
                        </div>
                      )}
                      <div className="text-[#ededed] text-sm whitespace-pre-line leading-relaxed">
                        {getSelectedTemplateData()?.message}
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#10b981]/20">
                        <div className="w-1 h-1 bg-[#10b981] rounded-full"></div>
                        <span className="text-xs text-[#71717a]">
                          Será enviado via WhatsApp para {selectedClients.length} cliente(s)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botões de ação */}
                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsPromotionModalOpen(false)}
                    className="flex-1 border-[#3f3f46] text-[#71717a] hover:text-[#ededed] hover:bg-[#27272a] min-h-[44px] touch-manipulation"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSendPromotion}
                    disabled={!selectedTemplate || selectedClients.length === 0}
                    className="flex-1 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-[#ededed] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Promoção
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#18181b] border-[#27272a]">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between sm:justify-between gap-2 sm:gap-0">
              <div className="text-left sm:text-left">
                <p className="text-[#71717a] text-sm">Total Inativos</p>
                <p className="text-xl sm:text-2xl md:text-2xl font-bold text-[#ededed]">{stats.totalInactive}</p>
              </div>
              <UserX className="w-6 h-6 sm:w-8 sm:h-8 md:w-8 md:h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#18181b] border-[#27272a]">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between sm:justify-between gap-2 sm:gap-0">
              <div className="text-left sm:text-left">
                <p className="text-[#71717a] text-sm">Promoções Enviadas</p>
                <p className="text-xl sm:text-2xl md:text-2xl font-bold text-[#ededed]">{stats.promotionsSent}</p>
              </div>
              <Send className="w-6 h-6 sm:w-8 sm:h-8 md:w-8 md:h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#18181b] border-[#27272a]">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between sm:justify-between gap-2 sm:gap-0">
              <div className="text-left sm:text-left">
                <p className="text-[#71717a] text-sm">Taxa de Retorno</p>
                <p className="text-xl sm:text-2xl md:text-2xl font-bold text-[#ededed]">
                  {stats.promotionsSent > 0 ? Math.round((stats.returnRate / stats.promotionsSent) * 100) : 0}%
                </p>
              </div>
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 md:w-8 md:h-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#18181b] border-[#27272a]">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between sm:justify-between gap-2 sm:gap-0">
              <div className="text-left sm:text-left">
                <p className="text-[#71717a] text-sm">Receita Potencial</p>
                <p className="text-xl sm:text-2xl md:text-2xl font-bold text-[#ededed]">
                  {new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  }).format(stats.potentialRevenue)}
                </p>
              </div>
              <Gift className="w-6 h-6 sm:w-8 sm:h-8 md:w-8 md:h-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botão mobile - apenas visível em telas pequenas */}
      <div className="block md:hidden">
        <Dialog open={isPromotionModalOpen} onOpenChange={setIsPromotionModalOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-[#ededed] shadow-lg shadow-emerald-500/20 transition-all duration-200">
              <Send className="w-4 h-4 mr-2" />
              Enviar Promoção ({selectedClients.length})
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-2xl">
            <DialogHeader className="border-b border-[#27272a] pb-3">
              <DialogTitle className="text-[#ededed] text-base font-semibold flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-[#10b981]/20 to-[#059669]/20 rounded-lg">
                  <Send className="w-4 h-4 text-emerald-400" />
                </div>
                Enviar Promoção
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 mt-3">
              {/* Seção de Clientes Selecionados */}
              <div className="bg-gradient-to-br from-[#10b981]/10 to-[#059669]/5 p-3 rounded-lg border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  <p className="text-[#ededed] font-medium text-sm">
                    {selectedClients.length} cliente{selectedClients.length > 1 ? 's' : ''} selecionado{selectedClients.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="bg-[#27272a]/50 p-2 rounded-lg max-h-20 overflow-y-auto space-y-1">
                  {selectedClients.map((clientId) => {
                    const client = filteredClients.find(c => c.id === clientId)
                    return (
                      <div key={clientId} className="flex items-center gap-2 text-xs text-[#d4d4d8]">
                        <div className="w-1 h-1 bg-emerald-400 rounded-full flex-shrink-0"></div>
                        <span className="font-medium">{client?.name}</span>
                        <span className="text-[#71717a]">•</span>
                        <span className="text-[#a1a1aa]">{client?.phone}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Seção de Template */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#ededed] flex items-center gap-2">
                  <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                  Modelo de Mensagem
                </label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="bg-[#27272a]/50 border-[#3f3f46] text-[#ededed] hover:bg-[#27272a] transition-colors">
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18181b] border-[#27272a]">
                    {promotionTemplates.map((template) => (
                      <SelectItem 
                        key={template.id} 
                        value={template.id}
                        className="text-[#ededed] hover:bg-[#27272a] focus:bg-[#27272a]"
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{template.name}</span>
                          {template.title && (
                            <span className="text-xs text-emerald-400">{template.title}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {promotionTemplates.length === 0 && (
                  <p className="text-xs text-[#71717a] mt-2 italic">
                    Nenhum template encontrado. Crie templates em Configurações → Promoções
                  </p>
                )}
              </div>

              {/* Prévia da Mensagem */}
              {selectedTemplate && getSelectedTemplateData() && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#ededed] flex items-center gap-2">
                    <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                    Prévia da Mensagem
                  </label>
                  <div className="bg-gradient-to-br from-[#27272a] to-[#1f1f23] p-3 rounded-lg border border-[#3f3f46] space-y-2">
                    {getSelectedTemplateData()?.title && (
                      <div className="flex items-start gap-2">
                        <div className="w-0.5 h-3 bg-emerald-400 rounded-full flex-shrink-0 mt-0.5"></div>
                        <p className="text-emerald-400 text-xs font-medium leading-relaxed">
                          {getSelectedTemplateData()?.title}
                        </p>
                      </div>
                    )}
                    <div className="text-[#d4d4d8] text-xs whitespace-pre-line leading-relaxed pl-2 border-l border-[#3f3f46]">
                      {getSelectedTemplateData()?.message}
                    </div>
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex gap-3 pt-1">
                <Button 
                  variant="outline" 
                  onClick={() => setIsPromotionModalOpen(false)}
                  className="flex-1 border-[#3f3f46] text-[#ededed] hover:bg-[#27272a] hover:border-[#52525b] transition-all duration-200 h-10"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSendPromotion}
                  disabled={!selectedTemplate || selectedClients.length === 0}
                  className="flex-1 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-[#ededed] shadow-lg shadow-emerald-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed h-10"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Promoção
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col gap-4 bg-[#3f3f46]/50 p-4 rounded-lg border border-[#52525b]">
        {/* Search Input - sempre em largura total */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#71717a] w-4 h-4" />
          <Input
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-[#27272a] border-[#3f3f46] text-[#ededed] placeholder-gray-400"
          />
        </div>
        
        {/* Filters - mobile: stack vertical, desktop: horizontal */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:items-center sm:justify-between">
          <Select value={daysThreshold.toString()} onValueChange={(value) => setDaysThreshold(parseInt(value))}>
            <SelectTrigger className="w-full sm:w-52 bg-[#27272a] border-[#3f3f46] text-[#ededed]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#27272a] border-[#3f3f46]">
              <SelectItem value="15">Inativos há 15+ dias</SelectItem>
              <SelectItem value="30">Inativos há 30+ dias</SelectItem>
              <SelectItem value="45">Inativos há 45+ dias</SelectItem>
              <SelectItem value="60">Inativos há 60+ dias</SelectItem>
              <SelectItem value="90">Inativos há 90+ dias</SelectItem>
            </SelectContent>
          </Select>
          
          {filteredClients.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleSelectAll(selectedClients.length !== filteredClients.length)}
              className="w-full sm:w-auto border-[#3f3f46] text-[#ededed] hover:bg-[#27272a]"
            >
              {selectedClients.length === filteredClients.length && filteredClients.length > 0 
                ? "Desmarcar Todos" 
                : "Selecionar Todos"
              }
            </Button>
          )}
        </div>
      </div>

      {/* Inactive Clients List */}
      <Card className="bg-[#18181b] border-[#27272a]">
        <CardContent className="p-6">
          <div className="space-y-4">
            {filteredClients.map((client) => {
              // ✅ CALCULAR DIAS DESDE ÚLTIMA VISITA USANDO DADOS DO BANCO
              const daysSinceLastVisit = client.totalVisits > 0 && client.lastVisit
                ? Math.floor((getBrazilNow().getTime() - new Date(client.lastVisit).getTime()) / (1000 * 60 * 60 * 24))
                : 999; // Valor alto para quem nunca visitou
                
              // ✅ CALCULAR RECEITA POTENCIAL INDIVIDUAL DO CLIENTE
              const clientPotentialRevenue = client.totalSpent > 0 
                ? client.totalSpent / Math.max(client.totalVisits, 1) // Média do próprio cliente
                : stats.averageTicket; // Se nunca gastou, usar média geral
                
              return (
                <div key={client.id}>
                  {/* Layout Desktop - mantido exatamente igual */}
                  <div
                    className={`hidden md:flex items-center gap-4 p-4 rounded-lg transition-colors border ${
                      selectedClients.includes(client.id)
                        ? 'bg-emerald-500/10 border-[#10b981]/30'
                        : 'bg-[#18181b] border-[#27272a] hover:bg-gray-900/70'
                    }`}
                  >
                    <Checkbox 
                      checked={selectedClients.includes(client.id)}
                      onCheckedChange={(checked) => handleSelectClient(client.id, checked as boolean)}
                    />
                    
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-[#ededed]">
                        {client.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[#ededed] font-medium">{client.name}</p>
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                          Prioridade Alta
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[#71717a]">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {client.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {client.totalVisits === 0 
                            ? "Nunca visitou" 
                            : `Inativo há ${daysSinceLastVisit} dias`
                          }
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {client.totalVisits === 0 ? "Nunca visitou" : `Última visita há ${daysSinceLastVisit} dias`}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm font-medium text-emerald-400">Potencial de receita</p>
                      <p className="text-lg font-bold text-emerald-400">
                        {new Intl.NumberFormat('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL' 
                        }).format(clientPotentialRevenue)}
                      </p>
                    </div>
                  </div>

                  {/* Layout Mobile - novo design otimizado */}
                  <div 
                    className={`block md:hidden p-4 rounded-lg transition-colors border ${
                      selectedClients.includes(client.id)
                        ? 'bg-emerald-500/10 border-[#10b981]/30'
                        : 'bg-[#18181b] border-[#27272a] hover:bg-gray-900/70'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Header do cliente com checkbox */}
                      <div className="flex items-start gap-3">
                        <Checkbox 
                          checked={selectedClients.includes(client.id)}
                          onCheckedChange={(checked) => handleSelectClient(client.id, checked as boolean)}
                          className="mt-1"
                        />
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-[#ededed]">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-white text-base truncate">{client.name}</h3>
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs flex-shrink-0">
                              Alta
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-[#71717a]">
                            <MessageCircle className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{client.phone}</span>
                          </div>
                        </div>
                      </div>

                      {/* Informações em cards mini */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-[#27272a]/50 rounded-lg p-2">
                          <div className="flex items-center gap-1 mb-1">
                            <Clock className="w-3 h-3 text-[#71717a]" />
                            <span className="text-xs text-[#71717a]">Status</span>
                          </div>
                          <div className="text-sm font-medium text-[#a1a1aa]">
                            {client.totalVisits === 0 
                              ? "Nunca visitou" 
                              : `${daysSinceLastVisit} dias`
                            }
                          </div>
                        </div>
                        <div className="bg-[#27272a]/50 rounded-lg p-2">
                          <div className="flex items-center gap-1 mb-1">
                            <Gift className="w-3 h-3 text-emerald-400" />
                            <span className="text-xs text-[#71717a]">Potencial</span>
                          </div>
                          <div className="text-sm font-medium text-emerald-400">
                            {new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL',
                              maximumFractionDigits: 0
                            }).format(clientPotentialRevenue)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {filteredClients.length === 0 && searchTerm && (
              <div className="text-center py-8">
                <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[#71717a] mb-2">
                  Nenhum cliente encontrado
                </h3>
                <p className="text-gray-500">
                  Tente buscar com outros termos
                </p>
              </div>
            )}
            
            {filteredClients.length === 0 && !searchTerm && (
              <div className="text-center py-8">
                <UserX className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[#71717a] mb-2">
                  Nenhum cliente inativo encontrado
                </h3>
                <p className="text-gray-500">
                  Todos os seus clientes estão ativos e engajados! 🎉
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
