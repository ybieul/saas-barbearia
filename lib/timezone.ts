/**
 * 🇧🇷 Utilitário Central de Timezone para Brasil
 * 
 * Este arquivo centraliza toda a lógica de manipulação de datas e horários
 * garantindo que sempre usemos o timezone "America/Sao_Paulo" (GMT-3).
 * 
 * ⚠️ IMPORTANTE: Use sempre estas funções em vez de new Date() direto
 */

import { format, toZonedTime, fromZonedTime } from 'date-fns-tz'
import { addMinutes, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns'

// 🇧🇷 Timezone padrão do Brasil
export const BRAZIL_TIMEZONE = 'America/Sao_Paulo'

/**
 * 🔄 Converte uma data UTC para timezone brasileiro
 * Use quando receber dados do backend (que estão em UTC)
 */
export const utcToBrazil = (utcDate: Date | string): Date => {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
  return toZonedTime(date, BRAZIL_TIMEZONE)
}

/**
 * 🔄 Converte uma data local brasileira para UTC
 * Use quando enviar dados para o backend
 */
export const brazilToUtc = (localDate: Date): Date => {
  return fromZonedTime(localDate, BRAZIL_TIMEZONE)
}

/**
 * 📅 Cria uma data segura no timezone brasileiro
 * Use em vez de new Date(year, month, day, hour, minute)
 */
export const createBrazilDate = (
  year: number, 
  month: number, 
  day: number, 
  hour: number = 0, 
  minute: number = 0, 
  second: number = 0
): Date => {
  // Criar data local e garantir que está no timezone correto
  const localDate = new Date(year, month, day, hour, minute, second)
  return toZonedTime(localDate, BRAZIL_TIMEZONE)
}

/**
 * 📅 Converte string de data (YYYY-MM-DD) para Date brasileiro
 * Use para processar inputs de data do frontend
 */
export const parseDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number)
  return createBrazilDate(year, month - 1, day) // month é 0-indexado
}

/**
 * ⏰ Converte string de hora (HH:MM) para Date brasileiro na data especificada
 * Use para processar inputs de horário do frontend
 */
export const parseDateTime = (dateString: string, timeString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number)
  const [hour, minute] = timeString.split(':').map(Number)
  return createBrazilDate(year, month - 1, day, hour, minute)
}

/**
 * 🕒 Obtém o dia da semana no timezone brasileiro
 * Use em vez de date.getDay() para evitar problemas de UTC
 */
export const getBrazilDayOfWeek = (date: Date | string): number => {
  const brazilDate = typeof date === 'string' ? utcToBrazil(date) : utcToBrazil(date)
  return brazilDate.getDay() // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
}

/**
 * 🕒 Formata horário no padrão brasileiro (HH:MM)
 * Use para exibir horários para o usuário
 */
export const formatBrazilTime = (date: Date | string): string => {
  const brazilDate = typeof date === 'string' ? utcToBrazil(date) : utcToBrazil(date)
  return format(brazilDate, 'HH:mm', { timeZone: BRAZIL_TIMEZONE })
}

/**
 * 📅 Formata data no padrão brasileiro (DD/MM/YYYY)
 * Use para exibir datas para o usuário
 */
export const formatBrazilDate = (date: Date | string): string => {
  const brazilDate = typeof date === 'string' ? utcToBrazil(date) : utcToBrazil(date)
  return format(brazilDate, 'dd/MM/yyyy', { timeZone: BRAZIL_TIMEZONE })
}

/**
 * 📅 Formata data e hora completa no padrão brasileiro
 * Use para exibir timestamp completo para o usuário
 */
export const formatBrazilDateTime = (date: Date | string): string => {
  const brazilDate = typeof date === 'string' ? utcToBrazil(date) : utcToBrazil(date)
  return format(brazilDate, 'dd/MM/yyyy HH:mm', { timeZone: BRAZIL_TIMEZONE })
}

/**
 * 🌅 Obtém o início do dia no timezone brasileiro
 * Use para comparações de data (ignorando horário)
 */
