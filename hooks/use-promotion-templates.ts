"use client"

import { useState, useEffect } from 'react'

export interface PromotionTemplate {
  id: string
  name: string
  title: string
  message: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export function usePromotionTemplates() {
  const [templates, setTemplates] = useState<PromotionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Gerar ou recuperar ID único do usuário
      let userId = typeof window !== 'undefined' ? localStorage.getItem('barbershop-user-id') : null
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        if (typeof window !== 'undefined') {
          localStorage.setItem('barbershop-user-id', userId)
        }
      }
      
      const response = await fetch('/api/promotion-templates', {
        headers: {
          'x-user-id': userId
        }
      })
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (err) {
      console.error('Erro ao buscar templates:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  const addTemplate = async (templateData: Omit<PromotionTemplate, 'id'>): Promise<boolean> => {
    try {
      setError(null)
      
      // Obter ID do usuário do localStorage
      let userId = typeof window !== 'undefined' ? localStorage.getItem('barbershop-user-id') : null
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        if (typeof window !== 'undefined') {
          localStorage.setItem('barbershop-user-id', userId)
        }
      }
      
      const response = await fetch('/api/promotion-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify(templateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao adicionar template')
      }

      // Recarregar a lista de templates
      await fetchTemplates()
      return true
    } catch (err) {
      console.error('Erro ao adicionar template:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      return false
    }
  }

  const updateTemplate = async (id: string, updates: Partial<PromotionTemplate>): Promise<boolean> => {
    try {
      setError(null)
      
      // Obter ID do usuário do localStorage
      let userId = typeof window !== 'undefined' ? localStorage.getItem('barbershop-user-id') : null
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        if (typeof window !== 'undefined') {
          localStorage.setItem('barbershop-user-id', userId)
        }
      }
      
      const response = await fetch('/api/promotion-templates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ id, ...updates }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar template')
      }

      // Recarregar a lista de templates
      await fetchTemplates()
      return true
    } catch (err) {
      console.error('Erro ao atualizar template:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      return false
    }
  }

  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      setError(null)
      
      // Obter ID do usuário do localStorage
      let userId = typeof window !== 'undefined' ? localStorage.getItem('barbershop-user-id') : null
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        if (typeof window !== 'undefined') {
          localStorage.setItem('barbershop-user-id', userId)
        }
      }
      
      const response = await fetch(`/api/promotion-templates?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': userId
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao remover template')
      }

      // Recarregar a lista de templates
      await fetchTemplates()
      return true
    } catch (err) {
      console.error('Erro ao remover template:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      return false
    }
  }

  const getTemplate = (id: string): PromotionTemplate | undefined => {
    return templates.find(template => template.id === id)
  }

  return {
    templates,
    loading,
    error,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    refreshTemplates: fetchTemplates
  }
}
