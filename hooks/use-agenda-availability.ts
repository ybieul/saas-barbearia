import { useState, useCallback, useMemo } from 'react'
import { useProfessionalAvailability } from './use-schedule'

// Hook especializado para a agenda do dashboard
export function useAgendaAvailability() {
  const { getAvailableSlots, checkProfessionalWorksOnDate, isLoading, error } = useProfessionalAvailability()
  const [businessSlug, setBusinessSlug] = useState<string>('')

  // Obter slug do negócio (pode ser obtido do contexto/localStorage/API)
  const initializeBusinessSlug = useCallback(async () => {
    try {
      // Buscar configuração do tenant atual
      const token = localStorage.getItem('auth_token')
      if (!token) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Token não encontrado para inicializar business slug')
        }
        return
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Buscando business slug via API...')
      }

      const response = await fetch('/api/business', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        const customLink = data.businessData?.customLink || data.businessConfig?.customLink
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📡 Resposta da API /api/business:', data)
          console.log('🔗 Custom link encontrado:', customLink)
        }
        
        if (customLink) {
          setBusinessSlug(customLink)
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Business slug inicializado:', customLink)
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ customLink não encontrado nos dados do business')
          }
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Erro na resposta da API /api/business:', response.status, response.statusText)
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Erro ao obter business slug:', err)
      }
    }
  }, [])

  // Buscar slots disponíveis considerando regras do profissional
  const getProfessionalAvailableSlots = useCallback(async (
    professionalId: string,
    date: string,
    serviceDuration: number = 30
  ): Promise<{ slots: string[]; usedProfessionalRules: boolean; fallbackReason?: string }> => {
    // Se não temos business slug, não podemos usar a nova lógica
    if (!businessSlug) {
      return {
        slots: [],
        usedProfessionalRules: false,
        fallbackReason: 'Business slug não disponível'
      }
    }

    try {
      const slots = await getAvailableSlots(businessSlug, professionalId, date, serviceDuration)
      
      return {
        slots,
        usedProfessionalRules: true
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Erro ao buscar slots via professional rules, usando fallback:', err)
      }
      
      return {
        slots: [],
        usedProfessionalRules: false,
        fallbackReason: err instanceof Error ? err.message : 'Erro desconhecido'
      }
    }
  }, [businessSlug, getAvailableSlots])

  // Verificar se profissional trabalha na data
  const checkProfessionalSchedule = useCallback(async (
    professionalId: string,
    date: string
  ): Promise<{
    works: boolean
    reason?: string
    workingHours?: { startTime: string; endTime: string }
    usedProfessionalRules: boolean
  }> => {
    if (!businessSlug) {
      return {
        works: false,
        usedProfessionalRules: false,
        reason: 'Business slug não disponível'
      }
    }

    try {
      const result = await checkProfessionalWorksOnDate(businessSlug, professionalId, date)
      
      return {
        ...result,
        usedProfessionalRules: true
      }
    } catch (err) {
      return {
        works: false,
        usedProfessionalRules: false,
        reason: err instanceof Error ? err.message : 'Erro ao verificar horário do profissional'
      }
    }
  }, [businessSlug, checkProfessionalWorksOnDate])

  // Estado consolidado com debug
  const isReady = useMemo(() => {
    const ready = Boolean(businessSlug)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 useAgendaAvailability isReady check:', {
        businessSlug,
        isReady: ready,
        timestamp: new Date().toLocaleTimeString()
      })
    }
    return ready
  }, [businessSlug])

  return {
    // Funções principais
    getProfessionalAvailableSlots,
    checkProfessionalSchedule,
    
    // Configuração
    initializeBusinessSlug,
    
    // Estado
    isReady,
    isLoading,
    error,
    businessSlug
  }
}
