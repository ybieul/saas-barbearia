"use client"

import { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { formatPrice } from '@/lib/api-utils'
import { useServicePackages, ServicePackageDto } from '@/hooks/use-service-packages'
import { useServices } from '@/hooks/use-services'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, DollarSign, Users, Package as PackageIcon } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Calendar as ShadcnCalendar } from '@/components/ui/calendar'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Pie, PieChart, Cell } from 'recharts'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { DateRange } from 'react-day-picker'

interface SubscriptionPlanDto {
  id: string
  name: string
  price: number
  cycleInDays: number
  isActive: boolean
  services: { id: string; name: string }[]
  _count?: { clientSubscriptions: number }
}

export default function MembershipsPage() {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'packages'>('subscriptions')
  const { toast } = useToast()

  // Stats
  type Stats = {
    mrr: number
    activeSubscriptionsCount: number
    activePackagesCount: number
    topSubscriptionPlans: { name: string; revenue: number }[]
    topSellingPackages: { name: string; count: number }[]
    packageSalesThisMonth: { count: number; revenue: number }
    creditsUsedThisMonth: number
    retentionRate?: number | null
    financialSummary?: {
      revenueSubscriptions: number
      revenuePackages: number
      refunds: number
      netRevenue: number
    }
    paymentsByMethod?: { method: string; amount: number }[]
  }
  const [stats, setStats] = useState<Stats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  // Packages
  const { packages, fetchPackages, createPackage, updatePackage, deletePackage } = useServicePackages()

  // Subscriptions
  const [plans, setPlans] = useState<SubscriptionPlanDto[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)

  // Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createType, setCreateType] = useState<'PACKAGE' | 'SUBSCRIPTION'>('SUBSCRIPTION')
  const [editingId, setEditingId] = useState<string | null>(null)
  // Services (para ambos os tipos)
  const { services: dbServices } = useServices()
  const serviceOptions = useMemo(() => (dbServices || []).map((s: any) => ({ id: s.id, name: s.name, price: Number(s.price || 0) })), [dbServices])

  // Formulário de Pacote (igual página antiga)
  const [pkgForm, setPkgForm] = useState({ name: '', description: '', totalPrice: '', discount: '0', validDays: '', isActive: true, defaultCredits: '1' })
  // Formulário de Assinatura
  const [subForm, setSubForm] = useState({ name: '', price: '', cycleInDays: '30', isActive: true, description: '' })
  // Lista de serviços selecionados (compartilhado; para assinatura ignora quantidade)
  const [formServices, setFormServices] = useState<{ serviceId: string; quantity: number }[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Filtro de período (igual ao Financeiro): DateRange via Calendar + Popover
  const nowLocal = new Date()
  const initialFrom = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), 1, 0, 0, 0, 0)
  const initialTo = new Date(nowLocal.getFullYear(), nowLocal.getMonth() + 1, 0, 23, 59, 59, 999)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: initialFrom, to: initialTo })

  function getPeriodRange(): { from?: string; to?: string } {
    const from = dateRange?.from ? new Date(dateRange.from) : undefined
    const to = dateRange?.to ? new Date(dateRange.to) : from
    if (!from || !to) return {}
    const toAdj = new Date(to)
    toAdj.setHours(23,59,59,999)
    return { from: from.toISOString(), to: toAdj.toISOString() }
  }

  useEffect(() => {
    const controller = new AbortController()
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

    async function load() {
      try {
        setLoadingStats(true)
        const { from, to } = getPeriodRange()
        const qs = new URLSearchParams()
        if (from) qs.set('from', from)
        if (to) qs.set('to', to)
        const res = await fetch(`/api/memberships/stats${qs.toString() ? `?${qs.toString()}` : ''}`,
          { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
        const data = await res.json()
        if (res.ok) setStats(data)
      } catch (e) {
        // ignore
      } finally {
        setLoadingStats(false)
      }
    }

    load()
    fetchPackages(controller.signal)
    fetchPlans()

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange])

  async function fetchPlans() {
    try {
      setLoadingPlans(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const res = await fetch('/api/subscription-plans', { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Erro ao carregar planos')
      setPlans((data.plans || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price || 0),
        cycleInDays: Number(p.cycleInDays || 30),
        isActive: !!p.isActive,
        services: Array.isArray(p.services) ? p.services : [],
        _count: p._count || undefined,
      })))
      if (data.warning) {
        toast({ title: 'Aviso', description: data.warning })
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setLoadingPlans(false)
    }
  }

  const mrrDisplay = useMemo(() => formatPrice(stats?.mrr || 0), [stats])
  const retentionPctDisplay = useMemo(() => {
    if (stats?.retentionRate == null) return '—'
    return `${Math.round((stats.retentionRate || 0) * 100)}%`
  }, [stats])

  function resetForms() {
    setPkgForm({ name: '', description: '', totalPrice: '', discount: '0', validDays: '', isActive: true, defaultCredits: '1' })
    setSubForm({ name: '', price: '', cycleInDays: '30', isActive: true, description: '' })
    setFormServices([])
    setEditingId(null)
  }

  function openCreate(type: 'SUBSCRIPTION' | 'PACKAGE') {
    setCreateType(type)
    resetForms()
    setIsCreateOpen(true)
  }

  const addService = () => setFormServices(prev => [...prev, { serviceId: serviceOptions[0]?.id || '', quantity: 1 }])
  const removeService = (idx: number) => setFormServices(prev => prev.filter((_, i) => i !== idx))
  const updateServiceField = (idx: number, field: 'serviceId' | 'quantity', value: string) => {
    // Só permitimos alterar o serviço; quantidade sempre 1 (créditos são do pacote, não por serviço)
    if (field !== 'serviceId') return
    setFormServices(prev => prev.map((row, i) => (i === idx ? { ...row, serviceId: value } : row)))
  }

  // Abrir modal pré-preenchido para edição de Plano
  function openEditPlan(plan: SubscriptionPlanDto) {
    setCreateType('SUBSCRIPTION')
    setEditingId(plan.id)
    setSubForm({
      name: plan.name,
      price: String(plan.price ?? ''),
      cycleInDays: String(plan.cycleInDays ?? '30'),
      isActive: !!plan.isActive,
      description: ''
    })
    setFormServices((plan.services || []).map(s => ({ serviceId: s.id, quantity: 1 })))
    setIsCreateOpen(true)
  }

  // Abrir modal pré-preenchido para edição de Pacote
  function openEditPackage(pkg: ServicePackageDto) {
    setCreateType('PACKAGE')
    setEditingId(pkg.id)
    setPkgForm({
      name: pkg.name || '',
      description: pkg.description || '',
      totalPrice: String(pkg.totalPrice ?? ''),
      discount: String(pkg.discount ?? '0'),
      validDays: pkg.validDays != null ? String(pkg.validDays) : '',
      isActive: !!pkg.isActive,
      defaultCredits: (pkg as any).defaultCredits != null ? String((pkg as any).defaultCredits) : '1'
    } as any)
    setFormServices((pkg.services || []).map(s => ({ serviceId: s.serviceId, quantity: 1 })))
    setIsCreateOpen(true)
  }

  async function handleCreate() {
    try {
      if (submitting) return
      setSubmitting(true)
      if (createType === 'SUBSCRIPTION') {
        const selectedServiceIds = formServices.map(s => s.serviceId).filter(Boolean)
        if (!subForm.name || !subForm.price || selectedServiceIds.length === 0) {
          toast({ title: 'Campos obrigatórios', description: 'Nome, Preço e ao menos um serviço são necessários', variant: 'destructive' })
          return
        }
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        const payload: any = {
          name: subForm.name,
          price: Number(subForm.price),
          cycleInDays: Number(subForm.cycleInDays || '30'),
          isActive: subForm.isActive,
          services: selectedServiceIds
        }
        // Se estiver editando, usar PUT
        const url = '/api/subscription-plans'
        const method = editingId ? 'PUT' : 'POST'
        if (editingId) payload.id = editingId
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) })
  const data = await res.json()
  if (!res.ok && res.status !== 201) throw new Error(data?.message || (editingId ? 'Erro ao atualizar plano' : 'Erro ao criar plano'))
  const msg = data?.warning ? `${editingId ? 'Plano atualizado' : 'Plano criado'} (serviços não vinculados ainda)` : (editingId ? 'Plano atualizado' : 'Plano criado')
  toast({ title: msg, description: data?.warning || (editingId ? 'Plano de assinatura atualizado com sucesso.' : 'Plano de assinatura criado com sucesso.') })
  await fetchPlans()
      } else {
        const selectedServices = formServices.filter(s => !!s.serviceId)
        if (!pkgForm.name || !pkgForm.totalPrice || selectedServices.length === 0) {
          toast({ title: 'Campos obrigatórios', description: 'Nome, Preço e ao menos um serviço são necessários', variant: 'destructive' })
          return
        }
        const payload: any = {
          name: pkgForm.name,
          description: pkgForm.description || undefined,
          totalPrice: Number(pkgForm.totalPrice),
          discount: Number(pkgForm.discount || '0'),
          validDays: pkgForm.validDays ? Number(pkgForm.validDays) : undefined,
          isActive: pkgForm.isActive,
          defaultCredits: pkgForm.defaultCredits ? Number(pkgForm.defaultCredits) : 1,
          // Quantidade por serviço não é configurável: sempre 1. Créditos pertencem ao pacote (defaultCredits)
          services: selectedServices.map(s => ({ serviceId: s.serviceId, quantity: 1 }))
        }
        if (editingId) {
          payload.id = editingId
          await updatePackage(payload)
          toast({ title: 'Pacote atualizado', description: 'Pacote atualizado com sucesso.' })
        } else {
          await createPackage(payload as any)
          toast({ title: 'Pacote criado', description: 'Pacote de créditos criado com sucesso.' })
        }
      }
      setIsCreateOpen(false)
      resetForms()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeletePlan(id: string) {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const res = await fetch(`/api/subscription-plans?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Erro ao remover plano')
      toast({ title: 'Plano removido', description: 'Plano de assinatura removido com sucesso.' })
      await fetchPlans()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  async function handleDeletePackage(id: string) {
    try {
      await deletePackage(id)
      toast({ title: 'Pacote removido', description: 'Pacote removido com sucesso.' })
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#ededed]">Assinaturas e Pacotes</h1>
          <p className="text-[#3f3f46]">Gerencie os planos de fidelização</p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9">
                Selecionar período
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <div className="p-3">
                <ShadcnCalendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </div>
            </PopoverContent>
          </Popover>
          <Button onClick={() => openCreate('SUBSCRIPTION')} className="bg-tymer-primary hover:bg-tymer-primary/80">Criar Plano</Button>
        </div>
      </div>

      {/* Cards financeiros do mês */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Assinaturas (mês)</CardTitle>
            <DollarSign className="h-4 w-4 text-tymer-icon" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {loadingStats ? <Skeleton className="h-7 w-28 bg-[#2a2a2e]"/> : formatPrice(stats?.financialSummary?.revenueSubscriptions || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Pacotes (mês)</CardTitle>
            <PackageIcon className="h-4 w-4 text-tymer-icon" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {loadingStats ? <Skeleton className="h-7 w-28 bg-[#2a2a2e]"/> : formatPrice(stats?.financialSummary?.revenuePackages || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estornos (mês)</CardTitle>
            <DollarSign className="h-4 w-4 text-tymer-icon" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {loadingStats ? <Skeleton className="h-7 w-20 bg-[#2a2a2e]"/> : formatPrice(stats?.financialSummary?.refunds || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Líquida (mês)</CardTitle>
            <DollarSign className="h-4 w-4 text-tymer-icon" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {loadingStats ? <Skeleton className="h-7 w-28 bg-[#2a2a2e]"/> : formatPrice(stats?.financialSummary?.netRevenue || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pie: receita de planos por forma de pagamento (período) */}
      <Card>
        <CardHeader>
          <CardTitle>Receita de Planos por Forma de Pagamento (mês)</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStats ? (
            <Skeleton className="h-64 w-full bg-[#2a2a2e]" />
          ) : (stats?.paymentsByMethod && stats.paymentsByMethod.length > 0 ? (
            <div className="w-full">
              <ChartContainer
                config={{
                  CASH: { label: 'Dinheiro', color: '#22c55e' },
                  PIX: { label: 'PIX', color: '#06b6d4' },
                  CARD: { label: 'Cartão', color: '#a78bfa' },
                  DEBIT: { label: 'Débito', color: '#f59e0b' },
                  CREDIT: { label: 'Crédito', color: '#f97316' },
                  TRANSFER: { label: 'Transferência', color: '#60a5fa' },
                  PREPAID: { label: 'Pré-pago', color: '#eab308' },
                  UNKNOWN: { label: 'Outro', color: '#94a3b8' },
                }}
                className="h-64"
              >
                <PieChart>
                  <Pie
                    data={(stats.paymentsByMethod || []).map((d) => ({ ...d, name: d.method }))}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {(stats.paymentsByMethod || []).map((entry, index) => {
                      const key = (entry.method || 'UNKNOWN') as string
                      const colors: Record<string, string> = {
                        CASH: '#22c55e', PIX: '#06b6d4', CARD: '#a78bfa', DEBIT: '#f59e0b', CREDIT: '#f97316', TRANSFER: '#60a5fa', PREPAID: '#eab308', UNKNOWN: '#94a3b8'
                      }
                      return <Cell key={`cell-${index}`} fill={colors[key] || colors.UNKNOWN} />
                    })}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent formatter={(value: any, name: any) => [formatPrice(Number(value) || 0), name]} />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            </div>
          ) : (
            <div className="text-sm text-[#a1a1aa]">Sem dados de pagamentos neste período.</div>
          ))}
        </CardContent>
      </Card>

      {/* Cards topo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Recorrente Mensal (MRR)</CardTitle>
            <DollarSign className="h-4 w-4 text-tymer-icon" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {loadingStats ? <Skeleton className="h-7 w-32 bg-[#2a2a2e]"/> : mrrDisplay}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes com Assinatura Ativa</CardTitle>
            <Users className="h-4 w-4 text-tymer-icon" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {loadingStats ? <Skeleton className="h-7 w-12 bg-[#2a2a2e]"/> : (stats?.activeSubscriptionsCount ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes com Pacotes Ativos</CardTitle>
            <PackageIcon className="h-4 w-4 text-tymer-icon" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {loadingStats ? <Skeleton className="h-7 w-12 bg-[#2a2a2e]"/> : (stats?.activePackagesCount ?? 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList>
          <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
          <TabsTrigger value="packages">Pacotes</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-4">
          {/* Cards de análise - Assinaturas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>MRR por Plano</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingStats ? (
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-2/3 bg-[#2a2a2e]"/>
                    <Skeleton className="h-5 w-1/2 bg-[#2a2a2e]"/>
                    <Skeleton className="h-5 w-3/4 bg-[#2a2a2e]"/>
                  </div>
                ) : (stats?.topSubscriptionPlans?.length ? (
                  <div className="space-y-2">
                    {stats.topSubscriptionPlans.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-md px-3 py-2 bg-[#111114] border border-[#27272a]">
                        <div className="text-sm text-[#ededed]">{p.name}</div>
                        <div className="text-sm font-medium">{formatPrice(p.revenue || 0)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-[#a1a1aa]">Sem dados de MRR por plano ainda.</div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Retenção (mês)</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <Skeleton className="h-7 w-20 bg-[#2a2a2e]"/>
                ) : (
                  <div>
                    <div className="text-2xl font-semibold">{retentionPctDisplay}</div>
                    {typeof stats?.retentionRate === 'number' && (
                      <div className="mt-3">
                        <Progress value={(stats.retentionRate || 0) * 100} />
                      </div>
                    )}
                  </div>
                )}
                <div className="text-xs text-[#a1a1aa] mt-1">Estimativa baseada nas assinaturas ativas no início do mês e churn até agora.</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Planos de Assinatura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingPlans ? (
                <div>Carregando...</div>
              ) : plans.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhum plano criado ainda.</div>
              ) : (
                <div className="space-y-2">
                  {plans.map(p => (
                    <div key={p.id} className="flex items-center justify-between rounded-md px-3 py-2 bg-[#111114] border border-[#27272a]">
                      <div className="min-w-0">
                        <div className="font-medium text-[#ededed] truncate">{p.name}</div>
                        <div className="text-sm text-[#a1a1aa]">{formatPrice(p.price)} • ciclo {p.cycleInDays} dias</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {p._count?.clientSubscriptions != null && (
                          <Badge variant="secondary" className="bg-[#1f1f23] text-[#ededed] border border-[#2b2b30]">{p._count.clientSubscriptions}</Badge>
                        )}
                        <Button variant="outline" size="sm" onClick={() => openEditPlan(p)}>Editar</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeletePlan(p.id)}>Remover</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packages" className="space-y-4">
          {/* Cards de análise - Pacotes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Pacotes Vendidos (este mês)</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-24 bg-[#2a2a2e]"/>
                    <Skeleton className="h-5 w-28 bg-[#2a2a2e]"/>
                  </div>
                ) : (
                  <div>
                    <div className="text-2xl font-semibold">{stats?.packageSalesThisMonth?.count ?? 0}</div>
                    <div className="text-xs text-[#a1a1aa]">Receita: {formatPrice(stats?.packageSalesThisMonth?.revenue || 0)}</div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Pacotes Mais Vendidos</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-2/3 bg-[#2a2a2e]"/>
                    <Skeleton className="h-5 w-1/2 bg-[#2a2a2e]"/>
                    <Skeleton className="h-5 w-3/4 bg-[#2a2a2e]"/>
                  </div>
                ) : (stats?.topSellingPackages?.length ? (
                  <div className="space-y-2">
                    {stats.topSellingPackages.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-md px-3 py-2 bg-[#111114] border border-[#27272a]">
                        <div className="text-sm text-[#ededed]">{p.name}</div>
                        <Badge variant="secondary" className="bg-[#1f1f23] text-[#ededed] border border-[#2b2b30]">{p.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-[#a1a1aa]">Sem dados de vendas ainda.</div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Créditos Usados (este mês)</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <Skeleton className="h-7 w-20 bg-[#2a2a2e]"/>
                ) : (
                  <div className="text-2xl font-semibold">{stats?.creditsUsedThisMonth ?? 0}</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pacotes de Créditos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {packages.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhum pacote criado ainda.</div>
              ) : (
                <div className="space-y-2">
                  {packages.map((pkg: ServicePackageDto) => (
                    <div key={pkg.id} className="flex items-center justify-between rounded-md px-3 py-2 bg-[#111114] border border-[#27272a]">
                      <div className="min-w-0">
                        <div className="font-medium text-[#ededed] truncate">{pkg.name}</div>
                        <div className="text-sm text-[#a1a1aa]">{formatPrice(pkg.totalPrice)}{pkg.validDays ? ` • validade ${pkg.validDays} dias` : ''}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditPackage(pkg)}>Editar</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeletePackage(pkg.id)}>Remover</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de criação (padronizado com o modal de agendamento) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent
          onOpenAutoFocus={(e) => { e.preventDefault() }}
          className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-2xl mx-auto h-full sm:h-auto sm:max-h-[85vh] flex flex-col p-0 rounded-xl"
        >
          <DialogHeader className="border-b border-[#27272a] pb-3 md:pb-4 px-4 sm:px-6 pt-4 flex-shrink-0">
            <DialogTitle>{createType === 'SUBSCRIPTION' ? 'Nova Assinatura' : 'Novo Pacote'}</DialogTitle>
            <DialogDescription>
              {createType === 'SUBSCRIPTION'
                ? 'Defina os detalhes do plano de assinatura e os serviços incluídos.'
                : 'Defina os detalhes e serviços do pacote. Os créditos são do pacote (pool unificado). O cliente consome 1 crédito quando agenda exatamente o combo definido.'}
            </DialogDescription>
          </DialogHeader>

          {/* Corpo scrollável */}
          <div className="overflow-y-auto flex-1 px-4 sm:px-6 space-y-4 mt-3">
            <div>
              <Label>Tipo</Label>
              <Select value={createType} onValueChange={(v: any) => setCreateType(v)}>
                <SelectTrigger className="bg-[#27272a] border-[#3f3f46] mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUBSCRIPTION">Assinatura</SelectItem>
                  <SelectItem value="PACKAGE">Pacote</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {createType === 'PACKAGE' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={pkgForm.name} onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} className="bg-[#27272a] border-[#3f3f46]"/>
                </div>
                <div>
                  <Label>Preço total</Label>
                  <Input type="number" step="0.01" value={pkgForm.totalPrice} onChange={e => setPkgForm(f => ({ ...f, totalPrice: e.target.value }))} className="bg-[#27272a] border-[#3f3f46]"/>
                </div>
                <div>
                  <Label>Desconto (%)</Label>
                  <Input type="number" step="0.01" value={pkgForm.discount} onChange={e => setPkgForm(f => ({ ...f, discount: e.target.value }))} className="bg-[#27272a] border-[#3f3f46]"/>
                </div>
                <div>
                  <Label>Validade (dias)</Label>
                  <Input type="number" value={pkgForm.validDays} onChange={e => setPkgForm(f => ({ ...f, validDays: e.target.value }))} className="bg-[#27272a] border-[#3f3f46]"/>
                </div>
                <div>
                  <Label>Créditos por pacote</Label>
                  <Input type="number" min={1} value={pkgForm.defaultCredits} onChange={e => setPkgForm(f => ({ ...f, defaultCredits: e.target.value }))} className="bg-[#27272a] border-[#3f3f46]"/>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={pkgForm.isActive} onCheckedChange={(v) => setPkgForm(f => ({ ...f, isActive: v }))} />
                  <Label>Ativo</Label>
                </div>
                <div className="md:col-span-2">
                  <Label>Descrição</Label>
                  <Input value={pkgForm.description} onChange={e => setPkgForm(f => ({ ...f, description: e.target.value }))} className="bg-[#27272a] border-[#3f3f46]"/>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={subForm.name} onChange={e => setSubForm(f => ({ ...f, name: e.target.value }))} className="bg-[#27272a] border-[#3f3f46]"/>
                </div>
                <div>
                  <Label>Preço</Label>
                  <Input type="number" step="0.01" value={subForm.price} onChange={e => setSubForm(f => ({ ...f, price: e.target.value }))} className="bg-[#27272a] border-[#3f3f46]"/>
                </div>
                <div>
                  <Label>Ciclo (dias)</Label>
                  <Input type="number" value={subForm.cycleInDays} onChange={e => setSubForm(f => ({ ...f, cycleInDays: e.target.value }))} className="bg-[#27272a] border-[#3f3f46]"/>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={subForm.isActive} onCheckedChange={(v) => setSubForm(f => ({ ...f, isActive: v }))} />
                  <Label>Ativo</Label>
                </div>
                <div className="md:col-span-2">
                  <Label>Descrição</Label>
                  <Input value={subForm.description} onChange={e => setSubForm(f => ({ ...f, description: e.target.value }))} className="bg-[#27272a] border-[#3f3f46]"/>
                </div>
              </div>
            )}

            {/* Serviços selecionados (mesmo layout do modal antigo de pacotes) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Serviços {createType === 'PACKAGE' ? 'do pacote' : 'da assinatura'}</Label>
                <Button variant="secondary" onClick={addService}><Plus className="w-4 h-4 mr-1"/> Adicionar</Button>
              </div>
              <div className="space-y-3">
                {formServices.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
                    <div className="md:col-span-5">
                      <Select value={row.serviceId} onValueChange={(v) => updateServiceField(idx, 'serviceId', v)}>
                        <SelectTrigger className="bg-[#27272a] border-[#3f3f46]">
                          <SelectValue placeholder="Selecione um serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceOptions.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-right">
                      <Button variant="destructive" onClick={() => removeService(idx)}><Trash2 className="w-4 h-4"/></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-3 p-4 sm:p-6 flex-shrink-0 pt-4 md:pt-2 border-t border-[#27272a] sm:border-t-0">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleCreate} className="bg-tymer-primary hover:bg-tymer-primary/80" disabled={submitting}>{submitting ? 'Salvando…' : (editingId ? 'Atualizar' : 'Salvar')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
