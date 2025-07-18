import { useState, useCallback } from 'react'

interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useApi<T>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null
  })

  const request = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers
        }
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.message || `Erro ${response.status}: ${response.statusText}`
        console.error('Erro na API:', { status: response.status, message: errorMessage, data })
        throw new Error(errorMessage)
      }

      setState(prev => ({ ...prev, data, loading: false }))
      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      console.error('Erro na requisição:', error)
      setState(prev => ({ ...prev, error: errorMessage, loading: false }))
      throw error // Propagar o erro para que possa ser tratado no componente
    }
  }, [])

  return { ...state, request }
}

// Hook específico para clientes (EndUsers)
export function useClients() {
  const { data, loading, error, request } = useApi<{ clients: any[] }>()

  const fetchClients = useCallback((isActive?: boolean) => {
    const params = isActive !== undefined ? `?isActive=${isActive}` : ''
    return request(`/api/clients${params}`)
  }, [request])

  const createClient = useCallback((clientData: {
    name: string
    email?: string
    phone: string
    dateOfBirth?: string
    preferences?: any
  }) => {
    return request('/api/clients', {
      method: 'POST',
      body: JSON.stringify(clientData)
    })
  }, [request])

  const updateClient = useCallback((clientData: {
    id: string
    name?: string
    email?: string
    phone?: string
    dateOfBirth?: string
    preferences?: any
    isActive?: boolean
  }) => {
    return request('/api/clients', {
      method: 'PUT',
      body: JSON.stringify(clientData)
    })
  }, [request])

  const deleteClient = useCallback((id: string) => {
    return request(`/api/clients?id=${id}`, {
      method: 'DELETE'
    })
  }, [request])

  return {
    clients: data?.clients || [],
    loading,
    error,
    fetchClients,
    createClient,
    updateClient,
    deleteClient
  }
}

// Hook específico para agendamentos
export function useAppointments() {
  const { data, loading, error, request } = useApi<{ appointments: any[] }>()

  const fetchAppointments = useCallback((date?: string, status?: string, professionalId?: string) => {
    const params = new URLSearchParams()
    if (date) params.append('date', date)
    if (status) params.append('status', status)
    if (professionalId) params.append('professionalId', professionalId)
    
    const queryString = params.toString()
    return request(`/api/appointments${queryString ? `?${queryString}` : ''}`)
  }, [request])

  const createAppointment = useCallback(async (appointmentData: {
    endUserId: string
    serviceId: string
    professionalId?: string
    dateTime: string
    notes?: string
  }) => {
    console.log('Criando agendamento:', appointmentData)
    
    try {
      const result = await request('/api/appointments', {
        method: 'POST',
        body: JSON.stringify(appointmentData)
      })
      
      if (result) {
        console.log('Agendamento criado com sucesso:', result)
      }
      
      return result
    } catch (error) {
      console.error('Erro ao criar agendamento:', error)
      throw error
    }
  }, [request])

  const updateAppointment = useCallback((appointmentData: {
    id: string
    endUserId?: string
    serviceId?: string
    professionalId?: string
    dateTime?: string
    status?: string
    notes?: string
    paymentMethod?: string
    paymentStatus?: string
  }) => {
    return request('/api/appointments', {
      method: 'PUT',
      body: JSON.stringify(appointmentData)
    })
  }, [request])

  const deleteAppointment = useCallback((id: string) => {
    return request(`/api/appointments?id=${id}`, {
      method: 'DELETE'
    })
  }, [request])

  return {
    appointments: data?.appointments || [],
    loading,
    error,
    fetchAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment
  }
}

