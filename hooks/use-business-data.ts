"use client"

import { useState, useEffect } from 'react'

export interface BusinessData {
  name: string
  email: string
  phone: string
  address: string
  customLink: string
  logo?: string
  cnpj?: string
}

export function useBusinessData() {
  const [businessData, setBusinessData] = useState<BusinessData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    customLink: "",
    logo: "",
    cnpj: ""
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBusinessData = async () => {
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
      console.log('Dados do estabelecimento carregados:', data.businessData)
      setBusinessData(data.businessData || {
        name: "",
        email: "",
        phone: "",
        address: "",
        customLink: "",
        logo: "",
        cnpj: ""
      })
    } catch (err) {
      console.error('Erro ao buscar dados do estabelecimento:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const updateBusinessData = async (newBusinessData: Partial<BusinessData>) => {
    try {
      setSaving(true)
      setError(null)
      
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }

      const dataToUpdate = { ...businessData, ...newBusinessData }

      const response = await fetch('/api/business', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToUpdate),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao atualizar dados do estabelecimento')
      }

      const data = await response.json()
      console.log('Dados do estabelecimento atualizados:', data)
      
      // Atualizar estado local
      setBusinessData(dataToUpdate)
      
      return data
    } catch (err) {
      console.error('Erro ao atualizar dados do estabelecimento:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      throw err
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof BusinessData, value: string) => {
    setBusinessData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  useEffect(() => {
    fetchBusinessData()
  }, [])

  return {
    businessData,
    loading,
    saving,
    error,
    fetchBusinessData,
    updateBusinessData,
    updateField,
  }
}
