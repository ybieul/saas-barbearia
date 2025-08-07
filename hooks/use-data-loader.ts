import { useState, useCallback } from 'react'
import { logger, withErrorTracking } from '@/lib/logger'

export interface DataLoadingState {
  loading: boolean
  error: string | null
  lastFetch: string | null
}

interface LoadDataOptions {
  retryAttempts?: number
  retryDelay?: number
  timeout?: number
}

/**
 * Hook melhorado para carregamento de dados com:
 * - Retry automático
 * - Timeout
 * - Logging estruturado
 * - Tratamento de race conditions
 */
export function useDataLoader() {
  const [state, setState] = useState<DataLoadingState>({
    loading: false,
    error: null,
    lastFetch: null
  })

  const loadData = useCallback(async (
    operations: Array<{
      name: string
      operation: () => Promise<any>
      required?: boolean // Se true, falha bloqueia outras operações
    }>,
    options: LoadDataOptions = {}
  ) => {
    const {
      retryAttempts = 2,
      retryDelay = 1000,
      timeout = 10000
    } = options

    setState(prev => ({ ...prev, loading: true, error: null }))
    
    logger.info('Iniciando carregamento de dados', {
      operations: operations.map(op => op.name),
      options
    })

    try {
      const results: Record<string, any> = {}
      const errors: Record<string, string> = {}
      let criticalError: string | null = null

      // Executar operações com retry e timeout
      for (const { name, operation, required = false } of operations) {
        let attempts = 0
        let success = false

        while (attempts <= retryAttempts && !success) {
          try {
            attempts++
            
            logger.debug(`Executando operação: ${name} (tentativa ${attempts})`)
            
            // Aplicar timeout
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout: ${name}`)), timeout)
            )
            
            const result = await Promise.race([
              withErrorTracking(operation(), {
                operation: name,
                component: 'useDataLoader'
              }),
              timeoutPromise
            ])
            
            results[name] = result
            success = true
            
            logger.debug(`Operação ${name} concluída com sucesso`)
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            
            logger.warn(`Tentativa ${attempts} falhou para ${name}`, {
              error: errorMessage,
              willRetry: attempts <= retryAttempts
            })
            
            if (attempts > retryAttempts) {
              errors[name] = errorMessage
              
              if (required) {
                criticalError = `Falha crítica em ${name}: ${errorMessage}`
                logger.error(criticalError)
                break
              }
            } else {
              // Aguardar antes de tentar novamente
              await new Promise(resolve => setTimeout(resolve, retryDelay * attempts))
            }
          }
        }

        // Se houve erro crítico, parar execução
        if (criticalError) {
          break
        }
      }

      const now = new Date().toISOString()
      
      if (criticalError) {
        setState({
          loading: false,
          error: criticalError,
          lastFetch: now
        })
        return { success: false, error: criticalError, results: {} }
      }

      // Log de erros não-críticos
      if (Object.keys(errors).length > 0) {
        logger.warn('Algumas operações falharam (não-críticas)', { errors })
      }

      setState({
        loading: false,
        error: null,
        lastFetch: now
      })

      logger.info('Carregamento de dados concluído', {
        successfulOperations: Object.keys(results),
        failedOperations: Object.keys(errors),
        totalTime: `${Date.now() - new Date(now).getTime()}ms`
      })

      return {
        success: true,
        results,
        errors: Object.keys(errors).length > 0 ? errors : null
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      
      logger.error('Falha geral no carregamento de dados', {
        error: errorMessage
      })
      
      setState({
        loading: false,
        error: errorMessage,
        lastFetch: new Date().toISOString()
      })

      return {
        success: false,
        error: errorMessage,
        results: {}
      }
    }
  }, [])

  const retry = useCallback(() => {
    logger.info('Tentativa manual de retry solicitada')
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    loadData,
    retry
  }
}

/**
 * Função utilitária para executar operações paralelas com melhor controle
 */
export async function executeParallel<T extends Record<string, any>>(
  operations: {
    [K in keyof T]: () => Promise<T[K]>
  },
  options: {
    maxConcurrency?: number
    failFast?: boolean
    timeout?: number
  } = {}
): Promise<{
  results: Partial<T>
  errors: Partial<Record<keyof T, string>>
  success: boolean
}> {
  const {
    maxConcurrency = 5,
    failFast = false,
    timeout = 10000
  } = options

  const results: Partial<T> = {}
  const errors: Partial<Record<keyof T, string>> = {}
  
  const operationEntries = Object.entries(operations) as Array<[keyof T, () => Promise<T[keyof T]>]>
  
  // Dividir em batches se necessário
  const batches: typeof operationEntries[] = []
  for (let i = 0; i < operationEntries.length; i += maxConcurrency) {
    batches.push(operationEntries.slice(i, i + maxConcurrency))
  }

  logger.info('Executando operações paralelas', {
    totalOperations: operationEntries.length,
    batches: batches.length,
    maxConcurrency,
    failFast
  })

  for (const batch of batches) {
    const batchPromises = batch.map(async ([key, operation]) => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout para ${String(key)}`)), timeout)
        )
        
        const result = await Promise.race([
          operation(),
          timeoutPromise
        ])
        
        results[key] = result
        return { key, success: true }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        errors[key] = errorMessage
        
        logger.warn(`Operação ${String(key)} falhou`, { error: errorMessage })
        
        if (failFast) {
          throw error
        }
        
        return { key, success: false }
      }
    })

    try {
      await Promise.all(batchPromises)
    } catch (error) {
      if (failFast) {
        logger.error('Execução paralela abortada (fail-fast)', {
          error: error instanceof Error ? error.message : String(error)
        })
        break
      }
    }
  }

  const success = Object.keys(errors).length === 0
  
  logger.info('Execução paralela concluída', {
    successfulOperations: Object.keys(results).length,
    failedOperations: Object.keys(errors).length,
    success
  })

  return { results, errors, success }
}
