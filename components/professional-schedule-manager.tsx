import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useProfessionalSchedule, type DaySchedule } from "@/hooks/use-professional-schedule"
import { Clock, Plus, Trash2 } from "lucide-react"

interface ProfessionalScheduleManagerProps {
  professionalId: string
  professionalName?: string
}

export function ProfessionalScheduleManager({ professionalId, professionalName }: ProfessionalScheduleManagerProps) {
  const { toast } = useToast()
  
  // Usar o novo hook (igual ao useWorkingHours do estabelecimento)
  const { schedules, loading: isLoading, error, updateSchedules } = useProfessionalSchedule(professionalId)

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

  // Atualizar horário de um dia (igual ao handleWorkingHoursChange do estabelecimento)
  const handleScheduleChange = async (dayOfWeek: number, field: 'isActive' | 'startTime' | 'endTime', value: boolean | string) => {
    // Criar objeto atualizado (igual ao estabelecimento)
    const updatedSchedules = schedules.map(schedule => 
      schedule.dayOfWeek === dayOfWeek 
        ? { ...schedule, [field]: value }
        : schedule
    )

    // Validação para horários
    if (field === 'startTime' || field === 'endTime') {
      const currentSchedule = updatedSchedules.find(s => s.dayOfWeek === dayOfWeek)
      if (currentSchedule) {
        const startMinutes = parseInt(currentSchedule.startTime.split(':')[0]) * 60 + parseInt(currentSchedule.startTime.split(':')[1])
        const endMinutes = parseInt(currentSchedule.endTime.split(':')[0]) * 60 + parseInt(currentSchedule.endTime.split(':')[1])
        
        if (startMinutes >= endMinutes) {
          toast({
            title: "Horário inválido",
            description: "O horário de início deve ser anterior ao horário de fim.",
            variant: "destructive",
          })
          return
        }
      }
    }

    // Salvar usando o hook (igual ao updateWorkingHours do estabelecimento)
    try {
      await updateSchedules(updatedSchedules)
      
      toast({
        title: "Horário atualizado!",
        description: `O horário ${field === 'isActive' ? (value ? 'foi ativado' : 'foi desativado') : 'foi atualizado'} com sucesso.`,
        variant: "default"
      })
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar horário",
        description: "Ocorreu um erro ao salvar o horário. Tente novamente.",
        variant: "destructive"
      })
    }
  }

  // Adicionar novo intervalo (igual ao padrão do estabelecimento)
  const addBreak = async (dayOfWeek: number) => {
    const updatedSchedules = schedules.map(schedule => 
      schedule.dayOfWeek === dayOfWeek 
        ? { 
            ...schedule, 
            breaks: [...schedule.breaks, { startTime: '12:00', endTime: '13:00' }]
          }
        : schedule
    )
    
    // Salvar usando o hook
    try {
      await updateSchedules(updatedSchedules)
      
      toast({
        title: "Intervalo adicionado!",
        description: "O intervalo foi adicionado com sucesso.",
        variant: "default"
      })
    } catch (err: any) {
      toast({
        title: "Erro ao adicionar intervalo",
        description: "Ocorreu um erro ao adicionar o intervalo. Tente novamente.",
        variant: "destructive"
      })
    }
  }

  // Remover intervalo (igual ao padrão do estabelecimento)
  const removeBreak = async (dayOfWeek: number, breakIndex: number) => {
    const updatedSchedules = schedules.map(schedule => 
      schedule.dayOfWeek === dayOfWeek 
        ? { 
            ...schedule, 
            breaks: schedule.breaks.filter((_, index) => index !== breakIndex)
          }
        : schedule
    )
    
    // Salvar usando o hook
    try {
      await updateSchedules(updatedSchedules)
      
      toast({
        title: "Intervalo removido!",
        description: "O intervalo foi removido com sucesso.",
        variant: "default"
      })
    } catch (err: any) {
      toast({
        title: "Erro ao remover intervalo",
        description: "Ocorreu um erro ao remover o intervalo. Tente novamente.",
        variant: "destructive"
      })
    }
  }

  // Atualizar horário de um intervalo (igual ao padrão do estabelecimento)
  const updateBreak = async (dayOfWeek: number, breakIndex: number, field: 'startTime' | 'endTime', value: string) => {
    const updatedSchedules = schedules.map(schedule => 
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
    )

    // Validação do intervalo
    const currentSchedule = updatedSchedules.find(s => s.dayOfWeek === dayOfWeek)
    if (currentSchedule) {
      const currentBreak = currentSchedule.breaks[breakIndex]
      if (currentBreak) {
        const startMinutes = parseInt(currentBreak.startTime.split(':')[0]) * 60 + parseInt(currentBreak.startTime.split(':')[1])
        const endMinutes = parseInt(currentBreak.endTime.split(':')[0]) * 60 + parseInt(currentBreak.endTime.split(':')[1])
        
        if (startMinutes >= endMinutes) {
          toast({
            title: "Intervalo inválido",
            description: "O horário de início do intervalo deve ser anterior ao horário de fim.",
            variant: "destructive",
          })
          return
        }
      }
    }
    
    // Salvar usando o hook
    try {
      await updateSchedules(updatedSchedules)
      
      toast({
        title: "Intervalo atualizado!",
        description: "O intervalo foi atualizado com sucesso.",
        variant: "default"
      })
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar intervalo",
        description: "Ocorreu um erro ao atualizar o intervalo. Tente novamente.",
        variant: "destructive"
      })
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
                          onClick={(e) => {
                            e.preventDefault()
                            addBreak(schedule.dayOfWeek)
                          }}
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
                                    onClick={(e) => {
                                      e.preventDefault()
                                      removeBreak(schedule.dayOfWeek, breakIndex)
                                    }}
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
                                    onClick={(e) => {
                                      e.preventDefault()
                                      removeBreak(schedule.dayOfWeek, breakIndex)
                                    }}
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
      </CardContent>
    </Card>
  )
}
