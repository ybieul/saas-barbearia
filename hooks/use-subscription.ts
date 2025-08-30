"use client"

import { useState, useEffect } from 'react'
import { useAuth } from './use-auth'

export interface SubscriptionInfo {
  isActive: boolean
  plan: string
  isExpired: boolean
  daysUntilExpiry?: number
  canAccessFeature: (feature: string) => boolean
}

export interface PlanLimits {
  clients: { current: number; limit: number; allowed: boolean }
  appointments: { current: number; limit: number; allowed: boolean }
  services: { current: number; limit: number; allowed: boolean }
  professionals: { current: number; limit: number; allowed: boolean }
}

export function useSubscription() {
  const { user } = useAuth()
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null)
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Buscar informações da assinatura
  const fetchSubscriptionInfo = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const response = await fetch('/api/subscription/info')
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription info')
      }
      
      const data = await response.json()
      setSubscriptionInfo(data)
      setError(null)
    } catch (err) {
      console.error('Erro ao buscar informações da assinatura:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  // Buscar limites do plano
  const fetchPlanLimits = async () => {
    if (!user?.id) return

    try {
      const response = await fetch('/api/subscription/limits')
      
      if (!response.ok) {
        throw new Error('Failed to fetch plan limits')
      }
      
      const data = await response.json()
      setPlanLimits(data)
    } catch (err) {
      console.error('Erro ao buscar limites do plano:', err)
    }
  }

  // Verificar se pode acessar uma funcionalidade
  const canAccessFeature = (feature: string): boolean => {
    if (!subscriptionInfo) return false
    return subscriptionInfo.canAccessFeature(feature)
  }

  // Verificar se pode criar mais recursos
  const canCreateMore = (resource: keyof PlanLimits): boolean => {
    if (!planLimits) return false
    return planLimits[resource].allowed
  }

  // Obter informações de uso de um recurso
  const getResourceUsage = (resource: keyof PlanLimits) => {
    if (!planLimits) return null
    return planLimits[resource]
  }

  // Verificar se está próximo do limite
  const isNearLimit = (resource: keyof PlanLimits, threshold = 0.8): boolean => {
    if (!planLimits) return false
    const usage = planLimits[resource]
    if (usage.limit === -1) return false // Ilimitado
    return usage.current / usage.limit >= threshold
  }

  // Obter informações do plano atual
  const getPlanInfo = () => {
    if (!subscriptionInfo) return null
    
    return {
      name: subscriptionInfo.plan,
      isActive: subscriptionInfo.isActive,
      isExpired: subscriptionInfo.isExpired,
      daysUntilExpiry: subscriptionInfo.daysUntilExpiry,
      needsUpgrade: subscriptionInfo.plan === 'FREE'
    }
  }

  // Atualizar dados
  const refresh = async () => {
    await Promise.all([
      fetchSubscriptionInfo(),
      fetchPlanLimits()
    ])
  }

  useEffect(() => {
    if (user?.id) {
      refresh()
    }
  }, [user?.id])

  return {
    subscriptionInfo,
    planLimits,
    loading,
    error,
    canAccessFeature,
    canCreateMore,
    getResourceUsage,
    isNearLimit,
    getPlanInfo,
    refresh
  }
}
