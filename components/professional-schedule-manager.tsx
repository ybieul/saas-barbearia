import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useProfessionalSchedule } from "@/hooks/use-schedule"
import { Save, Clock, Plus, Trash2 } from "lucide-react"
import type { ProfessionalScheduleData, RecurringBreakData } from "@/lib/types/schedule"

interface ProfessionalScheduleManagerProps {
  professionalId: string
  professionalName?: string
}

interface DaySchedule {
  dayOfWeek: number
  dayName: string
  isActive: boolean
  startTime: string
  endTime: string
  breaks: RecurringBreakData[]
}

const DAYS_OF_WEEK: Pick<DaySchedule, 'dayOfWeek' | 'dayName'>[] = [
  { dayOfWeek: 1, dayName: 'Segunda-feira' },
  { dayOfWeek: 2, dayName: 'Terça-feira' },
  { dayOfWeek: 3, dayName: 'Quarta-feira' },
  { dayOfWeek: 4, dayName: 'Quinta-feira' },
  { dayOfWeek: 5, dayName: 'Sexta-feira' },
  { dayOfWeek: 6, dayName: 'Sábado' },
  { dayOfWeek: 0, dayName: 'Domingo' }
]

const DEFAULT_START_TIME = '09:00'
const DEFAULT_END_TIME = '18:00'

