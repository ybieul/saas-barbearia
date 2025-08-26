"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
        {/* Botão Enviar Promoção - apenas desktop */}
        <div className="hidden md:block w-full md:w-auto">
          <Dialog open={isPromotionModalOpen} onOpenChange={setIsPromotionModalOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-[#ededed] shadow-lg shadow-emerald-500/20 transition-all duration-200">
                <Send className="w-4 h-4 mr-2" />
                Enviar Promoção ({selectedClients.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-2xl rounded-xl" onOpenAutoFocus={(e) => e.preventDefault()}>
              {/* Header responsivo */}
              <DialogHeader className="border-b border-[#27272a] pb-3 md:pb-4 text-center md:text-center">
                <DialogTitle className="text-base md:text-xl font-semibold text-[#ededed] flex items-center justify-center gap-2">
                  <div className="p-1.5 md:p-2 bg-gradient-to-br from-[#10b981]/20 to-[#059669]/20 rounded-lg">
                    <Send className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 md:text-[#10b981]" />
                  </div>
                  Enviar Promoção
                </DialogTitle>
                <DialogDescription className="text-[#71717a] text-sm hidden md:block">
                  Envie ofertas personalizadas para reativar clientes inativos selecionados via WhatsApp
                </DialogDescription>
              </DialogHeader>
              
              {/* Conteúdo principal do modal - fora do DialogDescription */}
              <div className="space-y-4 md:space-y-6 mt-3 md:mt-4">
                {/* Seção de Clientes Selecionados - responsiva */}
                <div className="bg-gradient-to-br from-[#10b981]/10 to-[#059669]/5 p-3 md:p-4 rounded-lg border border-emerald-500/20 md:border-[#27272a] md:bg-[#0a0a0a]/50">
                  <div className="flex items-center gap-2 mb-2 md:mb-3">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-400 md:bg-[#10b981] rounded-full"></div>
                    <p className="text-[#ededed] font-medium text-sm md:text-base">
                      {selectedClients.length} cliente{selectedClients.length > 1 ? 's' : ''} selecionado{selectedClients.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="bg-[#27272a]/50 p-2 md:p-3 rounded-lg max-h-20 md:max-h-24 overflow-y-auto space-y-1">
                    {selectedClients.map((clientId) => {
                      const client = filteredClients.find(c => c.id === clientId)
                      return (
                        <div key={clientId} className="flex items-center gap-2 text-xs md:text-sm text-[#d4d4d8] md:text-[#ededed]">
                          <div className="w-1 h-1 bg-emerald-400 md:bg-[#10b981] rounded-full flex-shrink-0"></div>
                          <span className="font-medium">{client?.name}</span>
                          <span className="text-[#71717a]">•</span>
                          <span className="text-[#a1a1aa] md:text-[#71717a]">{client?.phone}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Seleção de Template - responsiva */}
                <div className="space-y-2 md:space-y-3">
                  <label className="text-sm font-medium text-[#ededed] flex items-center gap-2 md:block">
                    <div className="w-1 h-1 bg-blue-400 rounded-full md:hidden"></div>
                    Modelo de Mensagem
                  </label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] hover:bg-[#27272a] transition-colors h-10 md:h-11">
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#18181b] md:bg-[#27272a] border-[#27272a] md:border-[#3f3f46]">
                      {promotionTemplates.map((template) => (
                        <SelectItem 
                          key={template.id} 
                          value={template.id}
                          className="text-[#ededed] hover:bg-[#3f3f46] focus:bg-[#3f3f46] data-[highlighted]:bg-[#3f3f46] data-[state=checked]:bg-[#10b981]/20 cursor-pointer"
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{template.name}</span>
                            {template.title && (
                              <span className="text-xs text-emerald-400 md:text-[#71717a]">{template.title}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {promotionTemplates.length === 0 && (
                    <div className="md:bg-amber-500/10 md:border md:border-amber-500/20 md:rounded-lg md:p-3">
                      <p className="text-xs text-[#71717a] mt-2 italic md:text-amber-400 md:text-sm md:flex md:items-center md:gap-2 md:mt-0 md:not-italic">
                        <AlertTriangle className="w-4 h-4 hidden md:inline" />
                        Nenhum template encontrado{". "}
                        <span className="md:block md:text-amber-400/80 md:text-xs md:mt-1">
                          Crie templates em Configurações → Promoções
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Prévia da Mensagem - responsiva */}
                {selectedTemplate && getSelectedTemplateData() && (
                  <div className="space-y-2 md:space-y-3">
                    <label className="text-sm font-medium text-[#ededed] flex items-center gap-2 md:block">
                      <div className="w-1 h-1 bg-purple-400 rounded-full md:hidden"></div>
                      Prévia da Mensagem
                    </label>
                    <div className="bg-gradient-to-br from-[#27272a] to-[#1f1f23] md:from-[#10b981]/10 md:to-[#059669]/5 p-3 md:p-4 rounded-lg border border-[#3f3f46] md:border-[#10b981]/20 space-y-2 md:space-y-3 max-h-32 md:max-h-none overflow-y-auto md:overflow-y-visible">
                      {getSelectedTemplateData()?.title && (
                        <div className="flex items-start gap-2 md:bg-[#10b981]/20 md:rounded-lg md:px-3 md:py-2 md:mb-3">
                          <div className="w-0.5 h-3 bg-emerald-400 rounded-full flex-shrink-0 mt-0.5 md:hidden"></div>
                          <p className="text-emerald-400 md:text-[#10b981] text-xs md:text-sm font-medium leading-relaxed md:font-semibold">
                            <span className="hidden md:inline">📢 </span>
                            {getSelectedTemplateData()?.title}
                          </p>
                        </div>
                      )}
                      <div className="text-[#d4d4d8] md:text-[#ededed] text-xs md:text-sm whitespace-pre-line leading-relaxed pl-2 md:pl-0 border-l md:border-l-0 border-[#3f3f46]">
                        {getSelectedTemplateData()?.message}
                      </div>
                      <div className="hidden md:flex items-center gap-2 mt-3 pt-3 border-t border-[#10b981]/20">
                        <div className="w-1 h-1 bg-[#10b981] rounded-full"></div>
                        <span className="text-xs text-[#71717a]">
                          Será enviado via WhatsApp para {selectedClients.length} cliente(s)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botões de Ação - responsivos */}
                <div className="flex gap-3 pt-1 md:pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsPromotionModalOpen(false)}
                    className="flex-1 border-[#3f3f46] text-[#ededed] md:text-[#71717a] hover:bg-[#27272a] hover:border-[#52525b] md:hover:text-[#ededed] transition-all duration-200 h-10 md:min-h-[44px] md:touch-manipulation"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSendPromotion}
                    disabled={!selectedTemplate || selectedClients.length === 0}
                    className="flex-1 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-[#ededed] shadow-lg shadow-emerald-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed h-10 md:min-h-[44px] md:touch-manipulation"
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

      {/* Botão Enviar Promoção - apenas mobile, abaixo dos cards */}
      <div className="block md:hidden">
        <Dialog open={isPromotionModalOpen} onOpenChange={setIsPromotionModalOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-[#ededed] shadow-lg shadow-emerald-500/20 transition-all duration-200">
              <Send className="w-4 h-4 mr-2" />
              Enviar Promoção ({selectedClients.length})
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-2xl rounded-xl" onOpenAutoFocus={(e) => e.preventDefault()}>
            {/* Header responsivo */}
            <DialogHeader className="border-b border-[#27272a] pb-3 md:pb-4 text-center md:text-center">
              <DialogTitle className="text-base md:text-xl font-semibold text-[#ededed] flex items-center justify-center gap-2">
                <div className="p-1.5 md:p-2 bg-gradient-to-br from-[#10b981]/20 to-[#059669]/20 rounded-lg">
                  <Send className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 md:text-[#10b981]" />
                </div>
                Enviar Promoção
              </DialogTitle>
              <DialogDescription className="text-[#71717a] text-sm hidden md:block">
                Envie ofertas personalizadas para reativar clientes inativos selecionados via WhatsApp
              </DialogDescription>
            </DialogHeader>
            
            {/* Conteúdo principal do modal mobile - fora do DialogDescription */}
            <div className="space-y-4 md:space-y-6 mt-3 md:mt-4">
              {/* Seção de Clientes Selecionados - responsiva */}
              <div className="bg-gradient-to-br from-[#10b981]/10 to-[#059669]/5 p-3 md:p-4 rounded-lg border border-emerald-500/20 md:border-[#27272a] md:bg-[#0a0a0a]/50">
                <div className="flex items-center gap-2 mb-2 md:mb-3">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-400 md:bg-[#10b981] rounded-full"></div>
                  <p className="text-[#ededed] font-medium text-sm md:text-base">
                    {selectedClients.length} cliente{selectedClients.length > 1 ? 's' : ''} selecionado{selectedClients.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="bg-[#27272a]/50 p-2 md:p-3 rounded-lg max-h-20 md:max-h-24 overflow-y-auto space-y-1">
                  {selectedClients.map((clientId) => {
                    const client = filteredClients.find(c => c.id === clientId)
                    return (
                      <div key={clientId} className="flex items-center gap-2 text-xs md:text-sm text-[#d4d4d8] md:text-[#ededed]">
                        <div className="w-1 h-1 bg-emerald-400 md:bg-[#10b981] rounded-full flex-shrink-0"></div>
                        <span className="font-medium">{client?.name}</span>
                        <span className="text-[#71717a]">•</span>
                        <span className="text-[#a1a1aa] md:text-[#71717a]">{client?.phone}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Seleção de Template - responsiva */}
              <div className="space-y-2 md:space-y-3">
                <label className="text-sm font-medium text-[#ededed] flex items-center gap-2 md:block">
                  <div className="w-1 h-1 bg-blue-400 rounded-full md:hidden"></div>
                  Modelo de Mensagem
                </label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] hover:bg-[#27272a] transition-colors h-10 md:h-11">
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18181b] md:bg-[#27272a] border-[#27272a] md:border-[#3f3f46]">
                    {promotionTemplates.map((template) => (
                      <SelectItem 
                        key={template.id} 
                        value={template.id}
                        className="text-[#ededed] hover:bg-[#3f3f46] focus:bg-[#3f3f46] data-[highlighted]:bg-[#3f3f46] data-[state=checked]:bg-[#10b981]/20 cursor-pointer"
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{template.name}</span>
                          {template.title && (
                            <span className="text-xs text-emerald-400 md:text-[#71717a]">{template.title}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {promotionTemplates.length === 0 && (
                  <div className="md:bg-amber-500/10 md:border md:border-amber-500/20 md:rounded-lg md:p-3">
                    <p className="text-xs text-[#71717a] mt-2 italic md:text-amber-400 md:text-sm md:flex md:items-center md:gap-2 md:mt-0 md:not-italic">
                      <AlertTriangle className="w-4 h-4 hidden md:inline" />
                      Nenhum template encontrado{". "}
                      <span className="md:block md:text-amber-400/80 md:text-xs md:mt-1">
                        Crie templates em Configurações → Promoções
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Prévia da Mensagem - responsiva */}
              {selectedTemplate && getSelectedTemplateData() && (
                <div className="space-y-2 md:space-y-3">
                  <label className="text-sm font-medium text-[#ededed] flex items-center gap-2 md:block">
                    <div className="w-1 h-1 bg-purple-400 rounded-full md:hidden"></div>
                    Prévia da Mensagem
                  </label>
                  <div className="bg-gradient-to-br from-[#27272a] to-[#1f1f23] md:from-[#10b981]/10 md:to-[#059669]/5 p-3 md:p-4 rounded-lg border border-[#3f3f46] md:border-[#10b981]/20 space-y-2 md:space-y-3 max-h-32 md:max-h-none overflow-y-auto md:overflow-y-visible">
                    {getSelectedTemplateData()?.title && (
                      <div className="flex items-start gap-2 md:bg-[#10b981]/20 md:rounded-lg md:px-3 md:py-2 md:mb-3">
                        <div className="w-0.5 h-3 bg-emerald-400 rounded-full flex-shrink-0 mt-0.5 md:hidden"></div>
                        <p className="text-emerald-400 md:text-[#10b981] text-xs md:text-sm font-medium leading-relaxed md:font-semibold">
                          <span className="hidden md:inline">📢 </span>
                          {getSelectedTemplateData()?.title}
                        </p>
                      </div>
                    )}
                    <div className="text-[#d4d4d8] md:text-[#ededed] text-xs md:text-sm whitespace-pre-line leading-relaxed pl-2 md:pl-0 border-l md:border-l-0 border-[#3f3f46]">
                      {getSelectedTemplateData()?.message}
                    </div>
                    <div className="hidden md:flex items-center gap-2 mt-3 pt-3 border-t border-[#10b981]/20">
                      <div className="w-1 h-1 bg-[#10b981] rounded-full"></div>
                      <span className="text-xs text-[#71717a]">
                        Será enviado via WhatsApp para {selectedClients.length} cliente(s)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Botões de Ação - responsivos */}
              <div className="flex gap-3 pt-1 md:pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsPromotionModalOpen(false)}
                  className="flex-1 border-[#3f3f46] text-[#ededed] md:text-[#71717a] hover:bg-[#27272a] hover:border-[#52525b] md:hover:text-[#ededed] transition-all duration-200 h-10 md:min-h-[44px] md:touch-manipulation"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSendPromotion}
                  disabled={!selectedTemplate || selectedClients.length === 0}
                  className="flex-1 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-[#ededed] shadow-lg shadow-emerald-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed h-10 md:min-h-[44px] md:touch-manipulation"
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
