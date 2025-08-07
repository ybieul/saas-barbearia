import { useState, useCallback, useRef, useEffect } from 'react'
import { logger } from '@/lib/logger'

interface ApiHookState<T> {
  data: T[]
  loading: boolean
  error: string | null
  lastFetch: string | null
}

interface ApiHookOptions {
  retryAttempts?: number
  retryDelay?: number
  timeout?: number
  autoRefresh?: number // ms para refresh automático
}

/**
 * Hook genérico melhorado para APIs com:
 * - Race condition protection
 * - Retry automático
 * - Timeout
 * - Auto-refresh
 * - Logging estruturado
 */
export function useApiData<T extends { id: string }>(
  endpoint: string,
  options: ApiHookOptions = {}
) {
  const {
    retryAttempts = 2,
    retryDelay = 1000,
    timeout = 10000,
    autoRefresh
  } = options

  const [state, setState] = useState<ApiHookState<T>>({
    data: [],
    loading: false,
    error: null,
    lastFetch: null
  })

  // Controle de race conditions
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Limpar timers e abortar requests ao desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current)
      }
    }
  }, [])

  // Configurar auto-refresh se especificado
  useEffect(() => {
    if (autoRefresh && autoRefresh > 0) {
      autoRefreshTimerRef.current = setInterval(() => {
        if (!state.loading) {
          logger.debug(`Auto-refresh executado para ${endpoint}`)
          fetchData()
        }
      }, autoRefresh)

      return () => {
        if (autoRefreshTimerRef.current) {
          clearInterval(autoRefreshTimerRef.current)
        }
      }
    }
  }, [autoRefresh, state.loading, endpoint])

  const fetchData = useCallback(async (params?: Record<string, any>) => {
    // Abortar request anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Criar novo controller para este request
    const controller = new AbortController()
    abortControllerRef.current = controller
    
    // ID único para este request
    const currentRequestId = ++requestIdRef.current

    setState(prev => ({ ...prev, loading: true, error: null }))

    logger.debug(`Iniciando fetch para ${endpoint}`, { params, requestId: currentRequestId })

    let attempts = 0
    while (attempts <= retryAttempts) {
      try {
        attempts++
        
        // Construir URL com parâmetros
        const url = new URL(endpoint, window.location.origin)
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              url.searchParams.append(key, String(value))
            }
          })
        }

        // Fazer request com timeout
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        )

        const fetchPromise = fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json'
          }
        })

        const response = await Promise.race([fetchPromise, timeoutPromise])

        // Verificar se este request ainda é o mais recente
        if (currentRequestId !== requestIdRef.current) {
          logger.debug(`Request ${currentRequestId} descartado (não é o mais recente)`)
          return
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        // Validar que retornou um array
        if (!Array.isArray(data)) {
          throw new Error('API retornou dados em formato inválido (esperado: array)')
        }

        setState({
          data,
          loading: false,
          error: null,
          lastFetch: new Date().toISOString()
        })

        logger.info(`Dados carregados com sucesso para ${endpoint}`, {
          count: data.length,
          requestId: currentRequestId,
          attempts
        })

        break // Sucesso, sair do loop de retry

      } catch (error) {
        // Se foi abortado, não tratar como erro
        if (error instanceof Error && error.name === 'AbortError') {
          logger.debug(`Request ${currentRequestId} abortado`)
          return
        }

        const errorMessage = error instanceof Error ? error.message : String(error)
        
        if (attempts > retryAttempts) {
          // Esgotar tentativas
          setState({
            data: [],
            loading: false,
            error: errorMessage,
            lastFetch: new Date().toISOString()
          })

          logger.error(`Falha definitiva no fetch de ${endpoint}`, {
            error: errorMessage,
            requestId: currentRequestId,
            totalAttempts: attempts,
            params
          })
        } else {
          // Aguardar antes de tentar novamente
          logger.warn(`Tentativa ${attempts} falhou para ${endpoint}, tentando novamente`, {
            error: errorMessage,
            requestId: currentRequestId
          })
          
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempts))
        }
      }
    }
  }, [endpoint, retryAttempts, retryDelay, timeout])

  // Criar item
  const createItem = useCallback(async (itemData: Omit<T, 'id'>): Promise<T | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const createdItem = await response.json()

      setState(prev => ({
        ...prev,
        data: [...prev.data, createdItem],
        loading: false,
        lastFetch: new Date().toISOString()
      }))

      logger.info(`Item criado com sucesso em ${endpoint}`, { id: createdItem.id })

      return createdItem

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setState(prev => ({ ...prev, loading: false, error: errorMessage }))
      
      logger.error(`Falha ao criar item em ${endpoint}`, { error: errorMessage, itemData })
      
      return null
    }
  }, [endpoint])

  // Atualizar item
  const updateItem = useCallback(async (id: string, updates: Partial<T>): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const response = await fetch(`${endpoint}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const updatedItem = await response.json()

      setState(prev => ({
        ...prev,
        data: prev.data.map(item => item.id === id ? { ...item, ...updatedItem } : item),
        loading: false,
        lastFetch: new Date().toISOString()
      }))

      logger.info(`Item atualizado com sucesso em ${endpoint}`, { id, updates })

      return true

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setState(prev => ({ ...prev, loading: false, error: errorMessage }))
      
      logger.error(`Falha ao atualizar item em ${endpoint}`, { error: errorMessage, id, updates })
      
      return false
    }
  }, [endpoint])

  // Deletar item
  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const response = await fetch(`${endpoint}/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      setState(prev => ({
        ...prev,
        data: prev.data.filter(item => item.id !== id),
        loading: false,
        lastFetch: new Date().toISOString()
      }))

      logger.info(`Item deletado com sucesso em ${endpoint}`, { id })

      return true

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setState(prev => ({ ...prev, loading: false, error: errorMessage }))
      
      logger.error(`Falha ao deletar item em ${endpoint}`, { error: errorMessage, id })
      
      return false
    }
  }, [endpoint])

  // Limpar erros
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Refresh manual
  const refresh = useCallback(() => {
    return fetchData()
  }, [fetchData])

  return {
    ...state,
    fetchData,
    createItem,
    updateItem,
    deleteItem,
    clearError,
    refresh
  }
}

// Hooks específicos usando o genérico
export function useAppointments(options?: ApiHookOptions) {
  return useApiData<any>('/api/appointments', options)
}

export function useProfessionals(options?: ApiHookOptions) {
  return useApiData<any>('/api/professionals', options)
}

export function useServices(options?: ApiHookOptions) {
  return useApiData<any>('/api/services', options)
}

export function useClients(options?: ApiHookOptions) {
  return useApiData<any>('/api/clients', options)
}
