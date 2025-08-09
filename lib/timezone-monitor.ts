/**
 * 🔍 SISTEMA DE MONITORAMENTO - TIMEZONE
 * =====================================
 * 
 * Sistema para detectar inconsistências e problemas de timezone
 */

import { parseDatabaseDateTime, toLocalISOString, extractTimeFromDateTime } from './timezone'

// 📊 Métricas de performance
interface TimezoneMetrics {
  parseOperations: number
  parseErrors: number
  averageParseTime: number
  lastError?: string
  inconsistenciesDetected: number
}

class TimezoneMonitor {
  private metrics: TimezoneMetrics = {
    parseOperations: 0,
    parseErrors: 0,
    averageParseTime: 0,
    inconsistenciesDetected: 0
  }

  private parseTimes: number[] = []

  /**
   * 🔍 Monitora operação de parse de database
   */
  monitorParse(dateTimeString: string): Date | null {
    const startTime = performance.now()
    
    try {
      this.metrics.parseOperations++
      
      // Validar se string parece problemática (UTC quando deveria ser local)
      if (this.detectPotentialUTCIssue(dateTimeString)) {
        this.metrics.inconsistenciesDetected++
        if (process.env.NODE_ENV === 'development') {
          console.warn('🚨 TIMEZONE MONITOR: Possível problema UTC detectado:', dateTimeString)
        }
      }
      
      const result = parseDatabaseDateTime(dateTimeString)
      
      // Calcular tempo de parse
      const parseTime = performance.now() - startTime
      this.parseTimes.push(parseTime)
      
      // Manter apenas últimas 1000 medições
      if (this.parseTimes.length > 1000) {
        this.parseTimes.shift()
      }
      
      // Atualizar média
      this.metrics.averageParseTime = this.parseTimes.reduce((a, b) => a + b, 0) / this.parseTimes.length
      
      return result
      
    } catch (error) {
      this.metrics.parseErrors++
      this.metrics.lastError = error instanceof Error ? error.message : 'Erro desconhecido'
      
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ TIMEZONE MONITOR: Erro no parse:', error)
      }
      return null
    }
  }

  /**
   * 🔍 Detecta possíveis problemas de UTC
   */
  private detectPotentialUTCIssue(dateTimeString: string): boolean {
    // Verificar se parece que foi convertido para UTC incorretamente
    if (dateTimeString.includes('Z')) {
      const withoutZ = dateTimeString.replace('Z', '')
      const parsed = new Date(withoutZ)
      const utcParsed = new Date(dateTimeString)
      
      // Se há diferença significativa, pode ser problema UTC
      const timeDiff = Math.abs(parsed.getTime() - utcParsed.getTime())
      return timeDiff > 0 // Qualquer diferença é suspeita
    }
    
    return false
  }

  /**
   * 🔍 Valida consistência entre frontend e backend
   */
  validateConsistency(frontendDate: Date, backendDateString: string): {
    isConsistent: boolean
    timeDifference: number
    frontendTime: string
    backendTime: string
  } {
    const backendDate = parseDatabaseDateTime(backendDateString)
    const timeDifference = Math.abs(frontendDate.getTime() - backendDate.getTime())
    
    const frontendTime = extractTimeFromDateTime(toLocalISOString(frontendDate))
    const backendTime = extractTimeFromDateTime(backendDateString)
    
    const isConsistent = timeDifference < 1000 // Menos de 1 segundo de diferença
    
    if (!isConsistent) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('🚨 TIMEZONE MONITOR: Inconsistência detectada:', {
          frontendTime,
          backendTime,
          timeDifference: `${timeDifference}ms`
        })
      }
      
      this.metrics.inconsistenciesDetected++
    }
    
    return {
      isConsistent,
      timeDifference,
      frontendTime,
      backendTime
    }
  }

  /**
   * 📊 Obter métricas atuais
   */
  getMetrics(): TimezoneMetrics {
    return { ...this.metrics }
  }

  /**
   * 🧹 Reset das métricas
   */
  resetMetrics(): void {
    this.metrics = {
      parseOperations: 0,
      parseErrors: 0,
      averageParseTime: 0,
      inconsistenciesDetected: 0
    }
    this.parseTimes = []
  }

  /**
   * 📈 Gerar relatório de saúde
   */
  generateHealthReport(): {
    status: 'healthy' | 'warning' | 'critical'
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []
    
    // Verificar taxa de erro
    const errorRate = this.metrics.parseErrors / this.metrics.parseOperations
    if (errorRate > 0.01) { // Mais de 1% de erro
      issues.push(`Taxa de erro alta: ${(errorRate * 100).toFixed(2)}%`)
      recommendations.push('Investigar strings de data malformadas')
    }
    
    // Verificar performance
    if (this.metrics.averageParseTime > 5) { // Mais de 5ms por parse
      issues.push(`Performance lenta: ${this.metrics.averageParseTime.toFixed(2)}ms por parse`)
      recommendations.push('Otimizar função de parse ou reduzir volume')
    }
    
    // Verificar inconsistências
    if (this.metrics.inconsistenciesDetected > 0) {
      issues.push(`Inconsistências detectadas: ${this.metrics.inconsistenciesDetected}`)
      recommendations.push('Verificar se ainda há código usando toISOString() incorretamente')
    }
    
    // Determinar status geral
    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (issues.length > 0) {
      status = errorRate > 0.05 || this.metrics.inconsistenciesDetected > 10 ? 'critical' : 'warning'
    }
    
    return { status, issues, recommendations }
  }
}

