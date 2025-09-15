import { useState, useEffect } from 'react'

interface Service {
  id: string
  name: string
  description?: string
  price: number
  duration: number
  category?: string
  image?: string | null
  isActive: boolean
  isVisibleOnPublicPage?: boolean
  createdAt: string
  updatedAt: string
}

interface UseServicesReturn {
  services: Service[]
  loading: boolean
  error: string | null
  createService: (data: Omit<Service, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>) => Promise<Service | null>
  updateService: (data: { id: string } & Partial<Service>) => Promise<Service | null>
  updateServiceImage: (serviceId: string, imageBase64: string | null) => Promise<Service | null>
  deleteService: (id: string) => Promise<Service | null>
  fetchServices: () => Promise<void>
}

export function useServices(): UseServicesReturn {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchServicesInternal = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('auth_token')
      
      const response = await fetch('/api/services?active=true', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        }
      })
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setServices(data.services || [])
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao buscar serviços:', err)
      }
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const createService = async (serviceData: Omit<Service, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>): Promise<Service | null> => {
    try {
      setError(null)
      
      const token = localStorage.getItem('auth_token')
      
  const response = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
  body: JSON.stringify(serviceData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erro ${response.status}`)
      }
      
      const data = await response.json()
      setServices(prev => [data.service, ...prev])
      return data.service
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao adicionar serviço:', err)
      }
      setError(err instanceof Error ? err.message : 'Erro ao adicionar serviço')
      return null
    }
  }

  const updateService = async (serviceData: { id: string } & Partial<Service>): Promise<Service | null> => {
    try {
      setError(null)
      
      const token = localStorage.getItem('auth_token')
      
      const response = await fetch('/api/services', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(serviceData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erro ${response.status}`)
      }
      
      const data = await response.json()
      setServices(prev => 
        prev.map(s => s.id === serviceData.id ? data.service : s)
      )
      return data.service
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao atualizar serviço:', err)
      }
      setError(err instanceof Error ? err.message : 'Erro ao atualizar serviço')
      return null
    }
  }

  const updateServiceImage = async (serviceId: string, imageBase64: string | null): Promise<Service | null> => {
    try {
      setError(null)
      
      const token = localStorage.getItem('auth_token')
      
      const response = await fetch('/api/services', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ 
          id: serviceId, 
          image: imageBase64 
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erro ${response.status}`)
      }
      
      const data = await response.json()
      setServices(prev => 
        prev.map(s => s.id === serviceId ? data.service : s)
      )
      return data.service
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao atualizar imagem do serviço:', err)
      }
      setError(err instanceof Error ? err.message : 'Erro ao atualizar imagem')
      throw err // Re-throw para que o componente possa lidar com o erro
    }
  }

  const deleteService = async (id: string): Promise<Service | null> => {
    try {
      setError(null)
      
      const token = localStorage.getItem('auth_token')
      
      const response = await fetch(`/api/services?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erro ${response.status}`)
      }
      
      const data = await response.json()
      setServices(prev => prev.filter(s => s.id !== id))
      return data.service || null
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao remover serviço:', err)
      }
      setError(err instanceof Error ? err.message : 'Erro ao remover serviço')
      return null
    }
  }

  const fetchServices = async () => {
    await fetchServicesInternal()
  }

  useEffect(() => {
    fetchServicesInternal()
  }, [])

  return {
    services,
    loading,
    error,
    createService,
    updateService,
    updateServiceImage,
    deleteService,
    fetchServices,
  }
}
