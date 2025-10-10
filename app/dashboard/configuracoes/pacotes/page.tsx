"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useServicePackages } from '@/hooks/use-service-packages'
import { useServices } from '@/hooks/use-services'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/currency'
import { Plus, Trash2, Edit } from 'lucide-react'

type ServiceOption = { id: string; name: string; price: number }

export default function PacotesPage() {
  const { user, isLoading } = useAuth()
  const isCollaborator = user?.role === 'COLLABORATOR'
  const router = useRouter()
  const { packages, loading, error, fetchPackages, createPackage, updatePackage, deletePackage } = useServicePackages()
  const { services: dbServices, fetchServices } = useServices()
  const { toast } = useToast()

  const serviceOptions: ServiceOption[] = useMemo(() => (dbServices || []).map((s: any) => ({ id: s.id, name: s.name, price: Number(s.price || 0) })), [dbServices])

  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', totalPrice: '', discount: '0', validDays: '', isActive: true, defaultCredits: '1' })
  const [formServices, setFormServices] = useState<{ serviceId: string; quantity: number }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (isCollaborator) return
    // Carrega apenas os pacotes aqui. Os serviços já são carregados
    // automaticamente pelo hook useServices no primeiro render.
    // Evita loop de renderizações causado por dependência instável
    // de função não-memoizada.
    fetchPackages()
    // fetchServices() // desnecessário: o hook já busca sozinho
  }, [fetchPackages, isCollaborator])

  // Redireciona colaboradores
  useEffect(() => {
    if (isLoading) return
    if (isCollaborator) router.replace('/dashboard')
  }, [isCollaborator, isLoading, router])

  const resetForm = () => {
    setEditingId(null)
    setForm({ name: '', description: '', totalPrice: '', discount: '0', validDays: '', isActive: true, defaultCredits: '1' })
    setFormServices([])
  }

  const openCreate = () => { resetForm(); setIsOpen(true) }
  const openEdit = (pkg: any) => {
    setEditingId(pkg.id)
    setForm({
      name: pkg.name || '',
      description: pkg.description || '',
      totalPrice: String(pkg.totalPrice || ''),
      discount: String(pkg.discount ?? '0'),
      validDays: pkg.validDays != null ? String(pkg.validDays) : '',
      isActive: !!pkg.isActive,
      defaultCredits: pkg.defaultCredits != null ? String(pkg.defaultCredits) : '1'
    })
    setFormServices((pkg.services || []).map((ps: any) => ({ serviceId: ps.serviceId || ps.service?.id, quantity: ps.quantity || 1 })))
    setIsOpen(true)
  }

  const addService = () => setFormServices(prev => [...prev, { serviceId: serviceOptions[0]?.id || '', quantity: 1 }])
  const removeService = (idx: number) => setFormServices(prev => prev.filter((_, i) => i !== idx))
  const updateServiceField = (idx: number, field: 'serviceId' | 'quantity', value: string) => {
    // Mesmo mantendo o campo quantity no estado por compatibilidade, o UI não expõe mais edição de quantidade
    setFormServices(prev => prev.map((row, i) => i === idx ? { ...row, [field]: field === 'quantity' ? 1 : value } : row))
  }

  const onSubmit = async () => {
    try {
      if (submitting) return
      setSubmitting(true)
      if (!form.name || !form.totalPrice || formServices.length === 0) {
        toast({ title: 'Campos obrigatórios', description: 'Nome, Preço e ao menos um serviço são necessários', variant: 'destructive' })
        return
      }
      const payload = {
        name: form.name,
        description: form.description || undefined,
        totalPrice: Number(form.totalPrice),
        discount: Number(form.discount || '0'),
        validDays: form.validDays ? Number(form.validDays) : undefined,
        isActive: form.isActive,
        defaultCredits: form.defaultCredits ? Number(form.defaultCredits) : 1,
        services: formServices.map(s => ({ serviceId: s.serviceId, quantity: 1 }))
      }
      if (editingId) await updatePackage({ id: editingId, ...payload })
      else await createPackage(payload)
      toast({ title: 'Sucesso', description: editingId ? 'Pacote atualizado' : 'Pacote criado' })
      setIsOpen(false)
      resetForm()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const onDelete = async (id: string) => {
    try {
      if (deletingId) return
      setDeletingId(id)
      await deletePackage(id)
      toast({ title: 'Removido', description: 'Pacote removido com sucesso' })
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setDeletingId(null)
    }
  }

  if (isCollaborator) {
    return (
      <div className="p-6">
        <div className="bg-[#18181b] border border-[#3f3f46] rounded-lg p-4 text-[#a1a1aa]">
          Acesso restrito: apenas o dono pode gerenciar pacotes.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#ededed]">Pacotes de Serviços</h1>
          <p className="text-sm text-[#71717a]">Crie pacotes com múltiplos serviços</p>
        </div>
        <Button onClick={openCreate} className="bg-tymer-primary hover:bg-tymer-primary/80" disabled={submitting}>
          <Plus className="w-4 h-4 mr-2" /> Novo Pacote
        </Button>
      </div>

      <Card className="bg-[#18181b] border-[#3f3f46]">
        <CardHeader>
          <CardTitle className="text-[#ededed]">Pacotes</CardTitle>
          <CardDescription className="text-[#71717a]">{loading ? 'Carregando...' : `${packages.length} pacote(s)`}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="text-red-400 mb-4">{error}</div>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Validade (dias)</TableHead>
                <TableHead>Serviços</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Compras</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{formatCurrency(Number(p.totalPrice || 0))}</TableCell>
                  <TableCell>{p.validDays ?? '-'}</TableCell>
                  <TableCell>
                    <div className="text-sm text-[#a1a1aa]">
                      {(p.services || []).map((ps: any) => (
                        <div key={`${ps.serviceId}`}>{ps.service?.name || ps.serviceId}</div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{p.isActive ? 'Sim' : 'Não'}</TableCell>
                  <TableCell>{p._count?.purchases ?? 0}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button variant="secondary" size="sm" onClick={() => openEdit(p)} disabled={submitting}>
                      <Edit className="w-4 h-4 mr-1"/> Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(p.id)} disabled={deletingId === p.id || submitting}>
                      <Trash2 className="w-4 h-4 mr-1"/> Remover
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-[#18181b] border-[#3f3f46] text-[#ededed] max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Pacote' : 'Novo Pacote'}</DialogTitle>
            <DialogDescription>
              Defina os detalhes e serviços do pacote. Os créditos são do pacote (pool unificado).
              O cliente consome 1 crédito quando agenda exatamente o combo de serviços definidos aqui.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-[#27272a] border-[#3f3f46]"/>
              </div>
              <div>
                <Label>Preço total</Label>
                <Input type="number" step="0.01" value={form.totalPrice} onChange={e => setForm(f => ({ ...f, totalPrice: e.target.value }))} className="bg-[#27272a] border-[#3f3f46]"/>
              </div>
              <div>
                <Label>Desconto (%)</Label>
                <Input type="number" step="0.01" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} className="bg-[#27272a] border-[#3f3f46]"/>
              </div>
              <div>
                <Label>Validade (dias)</Label>
                <Input type="number" value={form.validDays} onChange={e => setForm(f => ({ ...f, validDays: e.target.value }))} className="bg-[#27272a] border-[#3f3f46]"/>
              </div>
              <div>
                <Label>Créditos por pacote</Label>
                <Input type="number" min={1} value={form.defaultCredits} onChange={e => setForm(f => ({ ...f, defaultCredits: e.target.value }))} className="bg-[#27272a] border-[#3f3f46]"/>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))} />
                <Label>Ativo</Label>
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-[#27272a] border-[#3f3f46]"/>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Serviços do pacote</Label>
                <Button variant="secondary" onClick={addService}><Plus className="w-4 h-4 mr-1"/> Adicionar</Button>
              </div>
              <div className="space-y-3">
                {formServices.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                    <div className="md:col-span-4">
                      <Select value={row.serviceId} onValueChange={(v) => updateServiceField(idx, 'serviceId', v)}>
                        <SelectTrigger className="bg-[#27272a] border-[#3f3f46]">
                          <SelectValue placeholder="Selecione um serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceOptions.map(s => (
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
            <Button variant="secondary" onClick={() => setIsOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={onSubmit} className="bg-tymer-primary hover:bg-tymer-primary/80" disabled={submitting}>{editingId ? (submitting ? 'Salvando…' : 'Salvar') : (submitting ? 'Criando…' : 'Criar')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
