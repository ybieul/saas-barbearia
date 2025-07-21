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
      
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }
      
      const response = await fetch('/api/promotion-templates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
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

  const addTemplate = async (templateData: Omit<PromotionTemplate, 'id'>): Promise<boolean> => {
    try {
      setError(null)
      
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }
      
      const response = await fetch('/api/promotion-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(templateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao adicionar template')
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
      
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }
      
      const response = await fetch('/api/promotion-templates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id, ...updates }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao atualizar template')
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
      
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }
      
      const response = await fetch(`/api/promotion-templates?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao deletar template')
      }

      // Recarregar a lista de templates
      await fetchTemplates()
      return true
    } catch (err) {
      console.error('Erro ao deletar template:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      return false
    }
  }

  const getTemplate = (id: string): PromotionTemplate | undefined => {
    return templates.find(template => template.id === id)
  }

  // Carregar templates na inicialização
  useEffect(() => {
    if (typeof window !== 'undefined') {
      fetchTemplates()
    }
  }, [])

  return {
    templates,
    loading,
    error,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    fetchTemplates,
  }
}
