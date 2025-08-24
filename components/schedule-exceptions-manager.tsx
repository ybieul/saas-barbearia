import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useScheduleExceptions } from "@/hooks/use-schedule"
import { Calendar, Plus, Trash2, AlertCircle, Clock, X, ChevronLeft, ChevronRight } from "lucide-react"
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { CreateScheduleExceptionData, ScheduleExceptionData } from "@/lib/types/schedule"

interface ScheduleExceptionsManagerProps {
  professionalId: string
  professionalName?: string
}

interface NewExceptionForm {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  reason: string
  type: 'BLOCK' | 'DAY_OFF'
}

const DEFAULT_FORM: NewExceptionForm = {
  startDate: format(new Date(), 'yyyy-MM-dd'),
  startTime: '12:00',
  endDate: format(new Date(), 'yyyy-MM-dd'),
  endTime: '13:00',
  reason: '',
  type: 'BLOCK'
}

export function ScheduleExceptionsManager({ professionalId, professionalName }: ScheduleExceptionsManagerProps) {
  const { toast } = useToast()
  const { getExceptions, createException, deleteException, isLoading, error } = useScheduleExceptions(professionalId)
  
  const [exceptions, setExceptions] = useState<ScheduleExceptionData[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newException, setNewException] = useState<NewExceptionForm>(DEFAULT_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Estado para modal de confirmação de exclusão
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean
    exceptionId: string
    exceptionData: ScheduleExceptionData | null
  }>({
    isOpen: false,
    exceptionId: '',
    exceptionData: null
  })

  // Carregar exceções do mês atual
  useEffect(() => {
    const loadExceptions = async () => {
      if (!professionalId || professionalId === 'establishment') return

      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd')

      try {
        const data = await getExceptions(startDate, endDate, professionalId)
        setExceptions(data)
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Erro ao carregar exceções:', err)
        }
        toast({
          title: "Erro",
          description: "Não foi possível carregar os bloqueios do profissional.",
          variant: "destructive"
        })
      }
    }

    loadExceptions()
  }, [professionalId, currentMonth, getExceptions, toast])

  // Navegar pelos meses
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1))
  }

  // Gerar opções de horário
  const generateTimeOptions = () => {
    const times = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        times.push(timeString)
      }
    }
    return times
  }

  // Atualizar campos do formulário
  const handleFormChange = (field: keyof NewExceptionForm, value: string) => {
    setNewException(prev => ({ ...prev, [field]: value }))
  }

  // Submeter nova exceção
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validações básicas
      if (!newException.startDate || !newException.startTime || !newException.endDate || !newException.endTime) {
        throw new Error('Todos os campos de data e hora são obrigatórios.')
      }

      // Combinar data e hora no formato YYYY-MM-DD HH:MM:SS (horário local do Brasil)
      const startDatetime = `${newException.startDate} ${newException.startTime}:00`
      const endDatetime = `${newException.endDate} ${newException.endTime}:00`

      // Validar se data de fim é após início (comparação simples de strings)
      if (endDatetime <= startDatetime) {
        throw new Error('A data/hora de fim deve ser posterior à data/hora de início.')
      }

      const exceptionData: CreateScheduleExceptionData = {
        startDatetime,
        endDatetime,
        reason: newException.reason.trim() || undefined,
        type: newException.type
      }

      // 🔍 PONTO A - DADOS ENVIADOS PELO FRONTEND
      if (process.env.NODE_ENV === 'development') {
        console.log("=== PONTO A - DADOS ENVIADOS PELO FRONTEND ===")
        console.log("Frontend payload completo:", JSON.stringify(exceptionData, null, 2))
        console.log("Frontend startDatetime:", startDatetime)
        console.log("Frontend endDatetime:", endDatetime)
        console.log("Frontend tipo de startDatetime:", typeof startDatetime)
      }

      const result = await createException(exceptionData, professionalId)
      
      if (result) {
        toast({
          title: "Sucesso!",
          description: "Bloqueio criado com sucesso.",
          variant: "default"
        })

        // Limpar formulário e fechar modal
        setNewException(DEFAULT_FORM)
        setIsModalOpen(false)

        // Recarregar exceções
        const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
        const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
        const updatedExceptions = await getExceptions(startDate, endDate, professionalId)
        setExceptions(updatedExceptions)
      }
    } catch (err: any) {
      toast({
        title: "Erro ao criar bloqueio",
        description: err.message || "Erro interno. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Abrir modal de confirmação de exclusão
  const handleDeleteClick = (exception: ScheduleExceptionData) => {
    setDeleteConfirmDialog({
      isOpen: true,
      exceptionId: exception.id,
      exceptionData: exception
    })
  }

  // Deletar exceção com confirmação
  const handleConfirmDelete = async () => {
    const exceptionId = deleteConfirmDialog.exceptionId
    if (!exceptionId) return

    setDeletingId(exceptionId)
    try {
      const success = await deleteException(exceptionId)
      
      if (success) {
        toast({
          title: "Sucesso!",
          description: "Bloqueio removido com sucesso.",
          variant: "default"
        })

        // Remover da lista local
        setExceptions(prev => prev.filter(exc => exc.id !== exceptionId))
        
        // Fechar modal de confirmação
        setDeleteConfirmDialog({
          isOpen: false,
          exceptionId: '',
          exceptionData: null
        })
      }
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Erro ao remover bloqueio.",
        variant: "destructive"
      })
    } finally {
      setDeletingId(null)
    }
  }

  // Formatar data para exibição (assumindo que já vem em horário local do Brasil)
  const formatExceptionDate = (startDatetime: string | Date, endDatetime: string | Date) => {
    // Converter para string se for Date (assumindo que já está em horário local)
    const startStr = typeof startDatetime === 'string' ? startDatetime : startDatetime.toISOString()
    const endStr = typeof endDatetime === 'string' ? endDatetime : endDatetime.toISOString()
    
    // Extrair data e hora diretamente da string (YYYY-MM-DD HH:MM:SS ou YYYY-MM-DDTHH:MM:SS)
    const [startDatePart, startTimePart] = startStr.includes('T') 
      ? startStr.split('T') 
      : startStr.split(' ')
    const [endDatePart, endTimePart] = endStr.includes('T') 
      ? endStr.split('T') 
      : endStr.split(' ')
    
    // Formatar data brasileira
    const [startYear, startMonth, startDay] = startDatePart.split('-')
    const startDate = `${startDay}/${startMonth}/${startYear}`
    
    // Extrair apenas HH:MM
    const startTime = startTimePart.substring(0, 5)
    const endTime = endTimePart.substring(0, 5)
    
    // Se é no mesmo dia
    if (startDatePart === endDatePart) {
      return `${startDate} das ${startTime} às ${endTime}`
    }
    
    // Dias diferentes
    const [endYear, endMonth, endDay] = endDatePart.split('-')
    const endDate = `${endDay}/${endMonth}/${endYear}`
    return `${startDate} ${startTime} até ${endDate} ${endTime}`
  }

  if (isLoading) {
    return (
      <Card className="bg-[#18181b] border-[#27272a]">
        <CardContent className="py-8">
          <div className="flex justify-center items-center">
            <div className="w-6 h-6 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-[#71717a]">Carregando bloqueios...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-[#18181b] border-[#27272a]">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-[#a1a1aa] text-lg sm:text-xl flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Bloqueios e Exceções na Agenda
            </CardTitle>
            <CardDescription className="text-[#71717a]">
              {professionalName 
                ? `Gerencie folgas e bloqueios pontuais de ${professionalName}`
                : 'Gerencie folgas e bloqueios pontuais na agenda'
              }
            </CardDescription>
          </div>
          
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#10b981] hover:bg-[#059669] text-white border-0 px-4 sm:px-6">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Bloqueio
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-2xl mx-auto h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-xl">
              {/* Header fixo */}
              <DialogHeader className="border-b border-[#27272a] pb-3 md:pb-4 flex-shrink-0">
                <DialogTitle className="text-[#ededed] text-base md:text-xl font-semibold flex items-center gap-2">
                  <div className="p-1.5 md:p-2 bg-gradient-to-br from-[#10b981]/20 to-[#059669]/20 rounded-lg">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 md:text-[#10b981]" />
                  </div>
                  Novo Bloqueio
                </DialogTitle>
                <DialogDescription className="text-[#71717a] text-sm hidden md:block">
                  Crie um bloqueio ou folga na agenda do profissional
                </DialogDescription>
              </DialogHeader>
              
              {/* Conteúdo com scroll */}
              <div className="overflow-y-auto flex-1 px-4 sm:px-6">
                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 mt-3 md:mt-4">
                  {/* Seção de Configuração do Bloqueio */}
                  <div className="bg-gradient-to-br from-[#10b981]/10 to-[#059669]/5 p-3 md:p-4 rounded-lg border border-emerald-500/20 md:border-[#27272a] md:bg-[#0a0a0a]/50 space-y-3 md:space-y-4">
                    <div className="flex items-center gap-2 mb-2 md:mb-3">
                      <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-400 md:bg-[#10b981] rounded-full"></div>
                      <h3 className="text-[#ededed] font-medium text-sm md:text-base">Configuração do Bloqueio</h3>
                    </div>
                    
                    <div className="space-y-3 md:space-y-4">
                      {/* Tipo de bloqueio */}
                      <div className="space-y-2">
                        <Label className="text-[#ededed] text-sm font-medium">Tipo de bloqueio *</Label>
                        <Select 
                          value={newException.type} 
                          onValueChange={(value: 'BLOCK' | 'DAY_OFF') => handleFormChange('type', value)}
                        >
                          <SelectTrigger className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-12 md:h-11 text-base md:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#27272a] border-[#52525b]" position="popper" sideOffset={4}>
                            <SelectItem value="BLOCK" className="text-[#ededed] focus:bg-[#3f3f46] h-12 md:h-10 text-base md:text-sm">
                              Bloqueio pontual (saída rápida, consulta)
                            </SelectItem>
                            <SelectItem value="DAY_OFF" className="text-[#ededed] focus:bg-[#3f3f46] h-12 md:h-10 text-base md:text-sm">
                              Folga/Férias (dia inteiro)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Seção de Data e Horário */}
                  <div className="space-y-3 md:space-y-4">
                    <div className="flex items-center gap-2 md:hidden">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                      <h3 className="text-[#ededed] font-medium text-sm">Data e Horário</h3>
                    </div>
                    
                    <div className="space-y-4 md:space-y-4">
                      {/* Data e hora de início - Mobile first, então Desktop */}
                      <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
                        <div className="space-y-2">
                          <Label className="text-[#ededed] text-sm font-medium">Data início *</Label>
                          <Input
                            type="date"
                            value={newException.startDate}
                            onChange={(e) => handleFormChange('startDate', e.target.value)}
                            className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-12 md:h-11 text-base md:text-sm"
                            style={{ colorScheme: 'dark' }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[#ededed] text-sm font-medium">Hora início *</Label>
                          <Select value={newException.startTime} onValueChange={(value) => handleFormChange('startTime', value)}>
                            <SelectTrigger className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-12 md:h-11 text-base md:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#27272a] border-[#52525b] max-h-60" position="popper" sideOffset={4}>
                              {generateTimeOptions().map((time) => (
                                <SelectItem key={time} value={time} className="text-[#ededed] focus:bg-[#3f3f46] h-10 md:h-8">
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Data e hora de fim - Mobile first, então Desktop */}
                      <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
                        <div className="space-y-2">
                          <Label className="text-[#ededed] text-sm font-medium">Data fim *</Label>
                          <Input
                            type="date"
                            value={newException.endDate}
                            onChange={(e) => handleFormChange('endDate', e.target.value)}
                            className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-12 md:h-11 text-base md:text-sm"
                            style={{ colorScheme: 'dark' }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[#ededed] text-sm font-medium">Hora fim *</Label>
                          <Select value={newException.endTime} onValueChange={(value) => handleFormChange('endTime', value)}>
                            <SelectTrigger className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-12 md:h-11 text-base md:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#27272a] border-[#52525b] max-h-60" position="popper" sideOffset={4}>
                              {generateTimeOptions().map((time) => (
                                <SelectItem key={time} value={time} className="text-[#ededed] focus:bg-[#3f3f46] h-10 md:h-8">
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Motivo */}
                      <div className="space-y-2">
                        <Label className="text-[#ededed] text-sm font-medium">Motivo (opcional)</Label>
                        <Textarea
                          value={newException.reason}
                          onChange={(e) => handleFormChange('reason', e.target.value)}
                          placeholder="Ex: Almoço, Consulta médica, Férias..."
                          className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] min-h-20 md:min-h-20 max-h-24 md:max-h-none resize-none text-base md:text-sm"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </div>
              
              {/* Footer fixo */}
              <div className="flex gap-3 p-4 sm:p-6 flex-shrink-0 pt-4 md:pt-2 border-t border-[#27272a] sm:border-t-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 border-[#3f3f46] text-[#ededed] md:text-[#71717a] hover:bg-[#27272a] hover:border-[#52525b] md:hover:text-[#ededed] transition-all duration-200 h-12 md:h-10 text-base md:text-sm font-medium"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-[#ededed] shadow-lg shadow-emerald-500/20 transition-all duration-200 h-12 md:h-10 text-base md:text-sm font-medium"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Criando...
                    </>
                  ) : (
                    'Criar Bloqueio'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {/* Navegação de mês */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
            className="bg-transparent border-[#52525b] text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#ededed] flex items-center gap-2 px-3 py-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Anterior</span>
          </Button>
          
          <h3 className="text-[#ededed] font-semibold text-lg text-center flex-1 mx-4">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
            className="bg-transparent border-[#52525b] text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#ededed] flex items-center gap-2 px-3 py-2"
          >
            <span className="hidden sm:inline">Próximo</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Lista de exceções */}
        <div className="space-y-3">
          {exceptions.length === 0 ? (
            <div className="text-center py-8 text-[#71717a]">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum bloqueio encontrado para este mês.</p>
              <p className="text-sm mt-1">Clique em "Adicionar Bloqueio" para criar um novo.</p>
            </div>
          ) : (
            exceptions.map((exception) => (
              <div
                key={exception.id}
                className="group relative bg-[#27272a]/50 hover:bg-[#27272a] transition-colors rounded-xl border border-[#3f3f46] p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        exception.type === 'DAY_OFF' 
                          ? 'bg-red-500' 
                          : 'bg-orange-500'
                      }`}></div>
                      <span className="text-[#ededed] font-medium">
                        {exception.type === 'DAY_OFF' ? 'Folga' : 'Bloqueio'}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-[#a1a1aa] text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {formatExceptionDate(exception.startDatetime, exception.endDatetime)}
                      </p>
                      
                      {exception.reason && (
                        <p className="text-[#71717a] text-sm">
                          "{exception.reason}"
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(exception)}
                    disabled={deletingId === exception.id}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
                  >
                    {deletingId === exception.id ? (
                      <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
      
      {/* Modal de Confirmação para Excluir Bloqueio */}
      <Dialog open={deleteConfirmDialog.isOpen} onOpenChange={(open) => {
        if (!open) {
          setDeleteConfirmDialog({
            isOpen: false,
            exceptionId: '',
            exceptionData: null
          })
        }
      }}>
        <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-lg mx-auto h-[80vh] sm:max-h-[90vh] flex flex-col rounded-xl">
          {/* Header Fixo */}
          <DialogHeader className="border-b border-[#27272a] pb-3 md:pb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-[#ededed] text-lg md:text-xl font-semibold">
                  Excluir Bloqueio
                </DialogTitle>
                <DialogDescription className="text-[#a1a1aa] text-sm md:text-base">
                  Tem certeza que deseja remover este bloqueio permanentemente?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {/* Conteúdo com informações do bloqueio */}
          <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4">
            {deleteConfirmDialog.exceptionData && (
              <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 p-3 md:p-4 rounded-lg border border-red-500/20 space-y-3 md:space-y-4">
                <div className="flex items-center gap-2 mb-2 md:mb-3">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-red-400 rounded-full"></div>
                  <h3 className="text-[#ededed] font-medium text-sm md:text-base">Detalhes do Bloqueio</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-[#71717a] text-xs md:text-sm">Tipo</label>
                    <div className="bg-[#27272a]/70 border border-red-500/30 rounded-md px-3 py-2.5 text-[#ededed] text-sm md:text-base font-medium">
                      {deleteConfirmDialog.exceptionData.type === 'DAY_OFF' ? 'Folga/Férias (dia inteiro)' : 'Bloqueio pontual'}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[#71717a] text-xs md:text-sm">Período</label>
                    <div className="bg-[#27272a]/70 border border-red-500/30 rounded-md px-3 py-2.5 text-[#ededed] text-sm md:text-base">
                      {formatExceptionDate(deleteConfirmDialog.exceptionData.startDatetime, deleteConfirmDialog.exceptionData.endDatetime)}
                    </div>
                  </div>
                  
                  {deleteConfirmDialog.exceptionData.reason && (
                    <div className="space-y-2">
                      <label className="text-[#71717a] text-xs md:text-sm">Motivo</label>
                      <div className="bg-[#27272a]/70 border border-red-500/30 rounded-md px-3 py-2.5 text-[#ededed] text-sm md:text-base">
                        "{deleteConfirmDialog.exceptionData.reason}"
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 mt-3">
                    <p className="text-red-400 text-xs md:text-sm">
                      ⚠️ Este bloqueio será removido permanentemente da agenda.
                    </p>
                  </div>
                  
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3">
                    <p className="text-amber-400 text-xs md:text-sm">
                      💡 Esta ação não pode ser desfeita.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer com botões */}
          <div className="border-t border-[#27272a] pt-3 md:pt-4 px-4 sm:px-6 pb-4 sm:pb-6 flex-shrink-0">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmDialog({
                  isOpen: false,
                  exceptionId: '',
                  exceptionData: null
                })}
                className="border-[#27272a] hover:bg-[#27272a] w-full sm:w-auto"
                disabled={deletingId !== null}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                disabled={deletingId !== null}
              >
                {deletingId === deleteConfirmDialog.exceptionId ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Excluindo...
                  </>
                ) : (
                  'Excluir Permanentemente'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
