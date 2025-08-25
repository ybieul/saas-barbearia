"use client"

import { useState, useCallback } from "react"

export interface AutomationSettings {
  confirmationEnabled: boolean
  reminder24hEnabled: boolean
  reminder12hEnabled: boolean
  reminder2hEnabled: boolean
  reactivationEnabled: boolean
  reactivationDays: number
}

export function useAutomationSettings() {
  const [settings, setSettings] = useState<AutomationSettings>({
    confirmationEnabled: false,
    reminder24hEnabled: false,
    reminder12hEnabled: false,
    reminder2hEnabled: false,
    reactivationEnabled: false,
    reactivationDays: 45,
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log('📋 [Hook] Carregando configurações de automação...')
      
      const response = await fetch('/api/automation-settings')
      console.log('📋 [Hook] Response status:', response.status)
      
      if (response.ok) {
        const apiSettings = await response.json()
        console.log('📋 [Hook] Configurações carregadas:', apiSettings)
        
        const newSettings: AutomationSettings = {
          confirmationEnabled: apiSettings.confirmation?.isEnabled ?? false,
          reminder24hEnabled: apiSettings.reminder_24h?.isEnabled ?? false,
          reminder12hEnabled: apiSettings.reminder_12h?.isEnabled ?? false,
          reminder2hEnabled: apiSettings.reminder_2h?.isEnabled ?? false,
          reactivationEnabled: apiSettings.reactivation?.isEnabled ?? false,
          reactivationDays: 45,
        }
        
        setSettings(newSettings)
        console.log('✅ [Hook] Configurações aplicadas:', newSettings)
        return newSettings
      } else {
        const errorData = await response.text()
        console.error('❌ [Hook] Erro ao carregar configurações:', response.status, errorData)
        throw new Error(`Erro ${response.status}: ${errorData}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('❌ [Hook] Erro ao carregar configurações:', errorMessage)
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateSetting = useCallback(async (automationType: string, isEnabled: boolean) => {
    try {
      setError(null)
      console.log(`💾 [Hook] Salvando: ${automationType} = ${isEnabled}`)
      
      const response = await fetch('/api/automation-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          automationType,
          isEnabled,
        }),
      })

      console.log('💾 [Hook] Response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ [Hook] Configuração salva:', result)
        
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
            case 'reactivation':
              updated.reactivationEnabled = isEnabled
              break
          }
          console.log('🔄 [Hook] Estado atualizado:', updated)
          return updated
        })
        
        return true
      } else {
        const errorData = await response.text()
        console.error('❌ [Hook] Erro ao salvar:', response.status, errorData)
        throw new Error(`Erro ${response.status}: ${errorData}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('❌ [Hook] Erro ao salvar configuração:', errorMessage)
      setError(errorMessage)
      
      // Recarregar configurações em caso de erro
      await loadSettings()
      return false
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
