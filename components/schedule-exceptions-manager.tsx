import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useScheduleExceptions } from "@/hooks/use-schedule"
import { Calendar, Plus, Trash2, AlertCircle, Clock, X } from "lucide-react"
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
        console.error('Erro ao carregar exceções:', err)
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

  // Deletar exceção
  const handleDelete = async (exceptionId: string) => {
    if (!confirm('Tem certeza que deseja remover este bloqueio?')) return

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
            <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] max-w-md">
              <DialogHeader>
                <DialogTitle className="text-[#ededed]">Novo Bloqueio</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Tipo de bloqueio */}
                <div className="space-y-2">
                  <Label className="text-[#a1a1aa]">Tipo de bloqueio</Label>
                  <Select 
                    value={newException.type} 
                    onValueChange={(value: 'BLOCK' | 'DAY_OFF') => handleFormChange('type', value)}
                  >
                    <SelectTrigger className="bg-[#27272a] border-[#52525b] text-[#ededed]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#27272a] border-[#52525b]">
                      <SelectItem value="BLOCK" className="text-[#ededed] focus:bg-[#3f3f46]">
                        Bloqueio pontual (almoço, intervalo)
                      </SelectItem>
                      <SelectItem value="DAY_OFF" className="text-[#ededed] focus:bg-[#3f3f46]">
                        Folga/Férias (dia inteiro)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Data e hora de início */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a1a1aa]">Data início</Label>
                    <Input
                      type="date"
                      value={newException.startDate}
                      onChange={(e) => handleFormChange('startDate', e.target.value)}
                      className="bg-[#27272a] border-[#52525b] text-[#ededed] focus:ring-[#10b981] focus:border-[#10b981]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#a1a1aa]">Hora início</Label>
                    <Select value={newException.startTime} onValueChange={(value) => handleFormChange('startTime', value)}>
                      <SelectTrigger className="bg-[#27272a] border-[#52525b] text-[#ededed]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#27272a] border-[#52525b] max-h-60">
                        {generateTimeOptions().map((time) => (
                          <SelectItem key={time} value={time} className="text-[#ededed] focus:bg-[#3f3f46]">
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Data e hora de fim */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a1a1aa]">Data fim</Label>
                    <Input
                      type="date"
                      value={newException.endDate}
                      onChange={(e) => handleFormChange('endDate', e.target.value)}
                      className="bg-[#27272a] border-[#52525b] text-[#ededed] focus:ring-[#10b981] focus:border-[#10b981]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#a1a1aa]">Hora fim</Label>
                    <Select value={newException.endTime} onValueChange={(value) => handleFormChange('endTime', value)}>
                      <SelectTrigger className="bg-[#27272a] border-[#52525b] text-[#ededed]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#27272a] border-[#52525b] max-h-60">
                        {generateTimeOptions().map((time) => (
                          <SelectItem key={time} value={time} className="text-[#ededed] focus:bg-[#3f3f46]">
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Motivo */}
                <div className="space-y-2">
                  <Label className="text-[#a1a1aa]">Motivo (opcional)</Label>
                  <Textarea
                    value={newException.reason}
                    onChange={(e) => handleFormChange('reason', e.target.value)}
                    placeholder="Ex: Almoço, Consulta médica, Férias..."
                    className="bg-[#27272a] border-[#52525b] text-[#ededed] focus:ring-[#10b981] focus:border-[#10b981]"
                    rows={3}
                  />
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-transparent border-[#52525b] text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#ededed]"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#10b981] hover:bg-[#059669] text-white border-0"
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
                </DialogFooter>
              </form>
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
            className="bg-transparent border-[#52525b] text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#ededed]"
          >
            ← Anterior
          </Button>
          
          <h3 className="text-[#ededed] font-semibold text-lg">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
            className="bg-transparent border-[#52525b] text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#ededed]"
          >
            Próximo →
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
                    onClick={() => handleDelete(exception.id)}
                    disabled={deletingId === exception.id}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
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
    </Card>
  )
}