// Hook específico para serviços
export function useServices() {
  const { data, loading, error, request } = useApi<{ services: any[] }>()

  const fetchServices = useCallback((isActive?: boolean, category?: string) => {
    const params = new URLSearchParams()
    if (isActive !== undefined) params.append('isActive', isActive.toString())
    if (category) params.append('category', category)
    
    const queryString = params.toString()
    return request(`/api/services${queryString ? `?${queryString}` : ''}`)
  }, [request])

  const createService = useCallback((serviceData: {
    name: string
    description?: string
    price: number
    duration: number
    category: string
    professionalIds?: string[]
  }) => {
    return request('/api/services', {
      method: 'POST',
      body: JSON.stringify(serviceData)
    })
  }, [request])

  const updateService = useCallback((serviceData: {
    id: string
    name?: string
    description?: string
    price?: number
    duration?: number
    category?: string
    professionalIds?: string[]
    isActive?: boolean
  }) => {
    return request('/api/services', {
      method: 'PUT',
      body: JSON.stringify(serviceData)
    })
  }, [request])

  const deleteService = useCallback((id: string) => {
    return request(`/api/services?id=${id}`, {
      method: 'DELETE'
    })
  }, [request])

  return {
    services: data?.services || [],
    loading,
    error,
    fetchServices,
    createService,
    updateService,
    deleteService
  }
}

// Hook específico para profissionais
export function useProfessionals() {
  const { data, loading, error, request } = useApi<{ professionals: any[] }>()

  const fetchProfessionals = useCallback((status?: string, specialty?: string) => {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (specialty) params.append('specialty', specialty)
    
    const queryString = params.toString()
    return request(`/api/professionals${queryString ? `?${queryString}` : ''}`)
  }, [request])

  const createProfessional = useCallback((professionalData: {
    name: string
    email?: string
    phone: string
    specialty: string
    commission?: number
    serviceIds?: string[]
    workingHours?: any
  }) => {
    return request('/api/professionals', {
      method: 'POST',
      body: JSON.stringify(professionalData)
    })
  }, [request])

  const updateProfessional = useCallback((professionalData: {
    id: string
    name?: string
    email?: string
    phone?: string
    specialty?: string
    commission?: number
    serviceIds?: string[]
    workingHours?: any
    isActive?: boolean
  }) => {
    return request('/api/professionals', {
      method: 'PUT',
      body: JSON.stringify(professionalData)
    })
  }, [request])

  const deleteProfessional = useCallback((id: string) => {
    return request(`/api/professionals?id=${id}`, {
      method: 'DELETE'
    })
  }, [request])

  return {
    professionals: data?.professionals || [],
    loading,
    error,
    fetchProfessionals,
    createProfessional,
    updateProfessional,
    deleteProfessional
  }
}

// Hook específico para registros financeiros
export function useFinancial() {
  const { data, loading, error, request } = useApi<{ financialRecords: any[] }>()

  const fetchFinancialRecords = useCallback((type?: string, startDate?: string, endDate?: string, category?: string) => {
    const params = new URLSearchParams()
    if (type) params.append('type', type)
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    if (category) params.append('category', category)
    
    const queryString = params.toString()
    return request(`/api/financial${queryString ? `?${queryString}` : ''}`)
  }, [request])

  const createFinancialRecord = useCallback((recordData: {
    type: 'INCOME' | 'EXPENSE'
    amount: number
    description: string
    category: string
    date?: string
    paymentMethod?: string
    appointmentId?: string
  }) => {
    return request('/api/financial', {
      method: 'POST',
      body: JSON.stringify(recordData)
    })
  }, [request])

  const updateFinancialRecord = useCallback((recordData: {
    id: string
    type?: 'INCOME' | 'EXPENSE'
    amount?: number
    description?: string
    category?: string
    date?: string
    paymentMethod?: string
    appointmentId?: string
  }) => {
    return request('/api/financial', {
      method: 'PUT',
      body: JSON.stringify(recordData)
    })
  }, [request])

  const deleteFinancialRecord = useCallback((id: string) => {
    return request(`/api/financial?id=${id}`, {
      method: 'DELETE'
    })
  }, [request])

  return {
    financialRecords: data?.financialRecords || [],
    loading,
    error,
    fetchFinancialRecords,
    createFinancialRecord,
    updateFinancialRecord,
    deleteFinancialRecord
  }
}

// Hook específico para dashboard
export function useDashboard() {
  const { data, loading, error, request } = useApi<{ data: any }>()

  const fetchDashboardData = useCallback((period = 'today') => {
    return request(`/api/dashboard?period=${period}`)
  }, [request])

  return {
    dashboardData: data?.data || null,
    loading,
    error,
    fetchDashboardData
  }
}
