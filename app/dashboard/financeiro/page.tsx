"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, TrendingUp, TrendingDown, Calendar, CreditCard, Banknote, Download, ChevronLeft, ChevronRight, HelpCircle, Users, AlertTriangle, Clock, Star, RefreshCw, Plus, Trash2, Minus } from "lucide-react"
import { extractTimeFromDateTime } from '@/lib/timezone'
import { useDashboard, useAppointments, useProfessionals, useReports } from "@/hooks/use-api"
import { useAuth } from "@/hooks/use-auth"
import { utcToBrazil, getBrazilNow, getBrazilDayNumber, formatBrazilDate, toLocalDateString, toLocalISOString } from "@/lib/timezone"
import { formatCurrency } from "@/lib/currency"
import { ProfessionalAvatar } from "@/components/professional-avatar"
import { useWorkingHours } from "@/hooks/use-working-hours"
import { useBusinessData } from "@/hooks/use-business-data"
// Date Range Picker (react-day-picker já está no projeto via shadcn Calendar)
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { DateRange } from "react-day-picker"
import { useToast } from "@/hooks/use-toast"

// ✅ SEGURANÇA: Função para sanitizar dados de entrada
const sanitizeString = (str: string | undefined | null): string => {
  if (!str) return ''
  return String(str)
    .replace(/[<>&"']/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#x27;'
      }
      return entities[char] || char
    })
    .trim()
}

// ✅ PERFORMANCE: Debounce hook para navegação (implementação corrigida)
const useDebounce = <T extends any[]>(callback: (...args: T) => void, delay: number) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  return (...args: T) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => callback(...args), delay)
  }
}