export const getBrazilStartOfDay = (date: Date | string): Date => {
  const brazilDate = typeof date === 'string' ? utcToBrazil(date) : utcToBrazil(date)
  return startOfDay(brazilDate)
}

/**
 * 🌆 Obtém o fim do dia no timezone brasileiro
 * Use para comparações de data (ignorando horário)
 */
export const getBrazilEndOfDay = (date: Date | string): Date => {
  const brazilDate = typeof date === 'string' ? utcToBrazil(date) : utcToBrazil(date)
  return endOfDay(brazilDate)
}

/**
 * ⏰ Obtém a data/hora atual no timezone brasileiro
 * Use em vez de new Date() quando precisar da hora atual
 */
export const getBrazilNow = (): Date => {
  return utcToBrazil(new Date())
}

/**
 * 🔍 Verifica se uma data está no passado (timezone brasileiro)
 * Use para validações de agendamento
 */
export const isPastBrazilDate = (date: Date | string): boolean => {
  const brazilDate = typeof date === 'string' ? utcToBrazil(date) : utcToBrazil(date)
  const now = getBrazilNow()
  return isBefore(brazilDate, now)
}

/**
 * 🔍 Verifica se duas datas são do mesmo dia (timezone brasileiro)
 * Use para filtrar agendamentos por dia
 */
export const isSameBrazilDay = (date1: Date | string, date2: Date | string): boolean => {
  const brazil1 = getBrazilStartOfDay(date1)
  const brazil2 = getBrazilStartOfDay(date2)
  return brazil1.getTime() === brazil2.getTime()
}

/**
 * 🗓️ Obtém nome do dia da semana em português
 * Use para exibir dia da semana para o usuário
 */
export const getBrazilDayName = (date: Date | string): string => {
  const dayOfWeek = getBrazilDayOfWeek(date)
  const dayNames = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
  return dayNames[dayOfWeek]
}

/**
 * 🗓️ Obtém nome do dia da semana em inglês (para backend)
 * Use para buscar configurações de working hours
 */
export const getBrazilDayNameEn = (date: Date | string): string => {
  const dayOfWeek = getBrazilDayOfWeek(date)
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return dayNames[dayOfWeek]
}

/**
 * 🔧 Função de debug para desenvolvimento
 * Remove em produção
 */
export const debugTimezone = (date: Date | string, label: string = 'Debug') => {
  if (process.env.NODE_ENV === 'development') {
    const original = typeof date === 'string' ? new Date(date) : date
    const brazil = utcToBrazil(original)
    console.log(`🕒 ${label}:`, {
      original: original.toISOString(),
      brazil: brazil.toString(),
      brazilTime: formatBrazilTime(brazil),
      dayOfWeek: getBrazilDayOfWeek(brazil),
      dayName: getBrazilDayName(brazil)
    })
  }
}

/**
 * 📱 Converte para formato ISO mantendo timezone local (para inputs HTML)
 * Use para preencher campos de data/hora no frontend
 */
export const toBrazilISOString = (date: Date | string): string => {
  const brazilDate = typeof date === 'string' ? utcToBrazil(date) : utcToBrazil(date)
  return format(brazilDate, "yyyy-MM-dd'T'HH:mm", { timeZone: BRAZIL_TIMEZONE })
}

/**
 * 📱 Obtém apenas a parte da data (YYYY-MM-DD) no timezone brasileiro
 * Use para inputs type="date"
 */
export const toBrazilDateString = (date: Date | string): string => {
  const brazilDate = typeof date === 'string' ? utcToBrazil(date) : utcToBrazil(date)
  return format(brazilDate, 'yyyy-MM-dd', { timeZone: BRAZIL_TIMEZONE })
}

/**
 * 📱 Obtém apenas a parte do horário (HH:MM) no timezone brasileiro
 * Use para inputs type="time"
 */
export const toBrazilTimeString = (date: Date | string): string => {
  const brazilDate = typeof date === 'string' ? utcToBrazil(date) : utcToBrazil(date)
  return format(brazilDate, 'HH:mm', { timeZone: BRAZIL_TIMEZONE })
}
