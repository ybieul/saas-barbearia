import { format, startOfDay, endOfDay, isWithinInterval, addMinutes, parseISO } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { prisma } from '@/lib/prisma'
import type { ConflictingAppointment } from '@/lib/types/schedule'

// Timezone padrão do sistema
export const SYSTEM_TIMEZONE = 'America/Sao_Paulo'

/**
 * Converte uma string de tempo "HH:MM" para minutos desde meia-noite
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Converte minutos desde meia-noite para string "HH:MM"
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Gera slots de tempo disponíveis baseado no horário de trabalho
 * Agora gera TODOS os slots de 5min independente da duração do serviço
 */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  slotDuration: number = 5, // Sempre 5 minutos por slot
  serviceDuration: number = 30 // Não usado mais na geração, apenas para compatibilidade
): string[] {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  const slots: string[] = []

  // ✅ CORRIGIDO: Gerar TODOS os slots de 5min, sem considerar duração do serviço
  for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDuration) {
    slots.push(minutesToTime(minutes))
  }

  return slots
}

/**
 * Nova função: Verifica se um slot pode iniciar um serviço da duração especificada
 */
export function canSlotAccommodateService(
  slotTime: string,
  serviceDuration: number,
  availableSlots: string[],
  endTime: string
): boolean {
  const slotMinutes = timeToMinutes(slotTime)
  const endMinutes = timeToMinutes(endTime)
  const slotsNeeded = Math.ceil(serviceDuration / 5) // Quantos slots de 5min são necessários
  
  // Verificar se há tempo suficiente até o fim do expediente
  if (slotMinutes + serviceDuration > endMinutes) {
    return false
  }
  
  // Verificar se todos os slots consecutivos necessários estão disponíveis
  for (let i = 0; i < slotsNeeded; i++) {
    const requiredSlotMinutes = slotMinutes + (i * 5)
    const requiredSlotTime = minutesToTime(requiredSlotMinutes)
    
    if (!availableSlots.includes(requiredSlotTime)) {
      return false
    }
  }
  
  return true
}

/**
 * Verifica se dois períodos de tempo se sobrepõem
 */
export function timePeriodsOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && end1 > start2
}

/**
 * Verifica se há agendamentos conflitantes para um profissional em um período
 */
export async function checkConflictingAppointments(
  professionalId: string,
  startDateTime: Date,
  endDateTime: Date,
  excludeAppointmentId?: string
): Promise<ConflictingAppointment[]> {
  const appointments = await prisma.appointment.findMany({
    where: {
      professionalId,
      status: {
        in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
      },
      ...(excludeAppointmentId && {
        id: { not: excludeAppointmentId }
      }),
      OR: [
        {
          // Agendamento que começa durante o período
          dateTime: {
            gte: startDateTime,
            lt: endDateTime
          }
        },
        {
          // Agendamento que termina durante o período
          AND: [
            { dateTime: { lt: startDateTime } },
            // Calcula o fim do agendamento (dateTime + duration)
            {
              dateTime: {
                gte: new Date(endDateTime.getTime() - 24 * 60 * 60 * 1000) // busca 24h antes para pegar agendamentos longos
              }
            }
          ]
        }
      ]
    },
    include: {
      endUser: {
        select: { name: true }
      },
      services: {
        select: { name: true }
      }
    }
  })

  // Filtra apenas os agendamentos que realmente se sobrepõem
  return appointments
    .filter(appointment => {
      const appointmentEnd = addMinutes(appointment.dateTime, appointment.duration)
      return timePeriodsOverlap(
        appointment.dateTime,
        appointmentEnd,
        startDateTime,
        endDateTime
      )
    })
    .map(appointment => ({
      id: appointment.id,
      dateTime: appointment.dateTime,
      duration: appointment.duration,
      clientName: appointment.endUser.name,
      serviceName: appointment.services.map(s => s.name).join(', ')
    }))
}

/**
 * Converte uma data/hora para o timezone do sistema
 */
export function toSystemTimezone(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return toZonedTime(dateObj, SYSTEM_TIMEZONE)
}

/**
 * Converte uma data/hora do timezone do sistema para UTC
 */
export function fromSystemTimezone(date: Date): Date {
  return fromZonedTime(date, SYSTEM_TIMEZONE)
}

/**
 * Valida se uma string de tempo está no formato HH:MM ou HH:MM:SS
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/
  return timeRegex.test(time)
}

/**
 * Normaliza tempo para formato HH:MM:SS
 */
export function normalizeTimeFormat(time: string): string {
  if (time.length === 5) { // HH:MM
    return time + ':00'
  }
  return time // Já está em HH:MM:SS
}

/**
 * Valida se startTime é menor que endTime
 */
export function isValidTimeRange(startTime: string, endTime: string): boolean {
  return timeToMinutes(startTime) < timeToMinutes(endTime)
}