// 🌍 Instância global do monitor
export const timezoneMonitor = new TimezoneMonitor()

/**
 * 🔧 Função wrapper para monitorar parseDatabaseDateTime
 */
export function monitoredParseDatabaseDateTime(dateTimeString: string): Date {
  const result = timezoneMonitor.monitorParse(dateTimeString)
  return result || new Date() // Fallback seguro
}

/**
 * 🔧 Função para validar agendamento antes de salvar
 */
export function validateAppointmentDateTime(
  selectedDate: string, 
  selectedTime: string
): {
  isValid: boolean
  dateTime: Date | null
  issues: string[]
} {
  const issues: string[] = []
  
  try {
    // Criar data
    const [year, month, day] = selectedDate.split('-').map(Number)
    const [hours, minutes] = selectedTime.split(':').map(Number)
    
    // Validações básicas
    if (year < 2025 || year > 2030) {
      issues.push('Ano inválido')
    }
    
    if (month < 1 || month > 12) {
      issues.push('Mês inválido')
    }
    
    if (day < 1 || day > 31) {
      issues.push('Dia inválido')
    }
    
    if (hours < 0 || hours > 23) {
      issues.push('Hora inválida')
    }
    
    if (minutes < 0 || minutes > 59) {
      issues.push('Minuto inválido')
    }
    
    if (issues.length > 0) {
      return { isValid: false, dateTime: null, issues }
    }
    
    const dateTime = new Date(year, month - 1, day, hours, minutes, 0, 0)
    
    // Validar se é uma data válida
    if (isNaN(dateTime.getTime())) {
      issues.push('Data inválida')
      return { isValid: false, dateTime: null, issues }
    }
    
    // Validar se não é muito no passado
    const now = new Date()
    const daysDiff = (dateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysDiff < -365) { // Mais de 1 ano no passado
      issues.push('Data muito antiga (mais de 1 ano no passado)')
    }
    
    if (daysDiff > 365) { // Mais de 1 ano no futuro
      issues.push('Data muito distante (mais de 1 ano no futuro)')
    }
    
    return {
      isValid: issues.length === 0,
      dateTime,
      issues
    }
    
  } catch (error) {
    return {
      isValid: false,
      dateTime: null,
      issues: ['Erro ao processar data/hora']
    }
  }
}

// 🎯 Exportar funções para uso em APIs
export function logTimezoneMetrics(): void {
  const metrics = timezoneMonitor.getMetrics()
  const health = timezoneMonitor.generateHealthReport()
  
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 TIMEZONE METRICS:', {
      metrics,
      health
    })
  }
}

// 🔄 Auto-log a cada 5 minutos em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  setInterval(logTimezoneMetrics, 5 * 60 * 1000)
}
