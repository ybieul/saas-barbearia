import { useState, useCallback, useEffect } from 'react'

export interface PackageServiceItem {
  serviceId: string
  quantity: number
  service?: { id: string; name: string; price?: number; duration?: number }
}

export interface ServicePackageDto {
  id: string
  name: string
  description?: string | null
  totalPrice: number
  discount: number
  validDays?: number | null
  isActive: boolean
  services: PackageServiceItem[]
  _count?: { purchases: number }
}

export function useServicePackages() {
  const [packages, setPackages] = useState<ServicePackageDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPackages = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const res = await fetch('/api/service-packages', { credentials: 'include', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, signal })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || (res.status === 401 ? 'Sessão expirada. Faça login novamente.' : 'Erro ao carregar pacotes'))
      if (!signal?.aborted) setPackages(data.packages || [])
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      setError(e.message)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  const createPackage = useCallback(async (payload: Partial<ServicePackageDto>) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    const res = await fetch('/api/service-packages', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload), credentials: 'include' })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Erro ao criar pacote')
    await fetchPackages()
    return data.package as ServicePackageDto
  }, [fetchPackages])

  const updatePackage = useCallback(async (payload: Partial<ServicePackageDto> & { id: string }) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    const res = await fetch('/api/service-packages', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload), credentials: 'include' })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Erro ao atualizar pacote')
    await fetchPackages()
    return data.package as ServicePackageDto
  }, [fetchPackages])

  const deletePackage = useCallback(async (id: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    const url = `/api/service-packages?id=${encodeURIComponent(id)}`
    const res = await fetch(url, { method: 'DELETE', credentials: 'include', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Erro ao remover pacote')
    await fetchPackages()
    return true
  }, [fetchPackages])

  return { packages, loading, error, fetchPackages, createPackage, updatePackage, deletePackage }
}
