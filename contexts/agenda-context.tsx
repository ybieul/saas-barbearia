'use client'

import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react'
import { logger } from '@/lib/logger'
import { useTimezone } from '@/hooks/use-timezone'
import { useDataLoader } from '@/hooks/use-data-loader'

// Types
export interface Appointment {
  id: string
  clientId: string
  professionalId: string
  serviceId: string
  datetime: string // UTC ISO string
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed'
  notes?: string
  client?: {
    id: string
    name: string
    phone: string
  }
  professional?: {
    id: string
    name: string
  }
  service?: {
    id: string
    name: string
    duration: number
    price: number
  }
}

export interface Professional {
  id: string
  name: string
  avatar?: string
  isActive: boolean
}

export interface Service {
  id: string
  name: string
  duration: number
  price: number
  isActive: boolean
}

export interface Client {
  id: string
  name: string
  phone: string
  email?: string
}

export interface AgendaState {
  // Dados
  appointments: Appointment[]
  professionals: Professional[]
  services: Service[]
  clients: Client[]
  
  // Estados de UI
  selectedDate: string // UTC ISO string
  selectedProfessional: string | null
  viewMode: 'day' | 'week' | 'month'
  
  // Estados de carregamento
  loading: {
    appointments: boolean
    professionals: boolean
    services: boolean
    clients: boolean
    global: boolean
  }
  
  // Controle de operações
  lastUpdate: string
  pendingOperations: Set<string>
  optimisticUpdates: Map<string, any>
  
  // Erros
  errors: {
    appointments: string | null
    professionals: string | null
    services: string | null
    clients: string | null
    global: string | null
  }
}

type AgendaAction = 
  | { type: 'SET_LOADING'; payload: { key: keyof AgendaState['loading']; value: boolean } }
  | { type: 'SET_ERROR'; payload: { key: keyof AgendaState['errors']; value: string | null } }
  | { type: 'SET_DATA'; payload: { key: 'appointments' | 'professionals' | 'services' | 'clients'; value: any[] } }
  | { type: 'SET_SELECTED_DATE'; payload: string }
  | { type: 'SET_SELECTED_PROFESSIONAL'; payload: string | null }
  | { type: 'SET_VIEW_MODE'; payload: 'day' | 'week' | 'month' }
  | { type: 'ADD_APPOINTMENT'; payload: Appointment }
  | { type: 'UPDATE_APPOINTMENT'; payload: { id: string; updates: Partial<Appointment> } }
  | { type: 'DELETE_APPOINTMENT'; payload: string }
  | { type: 'ADD_PENDING_OPERATION'; payload: string }
  | { type: 'REMOVE_PENDING_OPERATION'; payload: string }
  | { type: 'ADD_OPTIMISTIC_UPDATE'; payload: { id: string; data: any } }
  | { type: 'REMOVE_OPTIMISTIC_UPDATE'; payload: string }
  | { type: 'CLEAR_OPTIMISTIC_UPDATES' }
  | { type: 'RESET_STATE' }

// Reducer
function agendaReducer(state: AgendaState, action: AgendaAction): AgendaState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value,
          global: Object.values({
            ...state.loading,
            [action.payload.key]: action.payload.value
          }).some(loading => loading)
        }
      }
      
    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.key]: action.payload.value
        }
      }
      
    case 'SET_DATA':
      return {
        ...state,
        [action.payload.key]: action.payload.value,
        lastUpdate: new Date().toISOString()
      }
      
    case 'SET_SELECTED_DATE':
      return {
        ...state,
        selectedDate: action.payload
      }
      
    case 'SET_SELECTED_PROFESSIONAL':
      return {
        ...state,
        selectedProfessional: action.payload
      }
      
    case 'SET_VIEW_MODE':
      return {
        ...state,
        viewMode: action.payload
      }
      
    case 'ADD_APPOINTMENT':
      return {
        ...state,
        appointments: [...state.appointments, action.payload],
        lastUpdate: new Date().toISOString()
      }
      
    case 'UPDATE_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments.map(apt =>
          apt.id === action.payload.id 
            ? { ...apt, ...action.payload.updates }
            : apt
        ),
        lastUpdate: new Date().toISOString()
      }
      
    case 'DELETE_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments.filter(apt => apt.id !== action.payload),
        lastUpdate: new Date().toISOString()
      }
      
    case 'ADD_PENDING_OPERATION':
      return {
        ...state,
        pendingOperations: new Set([...state.pendingOperations, action.payload])
      }
      
    case 'REMOVE_PENDING_OPERATION':
      const newPendingOperations = new Set(state.pendingOperations)
      newPendingOperations.delete(action.payload)
      return {
        ...state,
        pendingOperations: newPendingOperations
      }
      
    case 'ADD_OPTIMISTIC_UPDATE':
      return {
        ...state,
        optimisticUpdates: new Map([...state.optimisticUpdates, [action.payload.id, action.payload.data]])
      }
      
    case 'REMOVE_OPTIMISTIC_UPDATE':
      const newOptimisticUpdates = new Map(state.optimisticUpdates)
      newOptimisticUpdates.delete(action.payload)
      return {
        ...state,
        optimisticUpdates: newOptimisticUpdates
      }
      
    case 'CLEAR_OPTIMISTIC_UPDATES':
      return {
        ...state,
        optimisticUpdates: new Map()
      }
      
    case 'RESET_STATE':
      return createInitialState()
      
    default:
      return state
  }
}

