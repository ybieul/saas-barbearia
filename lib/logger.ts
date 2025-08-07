// Sistema de logging estruturado para debugging e monitoring
export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  userId?: string
  tenantId?: string
}

class Logger {
  private static instance: Logger
  private logs: LogEntry[] = []
  private maxLogs = 1000 // Manter apenas os últimos 1000 logs

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      userId: this.getCurrentUserId(),
      tenantId: this.getCurrentTenantId()
    }

    // Adicionar ao array de logs
    this.logs.push(entry)
    
    // Manter apenas os últimos N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Log no console com formatação
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : ''
    const prefix = `[${level.toUpperCase()}] ${entry.timestamp}`
    
    switch (level) {
      case 'error':
        console.error(`🚨 ${prefix} ${message}${contextStr}`)
        break
      case 'warn':
        console.warn(`⚠️ ${prefix} ${message}${contextStr}`)
        break
      case 'info':
        console.info(`ℹ️ ${prefix} ${message}${contextStr}`)
        break
      case 'debug':
        console.debug(`🔍 ${prefix} ${message}${contextStr}`)
        break
    }

    // Em produção, enviar erros críticos para serviço de monitoring
    if (level === 'error' && typeof window !== 'undefined') {
      this.reportToMonitoring(entry)
    }
  }

  private getCurrentUserId(): string | undefined {
    try {
      const user = localStorage.getItem('auth_user')
      return user ? JSON.parse(user).id : undefined
    } catch {
      return undefined
    }
  }

  private getCurrentTenantId(): string | undefined {
    try {
      const user = localStorage.getItem('auth_user')
      return user ? JSON.parse(user).tenantId : undefined
    } catch {
      return undefined
    }
  }

  private reportToMonitoring(entry: LogEntry) {
    // TODO: Integrar com serviço de monitoring (Sentry, LogRocket, etc.)
    // Por enquanto, apenas salvar no localStorage para debugging
    try {
      const errors = JSON.parse(localStorage.getItem('app_errors') || '[]')
      errors.push(entry)
      // Manter apenas os últimos 50 erros
      localStorage.setItem('app_errors', JSON.stringify(errors.slice(-50)))
    } catch {
      // Falha silenciosa para não quebrar a aplicação
    }
  }

  error(message: string, context?: Record<string, any>) {
    this.log('error', message, context)
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context)
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context)
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context)
  }

  // Método para capturar dados quando agendamentos "desaparecem"
  trackDataDisappearance(context: {
    component: string
    expectedCount: number
    actualCount: number
    filters?: Record<string, any>
    lastFetch?: string
  }) {
    this.error('Dados desapareceram da agenda', {
      type: 'DATA_DISAPPEARANCE',
      ...context
    })
  }

  // Método para rastrear race conditions
  trackRaceCondition(context: {
    component: string
    operation: string
    state?: Record<string, any>
  }) {
    this.warn('Possível race condition detectada', {
      type: 'RACE_CONDITION',
      ...context
    })
  }

  // Método para rastrear problemas de timezone
  trackTimezoneIssue(context: {
    utcTime: string
    brazilTime: string
    operation: string
    expectedResult?: any
    actualResult?: any
  }) {
    this.warn('Problema de timezone detectado', {
      type: 'TIMEZONE_ISSUE',
      ...context
    })
  }

  // Obter logs para debugging
  getLogs(level?: LogLevel, limit = 100): LogEntry[] {
    let filteredLogs = this.logs
    
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level)
    }
    
    return filteredLogs.slice(-limit)
  }

  // Limpar logs
  clearLogs() {
    this.logs = []
  }

  // Exportar logs para debugging
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }
}

// Instância singleton
export const logger = Logger.getInstance()

// Wrapper para capturar erros de Promise
export const withErrorTracking = async <T>(
  promise: Promise<T>,
  context: { operation: string; component: string }
): Promise<T> => {
  try {
    const result = await promise
    logger.debug(`Operação bem-sucedida: ${context.operation}`, context)
    return result
  } catch (error) {
    logger.error(`Falha na operação: ${context.operation}`, {
      ...context,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

// Hook para debugging em desenvolvimento
export const useLogger = () => {
  if (process.env.NODE_ENV === 'development') {
    // Expor logger no window para debugging
    if (typeof window !== 'undefined') {
      (window as any).appLogger = logger
    }
  }
  
  return logger
}
