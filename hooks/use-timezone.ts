import { useMemo, useCallback } from 'react'
import { logger } from '@/lib/logger'

// Timezone do Brasil (Brasília)
const BRAZIL_TIMEZONE = 'America/Sao_Paulo'
const UTC_TIMEZONE = 'UTC'

export interface TimezoneState {
  userTimezone: string
  serverTimezone: string
  offset: number // Diferença em minutos
  isDST: boolean // Horário de verão
}

export interface DateConversion {
  utc: Date
  local: Date
  brazil: Date
  display: string
  iso: string
}

/**
 * Hook para gerenciamento preciso de timezone
 * Foco especial em conversões UTC ↔ Brasil
 */
export function useTimezone() {
  
  // Detectar timezone do usuário
  const timezoneState = useMemo<TimezoneState>(() => {
    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const now = new Date()
      
      // Calcular offset do Brasil
      const brazilTime = new Date(now.toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE }))
      const utcTime = new Date(now.toLocaleString('en-US', { timeZone: UTC_TIMEZONE }))
      const offset = Math.round((brazilTime.getTime() - utcTime.getTime()) / (1000 * 60))
      
      // Verificar horário de verão
      const january = new Date(now.getFullYear(), 0, 1)
      const july = new Date(now.getFullYear(), 6, 1)
      const janOffset = Math.round((new Date(january.toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE })).getTime() - 
                                   new Date(january.toLocaleString('en-US', { timeZone: UTC_TIMEZONE })).getTime()) / (1000 * 60))
      const julOffset = Math.round((new Date(july.toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE })).getTime() - 
                                   new Date(july.toLocaleString('en-US', { timeZone: UTC_TIMEZONE })).getTime()) / (1000 * 60))
      
      const isDST = offset !== Math.max(janOffset, julOffset)
      
      logger.info('Timezone detectado', {
        userTimezone,
        brazilOffset: offset,
        isDST,
        currentTime: now.toISOString()
      })
      
      return {
        userTimezone,
        serverTimezone: BRAZIL_TIMEZONE,
        offset,
        isDST
      }
      
    } catch (error) {
      logger.error('Erro ao detectar timezone', { error })
      
      // Fallback para UTC-3 (Brasil sem horário de verão)
      return {
        userTimezone: 'UTC',
        serverTimezone: BRAZIL_TIMEZONE,
        offset: -180,
        isDST: false
      }
    }
  }, [])

  /**
   * Converter qualquer data para UTC garantindo precisão
   */
  const toUTC = useCallback((date: Date | string | null): Date | null => {
    if (!date) return null
    
    try {
      let sourceDate: Date
      
      if (typeof date === 'string') {
        // Se já tem timezone, usar como está
        if (date.includes('Z') || date.includes('+') || date.includes('T') && date.length > 19) {
          sourceDate = new Date(date)
        } else {
          // Assumir que é horário local do Brasil
          sourceDate = new Date(date + (date.includes('T') ? '' : 'T00:00:00'))
          
          // Ajustar para UTC considerando timezone do Brasil
          const brazilOffset = timezoneState.offset
          sourceDate.setMinutes(sourceDate.getMinutes() - brazilOffset)
        }
      } else {
        sourceDate = new Date(date)
      }
      
      const utcDate = new Date(sourceDate.toISOString())
      
      logger.debug('Conversão para UTC', {
        input: date,
        output: utcDate.toISOString(),
        inputType: typeof date
      })
      
      return utcDate
      
    } catch (error) {
      logger.error('Erro na conversão para UTC', {
        input: date,
        error: error instanceof Error ? error.message : String(error)
      })
      
      logger.trackTimezoneIssue({
        operation: 'toUTC',
        utcTime: 'N/A',
        brazilTime: String(date)
      })
      
      return null
    }
  }, [timezoneState.offset])

  /**
   * Converter UTC para horário do Brasil
   */
  const toBrazil = useCallback((utcDate: Date | string | null): Date | null => {
    if (!utcDate) return null
    
    try {
      const sourceDate = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
      
      if (isNaN(sourceDate.getTime())) {
        throw new Error('Data inválida')
      }
      
      // Converter usando o timezone do Brasil
      const brazilTime = new Date(sourceDate.toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE }))
      
      logger.debug('Conversão para Brasil', {
        input: sourceDate.toISOString(),
        output: brazilTime.toISOString(),
        offset: timezoneState.offset
      })
      
      return brazilTime
      
    } catch (error) {
      logger.error('Erro na conversão para Brasil', {
        input: utcDate,
        error: error instanceof Error ? error.message : String(error)
      })
      
      logger.trackTimezoneIssue({
        operation: 'toBrazil',
        utcTime: String(utcDate),
        brazilTime: 'N/A'
      })
      
      return null
    }
  }, [timezoneState.offset])

  /**
   * Criar objeto com todas as representações de uma data
   */
  const convertDate = useCallback((date: Date | string | null): DateConversion | null => {
    if (!date) return null
    
    try {
      const sourceDate = typeof date === 'string' ? new Date(date) : date
      
      if (isNaN(sourceDate.getTime())) {
        return null
      }
      
      const utc = toUTC(sourceDate)!
      const brazil = toBrazil(utc)!
      const local = new Date(sourceDate)
      
      // Formato de display amigável
      const display = brazil.toLocaleString('pt-BR', {
        timeZone: BRAZIL_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
      
      return {
        utc,
        local,
        brazil,
        display,
        iso: utc.toISOString()
      }
      
    } catch (error) {
      logger.error('Erro na conversão completa de data', {
        input: date,
        error: error instanceof Error ? error.message : String(error)
      })
      
      return null
    }
  }, [toUTC, toBrazil])

  /**
   * Formatar data para exibição considerando timezone
   */
  const formatDate = useCallback((
    date: Date | string | null,
    options: {
      timezone?: string
      format?: 'short' | 'long' | 'time' | 'date'
      locale?: string
    } = {}
  ): string => {
    if (!date) return ''
    
    const {
      timezone = BRAZIL_TIMEZONE,
      format = 'short',
      locale = 'pt-BR'
    } = options
    
    try {
      const sourceDate = typeof date === 'string' ? new Date(date) : date
      
      if (isNaN(sourceDate.getTime())) {
        return 'Data inválida'
      }
      
      const formatOptions: Intl.DateTimeFormatOptions = {
        timeZone: timezone
      }
      
      switch (format) {
        case 'short':
          formatOptions.year = 'numeric'
          formatOptions.month = '2-digit'
          formatOptions.day = '2-digit'
          formatOptions.hour = '2-digit'
          formatOptions.minute = '2-digit'
          break
          
        case 'long':
          formatOptions.weekday = 'long'
          formatOptions.year = 'numeric'
          formatOptions.month = 'long'
          formatOptions.day = 'numeric'
          formatOptions.hour = '2-digit'
          formatOptions.minute = '2-digit'
          break
          
        case 'time':
          formatOptions.hour = '2-digit'
          formatOptions.minute = '2-digit'
          break
          
        case 'date':
          formatOptions.year = 'numeric'
          formatOptions.month = '2-digit'
          formatOptions.day = '2-digit'
          break
      }
      
      return sourceDate.toLocaleString(locale, formatOptions)
      
    } catch (error) {
      logger.error('Erro na formatação de data', {
        input: date,
        options,
        error: error instanceof Error ? error.message : String(error)
      })
      
      return 'Erro na formatação'
    }
  }, [])

  /**
   * Verificar se uma data está no mesmo dia (considerando timezone)
   */
  const isSameDay = useCallback((date1: Date | string, date2: Date | string): boolean => {
    try {
      const d1 = convertDate(date1)
      const d2 = convertDate(date2)
      
      if (!d1 || !d2) return false
      
      return d1.brazil.toDateString() === d2.brazil.toDateString()
      
    } catch (error) {
      logger.error('Erro na comparação de datas', { date1, date2, error })
      return false
    }
  }, [convertDate])

  /**
   * Obter timestamp atual em UTC
   */
  const now = useCallback(() => {
    return new Date().toISOString()
  }, [])

  /**
   * Criar data específica do Brasil em UTC
   */
  const createBrazilDate = useCallback((
    year: number,
    month: number, // 1-12
    day: number,
    hour: number = 0,
    minute: number = 0,
    second: number = 0
  ): Date => {
    try {
      // Criar data no timezone do Brasil
      const brazilDateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`
      
      // Converter para UTC
      const utcDate = toUTC(brazilDateString)
      
      if (!utcDate) {
        throw new Error('Falha na conversão para UTC')
      }
      
      logger.debug('Data do Brasil criada', {
        input: { year, month, day, hour, minute, second },
        brazilString: brazilDateString,
        utc: utcDate.toISOString()
      })
      
      return utcDate
      
    } catch (error) {
      logger.error('Erro ao criar data do Brasil', {
        input: { year, month, day, hour, minute, second },
        error: error instanceof Error ? error.message : String(error)
      })
      
      // Fallback para data atual
      return new Date()
    }
  }, [toUTC])

  return {
    state: timezoneState,
    toUTC,
    toBrazil,
    convertDate,
    formatDate,
    isSameDay,
    now,
    createBrazilDate,
    
    // Constantes úteis
    BRAZIL_TIMEZONE,
    UTC_TIMEZONE
  }
}
