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
  // 🔍 DEBUG: Informações extras para diagnóstico em produção
  debug?: {
    existingAppointmentsCount: number
    totalGeneratedSlots: number
    slotsAfterBreaks: number
    allSlotsProcessed: number
    targetDateParsed: string
    businessInfo: {
      tenantId: string
      slug: string
    }
    queryResults?: {
      allAppointmentsForDay: Array<{
        id: string
        dateTime: string
        timeString: string
        duration: number
        status: string
        professionalId: string
        tenantId: string
        clientName?: string
        matchesProfessional: boolean
        matchesTenant: boolean
        statusMatches: boolean
      }>
      filteredAppointments: Array<{
        id: string
        dateTime: string
        duration: number
        status: string
        timeString: string
      }>
      criticalSlots: Array<{
        time: string
        available: boolean
        reason?: string
      }>
    }
  }
}

export interface ConflictingAppointment {
  id: string
  dateTime: Date
  duration: number
  clientName: string
  serviceName: string
}
