// Tipos para gerenciamento de horários dos profissionais

export interface RecurringBreakData {
  startTime: string // Formato HH:MM
  endTime: string   // Formato HH:MM
}

export interface ProfessionalScheduleData {
  dayOfWeek: number
  startTime: string
  endTime: string
  breaks?: RecurringBreakData[] // Intervalos recorrentes (como almoço)
}

export interface CreateScheduleExceptionData {
  startDatetime: string | Date
  endDatetime: string | Date
  reason?: string
  type: 'BLOCK' | 'DAY_OFF'
}

export interface ScheduleExceptionData extends CreateScheduleExceptionData {
  id: string
  professionalId: string
  createdAt: Date
  updatedAt: Date
}

export interface AvailabilitySlot {
  time: string
  available: boolean
  reason?: string
}

export interface DayAvailability {
  date: string
  dayOfWeek: number
  professionalId?: string
  professionalName?: string
  workingHours: {
    startTime: string
    endTime: string
  } | null
  serviceDuration?: number // Duração do serviço solicitado
  slots: AvailabilitySlot[]
  totalSlots?: number // Total de slots disponíveis
  allSlotsStatus?: AvailabilitySlot[] // Todos os slots (para debug)
  recurringBreaks?: Array<{
    startTime: string
    endTime: string
  }>
  message?: string // Mensagem opcional (ex: "Profissional de folga")
}

export interface ConflictingAppointment {
  id: string
  dateTime: Date
  duration: number
  clientName: string
  serviceName: string
}
