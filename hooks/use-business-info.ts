'use client'

import { useState, useEffect } from 'react'

interface BusinessInfo {
  businessName: string
  email: string
  businessLogo: string | null
}

export function useBusinessInfo() {
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBusinessInfo()
  }, [])

  const fetchBusinessInfo = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }

      const response = await fetch('/api/business', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao buscar dados do estabelecimento')
      }

      const data = await response.json()
      
      setBusinessInfo({
        businessName: data.businessData?.name || '',
        email: data.businessData?.email || '',
        businessLogo: data.businessData?.logo || null,
      })
    } catch (err) {
      console.error('Erro ao buscar dados do estabelecimento:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return { businessInfo, loading, error, refetch: fetchBusinessInfo }
}
