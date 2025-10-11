"use client"

import { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Plus, Trash2 } from 'lucide-react'

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
  const [stats, setStats] = useState<{ mrr: number; activeSubscriptions: number; activePackages: number } | null>(null)
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

  useEffect(() => {
    const controller = new AbortController()
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

    async function load() {
      try {
        setLoadingStats(true)
        const res = await fetch('/api/memberships/stats', { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
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
  }, [])

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
        <Button onClick={() => openCreate('SUBSCRIPTION')} className="bg-tymer-primary hover:bg-tymer-primary/80">Criar Plano</Button>
      </div>

      {/* Cards topo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Receita Recorrente Mensal (MRR)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loadingStats ? 'Carregando...' : mrrDisplay}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Clientes com Assinatura Ativa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loadingStats ? '...' : (stats?.activeSubscriptions ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Clientes com Pacotes Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loadingStats ? '...' : (stats?.activePackages ?? 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList>
          <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
          <TabsTrigger value="packages">Pacotes</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-4">
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
                    <div key={p.id} className="flex items-center justify-between border border-[#27272a] rounded-md p-3">
                      <div>
                        <div className="font-medium text-[#ededed]">{p.name}</div>
                        <div className="text-sm text-[#a1a1aa]">{formatPrice(p.price)} • ciclo {p.cycleInDays} dias</div>
                      </div>
                      <div className="flex items-center gap-2">
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
                    <div key={pkg.id} className="flex items-center justify-between border border-[#27272a] rounded-md p-3">
                      <div>
                        <div className="font-medium text-[#ededed]">{pkg.name}</div>
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

      {/* Modal de criação (fiel ao de pacotes com seletor de tipo) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-[#18181b] border-[#3f3f46] text-[#ededed] max-w-2xl">
          <DialogHeader>
            <DialogTitle>{createType === 'SUBSCRIPTION' ? 'Nova Assinatura' : 'Novo Pacote'}</DialogTitle>
            <DialogDescription>
              {createType === 'SUBSCRIPTION'
                ? 'Defina os detalhes do plano de assinatura e os serviços incluídos.'
                : 'Defina os detalhes e serviços do pacote. Os créditos são do pacote (pool unificado). O cliente consome 1 crédito quando agenda exatamente o combo definido.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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

          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleCreate} className="bg-tymer-primary hover:bg-tymer-primary/80" disabled={submitting}>{submitting ? 'Salvando…' : (editingId ? 'Atualizar' : 'Salvar')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
