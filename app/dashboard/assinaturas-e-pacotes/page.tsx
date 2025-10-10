"use client"

import { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { formatPrice } from '@/lib/api-utils'
import { useServicePackages, ServicePackageDto } from '@/hooks/use-service-packages'

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

  // Form fields (simplified)
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState<number | ''>('')
  const [formCycleInDays, setFormCycleInDays] = useState<number | ''>('')
  const [formValidDays, setFormValidDays] = useState<number | ''>('')

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
      setPlans(data.plans || [])
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setLoadingPlans(false)
    }
  }

  const mrrDisplay = useMemo(() => formatPrice(stats?.mrr || 0), [stats])

  function resetForm() {
    setFormName('')
    setFormPrice('')
    setFormCycleInDays('')
    setFormValidDays('')
    setCreateType('SUBSCRIPTION')
  }

  async function handleCreate() {
    try {
      if (createType === 'SUBSCRIPTION') {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        const payload = { name: formName, price: Number(formPrice || 0), cycleInDays: Number(formCycleInDays || 30), isActive: true, services: [] as string[] }
        const res = await fetch('/api/subscription-plans', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.message || 'Erro ao criar plano')
        toast({ title: 'Plano criado', description: 'Plano de assinatura criado com sucesso.' })
        await fetchPlans()
      } else {
        const payload = { name: formName, totalPrice: Number(formPrice || 0), validDays: formValidDays ? Number(formValidDays) : null, discount: 0, isActive: true, services: [] }
        await createPackage(payload as any)
        toast({ title: 'Pacote criado', description: 'Pacote de créditos criado com sucesso.' })
      }
      setIsCreateOpen(false)
      resetForm()
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
        <Button onClick={() => setIsCreateOpen(true)} className="bg-tymer-primary hover:bg-tymer-primary/80">Criar Novo Plano</Button>
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
                        <Button variant="outline" size="sm" onClick={() => toast({ title: 'Em breve', description: 'Edição de planos em desenvolvimento.' })}>Editar</Button>
                        <Button variant="destructive" size="sm" onClick={() => toast({ title: 'Em breve', description: 'Remoção de planos em desenvolvimento.' })}>Remover</Button>
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
                        <Button variant="outline" size="sm" onClick={() => toast({ title: 'Em breve', description: 'Edição de pacotes em desenvolvimento.' })}>Editar</Button>
                        <Button variant="destructive" size="sm" onClick={() => toast({ title: 'Em breve', description: 'Remoção de pacotes em desenvolvimento.' })}>Remover</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de criação */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Plano</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Tipo de Plano</Label>
              <Select value={createType} onValueChange={(v: any) => setCreateType(v)}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUBSCRIPTION">Assinatura Recorrente</SelectItem>
                  <SelectItem value="PACKAGE">Pacote de Créditos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Nome</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Plano Ilimitado" />
              </div>
              <div>
                <Label>Preço</Label>
                <Input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0,00" />
              </div>
              {createType === 'SUBSCRIPTION' ? (
                <div>
                  <Label>Ciclo (dias)</Label>
                  <Input type="number" value={formCycleInDays} onChange={(e) => setFormCycleInDays(e.target.value === '' ? '' : Number(e.target.value))} placeholder="30" />
                </div>
              ) : (
                <div>
                  <Label>Validade (dias)</Label>
                  <Input type="number" value={formValidDays} onChange={(e) => setFormValidDays(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex: 90" />
                </div>
              )}
            </div>

            <Separator />
            <div className="text-xs text-[#a1a1aa]">A seleção de serviços e quantidades será adicionada na edição do plano.</div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} className="bg-tymer-primary hover:bg-tymer-primary/80">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