// Estado inicial
function createInitialState(): AgendaState {
  return {
    appointments: [],
    professionals: [],
    services: [],
    clients: [],
    selectedDate: new Date().toISOString(),
    selectedProfessional: null,
    viewMode: 'day',
    loading: {
      appointments: false,
      professionals: false,
      services: false,
      clients: false,
      global: false
    },
    errors: {
      appointments: null,
      professionals: null,
      services: null,
      clients: null,
      global: null
    },
    lastUpdate: new Date().toISOString(),
    pendingOperations: new Set(),
    optimisticUpdates: new Map()
  }
}

// Context
interface AgendaContextValue {
  state: AgendaState
  actions: {
    // Operações básicas
    setSelectedDate: (date: string) => void
    setSelectedProfessional: (id: string | null) => void
    setViewMode: (mode: 'day' | 'week' | 'month') => void
    
    // Carregamento de dados
    loadAllData: () => Promise<void>
    loadAppointments: (date?: string, professionalId?: string) => Promise<void>
    loadProfessionals: () => Promise<void>
    loadServices: () => Promise<void>
    loadClients: () => Promise<void>
    
    // Operações de agendamento
    createAppointment: (appointment: Omit<Appointment, 'id'>) => Promise<string | null>
    updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<boolean>
    deleteAppointment: (id: string) => Promise<boolean>
    
    // Utilitários
    refreshData: () => Promise<void>
    clearErrors: () => void
    resetState: () => void
    
    // Getters com memoização
    getAppointmentsByDate: (date: string) => Appointment[]
    getAppointmentsByProfessional: (professionalId: string) => Appointment[]
    getAvailableTimeSlots: (date: string, professionalId: string, serviceId: string) => string[]
  }
}

const AgendaContext = createContext<AgendaContextValue | null>(null)

