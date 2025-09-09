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
      const token = localStorage.getItem('auth_token')
      
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
        if (process.env.NODE_ENV === 'development') {
          console.error('Erro na API:', { status: response.status, message: errorMessage, data })
        }
        throw new Error(errorMessage)
      }

      setState(prev => ({ ...prev, data, loading: false }))
      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro na requisição:', error)
      }
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
    const params = isActive !== undefined ? `?active=${isActive}` : ''
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

// Hook específico para clientes inativos
export function useInactiveClients() {
  const { data, loading, error, request } = useApi<{ 
    clients: any[],
    stats: {
      totalInactive: number
      totalPotentialRevenue: number
      averageTicket: number
      potentialRevenue: number
      promotionsSent: number
      returnRate: number
      daysThreshold: number
    }
  }>()

  const fetchInactiveClients = useCallback((daysThreshold?: number) => {
    const params = daysThreshold ? `?days=${daysThreshold}` : ''
    return request(`/api/clients/inactive${params}`)
  }, [request])

  return {
    clients: data?.clients || [],
    stats: data?.stats || {
      totalInactive: 0,
      totalPotentialRevenue: 0,
      averageTicket: 55,
      potentialRevenue: 0,
      promotionsSent: 0,
      returnRate: 0,
      daysThreshold: 15
    },
    loading,
    error,
    fetchInactiveClients
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

  // Novo: busca por intervalo de datas (from/to) e profissional
  const fetchAppointmentsRange = useCallback((from?: string, to?: string, professionalId?: string, status?: string) => {
    const params = new URLSearchParams()
    if (from) params.append('from', from)
    if (to) params.append('to', to)
    if (professionalId) params.append('professionalId', professionalId)
    if (status) params.append('status', status)

    const queryString = params.toString()
    return request(`/api/appointments${queryString ? `?${queryString}` : ''}`)
  }, [request])

  const createAppointment = useCallback(async (appointmentData: {
    endUserId: string
    services: string[] // ✅ CORREÇÃO: Aceitar array de serviços conforme backend espera
    professionalId?: string
    dateTime: string
    notes?: string
  }) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Criando agendamento:', appointmentData)
    }
    
    try {
      const result = await request('/api/appointments', {
        method: 'POST',
        body: JSON.stringify(appointmentData)
      })
      
      if (result) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Agendamento criado com sucesso:', result)
        }
      }
      
      return result
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao criar agendamento:', error)
      }
      throw error
    }
  }, [request])

  const updateAppointment = useCallback((appointmentData: {
    id: string
    endUserId?: string
    services?: string[] // ✅ CORREÇÃO: Aceitar array de serviços conforme backend espera
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
  fetchAppointmentsRange,
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
    // Por padrão, buscar apenas profissionais ativos
    if (status && status !== 'all') {
      params.append('status', status)
    } else if (!status) {
      params.append('status', 'active')
    }
    // Se status === 'all', não adiciona filtro de status
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
    avatar?: string | null
  }) => {
    return request('/api/professionals', {
      method: 'PUT',
      body: JSON.stringify(professionalData)
    })
  }, [request])

  const updateProfessionalAvatar = useCallback((professionalId: string, avatarBase64: string | null) => {
    return request('/api/professionals', {
      method: 'PUT',
      body: JSON.stringify({ 
        id: professionalId, 
        avatar: avatarBase64 
      })
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
    updateProfessionalAvatar,
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

// Hook específico para relatórios
export function useReports() {
  const { data, loading, error, request } = useApi<{ data: any }>()

  const fetchReports = useCallback((type = 'overview', month?: number, year?: number) => {
    const params = new URLSearchParams({ type })
    if (month) params.append('month', month.toString())
    if (year) params.append('year', year.toString())
    
    return request(`/api/reports?${params.toString()}`)
  }, [request])

  const fetchOverview = useCallback((month?: number, year?: number) => {
    return fetchReports('overview', month, year)
  }, [fetchReports])

  const fetchMonthlyPerformance = useCallback((year?: number) => {
    return fetchReports('monthly-performance', undefined, year)
  }, [fetchReports])

  const fetchServicesReport = useCallback((month?: number, year?: number) => {
    return fetchReports('services', month, year)
  }, [fetchReports])

  const fetchProfessionalsReport = useCallback((month?: number, year?: number) => {
    return fetchReports('professionals', month, year)
  }, [fetchReports])

  const fetchTimeAnalysis = useCallback((month?: number, year?: number) => {
    return fetchReports('time-analysis', month, year)
  }, [fetchReports])

  return {
    reportsData: data?.data || null,
    loading,
    error,
    fetchReports,
    fetchOverview,
    fetchMonthlyPerformance,
    fetchServicesReport,
    fetchProfessionalsReport,
    fetchTimeAnalysis
  }
}

// Hook específico para configurações do estabelecimento
export function useEstablishment() {
  const { data, loading, error, request } = useApi<{ businessData: any }>()

  const fetchEstablishment = useCallback(() => {
    return request('/api/business')
  }, [request])

  const updateEstablishment = useCallback((establishmentData: {
    id?: string
    name?: string
    openTime?: string
    closeTime?: string
    address?: string
    phone?: string
    workingDays?: string[]
  }) => {
    return request('/api/business', {
      method: 'PUT',
      body: JSON.stringify(establishmentData)
    })
  }, [request])

  return {
    establishment: data?.businessData || null,
    loading,
    error,
    fetchEstablishment,
    updateEstablishment
  }
}