export default function FinanceiroPage() {
  const { user } = useAuth()
  const isCollaborator = user?.role === 'COLLABORATOR'
  // Exibir ganhos (comissão) para colaborador, faturamento bruto para dono; ambos para dono avançado
  const { toast } = useToast()
  // Novo filtro de período por intervalo de datas
  // ✅ Ajuste: por padrão carregar o mês atual completo (1º dia até último dia) em vez de apenas o dia atual
  const brazilNow = getBrazilNow()
  const brazilLocalNow = utcToBrazil(brazilNow)
  const initialFrom = new Date(brazilLocalNow.getFullYear(), brazilLocalNow.getMonth(), 1, 0,0,0,0)
  const initialTo = new Date(brazilLocalNow.getFullYear(), brazilLocalNow.getMonth() + 1, 0, 23,59,59,999)

  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: initialFrom, to: initialTo })
  // Novo filtro por profissional (escondido para colaborador)
  const [professionalId, setProfessionalId] = useState('all') // 'all' ou id específico
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(utcToBrazil(brazilNow).getMonth())
  const [selectedYear, setSelectedYear] = useState(utcToBrazil(brazilNow).getFullYear())
  
  const { dashboardData, loading: dashboardLoading, fetchDashboardData } = useDashboard()
  const { appointments, loading: appointmentsLoading, fetchAppointmentsRange } = useAppointments()
  const { professionals, loading: professionalsLoading, fetchProfessionals } = useProfessionals()
  const { fetchProfessionalsReport, fetchTimeAnalysis, fetchProfitability } = useReports()
  const { getWorkingHoursForDay, workingHours } = useWorkingHours()
  // Dados do estabelecimento (para custos fixos)
  const { businessData, updateBusinessData } = useBusinessData()
  // Custos fixos (suporte a recorrência e custos únicos por mês)
  interface FixedCostItem {
    id: string
    name: string
    amount: number
    recurrence?: 'RECURRING' | 'ONE_TIME' // default: RECURRING se ausente (retrocompatibilidade)
    year?: number // usado para ONE_TIME
    month?: number // 0-11 usado para ONE_TIME
  createdAt?: string // ISO
  updatedAt?: string // ISO
  }
  // Mantém TODOS os custos (recorrentes + únicos de vários meses)
  const [fixedCostsAll, setFixedCostsAll] = useState<FixedCostItem[]>([])
  const [savingFixedCosts, setSavingFixedCosts] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  // Ref para rolar até o item recém adicionado
  const lastAddedCostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const list = Array.isArray(businessData?.fixedCosts) ? businessData.fixedCosts : []
    // Migração suave: itens antigos sem recurrence => RECURRING
    const nowIso = new Date().toISOString()
    const migrated: FixedCostItem[] = list.map((c: any) => ({
      id: c.id || crypto.randomUUID(),
      name: c.name || '',
      amount: Math.max(0, Number(c.amount) || 0),
      recurrence: c.recurrence === 'ONE_TIME' ? 'ONE_TIME' : 'RECURRING',
      year: typeof c.year === 'number' ? c.year : c.recurrence === 'ONE_TIME' ? (typeof c.year === 'number' ? c.year : undefined) : undefined,
      month: typeof c.month === 'number' ? c.month : c.recurrence === 'ONE_TIME' ? (typeof c.month === 'number' ? c.month : undefined) : undefined,
      createdAt: c.createdAt || nowIso,
      updatedAt: c.updatedAt || nowIso
    }))
    setFixedCostsAll(migrated)
  }, [businessData?.fixedCosts])

  // Helper de formatação de datas (criação / atualização)
  const formatCostDate = (iso?: string, includeTime: boolean = true) => {
    if (!iso) return '-'
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return '-'
      return includeTime
        ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('pt-BR')
    } catch { return '-' }
  }

  const handleSaveFixedCosts = async () => {
    try {
      setSavingFixedCosts(true)
      setSaveMsg(null)
      await updateBusinessData({ fixedCosts: fixedCostsAll })
      setSaveMsg('Alterações salvas')
      toast({
        title: 'Custos salvos',
        description: 'As alterações foram registradas com sucesso.',
      })
    } catch (e) {
      setSaveMsg('Falha ao salvar. Tente novamente.')
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar. Tente novamente.',
        variant: 'destructive'
      })
    } finally {
      setSavingFixedCosts(false)
    }
  }

  // Estados para os novos cards de relatórios
  const [professionalPerformance, setProfessionalPerformance] = useState<any[]>([])
  const [timeAnalysisData, setTimeAnalysisData] = useState<any[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  // Dados mensais para cards quando apenas 1 dia estiver selecionado
  const [monthlyAppointments, setMonthlyAppointments] = useState<any[]>([])
  // Fonte de dados de 12 meses para a Análise Mensal (independe do filtro de período)
  const [appointments12m, setAppointments12m] = useState<any[]>([])
  // Novo: lucratividade do período
  const [profitability, setProfitability] = useState<{
    grossRevenue: number
    totalDiscounts: number
    netRevenue: number
    totalCommissions: number
    fixedCosts: number
    netProfit: number
    perspective?: string
  } | null>(null)

  // Novo: cache de agendamentos do período anterior para calcular variações dos cards superiores
  const [previousPeriodAppointments, setPreviousPeriodAppointments] = useState<any[]>([])

  // ✅ TRATAMENTO DE ERROS: Estado de loading consolidado
  const loading = dashboardLoading || appointmentsLoading || professionalsLoading

  // ID efetivo a usar nas requisições (colaborador sempre fixo)
  const userProfessionalId = (user as any)?.professionalId
  const effectiveProfessionalId = (isCollaborator && userProfessionalId) ? userProfessionalId : (professionalId !== 'all' ? professionalId : undefined)

  // Carregamento inicial
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const fromStr = dateRange?.from ? toLocalDateString(new Date(dateRange.from)) : undefined
        const toStr = dateRange?.to ? toLocalDateString(new Date(dateRange.to)) : fromStr
        await Promise.all([
          fetchAppointmentsRange(fromStr, toStr, effectiveProfessionalId),
          fetchProfessionals(),
          fetchDashboardData('custom', { from: fromStr, to: toStr, professionalId: effectiveProfessionalId })
        ])
        // Carregar período anterior também no load inicial
        if (dateRange?.from && dateRange?.to) {
          const from = new Date(dateRange.from)
          const to = new Date(dateRange.to)
          const msInDay = 24 * 60 * 60 * 1000
          const days = Math.max(1, Math.round((to.setHours(0,0,0,0) - from.setHours(0,0,0,0)) / msInDay) + 1)
          const previousEnd = new Date(from)
          previousEnd.setDate(previousEnd.getDate() - 1)
          previousEnd.setHours(23,59,59,999)
          const previousStart = new Date(previousEnd)
          previousStart.setDate(previousEnd.getDate() - (days - 1))
          previousStart.setHours(0,0,0,0)
          try {
            const prevRes = await fetchAppointmentsRaw(toLocalDateString(previousStart), toLocalDateString(previousEnd), effectiveProfessionalId)
            setPreviousPeriodAppointments(Array.isArray(prevRes?.appointments) ? prevRes.appointments : [])
          } catch {
            setPreviousPeriodAppointments([])
          }
        } else {
          setPreviousPeriodAppointments([])
        }
        if (!isCollaborator && fromStr && toStr) {
          try {
            const resp = await fetchProfitability({ from: fromStr, to: toStr, professionalId: effectiveProfessionalId })
            const data = (resp as any)?.data?.profitability
            if (data) setProfitability(data)
          } catch {}
        }
      } catch (err) {
        setError('Erro ao carregar dados. Tente novamente.')
      } finally {
        setIsLoading(false)
        setLastUpdated(getBrazilNow())
      }
    }
    loadData()
  }, [fetchAppointmentsRange, fetchProfessionals, fetchDashboardData])

  // Recarregar dados quando filtros mudarem
  useEffect(() => {
    const reload = async () => {
      try {
        setIsRefreshing(true)
        const fromStr = dateRange?.from ? toLocalDateString(new Date(dateRange.from)) : undefined
        const toStr = dateRange?.to ? toLocalDateString(new Date(dateRange.to)) : fromStr
        await Promise.all([
          fetchAppointmentsRange(fromStr, toStr, effectiveProfessionalId),
          fetchDashboardData('custom', { from: fromStr, to: toStr, professionalId: effectiveProfessionalId })
        ])
        // Buscar também o período anterior para alimentar os cards de variação
        if (dateRange?.from && dateRange?.to) {
          const from = new Date(dateRange.from)
          const to = new Date(dateRange.to)
          const msInDay = 24 * 60 * 60 * 1000
          const days = Math.max(1, Math.round((to.setHours(0,0,0,0) - from.setHours(0,0,0,0)) / msInDay) + 1)
          const previousEnd = new Date(from)
          previousEnd.setDate(previousEnd.getDate() - 1)
          previousEnd.setHours(23,59,59,999)
          const previousStart = new Date(previousEnd)
          previousStart.setDate(previousEnd.getDate() - (days - 1))
          previousStart.setHours(0,0,0,0)
          try {
            const prevRes = await fetchAppointmentsRaw(toLocalDateString(previousStart), toLocalDateString(previousEnd), effectiveProfessionalId)
            setPreviousPeriodAppointments(Array.isArray(prevRes?.appointments) ? prevRes.appointments : [])
          } catch {
            setPreviousPeriodAppointments([])
          }
        } else {
          setPreviousPeriodAppointments([])
        }
        if (!isCollaborator && fromStr && toStr) {
          try {
            const resp = await fetchProfitability({ from: fromStr, to: toStr, professionalId: effectiveProfessionalId })
            const data = (resp as any)?.data?.profitability
            if (data) setProfitability(data)
          } catch {}
        }
        setLastUpdated(getBrazilNow())
      } catch (err) {
        // silencioso; já há UI de erro
      } finally {
        setIsRefreshing(false)
      }
    }
    // Apenas quando houver intervalo válido (from & to)
    if (dateRange?.from && dateRange?.to) reload()
  }, [dateRange?.from, dateRange?.to, professionalId, fetchAppointmentsRange, fetchDashboardData])

  // Carregar dados dos últimos 12 meses para a Análise Mensal (apenas quando profissional muda ou no mount)
  useEffect(() => {
    const loadLast12m = async () => {
      try {
        const now = getBrazilNow()
        const start = new Date(utcToBrazil(now))
        start.setMonth(start.getMonth() - 11)
        start.setDate(1)
        start.setHours(0,0,0,0)
        const end = new Date(utcToBrazil(now))
        end.setMonth(end.getMonth() + 1)
        end.setDate(0) // último dia do mês atual
        end.setHours(23,59,59,999)
        const fromStr = toLocalDateString(start)
        const toStr = toLocalDateString(end)
        const { appointments: apps } = await fetchAppointmentsRaw(
          fromStr,
          toStr,
          effectiveProfessionalId
        )
        setAppointments12m(Array.isArray(apps) ? apps : [])
      } catch {
        setAppointments12m([])
      }
    }
    loadLast12m()
  }, [professionalId])

  // Helper: verificar se apenas 1 dia foi selecionado
  const isSingleDaySelected = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return false
    const f = new Date(dateRange.from); f.setHours(0,0,0,0)
    const t = new Date(dateRange.to); t.setHours(0,0,0,0)
    return f.getTime() === t.getTime()
  }, [dateRange?.from, dateRange?.to])

  // Custos fixos integrais: somar o valor mensal de cada mês no intervalo (RECURRING + ONE_TIME daquele mês/ano)
  const integralFixedCostsForRange = useMemo(() => {
    try {
      if (!dateRange?.from || !dateRange?.to) return 0
      const start = new Date(dateRange.from)
      const end = new Date(dateRange.to)
      // Normalizar para início/fim de mês
      const monthStart = new Date(start.getFullYear(), start.getMonth(), 1)
      const monthEnd = new Date(end.getFullYear(), end.getMonth(), 1)

      let cursor = new Date(monthStart)
      let total = 0
      while (cursor.getFullYear() < monthEnd.getFullYear() || (cursor.getFullYear() === monthEnd.getFullYear() && cursor.getMonth() <= monthEnd.getMonth())) {
        const y = cursor.getFullYear()
        const m = cursor.getMonth()
        const monthlyApplicable = fixedCostsAll.filter(c => c.recurrence === 'RECURRING' || (c.recurrence === 'ONE_TIME' && c.year === y && c.month === m))
        total += monthlyApplicable.reduce((s, i) => s + (Number(i.amount) || 0), 0)
        cursor.setMonth(cursor.getMonth() + 1)
      }
      return total
    } catch {
      return 0
    }
  }, [fixedCostsAll, dateRange?.from, dateRange?.to])

  // Fetch local para buscar agendamentos de um intervalo sem sobrescrever o hook principal
  const fetchAppointmentsRaw = async (from?: string, to?: string, professional?: string) => {
    const params = new URLSearchParams()
    if (from) params.append('from', from)
    if (to) params.append('to', to)
    if (professional) params.append('professionalId', professional)
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    const res = await fetch(`/api/appointments${params.toString() ? `?${params.toString()}` : ''}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    })
    if (!res.ok) return { appointments: [] as any[] }
    return res.json() as Promise<{ appointments: any[] }>
  }

  // Quando apenas 1 dia for selecionado, carregar dados do mês para os cards
  useEffect(() => {
    const loadMonthly = async () => {
      if (!isSingleDaySelected || !dateRange?.from) {
        setMonthlyAppointments([])
        return
      }
      const base = new Date(dateRange.from)
      const monthStart = new Date(base.getFullYear(), base.getMonth(), 1)
      const monthEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0)
      const fromStr = toLocalDateString(monthStart)
      const toStr = toLocalDateString(monthEnd)
      try {
  const { appointments: apps } = await fetchAppointmentsRaw(fromStr, toStr, effectiveProfessionalId)
        setMonthlyAppointments(apps || [])
      } catch {
        setMonthlyAppointments([])
      }
    }
    loadMonthly()
  }, [isSingleDaySelected, dateRange?.from, effectiveProfessionalId])

  // ✅ FUNÇÃO PARA ATUALIZAR DADOS MANUALMENTE
  const handleRefreshData = async () => {
    try {
      setIsRefreshing(true)
      setError(null)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Atualizando dados financeiros manualmente...')
      }
      
      const fromStr = dateRange?.from ? toLocalDateString(new Date(dateRange.from)) : undefined
      const toStr = dateRange?.to ? toLocalDateString(new Date(dateRange.to)) : fromStr
      await Promise.all([
        fetchAppointmentsRange(fromStr, toStr, effectiveProfessionalId),
        fetchProfessionals()
      ])
      // Atualizar também o período anterior
      if (dateRange?.from && dateRange?.to) {
        const from = new Date(dateRange.from)
        const to = new Date(dateRange.to)
        const msInDay = 24 * 60 * 60 * 1000
        const days = Math.max(1, Math.round((to.setHours(0,0,0,0) - from.setHours(0,0,0,0)) / msInDay) + 1)
        const previousEnd = new Date(from)
        previousEnd.setDate(previousEnd.getDate() - 1)
        previousEnd.setHours(23,59,59,999)
        const previousStart = new Date(previousEnd)
        previousStart.setDate(previousEnd.getDate() - (days - 1))
        previousStart.setHours(0,0,0,0)
        try {
          const prevRes = await fetchAppointmentsRaw(toLocalDateString(previousStart), toLocalDateString(previousEnd), effectiveProfessionalId)
          setPreviousPeriodAppointments(Array.isArray(prevRes?.appointments) ? prevRes.appointments : [])
        } catch {
          setPreviousPeriodAppointments([])
        }
      } else {
        setPreviousPeriodAppointments([])
      }
      if (!isCollaborator && fromStr && toStr) {
        try {
          const resp = await fetchProfitability({ from: fromStr, to: toStr, professionalId: effectiveProfessionalId })
          const data = (resp as any)?.data?.profitability
          if (data) setProfitability(data)
        } catch {}
      }

      setLastUpdated(getBrazilNow())
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Dados atualizados com sucesso')
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Erro ao atualizar dados:', err)
      }
      setError('Erro ao atualizar dados. Tente novamente.')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Carregar dados de relatórios (Performance por profissional)
  // Recalcular com base no intervalo e profissional
  useEffect(() => {
    try {
      setReportsLoading(true)
      // Usar appointments carregados e filtrar por intervalo
      const from = dateRange?.from ? new Date(dateRange.from) : null
      const to = dateRange?.to ? new Date(dateRange.to) : null
      if (from) from.setHours(0,0,0,0)
      if (to) to.setHours(23,59,59,999)
      const inRange = Array.isArray(appointments) ? appointments.filter(app => {
        if (!app?.dateTime) return false
        try {
          const d = utcToBrazil(new Date(app.dateTime))
          const passProf = professionalId === 'all' ? true : app.professionalId === professionalId
          const passRange = (!from || d >= from) && (!to || d <= to)
          return passProf && passRange
        } catch { return false }
      }) : []

      // Performance por profissional (faturamento bruto e comissão estimada)
      const byProf = new Map<string, { id: string, name: string, avatar?: string | null, appointments: number, revenue: number, commission: number, growth: string }>()
      inRange.forEach((app: any) => {
        if (!['COMPLETED','IN_PROGRESS'].includes(app.status)) return
        const id = app.professionalId || 'sem-prof'
        const name = app.professional?.name || 'Profissional'
        const avatar = app.professional?.avatar || null
        const prev = byProf.get(id) || { id, name, avatar, appointments: 0, revenue: 0, commission: 0, growth: '+0%' }
        prev.appointments += 1
        prev.revenue += parseFloat(app.totalPrice) || 0
        // calcular comissão (snapshot ou fallback via helper)
        prev.commission += appointmentCommission(app)
        byProf.set(id, prev)
      })
      setProfessionalPerformance(Array.from(byProf.values()).sort((a,b)=>b.revenue-a.revenue))

    } finally {
      setReportsLoading(false)
    }
  }, [appointments, dateRange?.from, dateRange?.to, effectiveProfessionalId])

  // ✅ OTIMIZAÇÃO: Usar useMemo para filtros pesados com tratamento de erros (APENAS do intervalo selecionado)
  const completedAppointments = useMemo(() => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Processando agendamentos:', { 
          totalAppointments: appointments?.length || 0,
          professionalId,
          dateRange
        })
      }
      
      if (!Array.isArray(appointments)) {
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ appointments não é um array:', appointments)
        }
        return []
      }
      
      const filtered = appointments.filter(app => {
        // ✅ SEGURANÇA: Validação robusta dos dados
        if (!app || typeof app !== 'object') {
          if (process.env.NODE_ENV === 'development') {
            console.log('⚠️ Agendamento inválido:', app)
          }
          return false
        }
        
        // Incluir mais status para contabilizar receita
        if (!['COMPLETED', 'IN_PROGRESS'].includes(app.status)) {
          return false
        }
        
        if (!app.totalPrice || parseFloat(app.totalPrice) <= 0) {
          if (process.env.NODE_ENV === 'development') {
            console.log('⚠️ Agendamento sem valor válido:', { id: app.id, totalPrice: app.totalPrice })
          }
          return false
        }
        
        if (!app.dateTime) {
          if (process.env.NODE_ENV === 'development') {
            console.log('⚠️ Agendamento sem data:', app.id)
          }
          return false
        }
        
        try {
          const appointmentDate = utcToBrazil(new Date(app.dateTime))
          if (isNaN(appointmentDate.getTime())) {
            if (process.env.NODE_ENV === 'development') {
              console.log('⚠️ Data inválida:', app.dateTime)
            }
            return false
          }
          
          // Filtro por profissional
          if (professionalId !== 'all' && app.professionalId !== professionalId) {
            return false
          }
          // Filtro por intervalo (para seções afetadas pelo filtro de período)
          const from = dateRange?.from ? new Date(dateRange.from) : null
          const to = dateRange?.to ? new Date(dateRange.to) : null
          if (from) from.setHours(0,0,0,0)
          if (to) to.setHours(23,59,59,999)
          if (from && appointmentDate < from) return false
          if (to && appointmentDate > to) return false
          
          // ✅ CORREÇÃO: Remover filtro de data passada - agendamentos concluídos devem aparecer independente da data original
          // O que importa é o status COMPLETED/IN_PROGRESS, não se a data é passada ou futura
          return true
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.log('⚠️ Erro ao processar data:', err)
          }
          return false
        }
      })
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Agendamentos filtrados:', { 
          total: filtered.length,
          totalValue: filtered.reduce((sum, app) => sum + parseFloat(app.totalPrice), 0)
        })
      }
      
      return filtered
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Erro ao filtrar agendamentos:', err)
      }
      return []
    }
  }, [appointments, professionalId, dateRange?.from, dateRange?.to])

  // ✅ NOVO: Conjunto completo (ignora intervalo de datas) apenas filtrando por status, preço e profissional
  const completedAppointmentsAll = useMemo(() => {
    try {
      if (!Array.isArray(appointments)) return []
      return appointments.filter(app => {
        if (!app || typeof app !== 'object') return false
        if (!['COMPLETED','IN_PROGRESS'].includes(app.status)) return false
        if (!app.totalPrice || parseFloat(app.totalPrice) <= 0) return false
        if (!app.dateTime) return false
        if (professionalId !== 'all' && app.professionalId !== professionalId) return false
        try {
          const d = utcToBrazil(new Date(app.dateTime))
          return !isNaN(d.getTime())
        } catch { return false }
      })
    } catch { return [] }
  }, [appointments, professionalId])
  
  // Função para filtrar agendamentos por mês/ano
  const getAppointmentsByMonth = (month: number, year: number) => {
    return completedAppointments.filter(app => {
      const appointmentDate = utcToBrazil(new Date(app.dateTime))
      return appointmentDate.getMonth() === month && appointmentDate.getFullYear() === year
    })
  }

  // ✅ PERFORMANCE: Função otimizada para agendamentos do período atual
  const currentPeriodAppointments = useMemo(() => {
    try {
      const from = dateRange?.from ? new Date(dateRange.from) : null
      const to = dateRange?.to ? new Date(dateRange.to) : null
      let currentStart: Date = from ? new Date(from) : new Date(0)
      let currentEnd: Date = to ? new Date(to) : getBrazilNow()
      if (currentStart) currentStart.setHours(0,0,0,0)
      if (currentEnd) currentEnd.setHours(23,59,59,999)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Filtrando agendamentos por período:', { 
          period: 'custom-range', 
          currentStart: currentStart.toISOString(), 
          currentEnd: currentEnd.toISOString() 
        })
      }
      
      const filtered = completedAppointments.filter(app => {
        try {
          const appointmentDate = utcToBrazil(new Date(app.dateTime))
          return appointmentDate >= currentStart && appointmentDate <= currentEnd
        } catch {
          return false
        }
      })
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Agendamentos do período atual:', {
          total: filtered.length,
          revenue: filtered.reduce((sum, app) => sum + parseFloat(app.totalPrice), 0)
        })
      }
      
      return filtered
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Erro ao filtrar agendamentos do período atual:', err)
      }
      return []
    }
  }, [completedAppointments, dateRange?.from, dateRange?.to])

  // ✅ NOVO: Pré-pago (Pacotes/Assinaturas) no período atual
  const prepaidStats = useMemo(() => {
    try {
      const from = dateRange?.from ? new Date(dateRange.from) : null
      const to = dateRange?.to ? new Date(dateRange.to) : null
      if (from) from.setHours(0,0,0,0)
      if (to) to.setHours(23,59,59,999)
      const inRange = Array.isArray(appointments) ? appointments.filter(app => {
        try {
          if (!app?.dateTime) return false
          const d = utcToBrazil(new Date(app.dateTime))
          const inPeriod = (!from || d >= from) && (!to || d <= to)
          return inPeriod && (app.status === 'COMPLETED' || app.status === 'IN_PROGRESS')
        } catch { return false }
      }) : []
      // Somar valores de appointments com paymentSource PACKAGE ou SUBSCRIPTION
      const prepaidApps = inRange.filter((app: any) => app.paymentSource === 'PACKAGE' || app.paymentSource === 'SUBSCRIPTION')
      const prepaidAmount = prepaidApps.reduce((sum: number, app: any) => sum + (parseFloat(app.totalPrice) || 0), 0)
      const prepaidCount = prepaidApps.length
      return { prepaidAmount, prepaidCount }
    } catch { return { prepaidAmount: 0, prepaidCount: 0 } }
  }, [appointments, dateRange?.from, dateRange?.to])

  // Análise de Horários: baseada nos agendamentos do período atual
  useEffect(() => {
    try {
      setReportsLoading(true)
      const from = dateRange?.from ? new Date(dateRange.from) : null
      const to = dateRange?.to ? new Date(dateRange.to) : null
      if (from) from.setHours(0,0,0,0)
      if (to) to.setHours(23,59,59,999)

      const baseForTimeAnalysis = currentPeriodAppointments

      const slots = [
        { period: "Manhã", time: "08:00 - 12:00", startHour: 8, endHour: 12, isWeekend: false as const },
        { period: "Tarde", time: "12:00 - 18:00", startHour: 12, endHour: 18, isWeekend: false as const },
        { period: "Noite", time: "18:00 - 20:00", startHour: 18, endHour: 20, isWeekend: false as const },
        { period: "Sábado", time: "08:00 - 17:00", startHour: 8, endHour: 17, isWeekend: true as const, weekendDay: 6 as const },
        { period: "Domingo", time: "08:00 - 17:00", startHour: 8, endHour: 17, isWeekend: true as const, weekendDay: 0 as const },
      ]

      // Helpers
      const timeToMinutes = (time: string) => {
        const [hh, mm] = time.split(":").map(Number)
        return (hh || 0) * 60 + (mm || 0)
      }
      const overlapMinutes = (aStart: number, aEnd: number, bStart: number, bEnd: number) => {
        const start = Math.max(aStart, bStart)
        const end = Math.min(aEnd, bEnd)
        return Math.max(0, end - start)
      }

      const ta = slots.map(slot => {
        let list = baseForTimeAnalysis
        if (slot.isWeekend) {
          const targetDay = (slot as any).weekendDay ?? 6
          list = list.filter(apt => utcToBrazil(new Date(apt.dateTime)).getDay() === targetDay)
        } else {
          list = list.filter(apt => { const d = utcToBrazil(new Date(apt.dateTime)).getDay(); return d>=1 && d<=5 })
        }

        const slotApps = list.filter(apt => {
          const d = utcToBrazil(new Date(apt.dateTime))
          let h = d.getHours()
          if (h === 0) h = 9
          if (slot.isWeekend) return true
          if (slot.period === 'Manhã') return h < 12
          if (slot.period === 'Tarde') return h >= 12 && h < 18
          if (slot.period === 'Noite') return h >= 18
          return h>=slot.startHour && h<slot.endHour
        })

        // Capacidade por sobreposição com horários do estabelecimento
        let totalSlotsInRange = 0
        let daysInSel = 0
        if (from && to) {
          const dayMs = 24*60*60*1000
          const slotStartMin = slot.startHour * 60
          const slotEndMin = slot.endHour * 60
          for (let t = from.getTime(); t <= to.getTime(); t += dayMs) {
            const day = new Date(t)
            const dow = day.getDay()
            if (slot.isWeekend) {
              const targetDay = (slot as any).weekendDay ?? 6
              if (dow !== targetDay) continue
            } else {
              if (!(dow>=1 && dow<=5)) continue
            }
            daysInSel++
            const wh = getWorkingHoursForDay(day)
            if (!wh?.isOpen || !wh.startTime || !wh.endTime) continue
            const openStart = timeToMinutes(wh.startTime)
            const openEnd = timeToMinutes(wh.endTime)
            const minutesOverlap = overlapMinutes(slotStartMin, slotEndMin, openStart, openEnd)
            if (minutesOverlap <= 0) continue
            totalSlotsInRange += Math.floor(minutesOverlap / 30)
          }
          if (totalSlotsInRange === 0 && daysInSel > 0 && (!workingHours || workingHours.length === 0)) {
            const slotsPerHour = 2
            const totalHours = slot.endHour - slot.startHour
            totalSlotsInRange = daysInSel * totalHours * slotsPerHour
          }
        } else {
          const totalHours = slot.endHour - slot.startHour
          const slotsPerHour = 2
          const totalSlots = totalHours * slotsPerHour
          const daysFallback = slot.isWeekend ? 4 : 22
          totalSlotsInRange = totalSlots * daysFallback
        }

        const occupancy = totalSlotsInRange>0 ? Math.min(100, Math.round((slotApps.length/totalSlotsInRange)*100)) : 0

            // Calcular receita/ganhos neste período
            const periodValue = slotApps.reduce((sum, app) => {
              if (isCollaborator) {
                // usar comissão snapshot ou calcular
                const c = app?.commissionEarned
                if (c !== undefined && c !== null && !isNaN(parseFloat(c))) {
                  return sum + parseFloat(c)
                }
                const pct = app?.professional?.commissionPercentage
                if (pct !== undefined && pct !== null && !isNaN(parseFloat(pct))) {
                  const total = parseFloat(app.totalPrice) || 0
                  return sum + parseFloat((total * parseFloat(pct)).toFixed(2))
                }
                return sum
              } else {
                return sum + (parseFloat(app.totalPrice) || 0)
              }
            }, 0)

            return { period: slot.period, time: slot.time, occupancy, appointments: slotApps.length, value: periodValue }
      })
      setTimeAnalysisData(ta)
    } finally {
      setReportsLoading(false)
    }
  }, [currentPeriodAppointments, dateRange?.from, dateRange?.to, workingHours])

  // ✅ NOVO: Conjunto de agendamentos para a Análise Mensal (IGNORA o filtro de período)
  // Mantém apenas filtro por profissional, status e preço válido
  const completedAppointmentsMonthly = useMemo(() => {
    try {
      if (!Array.isArray(appointments12m)) return []

      const filtered = appointments12m.filter(app => {
        if (!app || typeof app !== 'object') return false
        if (!['COMPLETED', 'IN_PROGRESS'].includes(app.status)) return false
        if (!app.totalPrice || parseFloat(app.totalPrice) <= 0) return false
        if (!app.dateTime) return false

        try {
          const appointmentDate = utcToBrazil(new Date(app.dateTime))
          if (isNaN(appointmentDate.getTime())) return false
          // Apenas filtra por profissional; NÃO aplica dateRange aqui
          if (professionalId !== 'all' && app.professionalId !== professionalId) return false
          return true
        } catch {
          return false
        }
      })

      return filtered
    } catch {
      return []
    }
  }, [appointments12m, professionalId])
  const getMonthlyData = useMemo(() => {
    try {
      // Usar o conjunto mensal que ignora o filtro de período
      if (!Array.isArray(completedAppointmentsMonthly)) return []
      
      const monthlyData = []
      const currentDate = getBrazilNow()
      
      for (let i = 11; i >= 0; i--) {
        try {
          const brazilCurrentDate = utcToBrazil(currentDate)
          const date = new Date(brazilCurrentDate.getFullYear(), brazilCurrentDate.getMonth() - i, 1)
          const month = date.getMonth()
          const year = date.getFullYear()
          
          // Filtrar agendamentos do mês específico
          const monthAppointments = completedAppointmentsMonthly.filter(app => {
            try {
              const appointmentDate = utcToBrazil(new Date(app.dateTime))
              return appointmentDate.getMonth() === month && appointmentDate.getFullYear() === year
            } catch {
              return false
            }
          })
          
          // Calcular receita/ganhos do mês
          const revenue = monthAppointments.reduce((total, app) => {
            // Para COLLABORATOR: usar comissão (snapshot ou pct * total)
            if (isCollaborator) {
              let commission = 0
              const snap = app?.commissionEarned
              if (snap !== undefined && snap !== null && !isNaN(parseFloat(snap))) {
                commission = parseFloat(snap)
              } else if (app?.professional?.commissionPercentage !== undefined && app?.professional?.commissionPercentage !== null) {
                const pct = parseFloat(app.professional.commissionPercentage)
                if (!isNaN(pct)) {
                  const price = parseFloat(app.totalPrice) || 0
                  commission = parseFloat(((price) * pct).toFixed(2))
                }
              }
              return total + commission
            }
            // OWNER: receita bruta
            const price = parseFloat(app.totalPrice) || 0
            return total + (isNaN(price) ? 0 : price)
          }, 0)
          
          const appointmentCount = monthAppointments.length
          
          monthlyData.push({
            month,
            year,
            monthName: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
            shortName: date.toLocaleDateString('pt-BR', { month: 'short' }),
            revenue: Math.round(revenue * 100) / 100,
            appointmentCount,
            appointments: monthAppointments
          })
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Erro ao processar mês ${i}:`, err)
          }
        }
      }
      
    return monthlyData
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao gerar dados mensais:', err)
      }
      return []
    }
  }, [completedAppointmentsMonthly])

  // ✅ PERFORMANCE: Função otimizada para obter dados dos últimos 30 dias
  const getDailyData = useMemo(() => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Calculando dados diários do intervalo selecionado...')
      }
      
      if (!Array.isArray(completedAppointments)) {
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ completedAppointments não é um array para dados diários')
        }
        return []
      }
      
      const dailyData = [] as any[]
      // Construir range de datas para o gráfico
      const now = getBrazilNow()
      const from = dateRange?.from ? new Date(dateRange.from) : new Date(now)
      const to = dateRange?.to ? new Date(dateRange.to) : new Date(now)
      from.setHours(0,0,0,0)
      to.setHours(23,59,59,999)

      // Se apenas 1 dia estiver selecionado, exibir todo o mês do dia selecionado
      let graphStart = new Date(from)
      let graphEnd = new Date(to)
      if (isSingleDaySelected) {
        graphStart = new Date(from.getFullYear(), from.getMonth(), 1, 0,0,0,0)
        graphEnd = new Date(from.getFullYear(), from.getMonth()+1, 0, 23,59,59,999)
      }
      for (let d = new Date(graphStart); d <= graphEnd; d.setDate(d.getDate() + 1)) {
        try {
          const date = new Date(d)
          
          // Filtrar agendamentos do dia específico
          let dayAppointments = completedAppointments.filter(app => {
            try {
              const appointmentDate = utcToBrazil(new Date(app.dateTime))
              return appointmentDate.toDateString() === date.toDateString()
            } catch {
              return false
            }
          })

          // Se for seleção de 1 dia, manter dados apenas do dia selecionado; demais dias zerados
          if (isSingleDaySelected) {
            const isSelectedDay = date.toDateString() === from.toDateString()
            if (!isSelectedDay) {
              dayAppointments = []
            }
          }
          
          // Calcular receita real do dia
          const revenue = dayAppointments.reduce((total, app) => {
            const price = parseFloat(app.totalPrice) || 0
            return total + (isNaN(price) ? 0 : price)
          }, 0)
          
          const appointmentCount = dayAppointments.length
          
          if (appointmentCount > 0 && process.env.NODE_ENV === 'development') {
            console.log(`📅 ${date.toLocaleDateString('pt-BR')}: ${appointmentCount} agendamentos, R$ ${revenue.toFixed(2)}`)
          }
          
          dailyData.push({
            date: date, // 🇧🇷 CORREÇÃO: Manter objeto Date original
            dayName: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
            fullDate: date.toLocaleDateString('pt-BR'),
            revenue: Math.round(revenue * 100) / 100,
            appointmentCount,
            appointments: dayAppointments
          })
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.error('❌ Erro ao processar dia no intervalo selecionado:', err)
          }
        }
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Dados diários calculados:', {
          dias: dailyData.length,
          receitaTotal: dailyData.reduce((sum, day) => sum + day.revenue, 0),
          diasComReceita: dailyData.filter(day => day.revenue > 0).length
        })
      }
      
      return dailyData
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Erro ao gerar dados diários:', err)
      }
      return []
    }
  }, [completedAppointments, dateRange?.from, dateRange?.to])

  // ✅ OTIMIZAÇÃO: Usar useMemo para cálculos pesados
  const dailyData = getDailyData
  const monthlyData = getMonthlyData

  // ✅ NOVO (v2): Dados do gráfico abrangendo TODOS os meses do intervalo selecionado.
  // Regras:
  // 1. Sempre gera todos os dias desde o primeiro dia do mês inicial até o último dia do mês final do range.
  // 2. Receita só aparece em dias realmente dentro do intervalo selecionado (dateRange.from -> dateRange.to).
  // 3. Fora do intervalo selecionado (mas dentro da faixa exibida) as barras ficam com valor 0 (placeholder visual contínuo).
  // 4. Se não houver intervalo, usa o mês atual completo.
  const dailyChartData = useMemo(() => {
    try {
      const nowBrazil = utcToBrazil(getBrazilNow())
      const hasRange = !!(dateRange?.from && dateRange?.to)
      const rangeFrom = hasRange ? new Date(dateRange!.from!) : new Date(nowBrazil)
      const rangeTo = hasRange ? new Date(dateRange!.to!) : new Date(nowBrazil)
      rangeFrom.setHours(0,0,0,0)
      rangeTo.setHours(23,59,59,999)

      // Limites de exibição: abrangem todos os meses tocados pelo intervalo
      const displayStart = new Date(rangeFrom.getFullYear(), rangeFrom.getMonth(), 1, 0,0,0,0)
      const displayEnd = new Date(rangeTo.getFullYear(), rangeTo.getMonth()+1, 0, 23,59,59,999)

      // Conjunto de dias realmente selecionados (apenas dentro rangeFrom-rangeTo)
      const selectedDays = new Set<string>()
      if (hasRange) {
        for (let d = new Date(rangeFrom); d <= rangeTo; d.setDate(d.getDate()+1)) {
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
          selectedDays.add(key)
        }
      } else {
        // Se não há range definido, considerar o mês atual inteiro como "selecionado" para manter comportamento prévio
        for (let d = new Date(displayStart); d <= displayEnd; d.setDate(d.getDate()+1)) {
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
          selectedDays.add(key)
        }
      }

      // Agrupar receita para todos os dias entre displayStart e displayEnd (IGNORANDO o filtro de datas – visão completa)
      const revenueMap = new Map<string, { revenue: number; count: number }>()
      completedAppointmentsAll.forEach(app => {
        try {
          const d = utcToBrazil(new Date(app.dateTime))
          if (d < displayStart || d > displayEnd) return
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
          if (!revenueMap.has(key)) revenueMap.set(key, { revenue: 0, count: 0 })
          const bucket = revenueMap.get(key)!
          // Ganhos para colaborador (comissão); receita bruta para owner
          let addVal = 0
          if (isCollaborator) {
            const c = app?.commissionEarned
            if (c !== undefined && c !== null && !isNaN(parseFloat(c))) {
              addVal = parseFloat(c)
            } else if (app?.professional?.commissionPercentage !== undefined && app?.professional?.commissionPercentage !== null) {
              const pct = parseFloat(app.professional.commissionPercentage)
              if (!isNaN(pct)) {
                const total = parseFloat(app.totalPrice) || 0
                addVal = parseFloat((total * pct).toFixed(2))
              }
            }
          } else {
            addVal = parseFloat(app.totalPrice) || 0
          }
          bucket.revenue += addVal
          bucket.count += 1
        } catch {}
      })

      const result: any[] = []
      for (let d = new Date(displayStart); d <= displayEnd; d.setDate(d.getDate()+1)) {
        const day = new Date(d)
        const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
        const insideSelection = selectedDays.has(key)
        const bucket = revenueMap.get(key)
        // Só mostra receita se o dia está dentro do range selecionado
        const revenue = insideSelection && bucket ? bucket.revenue : 0
        const count = insideSelection && bucket ? bucket.count : 0
        result.push({
          date: day,
            dayName: day.toLocaleDateString('pt-BR', { weekday: 'short' }),
          fullDate: day.toLocaleDateString('pt-BR'),
          revenue: Math.round(revenue * 100) / 100,
          appointmentCount: count,
          appointments: [] as any[]
        })
      }
      return result
    } catch {
      return []
    }
  }, [completedAppointmentsAll, dateRange?.from, dateRange?.to, isCollaborator])

  // =====================
  // MÉTRICAS (Suporte a Comissão para Colaborador)
  // =====================
  const {
    cardsTotalRevenue,
    cardsAverageDaily,
    cardsMaxRevenue,
    cardsBestDay
  } = useMemo(() => {
    const isCollab = isCollaborator
    // Helper para comissão de um agendamento
    const getCommission = (app: any) => {
      const c = app?.commissionEarned
      if (c !== undefined && c !== null && !isNaN(parseFloat(c))) return parseFloat(c)
      const pct = app?.professional?.commissionPercentage
      if (pct !== undefined && pct !== null && !isNaN(parseFloat(pct))) {
        const total = parseFloat(app.totalPrice) || 0
        return parseFloat((total * parseFloat(pct)).toFixed(2))
      }
      return 0
    }

    // Fonte base: dailyData (agregada) + monthlyAppointments (raw) + completedAppointments (raw range)
    if (!isSingleDaySelected || !dateRange?.from) {
      // Intervalo custom ou múltiplos dias -> usar dailyData
      let total = 0
      let max = 0
      let best: any = null
      dailyData.forEach((day: any) => {
        let value = day.revenue || 0
        if (isCollab) {
          // Recalcular comissão do dia varrendo appointments concluídos do período
            value = completedAppointments.reduce((acc: number, app: any) => {
              try {
                if (!['COMPLETED','IN_PROGRESS'].includes(app.status)) return acc
                const dt = utcToBrazil(new Date(app.dateTime))
                if (dt.getFullYear() === day.date.getFullYear() && dt.getMonth() === day.date.getMonth() && dt.getDate() === day.date.getDate()) {
                  acc += getCommission(app)
                }
              } catch {}
              return acc
            }, 0)
        }
        total += value
        if (value >= max) {
          max = value
          best = { ...day, revenue: value }
        }
      })
      const avg = dailyData.length > 0 ? total / dailyData.length : 0
      return { cardsTotalRevenue: total, cardsAverageDaily: avg, cardsMaxRevenue: max, cardsBestDay: best }
    }
    // Modo mensal (quando selecionado só 1 dia – segue lógica original)
    const base = new Date(dateRange.from)
    const daysInMonth = new Date(base.getFullYear(), base.getMonth()+1, 0).getDate()
    const filtered = Array.isArray(monthlyAppointments) ? monthlyAppointments : []
    const valid = filtered.filter((app: any) => ['COMPLETED','IN_PROGRESS'].includes(app.status) && parseFloat(app.totalPrice) > 0)
    const totalsByDay = new Map<string, number>()
    valid.forEach(app => {
      try {
        const dt = utcToBrazil(new Date(app.dateTime))
        const key = dt.toDateString()
        const add = isCollab ? getCommission(app) : (parseFloat(app.totalPrice) || 0)
        totalsByDay.set(key, (totalsByDay.get(key) || 0) + add)
      } catch {}
    })
    let total = 0
    let max = 0
    let best: any = null
    totalsByDay.forEach((value, key) => {
      total += value
      if (value >= max) {
        max = value
        const d = new Date(key)
        best = {
          date: d,
          dayName: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
          fullDate: d.toLocaleDateString('pt-BR'),
          revenue: value,
          appointmentCount: 0
        }
      }
    })
    const avg = daysInMonth > 0 ? total / daysInMonth : 0
    return { cardsTotalRevenue: total, cardsAverageDaily: avg, cardsMaxRevenue: max, cardsBestDay: best }
  }, [isSingleDaySelected, dateRange?.from, dailyData, monthlyAppointments, isCollaborator, completedAppointments])
  
  // (Versão com comissão já integrada acima – removido bloco duplicado)

  // Máximo diário para escalar as barras do gráfico atualmente exibido
  const chartMaxRevenue = useMemo(() => {
    return dailyChartData.length > 0 ? Math.max(...dailyChartData.map((d: any) => d.revenue || 0)) : 0
  }, [dailyChartData])
  const selectedMonthData = monthlyData.find((m: any) => m.month === selectedMonth && m.year === selectedYear)
  const currentMonthAppointments = selectedMonthData?.appointments || []

  // ✅ PERFORMANCE: Função para navegar entre meses com debounce
  const debouncedNavigateMonth = useDebounce((direction: 'prev' | 'next') => {
    try {
      const currentIndex = monthlyData.findIndex((m: any) => m.month === selectedMonth && m.year === selectedYear)
      if (direction === 'prev' && currentIndex > 0) {
        const prevMonth = monthlyData[currentIndex - 1]
        setSelectedMonth(prevMonth.month)
        setSelectedYear(prevMonth.year)
      } else if (direction === 'next' && currentIndex < monthlyData.length - 1) {
        const nextMonth = monthlyData[currentIndex + 1]
        setSelectedMonth(nextMonth.month)
        setSelectedYear(nextMonth.year)
      }
    } catch (err) {
      console.error('Erro ao navegar entre meses:', err)
    }
  }, 300)
  
  // ✅ USAR DADOS REAIS: Métodos de pagamento baseados no banco de dados (+ Pré-pago)
  const paymentStats = useMemo(() => {
    const baseApps = Array.isArray(currentPeriodAppointments) ? currentPeriodAppointments : []

    // Receita total do período (inclui pré-pagos)
    const totalRevenue = baseApps.reduce((total, app) => {
      const price = parseFloat(app.totalPrice) || 0
      return total + price
    }, 0)

    // Separar pré-pagos
    const isPrepaid = (app: any) => app?.paymentSource === 'PACKAGE' || app?.paymentSource === 'SUBSCRIPTION'
    const prepaidApps = baseApps.filter(isPrepaid)
    const nonPrepaidApps = baseApps.filter(app => !isPrepaid(app))

    // Agrupar não-pré-pagos por método de pagamento
    const paymentGroups = nonPrepaidApps.reduce((groups, app) => {
      let method = app.paymentMethod || 'NULL'
      const price = parseFloat(app.totalPrice) || 0

      // Mapear para nomes padronizados
      if (method === 'CASH') method = 'Dinheiro'
      else if (method === 'CARD') method = 'Cartão'
      else if (method === 'PIX') method = 'PIX'
      else if (method === 'NULL') method = 'Não informado'
      else method = 'Outros'

      if (!groups[method]) {
        groups[method] = { count: 0, amount: 0, appointments: [] as any[] }
      }
      groups[method].count++
      groups[method].amount += price
      groups[method].appointments.push(app)
      return groups
    }, {} as Record<string, { count: number; amount: number; appointments: any[] }>)

    // Adicionar bucket "Pré-pago"
    const prepaidAmount = prepaidApps.reduce((sum, app) => sum + (parseFloat(app.totalPrice) || 0), 0)
    const prepaidCount = prepaidApps.length
    if (prepaidCount > 0) {
      paymentGroups['Pré-pago'] = {
        count: prepaidCount,
        amount: prepaidAmount,
        appointments: prepaidApps
      }
    }

    // Converter para array com ícones e cores
    const methodConfig = {
      // Ícones padronizados para cinza tymer-icon
      'Dinheiro': { icon: Banknote, color: 'text-tymer-icon', bgColor: 'bg-tymer-icon' },
      'Cartão': { icon: CreditCard, color: 'text-tymer-icon', bgColor: 'bg-tymer-icon' },
      'PIX': { icon: DollarSign, color: 'text-tymer-icon', bgColor: 'bg-tymer-icon' },
      'Não informado': { icon: HelpCircle, color: 'text-tymer-icon', bgColor: 'bg-tymer-icon' },
      'Outros': { icon: DollarSign, color: 'text-tymer-icon', bgColor: 'bg-tymer-icon' },
      'Pré-pago': { icon: Star, color: 'text-tymer-icon', bgColor: 'bg-tymer-icon' }
    }

    const list = Object.entries(paymentGroups).map(([method, data]) => ({
      method,
      icon: methodConfig[method as keyof typeof methodConfig]?.icon || DollarSign,
      color: methodConfig[method as keyof typeof methodConfig]?.color || 'text-gray-400',
      bgColor: methodConfig[method as keyof typeof methodConfig]?.bgColor || 'bg-gray-400',
      count: (data as any).count,
      amount: (data as any).amount,
      percentage: totalRevenue > 0 ? Math.round(((data as any).amount / totalRevenue) * 100) : 0
    }) )

    // Ordenação fixa solicitada: Dinheiro > PIX > Cartão > Pré-pago; "Não informado" sempre por último; demais por valor decrescente
    const order: Record<string, number> = {
      'Dinheiro': 1,
      'PIX': 2,
      'Cartão': 3,
      'Pré-pago': 4
    }
    list.sort((a, b) => {
      if (a.method === 'Não informado') return 1
      if (b.method === 'Não informado') return -1
      const ra = order[a.method] ?? 999
      const rb = order[b.method] ?? 999
      if (ra !== rb) return ra - rb
      // mesmos pesos: ordenar por valor decrescente
      return b.amount - a.amount
    })

    return list
  }, [currentPeriodAppointments])
  
  // Calcular mudanças reais comparando com dados anteriores
  // Helper para extrair comissão de um agendamento (snapshot ou cálculo fallback)
  const appointmentCommission = useCallback((app: any) => {
    if (!app) return 0
    const snap = app?.commissionEarned
    if (snap !== undefined && snap !== null) {
      const v = parseFloat(snap)
      if (!isNaN(v)) return v
    }
    // fallback: percentual do objeto do agendamento
    let pct: number | null = null
    const pctRaw = app?.professional?.commissionPercentage
    if (pctRaw !== undefined && pctRaw !== null) {
      const p = parseFloat(pctRaw)
      if (!isNaN(p)) pct = p
    }
    // fallback final: buscar percentual pela lista de profissionais carregada
    if ((pct === null || pct === undefined) && Array.isArray(professionals)) {
      const prof = professionals.find((p: any) => p.id === app.professionalId)
      if (prof && prof.commissionPercentage !== undefined && prof.commissionPercentage !== null) {
        const p = parseFloat(prof.commissionPercentage)
        if (!isNaN(p)) pct = p
      }
    }
    if (pct !== null && pct !== undefined) {
      const total = parseFloat(app.totalPrice) || 0
      return parseFloat(((total) * pct).toFixed(2))
    }
    return 0
  }, [professionals])

  const previousPeriodData = useMemo(() => {
    try {
      // Usar a lista carregada especificamente do período anterior; se vazia, retorna zeros
      if (!Array.isArray(previousPeriodAppointments)) return { revenue: 0, commissionRevenue: 0, completedCount: 0, totalCount: 0 }

      const from = dateRange?.from ? new Date(dateRange.from) : null
      const to = dateRange?.to ? new Date(dateRange.to) : null
      if (!from || !to) return { revenue: 0, commissionRevenue: 0, completedCount: 0, totalCount: 0 }

      const msInDay = 24*60*60*1000
      const days = Math.max(1, Math.round((to.setHours(0,0,0,0) - from.setHours(0,0,0,0)) / msInDay) + 1)
      const previousEnd = new Date(from)
      previousEnd.setDate(previousEnd.getDate() - 1)
      previousEnd.setHours(23,59,59,999)
      const previousStart = new Date(previousEnd)
      previousStart.setDate(previousEnd.getDate() - (days - 1))
      previousStart.setHours(0,0,0,0)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Calculando período anterior:', { 
          period: 'custom-range', 
          previousStart: toLocalISOString(previousStart), 
          previousEnd: toLocalISOString(previousEnd) 
        })
      }
      
      // Já carregados exatamente no intervalo desejado
      const previousAppointments = previousPeriodAppointments
      
      const previousCompleted = previousAppointments.filter(app => 
        ['COMPLETED', 'IN_PROGRESS'].includes(app.status) && 
        parseFloat(app.totalPrice) > 0
      )

      const previousRevenue = previousCompleted.reduce((total, app) => total + (parseFloat(app.totalPrice) || 0), 0)
      const previousCommission = previousCompleted.reduce((total, app) => total + appointmentCommission(app), 0)

      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Dados período anterior:', {
          totalAppointments: previousAppointments.length,
          completedAppointments: previousCompleted.length,
          revenue: previousRevenue,
          commissionRevenue: previousCommission
        })
      }

      return {
        revenue: previousRevenue,
        commissionRevenue: previousCommission,
        completedCount: previousCompleted.length,
        totalCount: previousAppointments.length
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Erro ao calcular período anterior:', err)
      }
      return { revenue: 0, commissionRevenue: 0, completedCount: 0, totalCount: 0 }
    }
  }, [previousPeriodAppointments, dateRange?.from, dateRange?.to, appointmentCommission])
  
  // ✅ PERFORMANCE: Receita do período atual usando agendamentos filtrados
  const currentPeriodRevenue = useMemo(() => {
    return currentPeriodAppointments.reduce((total, app) => 
      total + (parseFloat(app.totalPrice) || 0), 0
    )
  }, [currentPeriodAppointments])
  
  // ✅ CORREÇÃO: Ticket médio baseado no período atual
  const currentTicketMedio = currentPeriodAppointments.length > 0 ? 
    currentPeriodRevenue / currentPeriodAppointments.length : 0
  const currentTicketMedioComissao = currentPeriodAppointments.length > 0 ?
    (isCollaborator ? (currentPeriodAppointments.reduce((s, app) => s + appointmentCommission(app), 0)) / currentPeriodAppointments.length : 0) : 0
  
  const previousTicketMedio = previousPeriodData.completedCount > 0 ? 
    previousPeriodData.revenue / previousPeriodData.completedCount : 0
  const previousTicketMedioComissao = previousPeriodData.completedCount > 0 ?
    (previousPeriodData as any).commissionRevenue / previousPeriodData.completedCount : 0
  
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) {
      if (current === 0) return { change: "—", type: "neutral" as const }
      return { change: "Novo", type: "positive" as const }
    }
    const changePercent = ((current - previous) / previous) * 100
    const sign = changePercent >= 0 ? "+" : ""
    return {
      change: `${sign}${Math.round(changePercent)}%`,
      type: changePercent >= 0 ? "positive" : "negative"
    }
  }
  
  // ✅ CORREÇÃO: Usar dados do período atual para comparações
  const currentCommissionRevenue = useMemo(() => {
    if (!isCollaborator) return 0
    return currentPeriodAppointments.reduce((sum, app) => sum + appointmentCommission(app), 0)
  }, [currentPeriodAppointments, isCollaborator, appointmentCommission])

  // Comissões no período (para OWNER) — sempre soma via helper
  const currentPeriodCommissionsOwner = useMemo(() => {
    return currentPeriodAppointments.reduce((sum, app) => sum + appointmentCommission(app), 0)
  }, [currentPeriodAppointments, appointmentCommission])

  const revenueChange = calculateChange(
    isCollaborator ? currentCommissionRevenue : currentPeriodRevenue,
    isCollaborator ? (previousPeriodData as any).commissionRevenue || 0 : previousPeriodData.revenue
  )
  const completedChange = calculateChange(currentPeriodAppointments.length, previousPeriodData.completedCount)
  
  // ✅ CORREÇÃO: Calcular taxa de conversão do período atual
  const currentPeriodConversionRate = useMemo(() => {
    const today = getBrazilNow()
    const from = dateRange?.from ? new Date(dateRange.from) : new Date(today)
    const to = dateRange?.to ? new Date(dateRange.to) : new Date(today)
    const currentStart = new Date(from); currentStart.setHours(0,0,0,0)
    const currentEnd = new Date(to); currentEnd.setHours(23,59,59,999)
    
    const allPeriodAppointments = appointments.filter(app => {
      try {
        const appointmentDate = utcToBrazil(new Date(app.dateTime))
        return appointmentDate >= currentStart && appointmentDate <= currentEnd
      } catch {
        return false
      }
    })
    
    return allPeriodAppointments.length > 0 ? 
      (currentPeriodAppointments.length / allPeriodAppointments.length) * 100 : 0
  }, [appointments, currentPeriodAppointments, dateRange?.from, dateRange?.to])
  
  const conversionChange = calculateChange(
    currentPeriodConversionRate,
    previousPeriodData.totalCount > 0 ? (previousPeriodData.completedCount / previousPeriodData.totalCount) * 100 : 0
  )
  const ticketChange = isCollaborator 
    ? calculateChange(currentTicketMedioComissao, previousTicketMedioComissao)
    : calculateChange(currentTicketMedio, previousTicketMedio)

  // ✅ FUTURO: Função para exportar relatório com sanitização (comentada para implementação futura)
  /*
  const handleExportReport = () => {
    try {
      const today = formatBrazilDate(getBrazilNow())
      const reportData = [
        ['RELATÓRIO FINANCEIRO'],
        [`Data de Geração: ${today}`],
        [''],
        ['RESUMO GERAL'],
        ['Métrica', 'Valor', 'Variação'],
        ['Faturamento Hoje', dashboardData?.stats?.totalRevenue ? formatCurrency(dashboardData.stats.totalRevenue) : 'R$ 0,00', revenueChange.change],
        ['Agendamentos Concluídos', completedAppointments.length.toString(), completedChange.change],
        ['Taxa de Conversão', `${Math.round((completedAppointments.length / Math.max(appointments.length, 1)) * 100)}%`, conversionChange.change],
        ['Ticket Médio', formatCurrency(currentTicketMedio), ticketChange.change],
        [''],
        ['FORMAS DE PAGAMENTO'],
        ['Método', 'Quantidade', 'Valor', 'Percentual'],
        ...paymentStats.map(payment => [
          sanitizeString(payment.method),
          payment.count.toString(),
          formatCurrency(payment.amount),
          `${payment.percentage}%`
        ]),
        [''],
        ['AGENDAMENTOS CONCLUÍDOS'],
        ['Cliente', 'Serviço', 'Valor', 'Data'],
        ...completedAppointments.slice(0, 50).map(apt => [
          sanitizeString(apt.endUser?.name) || 'Cliente',
          sanitizeString(apt.services?.[0]?.name) || 'Serviço',
          formatCurrency(apt.totalPrice),
          utcToBrazil(new Date(apt.dateTime)).toLocaleDateString('pt-BR')
        ])
      ]

      // ✅ SEGURANÇA: Sanitização adicional para CSV
      const csvContent = reportData.map(row => 
        row.map(cell => {
          const sanitized = sanitizeString(String(cell))
          // Prevenir CSV injection
          if (sanitized.startsWith('=') || sanitized.startsWith('+') || sanitized.startsWith('-') || sanitized.startsWith('@')) {
            return `"'${sanitized}"`
          }
          return `"${sanitized}"`
        }).join(',')
      ).join('\n')

      // Criar e baixar arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `relatorio-financeiro-${formatBrazilDate(getBrazilNow()).split('/').reverse().join('-')}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Limpeza de memória
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Erro ao exportar relatório:', err)
      setError('Erro ao exportar relatório. Tente novamente.')
    }
  }
  */

  // ✅ CORREÇÃO: Função para obter título dinâmico baseado no período
  const getPeriodTitle = (baseTitle: string) => {
    // Mostra "no período" para indicar que segue o intervalo selecionado
    return baseTitle.replace('Hoje', 'no período')
  }

  // Montagem dinâmica dos cards superiores
  const financialStatsBase = [
    {
      title: isCollaborator ? getPeriodTitle('Ganhos (Comissão)') : getPeriodTitle('Faturamento Hoje'),
      value: (() => {
        const val = isCollaborator ? currentCommissionRevenue : currentPeriodRevenue
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
      })(),
      change: revenueChange.change,
      changeType: revenueChange.type,
      icon: DollarSign,
    },
    {
      title: getPeriodTitle('Agendamentos Concluídos'),
      value: currentPeriodAppointments.length.toString(),
      change: completedChange.change,
      changeType: completedChange.type,
      icon: TrendingUp,
    },
    {
      title: getPeriodTitle('Taxa de Conversão'),
      value: (() => {
        const today = getBrazilNow()
        const from = dateRange?.from ? new Date(dateRange.from) : new Date(today)
        const to = dateRange?.to ? new Date(dateRange.to) : new Date(today)
        const currentStart = new Date(from); currentStart.setHours(0,0,0,0)
        const currentEnd = new Date(to); currentEnd.setHours(23,59,59,999)
        const allPeriodAppointments = appointments.filter(app => {
          try {
            const appointmentDate = utcToBrazil(new Date(app.dateTime))
            return appointmentDate >= currentStart && appointmentDate <= currentEnd
          } catch { return false }
        })
        const conversionRate = allPeriodAppointments.length > 0 ? (currentPeriodAppointments.length / allPeriodAppointments.length) * 100 : 0
        return `${Math.round(conversionRate)}%`
      })(),
      change: conversionChange.change,
      changeType: conversionChange.type,
      icon: Calendar,
    },
    {
      title: isCollaborator ? getPeriodTitle('Ticket Médio (Comissão)') : getPeriodTitle('Ticket Médio'),
      value: (() => {
        if (currentPeriodAppointments.length === 0) return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(0)
        const totalValue = isCollaborator
          ? currentPeriodAppointments.reduce((s, app) => s + appointmentCommission(app), 0)
          : currentPeriodAppointments.reduce((s, app) => s + (parseFloat(app.totalPrice) || 0), 0)
        const avg = totalValue / currentPeriodAppointments.length
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avg)
      })(),
      change: ticketChange.change,
      changeType: ticketChange.type,
      icon: CreditCard,
    },
  ]

  // Remover card extra de "Comissões (Período)" no topo para evitar duplicidade
  const financialStats = financialStatsBase

  // ✅ IMPLEMENTAR: Transações recentes com dados reais e sanitização
  const recentTransactions = useMemo(() => {
    try {
  // Logs removidos em produção
      
  if (!Array.isArray(completedAppointments)) {
        return []
      }
      
      // Considerar o último dia do intervalo selecionado
      const to = dateRange?.to ? new Date(dateRange.to) : getBrazilNow()
      to.setHours(0,0,0,0)
      const dayString = to.toDateString()
      
      const todayTransactions = completedAppointments
        .filter(app => {
          try {
            // Usar parse direto local para evitar deslocamento de -3h
            const appointmentDate = new Date(app.dateTime)
            return appointmentDate.toDateString() === dayString
          } catch {
            return false
          }
        })
        .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
        .slice(0, 6) // ✅ LIMITADO: 6 últimos atendimentos do dia final do período
        .map(app => {
          // (logs removidos)
          // Normalizar método de pagamento
          let paymentMethod = app.paymentMethod || 'NULL'
          if (paymentMethod === 'CASH') {
            paymentMethod = 'Dinheiro'
          } else if (paymentMethod === 'CARD') {
            paymentMethod = 'Cartão'
          } else if (paymentMethod === 'PIX') {
            paymentMethod = 'PIX'
          } else if (paymentMethod === 'NULL') {
            paymentMethod = 'Não informado'
          } else {
            paymentMethod = 'Outros'
          }
          // Calcular comissão (snapshot ou fallback)
          let commission = 0
          const snap = app?.commissionEarned
          if (snap !== undefined && snap !== null && !isNaN(parseFloat(snap))) {
            commission = parseFloat(snap)
          } else if (app?.professional?.commissionPercentage !== undefined && app?.professional?.commissionPercentage !== null) {
            const pct = parseFloat(app.professional.commissionPercentage)
            if (!isNaN(pct)) {
              const price = parseFloat(app.totalPrice) || 0
              commission = parseFloat((price * pct).toFixed(2))
            }
          }

          return {
            id: app.id,
            client: sanitizeString(app.endUser?.name) || 'Cliente',
            // Concatenar múltiplos serviços (upsell)
            service: Array.isArray(app.services) && app.services.length > 0
              ? app.services.map((s: any) => sanitizeString(s.name) || 'Serviço').join(' + ')
              : 'Serviço',
            amount: parseFloat(app.totalPrice) || 0,
            commission,
            method: paymentMethod,
            // Mostrar horário real salvo (já está em horário local “brasileiro” via toLocalISOString durante criação)
            time: extractTimeFromDateTime(app.dateTime)
          }
        })
      
  // (logs removidos)
      
      return todayTransactions
  } catch (err) {
      return []
    }
  }, [completedAppointments, dateRange?.to])

  // ✅ IMPLEMENTAR: Serviços mais vendidos com dados reais e sanitização
  const topServices = useMemo(() => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 Calculando serviços mais vendidos...')
      }
      
      if (!Array.isArray(completedAppointments)) {
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ completedAppointments não é um array para serviços')
        }
        return []
      }
      
      const serviceStats = new Map()
      
      completedAppointments.forEach(app => {
        if (!app.services || !Array.isArray(app.services)) return
        
        // Se colaborador, distribuir a comissão do agendamento proporcional ao preço dos serviços
        const isCollab = isCollaborator
        let commissionForAppointment = 0
        if (isCollab) {
          const c = app?.commissionEarned
          if (c !== undefined && c !== null && !isNaN(parseFloat(c))) {
            commissionForAppointment = parseFloat(c)
          } else if (app?.professional?.commissionPercentage !== undefined && app?.professional?.commissionPercentage !== null) {
            const pct = parseFloat(app.professional.commissionPercentage)
            if (!isNaN(pct)) {
              const total = parseFloat(app.totalPrice) || 0
              commissionForAppointment = parseFloat((total * pct).toFixed(2))
            }
          }
        }

        // Soma de preços dos serviços deste agendamento (para rateio)
        const totalServicesPrice = app.services.reduce((s: number, srv: any) => s + (parseFloat(srv.price) || 0), 0)

        app.services.forEach((service: any) => {
          const serviceName = sanitizeString(service.name) || 'Serviço sem nome'
          const servicePrice = parseFloat(service.price) || 0

          // Valor a acumular: comissão rateada se colaborador; caso contrário, preço do serviço
          let addValue = 0
          if (isCollab) {
            if (commissionForAppointment > 0 && totalServicesPrice > 0) {
              addValue = (servicePrice / totalServicesPrice) * commissionForAppointment
            } else {
              addValue = 0
            }
          } else {
            addValue = isNaN(servicePrice) ? 0 : servicePrice
          }

          if (serviceStats.has(serviceName)) {
            const existing = serviceStats.get(serviceName)
            serviceStats.set(serviceName, {
              ...existing,
              count: existing.count + 1,
              revenue: existing.revenue + addValue
            })
          } else {
            serviceStats.set(serviceName, {
              service: serviceName,
              count: 1,
              revenue: addValue
            })
          }
        })
      })
      
      const totalRevenue = Array.from(serviceStats.values())
        .reduce((total, service) => total + (service.revenue || 0), 0)
      
      const topServicesData = Array.from(serviceStats.values())
        .map(service => ({
          ...service,
          percentage: totalRevenue > 0 ? Math.round((service.revenue / totalRevenue) * 100) : 0
        }))
  .sort((a, b) => b.revenue - a.revenue) // Ordenar por receita/ganhos
        .slice(0, 5)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Serviços mais vendidos calculados:', {
          totalServicos: serviceStats.size,
          top5: topServicesData.map(s => ({ 
            nome: s.service, 
            vendas: s.count, 
            receita: s.revenue 
          }))
        })
      }
      
      return topServicesData
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Erro ao processar serviços mais vendidos:', err)
      }
      return []
    }
  }, [completedAppointments])

  // ✅ TRATAMENTO DE ERROS: Componente de erro
  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#ededed]">{isCollaborator ? 'Meus Ganhos e Performance' : 'Relatório e Financeiro'}</h1>
            <p className="text-[#71717a]">Controle completo das suas finanças e análises</p>
          </div>
        </div>
        
        <Card className="bg-[#18181b] border-red-500/20">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-400 mb-2">Erro ao carregar dados</h3>
            <p className="text-[#a1a1aa] mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ✅ ESTADOS DE LOADING: Feedback visual melhorado
  if (loading || isLoading) {
    return (
      <div className="space-y-8">

        {/* Financial Stats Skeleton */}
        <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {[1, 2, 3, 4].map((index) => (
            <Card key={index} className="bg-[#18181b] border-[#27272a]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="animate-pulse bg-[#27272a] rounded h-4 w-24"></div>
                <div className="animate-pulse bg-[#27272a] rounded h-4 w-4"></div>
              </CardHeader>
              <CardContent>
                <div className="animate-pulse bg-[#27272a] rounded h-6 w-20 mb-2"></div>
                <div className="animate-pulse bg-[#27272a] rounded h-3 w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Skeleton */}
        <Card className="bg-[#18181b] border-[#27272a]">
          <CardHeader>
            <div className="animate-pulse bg-[#27272a] rounded h-6 w-40 mb-2"></div>
            <div className="animate-pulse bg-[#27272a] rounded h-4 w-64"></div>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse bg-[#27272a] rounded h-64 w-full"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header com filtro por profissional */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#ededed]">Relatório e Financeiro</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <p className="text-[#71717a]">Controle completo das suas finanças e análises</p>
              {lastUpdated && (
                <span className="text-xs text-[#52525b] sm:ml-2">
                  • Última atualização: {lastUpdated.toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              )}
            </div>
          </div>
          
          {/* ✅ DESKTOP: Filtros e ações */}
          <div className="hidden sm:flex items-center gap-3 lg:ml-auto">
            {/* ✅ BOTÃO DE ATUALIZAR DADOS */}
            <Button
              onClick={handleRefreshData}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="bg-[#18181b] border-[#27272a] text-[#ededed] hover:bg-[#27272a] hover:border-[#3f3f46] flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
            
            {/* ✅ Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="bg-[#18181b] border-[#27272a] text-[#ededed]">
                  <Calendar className="w-4 h-4 mr-2" />
                  {dateRange?.from && dateRange?.to
                    ? `${dateRange.from.toLocaleDateString('pt-BR')} - ${dateRange.to.toLocaleDateString('pt-BR')}`
                    : 'Selecione o período'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[#18181b] border-[#27272a]" align="end">
                <div className="p-3">
                  <ShadcnCalendar
                    mode="range"
                    numberOfMonths={2}
                    selected={dateRange}
                    onSelect={setDateRange}
                  />
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-[#18181b] border-[#27272a]"
                      onClick={() => {
                        const d = getBrazilNow()
                        const from = new Date(d); from.setHours(0,0,0,0)
                        const to = new Date(d); to.setHours(23,59,59,999)
                        setDateRange({ from, to })
                      }}
                    >
                      Hoje
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-[#18181b] border-[#27272a]"
                      onClick={() => {
                        const to = getBrazilNow(); to.setHours(23,59,59,999)
                        const from = new Date(to); from.setDate(from.getDate() - 6); from.setHours(0,0,0,0)
                        setDateRange({ from, to })
                      }}
                    >
                      Últimos 7 dias
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-[#18181b] border-[#27272a]"
                      onClick={() => {
                        const now = getBrazilNow()
                        const from = new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0,0)
                        const to = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59,999)
                        setDateRange({ from, to })
                      }}
                    >
                      Este mês
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* ✅ FILTRO POR PROFISSIONAL (oculto para colaborador) */}
            {!isCollaborator && (
              <Select value={professionalId} onValueChange={setProfessionalId}>
                <SelectTrigger className="w-48 bg-[#18181b] border-[#27272a] text-[#ededed]">
                  <SelectValue placeholder="Filtrar por profissional" />
                </SelectTrigger>
                <SelectContent className="bg-[#18181b] border-[#27272a]">
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Todos os profissionais
                    </div>
                  </SelectItem>
                  {professionals?.map((professional: any) => (
                    <SelectItem key={professional.id} value={professional.id}>
                      {sanitizeString(professional.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* ✅ MOBILE: Igual estrutura WhatsApp */}
          <div className="sm:hidden lg:ml-auto w-full lg:w-auto">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 items-center">
              {/* ✅ Date Range Picker (mobile) */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full lg:w-auto bg-[#18181b] border-[#27272a] text-[#ededed] text-center lg:text-left">
                    <Calendar className="w-4 h-4 mr-2" />
                    {dateRange?.from && dateRange?.to
                      ? `${dateRange.from.toLocaleDateString('pt-BR')} - ${dateRange.to.toLocaleDateString('pt-BR')}`
                      : 'Período'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#18181b] border-[#27272a]" align="start">
                  <div className="p-3">
                    <ShadcnCalendar mode="range" selected={dateRange} onSelect={setDateRange} />
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <Button variant="outline" size="sm" className="bg-[#18181b] border-[#27272a]" onClick={() => {
                        const d = getBrazilNow(); const f = new Date(d); f.setHours(0,0,0,0); const t = new Date(d); t.setHours(23,59,59,999); setDateRange({from:f,to:t})
                      }}>Hoje</Button>
                      <Button variant="outline" size="sm" className="bg-[#18181b] border-[#27272a]" onClick={() => {
                        const t = getBrazilNow(); t.setHours(23,59,59,999); const f = new Date(t); f.setDate(f.getDate()-6); f.setHours(0,0,0,0); setDateRange({from:f,to:t})
                      }}>Últimos 7 dias</Button>
                      <Button variant="outline" size="sm" className="bg-[#18181b] border-[#27272a]" onClick={() => {
                        const n = getBrazilNow(); const f = new Date(n.getFullYear(), n.getMonth(), 1, 0,0,0,0); const t = new Date(n.getFullYear(), n.getMonth()+1, 0, 23,59,59,999); setDateRange({from:f,to:t})
                      }}>Este mês</Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* ✅ FILTRO POR PROFISSIONAL (oculto para colaborador) */}
              {!isCollaborator && (
                <Select value={professionalId} onValueChange={setProfessionalId}>
                  <SelectTrigger className="w-full lg:w-auto bg-[#18181b] border-[#27272a] text-[#ededed] text-center lg:text-left">
                    <SelectValue placeholder="Filtrar por profissional" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18181b] border-[#27272a]">
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Todos os profissionais
                      </div>
                    </SelectItem>
                    {professionals?.map((professional: any) => (
                      <SelectItem key={professional.id} value={professional.id}>
                        {sanitizeString(professional.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {/* ✅ BOTÃO DE ATUALIZAR DADOS */}
              <Button
                onClick={handleRefreshData}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
                className="bg-[#18181b] border-[#27272a] text-[#ededed] hover:bg-[#27272a] hover:border-[#3f3f46] flex items-center justify-center gap-2 w-full lg:w-auto"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Atualizando...' : 'Atualizar'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Stats */}
      <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {financialStats.map((stat, index) => {
          const IconComp = typeof (stat as any)?.icon === 'function' ? (stat as any).icon : DollarSign
          return (
            <Card key={index} className="bg-[#18181b] border-[#27272a] hover:border-[#3f3f46] transition-colors duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm sm:text-sm font-medium text-[#a1a1aa] truncate">{stat.title}</CardTitle>
                <IconComp className="h-4 w-4 text-tymer-icon flex-shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-xl font-bold text-[#ededed] mb-1 truncate">{stat.value}</div>
                <p
                  className={`text-xs sm:text-xs ${stat.changeType === "positive" ? "text-[#10b981]" : stat.changeType === "neutral" ? "text-[#a1a1aa]" : "text-red-400"} flex items-center`}
                >
                  {stat.changeType === "positive" ? (
                    <TrendingUp className="w-3 h-3 mr-1" />
                  ) : stat.changeType === "neutral" ? (
                    <Minus className="w-3 h-3 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-1" />
                  )}
                  {stat.change} em relação ao período anterior
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

    {/* Daily Revenue Analysis Card */}
    <Card className="bg-[#18181b] border-[#27272a]">
        <CardHeader>
          <CardTitle className="text-[#a1a1aa] flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-tymer-icon" />
              <span className="text-lg sm:text-xl">{isCollaborator ? 'Gráfico de Ganhos Diários' : 'Receita Diária'}</span>
            </div>
            <span className="text-sm sm:text-base text-[#71717a] sm:text-[#a1a1aa]">
              - {dateRange?.from && dateRange?.to ? `${dateRange.from.toLocaleDateString('pt-BR')} a ${dateRange.to.toLocaleDateString('pt-BR')}` : 'Selecione um período'}
            </span>
          </CardTitle>
          <CardDescription className="text-sm sm:text-sm text-[#71717a]">
            {isCollaborator ? 'Acompanhe seus ganhos diários e identifique tendências' : 'Acompanhe o faturamento diário e identifique tendências'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6">
            <div className="text-center p-3 sm:p-3 bg-tymer-card/50 rounded-lg border border-tymer-border/50">
              <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 text-tymer-icon mx-auto mb-1" />
              <p className="text-base sm:text-lg font-bold text-[#ededed] truncate">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cardsTotalRevenue)}
              </p>
              <p className="text-xs sm:text-sm text-[#71717a]">Total 30 Dias {isCollaborator ? '(Comissão)' : ''}</p>
            </div>
            <div className="text-center p-3 sm:p-3 bg-tymer-card/50 rounded-lg border border-tymer-border/50">
              <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-tymer-icon mx-auto mb-1" />
              <p className="text-base sm:text-lg font-bold text-[#ededed] truncate">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cardsAverageDaily)}
              </p>
              <p className="text-xs sm:text-sm text-[#71717a]">Média Diária {isCollaborator ? '(Comissão)' : ''}</p>
            </div>
            <div className="text-center p-3 sm:p-3 bg-tymer-card/50 rounded-lg border border-tymer-border/50">
              <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-tymer-icon mx-auto mb-1" />
              <p className="text-base sm:text-lg font-bold text-[#ededed] truncate">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cardsMaxRevenue)}
              </p>
              <p className="text-xs sm:text-sm text-[#71717a]">Melhor Dia</p>
            </div>
            <div className="text-center p-3 sm:p-3 bg-tymer-card/50 rounded-lg border border-tymer-border/50">
              <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-tymer-icon mx-auto mb-1" />
              <p className="text-base sm:text-lg font-bold text-[#ededed] truncate">
                {cardsBestDay?.fullDate || 'N/A'}
              </p>
              <p className="text-xs sm:text-sm text-[#71717a]">Data do Melhor Dia</p>
            </div>
          </div>

          {/* Daily Chart */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <h4 className="text-base sm:text-lg text-[#ededed] font-medium">{isCollaborator ? 'Gráfico de Ganhos Diários' : 'Gráfico de Receita Diária'}</h4>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-[#71717a]">
                <div className="w-3 h-3 bg-[#10b981] rounded"></div>
                <span>{isCollaborator ? 'Ganhos do dia' : 'Receita do dia'}</span>
              </div>
            </div>
            
            {/* Mobile Chart - Scrollable horizontal list */}
            <div className="block sm:hidden">
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                  {dailyChartData.map((day, index) => {
                    const height = chartMaxRevenue > 0 ? (day.revenue / chartMaxRevenue) * 100 : 0
                    const dayDate = day.date // 🇧🇷 CORREÇÃO: day.date já é um objeto Date
                    const isWeekend = getBrazilDayNumber(dayDate) === 0 || getBrazilDayNumber(dayDate) === 6
                    
                    return (
                      <div
                        key={index}
                        className="flex flex-col items-center min-w-[50px]"
                      >
                        {/* Bar Container */}
                        <div className="w-8 h-24 bg-[#27272a]/30 rounded-t flex items-end relative mb-2">
                          <div
                            className={`w-full transition-all duration-300 rounded-t ${
                              isWeekend 
                                ? 'bg-orange-500' 
                                : 'bg-[#10b981]'
                            }`}
                            style={{ 
                              height: `${height}%`, 
                              minHeight: day.revenue > 0 ? '4px' : '0px' 
                            }}
                          />
                        </div>
                        
                        {/* Day Info */}
                        <div className="text-center">
                          <div className={`text-xs ${isWeekend ? 'text-tymer-icon' : 'text-[#71717a]'} font-medium mb-1`}>
                            {day.dayName.slice(0, 3)}
                          </div>
                          <div className="text-xs text-gray-500 mb-1">
                            {dayDate.getDate()}
                          </div>
                          <div className="text-xs text-[#10b981] font-medium">
                            {day.revenue > 0 ? `R$ ${Math.round(day.revenue)}` : 'R$ 0'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              {/* Mobile Legend */}
              <div className="flex flex-col items-center gap-2 text-xs text-[#71717a] pt-3 border-t border-[#52525b]">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#10b981] rounded"></div>
                    <span>Dias úteis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded"></div>
                    <span>Fins de semana</span>
                  </div>
                </div>
                <span className="text-center text-gray-500">Deslize para ver todos os dias</span>
              </div>
            </div>

            {/* Desktop Chart - Original layout */}
            <div className="hidden sm:block relative pt-16 pb-4">
              {/* Chart Container */}
              <div className="flex items-end justify-between gap-1 h-32 px-4 relative">
                {dailyChartData.map((day, index) => {
                  const height = chartMaxRevenue > 0 ? (day.revenue / chartMaxRevenue) * 100 : 0
                  const dayDate2 = day.date // 🇧🇷 CORREÇÃO: day.date já é um objeto Date
                  const isWeekend = getBrazilDayNumber(dayDate2) === 0 || getBrazilDayNumber(dayDate2) === 6
                  
                  return (
                    <div
                      key={index}
                      className="group relative flex flex-col items-center flex-1"
                      style={{ minWidth: '6px', maxWidth: '18px' }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 border border-[#3f3f46] text-[#ededed] p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                        <div className="text-sm font-medium">{day.fullDate}</div>
                        <div className="text-[#10b981] font-bold text-sm">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(day.revenue)}
                        </div>
                        <div className="text-xs text-[#ededed]">
                          {day.appointmentCount} agendamento{day.appointmentCount !== 1 ? 's' : ''}
                        </div>
                        {/* Tooltip Arrow */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
                      </div>

                      {/* Bar */}
                      <div className="w-full h-32 bg-[#27272a]/30 rounded-t flex items-end relative">
                        <div
                          className={`w-full transition-all duration-300 rounded-t ${
                            isWeekend 
                              ? 'bg-orange-500 hover:bg-orange-400' 
                              : 'bg-[#10b981] hover:bg-emerald-400'
                          } group-hover:shadow-lg cursor-pointer`}
                          style={{ 
                            height: `${height}%`, 
                            minHeight: day.revenue > 0 ? '4px' : '0px' 
                          }}
                          title={`${day.fullDate} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(day.revenue)} - ${day.appointmentCount} agendamento${day.appointmentCount !== 1 ? 's' : ''}`}
                        />
                      </div>
                      
                      {/* Day Label */}
                      <div className="mt-1 text-center">
                        <div className={`text-xs ${isWeekend ? 'text-tymer-icon' : 'text-[#71717a]'} font-medium`}>
                          {day.dayName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {dayDate2.getDate()}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Desktop Legend */}
            <div className="hidden sm:flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-xs text-[#71717a] pt-2 border-t border-[#52525b]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#10b981] rounded"></div>
                <span>Dias úteis</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span>Fins de semana</span>
              </div>
              <span className="text-center">• Passe o mouse sobre as barras para ver detalhes</span>
            </div>
          </div>
        </CardContent>
  </Card>

  {/* Monthly Analysis Card */}
      <Card className="bg-[#18181b] border-[#27272a]">
        <CardHeader>
          <CardTitle className="text-[#a1a1aa] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-tymer-icon" />
              <span className="text-lg sm:text-xl">Análise Mensal</span>
            </div>
            
            {/* Navegação de mês - estilo igual à agenda */}
            <div className="flex items-center justify-center gap-4 sm:justify-end">
              <Button
                variant="outline"
                size="icon"
                onClick={() => debouncedNavigateMonth('prev')}
                disabled={monthlyData.findIndex((m: any) => m.month === selectedMonth && m.year === selectedYear) === 0}
                className="border-[#27272a] hover:bg-[#27272a] h-10 w-10 sm:h-12 sm:w-12"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              
              <div className="text-center">
                <h2 className="text-base sm:text-lg font-semibold text-[#ededed] whitespace-nowrap min-w-[180px] sm:min-w-[200px]">
                  {selectedMonthData?.monthName || 'Carregando...'}
                </h2>
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => debouncedNavigateMonth('next')}
                disabled={monthlyData.findIndex((m: any) => m.month === selectedMonth && m.year === selectedYear) === monthlyData.length - 1}
                className="border-[#27272a] hover:bg-[#27272a] h-10 w-10 sm:h-12 sm:w-12"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </CardTitle>
          <CardDescription className="text-sm sm:text-sm text-[#71717a]">
            {isCollaborator ? 'Ganhos totais do mês selecionado' : 'Faturamento detalhado do mês selecionado'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6">
            <div className="text-center p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-800/50">
              <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 text-tymer-icon mx-auto mb-2" />
              <p className="text-base sm:text-lg font-bold text-[#ededed] truncate">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedMonthData?.revenue || 0)}
              </p>
              <p className="text-xs sm:text-sm text-[#71717a]">{isCollaborator ? 'Ganhos Totais' : 'Faturamento Total'}</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-800/50">
              <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-tymer-icon mx-auto mb-2" />
              <p className="text-base sm:text-lg font-bold text-[#ededed]">{selectedMonthData?.appointmentCount || 0}</p>
              <p className="text-xs sm:text-sm text-[#71717a]">Agendamentos</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-800/50">
              <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-tymer-icon mx-auto mb-2" />
              <p className="text-base sm:text-lg font-bold text-[#ededed] truncate">
                {selectedMonthData?.appointmentCount ? 
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((selectedMonthData.revenue / selectedMonthData.appointmentCount)) : 
                  'R$ 0,00'
                }
              </p>
              <p className="text-xs sm:text-sm text-[#71717a]">{isCollaborator ? 'Ticket Médio (Comissão)' : 'Ticket Médio'}</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-800/50">
              <CreditCard className="w-6 h-6 sm:w-7 sm:h-7 text-tymer-icon mx-auto mb-2" />
              <p className="text-base sm:text-lg font-bold text-[#ededed]">
                {(() => {
                  if (!selectedMonthData) return 0
                  const daysInMonth = new Date(selectedMonthData.year, selectedMonthData.month + 1, 0).getDate()
                  return daysInMonth > 0
                    ? Math.round((selectedMonthData.appointmentCount || 0) / daysInMonth)
                    : 0
                })()}
              </p>
              <p className="text-xs sm:text-sm text-[#71717a]">Média Diária</p>
            </div>
          </div>

          {/* Monthly Chart Preview */}
          <div className="space-y-4">
            <h4 className="text-base sm:text-lg text-[#ededed] font-medium">Últimos 12 Meses</h4>
            
            {/* Mobile Chart - Scrollable horizontal list */}
            <div className="block sm:hidden">
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                  {monthlyData.map((month: any, index: number) => {
                    const maxRevenue = Math.max(...monthlyData.map((m: any) => m.revenue || 0))
                    const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0
                    const isSelected = month.month === selectedMonth && month.year === selectedYear
                    
                    return (
                      <div
                        key={index}
                        className={`flex flex-col items-center min-w-[60px] cursor-pointer transition-all duration-200 ${
                          isSelected ? 'scale-105' : ''
                        }`}
                        onClick={() => {
                          setSelectedMonth(month.month)
                          setSelectedYear(month.year)
                        }}
                      >
                        {/* Bar Container */}
                        <div className="w-10 h-20 bg-[#27272a] rounded-t flex items-end relative mb-2">
                          <div
                            className={`w-full transition-all duration-300 cursor-pointer ${
                              isSelected ? 'bg-[#10b981]' : 'bg-emerald-600/70'
                            }`}
                            style={{ height: `${height}%`, minHeight: month.revenue > 0 ? '8px' : '0px' }}
                          />
                        </div>
                        
                        {/* Month Info */}
                        <div className="text-center">
                          <div className={`text-xs font-medium mb-1 ${
                            isSelected ? 'text-[#10b981]' : 'text-[#71717a]'
                          }`}>
                            {month.shortName}
                          </div>
                          <div className="text-xs text-[#10b981] font-medium">
                            {month.revenue > 0 ? `R$ ${Math.round(month.revenue)}` : 'R$ 0'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {month.appointmentCount} agend.
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              <div className="text-center text-xs text-gray-500 pt-3 border-t border-[#52525b]">
                Deslize para ver todos os meses • Toque para selecionar
              </div>
            </div>

            {/* Desktop Chart - Original layout */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-12 gap-2">
                {monthlyData.map((month: any, index: number) => {
                  const maxRevenue = Math.max(...monthlyData.map((m: any) => m.revenue || 0))
                  const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0
                  const isSelected = month.month === selectedMonth && month.year === selectedYear
                  
                  return (
                    <div key={index} className="group relative flex flex-col items-center">
                      <div className="w-full h-24 bg-[#27272a] rounded-t flex items-end justify-center relative">
                        <div
                          className={`w-full transition-all duration-300 cursor-pointer ${
                            isSelected ? 'bg-[#10b981]' : 'bg-emerald-600/70 hover:bg-[#10b981]/90'
                          }`}
                          style={{ height: `${height}%`, minHeight: month.revenue > 0 ? '8px' : '0px' }}
                          onClick={() => {
                            setSelectedMonth(month.month)
                            setSelectedYear(month.year)
                          }}
                          title={`${month.monthName} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(month.revenue)} - ${month.appointmentCount} agendamentos${isCollaborator ? ' (ganhos)' : ''}`}
                        />
                      </div>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 border border-[#3f3f46] text-[#ededed] p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                        <div className="text-sm font-medium">{month.monthName}</div>
                        <div className="text-[#10b981] font-bold">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(month.revenue)}
                        </div>
                        <div className="text-xs text-[#ededed]">
                          {month.appointmentCount} agendamento{month.appointmentCount !== 1 ? 's' : ''}
                        </div>
                        {/* Tooltip Arrow */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
                      </div>
                      
                      <span className="text-xs text-[#71717a] mt-1 text-center">
                        {month.shortName}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card className="bg-[#18181b] border-[#27272a]">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-[#a1a1aa] flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-tymer-icon" />
              Transações Recentes
            </CardTitle>
            <CardDescription className="text-sm sm:text-sm text-[#71717a]">6 últimos atendimentos do dia final do período</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">Nenhuma transação hoje</h3>
                <p className="text-sm text-gray-500">
                  As transações aparecerão aqui quando houver agendamentos concluídos
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-tymer-icon/20 rounded-full flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-tymer-icon" />
                      </div>
                      <div>
                        <p className="text-sm sm:text-base text-[#ededed] font-medium">{transaction.client}</p>
                        <p className="text-xs sm:text-sm text-[#71717a]">{transaction.service}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {transaction.method}
                          </Badge>
                          <span className="text-xs text-gray-500">{transaction.time}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {isCollaborator ? (
                        <div className="space-y-0.5">
                          <p className="text-xs text-[#71717a] line-through">Bruto: R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0 }).format(transaction.amount)}</p>
                          <p className="text-sm sm:text-base text-[#10b981] font-bold">Comissão: R$ {new Intl.NumberFormat('pt-BR').format(transaction.commission || 0)}</p>
                        </div>
                      ) : (
                        <p className="text-sm sm:text-base text-[#10b981] font-bold">R$ {transaction.amount}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card className="bg-[#18181b] border-[#27272a]">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-[#a1a1aa] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-tymer-icon" />
              {isCollaborator ? 'Meus Serviços Mais Rentáveis' : 'Serviços Mais Vendidos'}
            </CardTitle>
            <CardDescription className="text-sm sm:text-sm text-[#71717a]">Ranking dos serviços por quantidade de atendimentos</CardDescription>
          </CardHeader>
          <CardContent>
            {topServices.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">Nenhum serviço vendido</h3>
                <p className="text-sm text-gray-500">
                  Os serviços mais vendidos aparecerão aqui quando houver agendamentos concluídos
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {topServices.map((service, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm sm:text-base text-[#ededed] font-medium">{service.service}</p>
                        <p className="text-xs sm:text-sm text-[#71717a]">{service.count} atendimentos</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm sm:text-base text-[#10b981] font-bold">R$ {service.revenue}</p>
                        <p className="text-xs text-[#71717a]">{service.percentage}% do total</p>
                      </div>
                    </div>
                    <div className="w-full bg-[#27272a] rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-[#10b981] to-[#059669] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${service.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Professional Performance */}
  {!isCollaborator && (
  <Card className="bg-[#18181b] border-[#27272a]">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-[#a1a1aa] flex items-center gap-2">
              <Users className="w-5 h-5 text-tymer-icon" />
              Performance dos Profissionais
            </CardTitle>
            <CardDescription className="text-sm sm:text-sm text-[#71717a]">Desempenho individual por profissional</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportsLoading ? (
                <div className="text-center py-8 text-[#71717a]">
                  <div className="animate-pulse">Carregando dados dos profissionais...</div>
                </div>
              ) : professionalPerformance.length > 0 ? professionalPerformance.map((professional, index) => (
                <div key={professional.id || index} className="p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-800/50 hover:border-gray-700/50 transition-all duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <ProfessionalAvatar
                        avatar={professional.avatar}
                        name={sanitizeString(professional.name)}
                        size="md"
                        className="border-2 border-[#10b981]/30 shadow-sm"
                      />
                      <div>
                        <p className="text-[#ededed] font-medium text-sm sm:text-base">{sanitizeString(professional.name)}</p>
                      </div>
                    </div>
                    {(() => {
                      const appts = professional.appointments || 0
                      const revenue = parseFloat(professional.revenue) || 0
                      const avg = appts > 0 ? revenue / appts : 0
                      return (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30 text-xs sm:text-sm">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avg)} méd.
                          </Badge>
                        </div>
                      )
                    })()}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
                    <div>
                      <p className="text-[#71717a] mb-1">Agendamentos</p>
                      <p className="text-[#ededed] font-medium text-sm sm:text-base">{professional.appointments || 0}</p>
                    </div>
                    <div>
                      <p className="text-[#71717a] mb-1">Faturamento</p>
                      <p className="text-[#10b981] font-medium text-sm sm:text-base">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(professional.revenue) || 0)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[#71717a] mb-1">Comissão a Pagar</p>
                      <p className="text-[#f59e0b] font-medium text-sm sm:text-base">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(professional.commission) || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-[#71717a]">
                  <Users className="w-12 h-12 text-[#71717a] mx-auto mb-3" />
                  <p className="text-sm sm:text-base">Nenhum profissional encontrado para o período selecionado</p>
                  <p className="text-xs sm:text-sm text-[#52525b] mt-2">Selecione um período diferente ou verifique se há profissionais ativos</p>
                </div>
              )}
            </div>
          </CardContent>
  </Card>
  )}

        {/* Time Analysis */}
        <Card className="bg-[#18181b] border-[#27272a]">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-[#a1a1aa] flex items-center gap-2">
              <Clock className="w-5 h-5 text-tymer-icon" />
              Análise de Horários
            </CardTitle>
            <CardDescription className="text-sm sm:text-sm text-[#71717a]">Horários com maior movimento e ocupação</CardDescription>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="text-center py-8 text-[#71717a]">
                <div className="animate-pulse">Carregando análise de horários...</div>
              </div>
            ) : timeAnalysisData.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {timeAnalysisData.map((period, index) => (
                  <div key={index} className="text-center p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-800/50 hover:border-gray-700/50 transition-all duration-200">
                    <h4 className="text-[#ededed] font-medium mb-1 text-sm sm:text-base">{period.period}</h4>
                    <p className="text-xs sm:text-sm text-[#71717a] mb-3">{period.time}</p>
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 relative">
                      <svg className="w-12 h-12 sm:w-16 sm:h-16 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="rgb(63 63 70)"
                          strokeWidth="2"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="rgb(16 185 129)"
                          strokeWidth="2"
                          strokeDasharray={`${period.occupancy || 0}, 100`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs sm:text-sm font-bold text-[#10b981]">{period.occupancy || 0}%</span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-[#71717a]">
                      {period.appointments || 0} agendamento{(period.appointments || 0) !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs sm:text-sm text-[#10b981] font-medium mt-1">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(period.value || 0)} {isCollaborator ? 'em ganhos' : 'em receita'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#71717a]">
                <Clock className="w-12 h-12 text-[#71717a] mx-auto mb-3" />
                <p className="text-sm sm:text-base">Nenhum dado de horário encontrado para o período selecionado</p>
                <p className="text-xs sm:text-sm text-[#52525b] mt-2">Selecione um período diferente ou verifique se há agendamentos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

  {/* Payment Methods */}
  {!isCollaborator && (
  <Card className="bg-[#18181b] border-[#27272a]">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl text-[#a1a1aa] flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-tymer-icon" />
            Formas de Pagamento
          </CardTitle>
          <CardDescription className="text-sm sm:text-sm text-[#71717a]">Distribuição dos pagamentos por método</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentStats.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">Nenhum pagamento registrado</h3>
              <p className="text-sm text-gray-500">
                Os métodos de pagamento aparecerão aqui quando houver agendamentos concluídos
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {paymentStats.map((payment, index) => {
                const Icon = (payment && payment.icon) ? payment.icon : DollarSign
                return (
                  <div key={index} className="text-center p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-800/50 hover:border-gray-700/50 transition-all duration-200">
                    <Icon className={`w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 ${payment.color}`} />
                    <h4 className="text-[#ededed] font-medium mb-1 text-sm sm:text-base">{payment.method}</h4>
                    <p className="text-[#10b981] font-bold text-base sm:text-lg">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount)}
                    </p>
                    <p className="text-xs sm:text-sm text-[#71717a] mb-2">{payment.count} transação{payment.count !== 1 ? 'ões' : ''}</p>
                    <div className="flex items-center justify-center">
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${payment.bgColor}`}></div>
                        <span className="text-xs text-[#71717a]">{payment.percentage}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
  </Card>
  )}

  {/* ✅ NOVO: Pré-pago (Pacotes/Assinaturas) */}
  {!isCollaborator && (
    <Card className="bg-[#18181b] border-[#27272a]">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl text-[#a1a1aa] flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-tymer-icon" />
          Pré-pago (Pacotes/Assinaturas)
        </CardTitle>
        <CardDescription className="text-sm sm:text-sm text-[#71717a]">Agendamentos pagos via crédito de pacote ou assinatura</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="text-center p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-800/50">
            <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 text-tymer-icon mx-auto mb-2" />
            <p className="text-base sm:text-lg font-bold text-[#ededed] truncate">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prepaidStats.prepaidAmount || 0)}
            </p>
            <p className="text-xs sm:text-sm text-[#71717a]">Valor no período</p>
          </div>
          <div className="text-center p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-800/50">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 text-tymer-icon mx-auto mb-2" />
            <p className="text-base sm:text-lg font-bold text-[#ededed]">{prepaidStats.prepaidCount || 0}</p>
            <p className="text-xs sm:text-sm text-[#71717a]">Atendimentos pré-pagos</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )}

  {/* 🧮 Análise de Lucratividade do Período */}
  {!isCollaborator && profitability && (
    <Card className="bg-[#18181b] border-[#27272a]">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl text-[#a1a1aa] flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-tymer-icon" />
          Análise de Lucratividade do Período
        </CardTitle>
        <CardDescription className="text-sm sm:text-sm text-[#71717a]">
          Receita bruta, descontos de pré-pago, receita líquida, comissões, custos mensais integrais e lucro líquido
        </CardDescription>
      </CardHeader>
      <CardContent>
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
          <div className="text-center p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-800/50">
            <h4 className="text-xs text-[#71717a] mb-1">Receita Bruta</h4>
            <p className="text-base sm:text-lg font-bold text-[#ededed]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profitability.grossRevenue || 0)}</p>
          </div>
          <div className="text-center p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-800/50">
            <h4 className="text-xs text-[#71717a] mb-1">Descontos (Pré-pago)</h4>
            <p className="text-base sm:text-lg font-bold text-[#ededed]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profitability.totalDiscounts || 0)}</p>
          </div>
          <div className="text-center p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-800/50">
            <h4 className="text-xs text-[#71717a] mb-1">Receita Líquida</h4>
            <p className="text-base sm:text-lg font-bold text-[#ededed]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profitability.netRevenue || 0)}</p>
          </div>
          <div className="text-center p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-800/50">
            <h4 className="text-xs text-[#71717a] mb-1">Comissões</h4>
            <p className="text-base sm:text-lg font-bold text-[#ededed]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profitability.totalCommissions || 0)}</p>
          </div>
          <div className="text-center p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-800/50">
            <h4 className="text-xs text-[#71717a] mb-1">Custos Mensais</h4>
            <p className="text-base sm:text-lg font-bold text-[#ededed]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(integralFixedCostsForRange || 0)}</p>
          </div>
          <div className="text-center p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-800/50">
            <h4 className="text-xs text-[#71717a] mb-1">Lucro Líquido</h4>
            {(() => {
              const net = (Number(profitability?.netRevenue || 0) - Number(profitability?.totalCommissions || 0) - Number(integralFixedCostsForRange || 0))
              const cls = net >= 0 ? 'text-[#10b981]' : 'text-red-400'
              return (
                <p className={`text-base sm:text-lg font-bold ${cls}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(net)}
                </p>
              )
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  )}

  {/* Custos Mensais (última seção) - oculto para colaborador */}
  {!isCollaborator && (
    <Card className="bg-[#18181b] border-[#27272a]">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl text-[#a1a1aa] flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <span className="leading-none pt-1 sm:pt-0">Custos Mensais</span>
            {/* Controles alinhados à direita em desktop; empilhado no mobile */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3 w-full sm:w-auto">
              {/* Navegação de mês: em mobile ocupa 100% da largura para ficar igual ao botão abaixo */}
              <div className="flex items-center gap-2 sm:order-1 order-1 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => debouncedNavigateMonth('prev')}
                  disabled={monthlyData.findIndex((m: any) => m.month === selectedMonth && m.year === selectedYear) === 0}
                  className="border-[#27272a] hover:bg-[#27272a] h-9 w-9"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1 sm:flex-none text-sm font-semibold text-[#ededed] min-w-[140px] text-center px-3 py-1 rounded-md bg-[#27272a]/40 truncate">
                  {selectedMonthData?.monthName || 'Carregando...'}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => debouncedNavigateMonth('next')}
                  disabled={monthlyData.findIndex((m: any) => m.month === selectedMonth && m.year === selectedYear) === monthlyData.length - 1}
                  className="border-[#27272a] hover:bg-[#27272a] h-9 w-9"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-[#3f3f46] text-[#ededed] hover:text-white w-full sm:w-auto sm:order-2 order-2"
                onClick={() => {
                  const newId = crypto.randomUUID()
                  setFixedCostsAll(prev => [...prev, { id: newId, name: '', amount: 0, recurrence: 'RECURRING', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }])
                  setTimeout(() => {
                    if (lastAddedCostRef.current) {
                      lastAddedCostRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      const input = lastAddedCostRef.current.querySelector('input') as HTMLInputElement | null
                      input?.focus()
                    }
                  }, 50)
                }}
              >
                <Plus className="w-4 h-4 mr-1" /> Adicionar Custo
              </Button>
            </div>
          </CardTitle>
          <CardDescription className="text-sm sm:text-sm text-[#71717a]">Gerencie aqui seus custos mensais (recorrentes ou pontuais); os valores entram no cálculo de lucro líquido</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(() => {
              // Custos exibidos: recorrentes + ONE_TIME do mês selecionado
              const displayed = fixedCostsAll.filter(c => c.recurrence === 'RECURRING' || (c.recurrence === 'ONE_TIME' && c.year === selectedYear && c.month === selectedMonth))
              return displayed.map((item, idx) => {
                const indexInAll = fixedCostsAll.findIndex(fc => fc.id === item.id)
                return (
      <div ref={idx === displayed.length - 1 ? lastAddedCostRef : undefined} key={item.id || idx} className="relative flex flex-col gap-2 rounded-md p-2 hover:bg-[#1f1f23] transition-colors sm:grid sm:grid-cols-12 sm:gap-2">
                    {/* Nome + botão excluir (overlay no mobile) */}
                    <div className="sm:col-span-5">
                      <div className="relative">
                        <Input
                          placeholder="Ex.: Aluguel"
                          value={item.name}
                          onChange={(e) => setFixedCostsAll(list => list.map((c, i) => i === indexInAll ? { ...c, name: e.target.value, updatedAt: new Date().toISOString() } : c))}
                          className="bg-[#27272a] border-[#3f3f46] text-[#ededed] pr-10"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="absolute top-1.5 right-1.5 border-red-600 text-red-400 hover:text-red-300 h-7 w-7 sm:hidden"
                          onClick={() => setFixedCostsAll(list => list.filter(fc => fc.id !== item.id))}
                          aria-label="Excluir custo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {/* Valor */}
                    <div className="sm:col-span-3 flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Valor (R$)"
                        value={String(item.amount ?? 0)}
                        onChange={(e) => {
                          const raw = (e.target.value || '').replace(',', '.').trim()
                          let value = parseFloat(raw)
                          if (isNaN(value) || value < 0) value = 0
                          value = Math.round(value * 100) / 100
                          setFixedCostsAll(list => list.map((c, i) => i === indexInAll ? { ...c, amount: value, updatedAt: new Date().toISOString() } : c))
                        }}
                        className="bg-[#27272a] border-[#3f3f46] text-[#ededed] w-full"
                      />
                    </div>
                    {/* Recorrência */}
                    <div className="sm:col-span-3">
                      <select
                        className="w-full bg-[#27272a] border-[#3f3f46] text-[#ededed] text-sm rounded-md h-10 px-2 focus:outline-none focus:ring-1 focus:ring-tymer-primary"
                        value={item.recurrence === 'ONE_TIME' ? 'ONE_TIME' : 'RECURRING'}
                        onChange={(e) => {
                          const value = e.target.value === 'ONE_TIME' ? 'ONE_TIME' : 'RECURRING'
                          setFixedCostsAll(list => list.map((c, i) => {
                            if (i !== indexInAll) return c
                            if (value === 'ONE_TIME') {
                              return { ...c, recurrence: 'ONE_TIME', year: selectedYear, month: selectedMonth, updatedAt: new Date().toISOString() }
                            } else {
                              const { year, month, ...rest } = c
                              return { ...rest, recurrence: 'RECURRING', updatedAt: new Date().toISOString() }
                            }
                          }))
                        }}
                      >
                        <option value="RECURRING">Recorrente</option>
                        <option value="ONE_TIME">Somente este mês</option>
                      </select>
                    </div>
                    {/* Botão excluir desktop */}
                    <div className="hidden sm:flex sm:col-span-1 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="border-red-600 text-red-400 hover:text-red-300"
                        onClick={() => setFixedCostsAll(list => list.filter(fc => fc.id !== item.id))}
                        aria-label="Excluir custo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {/* Metadata */}
                    <div className="sm:col-span-12 -mt-1">
                      <p className="text-[10px] sm:text-xs text-[#52525b] flex flex-wrap gap-x-2">
                        <span>Criado: {formatCostDate(item.createdAt)}</span>
                        {item.updatedAt && item.updatedAt !== item.createdAt && (
                          <span>• Última atualização: {formatCostDate(item.updatedAt)}</span>
                        )}
                        {!item.updatedAt || item.updatedAt === item.createdAt ? (
                          <span>• Sem alterações posteriores</span>
                        ) : null}
                        {item.recurrence === 'ONE_TIME' && (
                          <span className="text-amber-500">• Apenas este mês</span>
                        )}
                      </p>
                    </div>
                  </div>
                )
              })
            })()}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm text-[#a1a1aa] pt-1">
              <span>Total mensal:</span>
              <span className="font-medium">{(() => {
                // Memo simplificado por fechamento (já que selectedMonth, selectedYear, fixedCostsAll mudam pouco)
                const monthlyApplicable = fixedCostsAll.filter(c => c.recurrence === 'RECURRING' || (c.recurrence === 'ONE_TIME' && c.year === selectedYear && c.month === selectedMonth))
                const total = monthlyApplicable.reduce((s,i)=> s + (Number(i.amount) || 0), 0)
                return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)
              })()}</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
              <Button onClick={handleSaveFixedCosts} disabled={savingFixedCosts} className="bg-tymer-primary hover:bg-tymer-primary/80 text-white w-full sm:w-auto">
                {savingFixedCosts ? 'Salvando...' : 'Salvar alterações'}
              </Button>
              {saveMsg && <span className="text-xs text-[#71717a]">{saveMsg}</span>}
            </div>

            {/* Cards: Custos Fixos e Lucro Líquido (Estimado, Mês) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 pt-4">
              {(() => {
                const monthlyFixedTotal = fixedCostsAll
                  .filter(c => c.recurrence === 'RECURRING' || (c.recurrence === 'ONE_TIME' && c.year === selectedYear && c.month === selectedMonth))
                  .reduce((s, i) => s + (Number(i.amount) || 0), 0)
                // Receita líquida do mês: receita bruta - descontos de pré-pago
                // Preferir dados agregados se existirem, senão calcular dos agendamentos do mês
                const monthGross = selectedMonthData?.revenue || 0
                const monthDiscounts = (() => {
                  try {
                    const apps = Array.isArray(selectedMonthData?.appointments) ? selectedMonthData.appointments : []
                    return apps.reduce((s: number, app: any) => s + (parseFloat(app.discountApplied) || 0), 0)
                  } catch { return 0 }
                })()
                const monthNetRevenue = Math.max(0, monthGross - monthDiscounts)
                const monthlyNetProfit = monthNetRevenue - monthlyFixedTotal
                return [
                  {
                    title: 'Custos Fixos (Mensal)',
                    value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyFixedTotal),
                    icon: Banknote,
                  },
                  {
                    title: 'Lucro Líquido (Estimado, Mês)',
                    value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyNetProfit),
                    icon: TrendingUp,
                  }
                ]
              })().map((stat, index) => {
                const IconComp = typeof (stat as any)?.icon === 'function' ? (stat as any).icon : DollarSign
                return (
                  <Card key={index} className="bg-[#18181b] border-[#27272a] hover:border-[#3f3f46] transition-colors duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-[#a1a1aa] truncate">{stat.title}</CardTitle>
                      <IconComp className="h-4 w-4 text-tymer-icon flex-shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold text-[#ededed] truncate">{stat.value}</div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </CardContent>
    </Card>
  )}
    </div>
  )
}