// Provider
export function AgendaProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(agendaReducer, createInitialState())
  const { loadData } = useDataLoader()
  const { toUTC, convertDate, formatDate } = useTimezone()
  
  // Refs para controle de race conditions
  const operationIdRef = useRef(0)
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

  // Função para gerar ID único de operação
  const generateOperationId = useCallback((): string => {
    operationIdRef.current += 1
    return `op_${Date.now()}_${operationIdRef.current}`
  }, [])

  // Abortar operação anterior se necessário
  const abortPreviousOperation = useCallback((operationType: string) => {
    const controller = abortControllersRef.current.get(operationType)
    if (controller) {
      controller.abort()
      abortControllersRef.current.delete(operationType)
    }
  }, [])

  // Carregar todos os dados
  const loadAllData = useCallback(async () => {
    const operationId = generateOperationId()
    abortPreviousOperation('loadAll')
    
    const controller = new AbortController()
    abortControllersRef.current.set('loadAll', controller)
    
    dispatch({ type: 'ADD_PENDING_OPERATION', payload: operationId })
    
    logger.info('Iniciando carregamento completo de dados da agenda')

    try {
      const result = await loadData([
        {
          name: 'professionals',
          operation: async () => {
            const response = await fetch('/api/professionals', {
              signal: controller.signal
            })
            if (!response.ok) throw new Error('Falha ao carregar profissionais')
            return response.json()
          },
          required: true
        },
        {
          name: 'services',
          operation: async () => {
            const response = await fetch('/api/services', {
              signal: controller.signal
            })
            if (!response.ok) throw new Error('Falha ao carregar serviços')
            return response.json()
          },
          required: true
        },
        {
          name: 'clients',
          operation: async () => {
            const response = await fetch('/api/clients', {
              signal: controller.signal
            })
            if (!response.ok) throw new Error('Falha ao carregar clientes')
            return response.json()
          },
          required: false
        },
        {
          name: 'appointments',
          operation: async () => {
            const fromDate = convertDate(state.selectedDate)?.utc.toISOString()
            const response = await fetch(`/api/appointments?date=${fromDate}`, {
              signal: controller.signal
            })
            if (!response.ok) throw new Error('Falha ao carregar agendamentos')
            return response.json()
          },
          required: true
        }
      ], {
        retryAttempts: 2,
        timeout: 15000
      })

      if (result.success && result.results) {
        // Atualizar dados no estado
        Object.entries(result.results).forEach(([key, data]) => {
          dispatch({ type: 'SET_DATA', payload: { key: key as any, value: data } })
          dispatch({ type: 'SET_ERROR', payload: { key: key as any, value: null } })
        })
        
        logger.info('Dados da agenda carregados com sucesso', {
          loadedData: Object.keys(result.results)
        })
      } else {
        const error = result.error || 'Erro desconhecido no carregamento'
        dispatch({ type: 'SET_ERROR', payload: { key: 'global', value: error } })
        logger.error('Falha no carregamento de dados da agenda', { error })
      }
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.info('Carregamento de dados abortado')
        return
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      dispatch({ type: 'SET_ERROR', payload: { key: 'global', value: errorMessage } })
      
      logger.error('Erro no carregamento de dados da agenda', { error: errorMessage })
      
    } finally {
      dispatch({ type: 'REMOVE_PENDING_OPERATION', payload: operationId })
      abortControllersRef.current.delete('loadAll')
    }
  }, [state.selectedDate, loadData, generateOperationId, abortPreviousOperation, convertDate])

  // Carregar agendamentos específicos
  const loadAppointments = useCallback(async (date?: string, professionalId?: string) => {
    const operationId = generateOperationId()
    abortPreviousOperation('loadAppointments')
    
    const controller = new AbortController()
    abortControllersRef.current.set('loadAppointments', controller)
    
    dispatch({ type: 'SET_LOADING', payload: { key: 'appointments', value: true } })
    dispatch({ type: 'ADD_PENDING_OPERATION', payload: operationId })
    
    try {
      const targetDate = date || state.selectedDate
      const utcDate = convertDate(targetDate)?.utc.toISOString()
      
      const params = new URLSearchParams()
      if (utcDate) params.append('date', utcDate)
      if (professionalId) params.append('professionalId', professionalId)
      
      const response = await fetch(`/api/appointments?${params.toString()}`, {
        signal: controller.signal
      })
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }
      
      const appointments = await response.json()
      
      dispatch({ type: 'SET_DATA', payload: { key: 'appointments', value: appointments } })
      dispatch({ type: 'SET_ERROR', payload: { key: 'appointments', value: null } })
      
      logger.info('Agendamentos carregados', {
        count: appointments.length,
        date: targetDate,
        professionalId
      })
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar agendamentos'
      dispatch({ type: 'SET_ERROR', payload: { key: 'appointments', value: errorMessage } })
      
      logger.error('Erro ao carregar agendamentos', {
        error: errorMessage,
        date,
        professionalId
      })
      
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'appointments', value: false } })
      dispatch({ type: 'REMOVE_PENDING_OPERATION', payload: operationId })
      abortControllersRef.current.delete('loadAppointments')
    }
  }, [state.selectedDate, generateOperationId, abortPreviousOperation, convertDate])

  // Implementação dos demais métodos de carregamento seguindo o mesmo padrão...
  const loadProfessionals = useCallback(async () => {
    // Similar ao loadAppointments mas para profissionais
    // Implementação omitida por brevidade
  }, [])

  const loadServices = useCallback(async () => {
    // Similar ao loadAppointments mas para serviços
    // Implementação omitida por brevidade
  }, [])

  const loadClients = useCallback(async () => {
    // Similar ao loadAppointments mas para clientes
    // Implementação omitida por brevidade
  }, [])

  // Criar agendamento
  const createAppointment = useCallback(async (appointmentData: Omit<Appointment, 'id'>): Promise<string | null> => {
    const operationId = generateOperationId()
    const tempId = `temp_${Date.now()}`
    
    // Update otimista
    const optimisticAppointment: Appointment = {
      ...appointmentData,
      id: tempId,
      datetime: toUTC(appointmentData.datetime)?.toISOString() || appointmentData.datetime
    }
    
    dispatch({ type: 'ADD_OPTIMISTIC_UPDATE', payload: { id: tempId, data: optimisticAppointment } })
    dispatch({ type: 'ADD_APPOINTMENT', payload: optimisticAppointment })
    
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...appointmentData,
          datetime: toUTC(appointmentData.datetime)?.toISOString()
        })
      })
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }
      
      const createdAppointment = await response.json()
      
      // Remover update otimista e adicionar dados reais
      dispatch({ type: 'REMOVE_OPTIMISTIC_UPDATE', payload: tempId })
      dispatch({ type: 'DELETE_APPOINTMENT', payload: tempId })
      dispatch({ type: 'ADD_APPOINTMENT', payload: createdAppointment })
      
      logger.info('Agendamento criado com sucesso', {
        id: createdAppointment.id,
        datetime: createdAppointment.datetime
      })
      
      return createdAppointment.id
      
    } catch (error) {
      // Reverter update otimista
      dispatch({ type: 'REMOVE_OPTIMISTIC_UPDATE', payload: tempId })
      dispatch({ type: 'DELETE_APPOINTMENT', payload: tempId })
      
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar agendamento'
      logger.error('Falha ao criar agendamento', { error: errorMessage })
      
      return null
    }
  }, [generateOperationId, toUTC])

  // Função para limpar controladores ao desmontar
  useEffect(() => {
    return () => {
      abortControllersRef.current.forEach(controller => controller.abort())
      abortControllersRef.current.clear()
    }
  }, [])

  // Getters memoizados
  const getAppointmentsByDate = useCallback((date: string): Appointment[] => {
    const targetDate = convertDate(date)
    if (!targetDate) return []
    
    return state.appointments.filter(apt => {
      const aptDate = convertDate(apt.datetime)
      return aptDate && formatDate(aptDate.brazil, { format: 'date' }) === 
                      formatDate(targetDate.brazil, { format: 'date' })
    })
  }, [state.appointments, convertDate, formatDate])

  const contextValue: AgendaContextValue = {
    state,
    actions: {
      setSelectedDate: (date: string) => dispatch({ type: 'SET_SELECTED_DATE', payload: date }),
      setSelectedProfessional: (id: string | null) => dispatch({ type: 'SET_SELECTED_PROFESSIONAL', payload: id }),
      setViewMode: (mode: 'day' | 'week' | 'month') => dispatch({ type: 'SET_VIEW_MODE', payload: mode }),
      
      loadAllData,
      loadAppointments,
      loadProfessionals,
      loadServices,
      loadClients,
      
      createAppointment,
      updateAppointment: async () => false, // Implementar
      deleteAppointment: async () => false, // Implementar
      
      refreshData: loadAllData,
      clearErrors: () => {
        Object.keys(state.errors).forEach(key => {
          dispatch({ type: 'SET_ERROR', payload: { key: key as any, value: null } })
        })
      },
      resetState: () => dispatch({ type: 'RESET_STATE' }),
      
      getAppointmentsByDate,
      getAppointmentsByProfessional: () => [], // Implementar
      getAvailableTimeSlots: () => []         // Implementar
    }
  }

  return (
    <AgendaContext.Provider value={contextValue}>
      {children}
    </AgendaContext.Provider>
  )
}

// Hook para usar o contexto
export function useAgenda() {
  const context = useContext(AgendaContext)
  if (!context) {
    throw new Error('useAgenda deve ser usado dentro de AgendaProvider')
  }
  return context
}