export function ProfessionalScheduleManager({ professionalId, professionalName }: ProfessionalScheduleManagerProps) {
  const { toast } = useToast()
  const { getSchedule, updateSchedule, isLoading, error } = useProfessionalSchedule(professionalId)
  const [schedules, setSchedules] = useState<DaySchedule[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Inicializar horários padrão
  useEffect(() => {
    const initialSchedules: DaySchedule[] = DAYS_OF_WEEK.map(day => ({
      ...day,
      isActive: false,
      startTime: DEFAULT_START_TIME,
      endTime: DEFAULT_END_TIME,
      breaks: []
    }))
    setSchedules(initialSchedules)
  }, [])

  // Carregar horários do profissional
  useEffect(() => {
    const loadSchedules = async () => {
      if (!professionalId || professionalId === 'establishment') return

      try {
        const response = await getSchedule(professionalId)
        if (response?.schedule) {
          const updatedSchedules = DAYS_OF_WEEK.map(day => {
            const existingSchedule = response.schedule.find(s => s.dayOfWeek === day.dayOfWeek)
            return {
              ...day,
              isActive: existingSchedule?.isWorking || false,
              startTime: existingSchedule?.startTime?.substring(0, 5) || DEFAULT_START_TIME,
              endTime: existingSchedule?.endTime?.substring(0, 5) || DEFAULT_END_TIME,
              breaks: existingSchedule?.breaks?.map(breakItem => ({
                startTime: breakItem.startTime.substring(0, 5),
                endTime: breakItem.endTime.substring(0, 5)
              })) || []
            }
          })
          setSchedules(updatedSchedules)
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Erro ao carregar horários:', err)
        }
        toast({
          title: "Erro",
          description: "Não foi possível carregar os horários do profissional.",
          variant: "destructive"
        })
      }
    }

    loadSchedules()
  }, [professionalId, getSchedule, toast])

  // Gerar opções de horário (de 15 em 15 minutos)
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

  // Atualizar horário de um dia
  const handleScheduleChange = (dayOfWeek: number, field: 'isActive' | 'startTime' | 'endTime', value: boolean | string) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.dayOfWeek === dayOfWeek 
        ? { ...schedule, [field]: value }
        : schedule
    ))
  }

  // Adicionar novo intervalo para um dia específico
  const addBreak = (dayOfWeek: number) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.dayOfWeek === dayOfWeek 
        ? { 
            ...schedule, 
            breaks: [...schedule.breaks, { startTime: '12:00', endTime: '13:00' }]
          }
        : schedule
    ))
  }

  // Remover intervalo de um dia específico
  const removeBreak = (dayOfWeek: number, breakIndex: number) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.dayOfWeek === dayOfWeek 
        ? { 
            ...schedule, 
            breaks: schedule.breaks.filter((_, index) => index !== breakIndex)
          }
        : schedule
    ))
  }

  // Atualizar horário de um intervalo específico
  const updateBreak = (dayOfWeek: number, breakIndex: number, field: 'startTime' | 'endTime', value: string) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.dayOfWeek === dayOfWeek 
        ? { 
            ...schedule, 
            breaks: schedule.breaks.map((breakItem, index) => 
              index === breakIndex 
                ? { ...breakItem, [field]: value }
                : breakItem
            )
          }
        : schedule
    ))
  }

  // Salvar horários
  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Preparar dados apenas dos dias ativos
      const activeSchedules: ProfessionalScheduleData[] = schedules
        .filter(schedule => schedule.isActive)
        .map(schedule => ({
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breaks: schedule.breaks
        }))

      const success = await updateSchedule(activeSchedules, professionalId)
      
      if (success) {
        toast({
          title: "Sucesso!",
          description: "Horários do profissional atualizados com sucesso.",
          variant: "default"
        })
      }
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Erro ao salvar horários.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-[#18181b] border-[#27272a]">
        <CardContent className="py-8">
          <div className="flex justify-center items-center">
            <div className="w-6 h-6 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-[#71717a]">Carregando horários...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-[#18181b] border-[#27272a]">
      <CardHeader>
        <CardTitle className="text-[#a1a1aa] text-lg sm:text-xl flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Horário de Trabalho Padrão
        </CardTitle>
        <CardDescription className="text-[#71717a]">
          {professionalName 
            ? `Defina os dias e horários de trabalho de ${professionalName}`
            : 'Defina os dias e horários de trabalho do profissional'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div 
              key={schedule.dayOfWeek} 
              className="group relative bg-[#27272a]/50 hover:bg-[#27272a] transition-colors rounded-xl border border-[#3f3f46] overflow-hidden"
            >
              <div className="p-3 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Lado esquerdo - Dia e Switch */}
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="relative">
                      <Switch
                        checked={schedule.isActive}
                        onCheckedChange={(checked) =>
                          handleScheduleChange(schedule.dayOfWeek, 'isActive', checked)
                        }
                        className="data-[state=checked]:bg-[#10b981]"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#ededed] font-semibold text-base sm:text-lg">
                        {schedule.dayName}
                      </span>
                      <span className="text-[#71717a] text-xs sm:text-sm">
                        {schedule.isActive ? 'Dia de trabalho' : 'Folga'}
                      </span>
                    </div>
                  </div>

                  {/* Lado direito - Horários ou Status */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    {schedule.isActive ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 bg-[#18181b] rounded-lg p-2.5 sm:p-3 border border-[#3f3f46] w-full sm:w-auto">
                        {/* Container de Início */}
                        <div className="flex items-center justify-between sm:flex-col sm:items-center sm:justify-center">
                          <label className="text-[#a1a1aa] text-xs font-medium sm:mb-1 flex-shrink-0 min-w-[60px] sm:min-w-0">Início</label>
                          <Select
                            value={schedule.startTime}
                            onValueChange={(value) => handleScheduleChange(schedule.dayOfWeek, 'startTime', value)}
                          >
                            <SelectTrigger className="bg-[#27272a] border-[#52525b] text-[#ededed] w-20 sm:w-24 h-7 sm:h-9 text-center font-mono focus:ring-[#10b981] focus:border-[#10b981] text-xs sm:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#27272a] border-[#52525b] max-h-60">
                              {generateTimeOptions().map((time) => (
                                <SelectItem key={time} value={time} className="text-[#ededed] focus:bg-[#3f3f46] focus:text-[#ededed]">
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Separador "até" - apenas no desktop */}
                        <div className="hidden sm:flex items-center justify-center px-2 order-3 sm:order-2">
                          <span className="text-[#71717a] font-medium text-sm">até</span>
                        </div>
                        
                        {/* Container de Fim */}
                        <div className="flex items-center justify-between sm:flex-col sm:items-center sm:justify-center order-2 sm:order-3">
                          <label className="text-[#a1a1aa] text-xs font-medium sm:mb-1 flex-shrink-0 min-w-[60px] sm:min-w-0">Fim</label>
                          <Select
                            value={schedule.endTime}
                            onValueChange={(value) => handleScheduleChange(schedule.dayOfWeek, 'endTime', value)}
                          >
                            <SelectTrigger className="bg-[#27272a] border-[#52525b] text-[#ededed] w-20 sm:w-24 h-7 sm:h-9 text-center font-mono focus:ring-[#10b981] focus:border-[#10b981] text-xs sm:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#27272a] border-[#52525b] max-h-60">
                              {generateTimeOptions().map((time) => (
                                <SelectItem key={time} value={time} className="text-[#ededed] focus:bg-[#3f3f46] focus:text-[#ededed]">
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-900/20 rounded-lg border border-orange-700/30">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-orange-400 text-xs sm:text-sm font-medium">Folga</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Seção de Intervalos Recorrentes - apenas para dias ativos */}
                {schedule.isActive && (
                  <div className="mt-4 pt-4 border-t border-[#3f3f46]/50">
                    <div className="space-y-3">
                      {/* Botão Adicionar Intervalo */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#a1a1aa]" />
                          <span className="text-[#a1a1aa] text-sm font-medium">
                            Intervalos ({schedule.breaks.length})
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => addBreak(schedule.dayOfWeek)}
                          className="text-[#10b981] hover:text-[#059669] hover:bg-[#10b981]/10 text-xs h-7 px-2"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Adicionar intervalo
                        </Button>
                      </div>

                      {/* Lista de Intervalos Existentes */}
                      {schedule.breaks.length > 0 && (
                        <div className="space-y-2">
                          {schedule.breaks.map((breakItem, breakIndex) => (
                            <div 
                              key={breakIndex}
                              className="bg-[#18181b] rounded-lg p-3 border border-[#3f3f46]"
                            >
                              {/* Layout Mobile-First Responsivo */}
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                {/* Cabeçalho do Intervalo */}
                                <div className="flex items-center justify-between sm:justify-start">
                                  <span className="text-[#a1a1aa] text-xs font-medium">
                                    Intervalo
                                  </span>
                                  {/* Botão Remover - Mobile (no topo à direita) */}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeBreak(schedule.dayOfWeek, breakIndex)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-7 w-7 p-0 sm:hidden"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                                
                                {/* Container de Horários */}
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                  {/* Horário de Início */}
                                  <div className="flex items-center justify-between sm:flex-col sm:items-center">
                                    <label className="text-[#a1a1aa] text-xs font-medium sm:mb-1 min-w-[50px] sm:min-w-0">
                                      Início
                                    </label>
                                    <Select
                                      value={breakItem.startTime}
                                      onValueChange={(value) => updateBreak(schedule.dayOfWeek, breakIndex, 'startTime', value)}
                                    >
                                      <SelectTrigger className="bg-[#27272a] border-[#52525b] text-[#ededed] w-20 sm:w-24 h-7 sm:h-9 text-center font-mono focus:ring-[#10b981] focus:border-[#10b981] text-xs sm:text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-[#27272a] border-[#52525b] max-h-60">
                                        {generateTimeOptions().map((time) => (
                                          <SelectItem key={time} value={time} className="text-[#ededed] focus:bg-[#3f3f46] focus:text-[#ededed]">
                                            {time}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Separador "até" */}
                                  <div className="hidden sm:flex items-center justify-center">
                                    <span className="text-[#71717a] text-xs font-medium">até</span>
                                  </div>

                                  {/* Horário de Fim */}
                                  <div className="flex items-center justify-between sm:flex-col sm:items-center">
                                    <label className="text-[#a1a1aa] text-xs font-medium sm:mb-1 min-w-[50px] sm:min-w-0">
                                      Fim
                                    </label>
                                    <Select
                                      value={breakItem.endTime}
                                      onValueChange={(value) => updateBreak(schedule.dayOfWeek, breakIndex, 'endTime', value)}
                                    >
                                      <SelectTrigger className="bg-[#27272a] border-[#52525b] text-[#ededed] w-20 sm:w-24 h-7 sm:h-9 text-center font-mono focus:ring-[#10b981] focus:border-[#10b981] text-xs sm:text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-[#27272a] border-[#52525b] max-h-60">
                                        {generateTimeOptions().map((time) => (
                                          <SelectItem key={time} value={time} className="text-[#ededed] focus:bg-[#3f3f46] focus:text-[#ededed]">
                                            {time}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Botão Remover - Desktop */}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeBreak(schedule.dayOfWeek, breakIndex)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-7 w-7 p-0 hidden sm:flex"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Mensagem quando não há intervalos */}
                      {schedule.breaks.length === 0 && (
                        <div className="text-center py-3">
                          <p className="text-[#71717a] text-xs">
                            Nenhum intervalo configurado para este dia
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end mt-6">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#10b981] hover:bg-[#059669] text-white border-0 px-6 sm:px-8"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Horário Padrão
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
