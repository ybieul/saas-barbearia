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

  const uploadLogo = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        reject(new Error('Arquivo deve ser uma imagem'))
        return
      }

      // Validar tamanho (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        reject(new Error('Imagem deve ter no máximo 2MB'))
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          // Redimensionar para 150x150px (menor para reduzir o tamanho)
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          canvas.width = 150
          canvas.height = 150
          
          // Calcular posição para centralizar a imagem
          const scale = Math.min(150 / img.width, 150 / img.height)
          const newWidth = img.width * scale
          const newHeight = img.height * scale
          const x = (150 - newWidth) / 2
          const y = (150 - newHeight) / 2
          
          if (ctx) {
            // Fundo branco
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, 150, 150)
            
            // Desenhar imagem redimensionada
            ctx.drawImage(img, x, y, newWidth, newHeight)
            
            // Converter para base64 com qualidade reduzida (0.6 ao invés de 0.8)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
            resolve(dataUrl)
          } else {
            reject(new Error('Erro ao processar imagem'))
          }
        }
        img.onerror = () => reject(new Error('Erro ao carregar imagem'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
      reader.readAsDataURL(file)
    })
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
    uploadLogo,
  }
}
