"use client"

import { useState, useCallback } from "react"

export interface AutomationSettings {
  confirmationEnabled: boolean
  reminder24hEnabled: boolean
  reminder12hEnabled: boolean
  reminder2hEnabled: boolean
  reminder1hEnabled: boolean
  reminder30minEnabled: boolean
  reactivationEnabled: boolean
  reactivationDays: number
}

export function useAutomationSettings() {
  const [settings, setSettings] = useState<AutomationSettings>({
    confirmationEnabled: false,
    reminder24hEnabled: false,
    reminder12hEnabled: false,
    reminder2hEnabled: false,
  reminder1hEnabled: false,
  reminder30minEnabled: false,
    reactivationEnabled: false,
    reactivationDays: 15,
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      if (process.env.NODE_ENV === 'development') {
        console.log('📋 [Hook] Carregando configurações de automação...')
      }
      
      // Obter token do localStorage
      const token = localStorage.getItem('auth_token')
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [Hook] Token encontrado:', token ? '✅ Sim' : '❌ Não')
      }

      const headers: Record<string, string> = {
        'Accept': 'application/json'
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch('/api/automation-settings', { headers })
      if (process.env.NODE_ENV === 'development') {
        console.log('📋 [Hook] Response status:', response.status)
      }
      
      if (response.ok) {
        const apiSettings = await response.json()
        if (process.env.NODE_ENV === 'development') {
          console.log('📋 [Hook] Configurações carregadas:', apiSettings)
        }
        
        const newSettings: AutomationSettings = {
          confirmationEnabled: apiSettings.confirmation?.isEnabled ?? false,
          reminder24hEnabled: apiSettings.reminder_24h?.isEnabled ?? false,
          reminder12hEnabled: apiSettings.reminder_12h?.isEnabled ?? false,
          reminder2hEnabled: apiSettings.reminder_2h?.isEnabled ?? false,
          reminder1hEnabled: apiSettings.reminder_1h?.isEnabled ?? false,
          reminder30minEnabled: apiSettings.reminder_30min?.isEnabled ?? false,
          reactivationEnabled: apiSettings.reactivation?.isEnabled ?? false,
          reactivationDays: 15,
        }
        
        setSettings(newSettings)
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [Hook] Configurações aplicadas:', newSettings)
        }
        return newSettings
      } else {
        const errorData = await response.text()
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ [Hook] Erro ao carregar configurações:', response.status, errorData)
        }
        throw new Error(`Erro ${response.status}: ${errorData}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [Hook] Erro ao carregar configurações:', errorMessage)
      }
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateSetting = useCallback(async (automationType: string, isEnabled: boolean): Promise<boolean> => {
    try {
      setError(null)
      if (process.env.NODE_ENV === 'development') {
        console.log(`💾 [Hook] Salvando: ${automationType} = ${isEnabled}`)
      }
      
      // Obter token do localStorage
      const token = localStorage.getItem('auth_token')
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [Hook] Token encontrado para save:', token ? '✅ Sim' : '❌ Não')
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch('/api/automation-settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          automationType,
          isEnabled,
        }),
      })

      if (process.env.NODE_ENV === 'development') {
        console.log('💾 [Hook] Response status:', response.status)
      }
      
      if (response.ok) {
        const result = await response.json()
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [Hook] Configuração salva:', result)
        }
        
        // Atualizar estado local
        setSettings(prev => {
          const updated = { ...prev }
          switch (automationType) {
            case 'confirmation':
              updated.confirmationEnabled = isEnabled
              break
            case 'reminder_24h':
              updated.reminder24hEnabled = isEnabled
              break
            case 'reminder_12h':
              updated.reminder12hEnabled = isEnabled
              break
            case 'reminder_2h':
              updated.reminder2hEnabled = isEnabled
              break
            case 'reminder_1h':
              updated.reminder1hEnabled = isEnabled
              break
            case 'reminder_30min':
              updated.reminder30minEnabled = isEnabled
              break
            case 'reactivation':
              updated.reactivationEnabled = isEnabled
              break
          }
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 [Hook] Estado atualizado:', updated)
          }
          return updated
        })
        
        return true // IMPORTANTE: retornar true quando sucesso
      } else {
        const errorData = await response.text()
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ [Hook] Erro ao salvar:', response.status, errorData)
        }
        throw new Error(`Erro ${response.status}: ${errorData}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [Hook] Erro ao salvar configuração:', errorMessage)
      }
      setError(errorMessage)
      
      // Recarregar configurações em caso de erro
      await loadSettings()
      return false // IMPORTANTE: retornar false quando erro
    }
  }, [loadSettings])

  return {
    settings,
    isLoading,
    error,
    loadSettings,
    updateSetting,
    clearError: () => setError(null)
  }
}
