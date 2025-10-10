"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Users, Search, Plus, Phone, MessageCircle, Calendar, DollarSign, Edit, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useServicePackages } from '@/hooks/use-service-packages'
import { useAuth } from '@/hooks/use-auth'
import { useClients } from "@/hooks/use-api"
import { getBrazilNow, formatBrazilDate, formatBrazilDateOnly } from "@/lib/timezone"

interface Client {
  id: string
  name: string
  phone: string
  email?: string
  birthday?: string
  notes?: string
  isActive: boolean
  createdAt: string
  // ✅ DADOS REAIS DO BANCO DE DADOS
  totalSpent: number    // Convertido do Decimal para Number
  totalVisits: number   // Diretamente do banco
  lastVisit?: string    // Diretamente do banco
  // ✅ Appointments apenas para exibição de histórico (não para cálculos)
  appointments?: Array<{
    id: string
    dateTime: string
    status: string
    services: Array<{
      name: string
      price: number
    }>
  }>
}

export default function ClientesPage() {
  const { user } = useAuth()
  const isCollaborator = user?.role === 'COLLABORATOR'
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    clientId: string
    clientName: string
  }>({
    isOpen: false,
    clientId: '',
    clientName: ''
  })
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    birthday: "",
    notes: ""
  })

  const { clients, loading, error, fetchClients, createClient, updateClient, deleteClient } = useClients()
  const [clientPackagesSummary, setClientPackagesSummary] = useState<Record<string, { hasAny: boolean; hasActive: boolean }>>({})
  const summaryAbortRef = useRef<AbortController | null>(null)
  const lastSummaryKeyRef = useRef<string | null>(null)
  const summaryCacheRef = useRef<Record<string, Record<string, { hasAny: boolean; hasActive: boolean }>>>({})
  const [showWalkIns, setShowWalkIns] = useState(false)
  // Pacotes: vender para cliente
  const { packages: availablePackages, fetchPackages } = useServicePackages()
  const [isSellPackageOpen, setIsSellPackageOpen] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState<string>('')
  const [overridePrice, setOverridePrice] = useState<string>('')
  const [selling, setSelling] = useState(false)
  const [clientPackagesList, setClientPackagesList] = useState<Array<{ id: string; name: string; purchasedAt: string; expiresAt: string | null; creditsTotal?: number; usedCredits?: number }>>([])
  const [loadingClientPackages, setLoadingClientPackages] = useState(false)
  const [clientPackagesMeta, setClientPackagesMeta] = useState<{ total: number; page: number; pageSize: number; hasNext: boolean } | null>(null)
  const [clientPackagesPage, setClientPackagesPage] = useState(1)
  const [processingAction, setProcessingAction] = useState<string | null>(null)

  useEffect(() => {
    fetchClients(true, { includeWalkIn: showWalkIns, search: searchTerm || undefined }) // Buscar clientes ativos; incluir walk-ins se selecionado
  }, [fetchClients, showWalkIns])

  // Carrega pacotes disponíveis (apenas para OWNER via API)
  useEffect(() => {
    if (isCollaborator) return
    fetchPackages()
  }, [fetchPackages, isCollaborator])

  // Buscar resumo de pacotes por cliente para Colorir botão "Pacote" (debounce + cancel + cache)
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        if (isCollaborator) { setClientPackagesSummary({}); return }
        if (!clients || clients.length === 0) { setClientPackagesSummary({}); return }
        const ids = clients.map((c: any) => c.id)
        const key = ids.sort().join(',')

        if (summaryCacheRef.current[key]) {
          setClientPackagesSummary(summaryCacheRef.current[key])
          lastSummaryKeyRef.current = key
          return
        }
        if (lastSummaryKeyRef.current === key) return

        if (summaryAbortRef.current) summaryAbortRef.current.abort()
        const controller = new AbortController()
        summaryAbortRef.current = controller

        const url = new URL('/api/client-packages/summary', window.location.origin)
        url.searchParams.set('clientIds', key)
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        const res = await fetch(url.toString(), { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, credentials: 'include', signal: controller.signal })
        if (!res.ok) { setClientPackagesSummary({}); return }
        const data = await res.json()
        const summary = data.summary || {}
        summaryCacheRef.current[key] = summary
        lastSummaryKeyRef.current = key
        setClientPackagesSummary(summary)
      } catch (e: any) {
        if (e?.name === 'AbortError') return
        console.error('Erro ao buscar resumo de pacotes:', e)
        setClientPackagesSummary({})
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [clients, isCollaborator])

  // Recarregar quando searchTerm mudar (debounce simples opcional futuramente)
  useEffect(() => {
    const t = setTimeout(() => {
      fetchClients(true, { includeWalkIn: showWalkIns, search: searchTerm || undefined })
    }, 300)
    return () => clearTimeout(t)
  }, [searchTerm, showWalkIns, fetchClients])

  // Previne foco automático no modal de novo/editar cliente (apenas no primeiro input)
  useEffect(() => {
    if (showAddDialog) {
      const timer = setTimeout(() => {
        // Remove foco apenas do primeiro input quando o modal abre
        const modal = document.querySelector('[data-state="open"]')
        if (modal) {
          const firstInput = modal.querySelector('input[id="name"]') as HTMLElement
          if (firstInput && firstInput === document.activeElement) {
            firstInput.blur()
          }
        }
      }, 100) // Timeout menor para ser menos invasivo
      
      return () => clearTimeout(timer)
    }
  }, [showAddDialog])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingClient) {
        await updateClient({ ...formData, id: editingClient.id })
      } else {
        await createClient(formData)
      }
      
      // Recarregar lista
      await fetchClients(true)
      
      // Resetar form
      setFormData({ name: "", phone: "", email: "", birthday: "", notes: "" })
      setShowAddDialog(false)
      setEditingClient(null)
    } catch (error) {
      console.error('Erro ao salvar cliente:', error)
    }
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      name: client.name,
      phone: client.phone,
      email: client.email || "",
      birthday: client.birthday ? client.birthday.split('T')[0] : "",
      notes: client.notes || ""
    })
    setShowAddDialog(true)
  }

  const handleDelete = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      clientId: id,
      clientName: name
    })
  }

  const handleConfirmDelete = async () => {
    try {
      await deleteClient(confirmDialog.clientId)
      await fetchClients(true)
      
      // Fechar o modal
      setConfirmDialog({
        isOpen: false,
        clientId: '',
        clientName: ''
      })
    } catch (error) {
      console.error('Erro ao deletar cliente:', error)
    }
  }

  const resetForm = () => {
    setFormData({ name: "", phone: "", email: "", birthday: "", notes: "" })
    setEditingClient(null)
    setShowAddDialog(false)
  }

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client)
    setShowDetailsModal(true)
  }

  const openSellPackage = (client: Client) => {
    setSelectedClient(client)
    setSelectedPackageId('')
    setOverridePrice('')
    setClientPackagesPage(1)
    // Carregar pacotes já vendidos para este cliente
    ;(async () => {
      try {
        setLoadingClientPackages(true)
        const url = new URL('/api/client-packages', window.location.origin)
        url.searchParams.set('clientId', client.id)
        url.searchParams.set('page', '1')
        url.searchParams.set('pageSize', '5')
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        const res = await fetch(url.toString(), { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, credentials: 'include' })
        if (!res.ok) { setClientPackagesList([]); setClientPackagesMeta(null) }
        else {
          const data = await res.json()
          const items = (data.items || []).map((it: any) => ({ id: it.id, name: it.package?.name || 'Pacote', purchasedAt: it.purchasedAt, expiresAt: it.expiresAt, creditsTotal: it.creditsTotal, usedCredits: it.usedCredits }))
          setClientPackagesList(items)
          setClientPackagesMeta(data.meta || null)
        }
      } catch (e) {
        console.error('Erro ao carregar pacotes do cliente:', e)
        setClientPackagesList([])
        setClientPackagesMeta(null)
      } finally {
        setLoadingClientPackages(false)
      }
    })()
    setIsSellPackageOpen(true)
  }

  const loadClientPackagesPage = async (page: number) => {
    if (!selectedClient) return
    try {
      setLoadingClientPackages(true)
      const url = new URL('/api/client-packages', window.location.origin)
      url.searchParams.set('clientId', selectedClient.id)
      url.searchParams.set('page', String(page))
      url.searchParams.set('pageSize', '5')
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const res = await fetch(url.toString(), { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, credentials: 'include' })
      if (!res.ok) { return }
      const data = await res.json()
      const items = (data.items || []).map((it: any) => ({ id: it.id, name: it.package?.name || 'Pacote', purchasedAt: it.purchasedAt, expiresAt: it.expiresAt, creditsTotal: it.creditsTotal, usedCredits: it.usedCredits }))
      setClientPackagesList(items)
      setClientPackagesMeta(data.meta || null)
      setClientPackagesPage(page)
    } catch (e) {
      console.error('Erro ao paginar pacotes do cliente', e)
    } finally {
      setLoadingClientPackages(false)
    }
  }

  const deactivateClientPackage = async (id: string) => {
    if (!selectedClient) return
    const confirm = window.confirm('Deseja desativar este pacote? Você pode informar um valor de estorno na próxima etapa.')
    if (!confirm) return
    const refundStr = window.prompt('Valor de estorno (opcional). Deixe em branco para nenhum estorno:', '')
    try {
      setProcessingAction(id)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const body: any = { id, action: 'deactivate' }
      const parsed = refundStr ? Number(String(refundStr).replace(',', '.')) : undefined
      if (parsed && Number.isFinite(parsed) && parsed > 0) body.refundAmount = parsed
      const res = await fetch('/api/client-packages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Erro ao desativar pacote')
      await loadClientPackagesPage(clientPackagesPage)
    } catch (e) {
      console.error('Erro ao desativar pacote', e)
    } finally {
      setProcessingAction(null)
    }
  }

  const sellPackage = async () => {
    if (!selectedClient || !selectedPackageId) return
    try {
      if (selling) return
      setSelling(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const res = await fetch('/api/client-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: JSON.stringify({ clientId: selectedClient.id, packageId: selectedPackageId, overridePrice: overridePrice || undefined })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Erro ao vender pacote')
      setIsSellPackageOpen(false)
    } catch (e) {
      console.error('Erro ao vender pacote', e)
    } finally {
      setSelling(false)
    }
  }

  const getStatusColor = (status: string) => {
    if (status === 'active') return 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20'
    return 'bg-[#3f3f46]/10 text-[#71717a] border-[#3f3f46]/20'
  }

  const getStatusLabel = (status: string) => {
    return status === 'active' ? 'Ativo' : 'Inativo'
  }

  const calculateClientStats = (client: Client) => {
    // ✅ USAR APENAS DADOS DO BANCO DE DADOS - SEM CÁLCULOS
    const totalSpent = Number(client.totalSpent) || 0
    const totalAppointments = Number(client.totalVisits) || 0
    const averageTicket = totalAppointments > 0 ? totalSpent / totalAppointments : 0
    
    return {
      totalSpent,
      totalAppointments, 
      averageTicket: Number(averageTicket) || 0
    }
  }

  const [filterActivePackagesOnly, setFilterActivePackagesOnly] = useState(false)
  const filteredClients = (clients || []).filter((c: any) => {
    if (!filterActivePackagesOnly) return true
    const status = clientPackagesSummary[c.id]
    return !!status?.hasActive
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-2 text-[#71717a]">Carregando clientes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg">
          Erro ao carregar clientes: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#ededed]">Clientes</h1>
          <p className="text-[#a1a1aa]">Gerencie sua base de clientes</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <div className="flex justify-center lg:justify-start w-full lg:w-auto">
              <Button 
                className="bg-tymer-primary hover:bg-tymer-primary/90 text-white w-full lg:w-auto"
                onClick={() => resetForm()}
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </div>
          </DialogTrigger>
          <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-2xl mx-auto h-[85vh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-xl">
            {/* Header fixo */}
            <DialogHeader className="border-b border-[#27272a] pb-3 md:pb-4 flex-shrink-0">
              <DialogTitle className="text-[#ededed] text-base md:text-xl font-semibold flex items-center gap-2">
                <div className="p-1.5 md:p-2 rounded-lg bg-tymer-primary/15 border border-tymer-primary/30">
                  <Plus className="w-4 h-4 md:w-5 md:h-5 text-tymer-primary" />
                </div>
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
              <DialogDescription className="text-[#71717a] text-sm hidden md:block">
                {editingClient ? 'Edite as informações do cliente' : 'Adicione um novo cliente à sua base'}
              </DialogDescription>
            </DialogHeader>
            
            {/* Conteúdo com scroll */}
            <div className="overflow-y-auto flex-1 px-4 sm:px-6">
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 mt-3 md:mt-4">
                {/* Seção de Informações Básicas */}
                <div className="bg-gradient-to-br from-tymer-primary/15 to-tymer-primary/5 p-3 md:p-4 rounded-lg border border-tymer-primary/25 md:bg-tymer-card/50 space-y-3 md:space-y-4">
                  <div className="flex items-center gap-2 mb-2 md:mb-3">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-tymer-primary rounded-full"></div>
                    <h3 className="text-[#ededed] font-medium text-sm md:text-base">Informações Básicas</h3>
                  </div>
                  
                  <div className="space-y-3 md:space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-[#ededed] text-sm font-medium">
                        Nome *
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                        placeholder="Nome completo do cliente"
                        required
                        autoFocus={false}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-[#ededed] text-sm font-medium">
                        Telefone *
                      </Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                        placeholder="(11) 99999-9999"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Seção de Informações Adicionais */}
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-center gap-2 md:hidden">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <h3 className="text-[#ededed] font-medium text-sm">Informações Adicionais</h3>
                  </div>
                  
                  <div className="space-y-3 md:space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-[#ededed] text-sm font-medium">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                        placeholder="email@exemplo.com"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="birthday" className="text-[#ededed] text-sm font-medium">
                        Data de Nascimento
                      </Label>
                      <Input
                        id="birthday"
                        type="date"
                        value={formData.birthday}
                        onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
                        className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-[#ededed] text-sm font-medium">
                        Observações
                      </Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] min-h-16 md:min-h-20 max-h-20 md:max-h-none overflow-y-auto md:overflow-y-visible text-sm resize-none"
                        placeholder="Preferências, alergias, etc..."
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            {/* Footer fixo */}
            <div className="flex gap-3 p-4 sm:p-6 flex-shrink-0 pt-1 md:pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={resetForm} 
                className="flex-1 border-[#3f3f46] text-[#ededed] md:text-[#71717a] hover:bg-[#27272a] hover:border-[#52525b] md:hover:text-[#ededed] transition-all duration-200 h-10 md:min-h-[44px]"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                onClick={handleSubmit}
                className="flex-1 bg-tymer-primary hover:bg-tymer-primary/90 text-white shadow-lg shadow-tymer-primary/20 transition-all duration-200 h-10 md:min-h-[44px]"
              >
                {editingClient ? 'Salvar' : 'Criar Cliente'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#18181b] border-[#27272a]">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between sm:justify-between gap-2 sm:gap-0">
              <div className="text-left sm:text-left">
                <p className="text-[#a1a1aa] text-sm">Total de Clientes</p>
                <p className="text-xl sm:text-2xl font-bold text-[#ededed]">{clients.length}</p>
              </div>
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-tymer-icon" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#18181b] border-[#27272a]">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between sm:justify-between gap-2 sm:gap-0">
              <div className="text-left sm:text-left">
                <p className="text-[#a1a1aa] text-sm">Novos este Mês</p>
                <p className="text-xl sm:text-2xl font-bold text-[#ededed]">
                  {clients.filter(client => {
                    const clientDate = new Date(client.createdAt)
                    const now = getBrazilNow()
                    return clientDate.getMonth() === now.getMonth() && clientDate.getFullYear() === now.getFullYear()
                  }).length}
                </p>
              </div>
              <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-tymer-icon" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#18181b] border-[#27272a]">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between sm:justify-between gap-2 sm:gap-0">
              <div className="text-left sm:text-left">
                <p className="text-[#a1a1aa] text-sm">Com Agendamentos</p>
                <p className="text-xl sm:text-2xl font-bold text-[#ededed]">
                  {clients.filter(client => client.totalVisits > 0).length}
                </p>
              </div>
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-tymer-icon" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#18181b] border-[#27272a]">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between sm:justify-between gap-2 sm:gap-0">
              <div className="text-left sm:text-left">
                <p className="text-[#a1a1aa] text-sm">Faturamento Total</p>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  }).format(
                    clients.reduce((total, client) => {
                      const clientStats = calculateClientStats(client)
                      return total + clientStats.totalSpent
                    }, 0)
                  )}
                </p>
              </div>
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-tymer-icon" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and filters */}
      <Card className="bg-[#18181b] border-[#27272a]">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex items-center gap-2 text-sm text-[#ededed] lg:w-auto">
              <input
                id="show-walkins"
                type="checkbox"
                checked={showWalkIns}
                onChange={(e) => setShowWalkIns(e.target.checked)}
                className="h-4 w-4 rounded border-[#3f3f46] bg-[#27272a] text-tymer-primary focus:ring-tymer-primary"
              />
              <label htmlFor="show-walkins" className="select-none cursor-pointer text-[#a1a1aa] hover:text-[#ededed] transition-colors">
                Incluir clientes de Balcão
              </label>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#3f3f46] w-4 h-4" />
              <Input
                placeholder="Buscar clientes por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#27272a] border-[#3f3f46] text-[#ededed] placeholder:text-[#3f3f46]"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Filtro por Pacote Ativo (abaixo da busca) */}
      {!isCollaborator && (
        <div className="flex items-center gap-2 px-2 sm:px-0">
          <Switch checked={filterActivePackagesOnly} onCheckedChange={(v) => setFilterActivePackagesOnly(Boolean(v))} />
          <span className="text-sm text-[#a1a1aa]">Com pacote ativo</span>
        </div>
      )}

      {/* Clients list */}
      <Card className="bg-[#18181b] border-[#27272a]">
        <CardContent className="p-0">
          {/* Header da tabela - apenas desktop */}
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 pr-6 lg:pr-8 border-b border-[#27272a] text-sm font-medium text-[#a1a1aa]">
            <div className="col-span-2">Cliente</div>
            <div className="col-span-2">Contato</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1">Agendamentos</div>
            <div className="col-span-2">Total Gasto</div>
            <div className="col-span-2">Última Visita</div>
            <div className="col-span-2 pr-2 text-right md:text-left">Ações</div>
          </div>
          
          {/* Lista de clientes */}
          <div className="divide-y divide-gray-700">
            {filteredClients.map((client) => {
              const stats = calculateClientStats(client)
              // ✅ USAR LASTVISIT DO BANCO DE DADOS
              const lastVisit = client.lastVisit ? new Date(client.lastVisit) : null
              
              return (
                <div key={client.id}>
                  {/* Layout Desktop - mantido exatamente igual */}
                  <div className="hidden md:grid grid-cols-12 gap-4 p-4 pr-6 lg:pr-8 hover:bg-[#27272a]/80 transition-colors">
                    {/* Cliente */}
                    <div className="col-span-2">
                      <div>
                        <h3 className="font-medium text-white flex items-center gap-2">{client.name}{client.isWalkIn && (<span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">Balcão</span>)}</h3>
                        <p className="text-xs text-[#71717a]">
                          Cliente desde {formatBrazilDate(new Date(client.createdAt))}
                        </p>
                      </div>
                    </div>
                    
                    {/* Contato */}
                    <div className="col-span-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#71717a]" />
                          <span className="text-sm text-[#a1a1aa]">{client.phone}</span>
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3 text-[#71717a]" />
                            <span className="text-sm text-[#a1a1aa]">{client.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Status */}
                    <div className="col-span-1">
                      <Badge 
                        className={`text-xs ${client.isActive 
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                          : 'bg-[#3f3f46]/10 text-[#71717a] border-[#3f3f46]/20'
                        }`}
                      >
                        {client.isActive ? 'Novo' : 'Inativo'}
                      </Badge>
                    </div>
                    
                    {/* Agendamentos */}
                    <div className="col-span-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-[#71717a]" />
                        <span className="text-white font-medium">{stats.totalAppointments}</span>
                      </div>
                    </div>
                    
                    {/* Total Gasto */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-[#10b981]" />
                        <span className="text-[#10b981] font-medium">
                          {new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          }).format(stats.totalSpent)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Última Visita */}
                    <div className="col-span-2">
                      <span className="text-[#a1a1aa]">
                        {lastVisit ? lastVisit.toLocaleDateString('pt-BR') : 'Nunca'}
                      </span>
                    </div>
                    
                    {/* Ações */}
                    <div className="col-span-2 pr-2">
                      <div className="flex items-center gap-2 flex-nowrap justify-start md:justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(client)}
                          className="shrink-0 border-emerald-600 text-[#10b981] hover:bg-emerald-600/10 px-2 py-1 h-8 text-xs"
                        >
                          Detalhes
                        </Button>
                        {!isCollaborator && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openSellPackage(client)}
                            className={`shrink-0 ${clientPackagesSummary[client.id]?.hasActive ? 'border-emerald-600 text-emerald-400 hover:bg-emerald-600/10' : clientPackagesSummary[client.id]?.hasAny ? 'border-blue-600 text-blue-400 hover:bg-blue-600/10' : 'border-gray-600 text-[#a1a1aa] hover:bg-gray-700'} px-2 py-1 h-8 text-xs`}
                          >
                            <DollarSign className="w-3 h-3 mr-1" /> Pacote
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(client)}
                          className="shrink-0 border-gray-600 text-[#a1a1aa] hover:bg-gray-700 px-2 py-1 h-8"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(client.id, client.name)}
                          className="shrink-0 border-red-600 text-red-400 hover:bg-red-600/10 px-2 py-1 h-8"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Layout Mobile - novo design otimizado */}
                  <div className="block md:hidden p-4 hover:bg-[#27272a]/50 transition-colors">
                    <div className="space-y-3">
                      {/* Header do cliente */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-white text-base flex items-center gap-2">{client.name}{client.isWalkIn && (<span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">Balcão</span>)}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              className={`text-xs ${client.isActive 
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                : 'bg-[#3f3f46]/10 text-[#71717a] border-[#3f3f46]/20'
                              }`}
                            >
                              {client.isActive ? 'Novo' : 'Inativo'}
                            </Badge>
                            <span className="text-xs text-[#71717a]">
                              Desde {formatBrazilDate(new Date(client.createdAt))}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Informações de contato */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-[#71717a] flex-shrink-0" />
                          <span className="text-sm text-[#a1a1aa]">{client.phone}</span>
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4 text-[#71717a] flex-shrink-0" />
                            <span className="text-sm text-[#a1a1aa] truncate">{client.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Estatísticas em cards mini */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-[#27272a]/50 rounded-lg p-2 text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Calendar className="w-3 h-3 text-[#71717a]" />
                          </div>
                          <div className="text-sm font-medium text-white">{stats.totalAppointments}</div>
                          <div className="text-xs text-[#71717a]">Agendamentos</div>
                        </div>
                        <div className="bg-[#27272a]/50 rounded-lg p-2 text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <DollarSign className="w-3 h-3 text-[#10b981]" />
                          </div>
                          <div className="text-sm font-medium text-[#10b981]">
                            {new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL',
                              maximumFractionDigits: 0
                            }).format(stats.totalSpent)}
                          </div>
                          <div className="text-xs text-[#71717a]">Total Gasto</div>
                        </div>
                        <div className="bg-[#27272a]/50 rounded-lg p-2 text-center">
                          <div className="text-sm font-medium text-[#a1a1aa]">
                            {lastVisit ? lastVisit.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'Nunca'}
                          </div>
                          <div className="text-xs text-[#71717a]">Última Visita</div>
                        </div>
                      </div>

                      {/* Botões de ação */}
                      <div className="flex gap-2 pt-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(client)}
                          className="flex-1 border-emerald-600 text-[#10b981] hover:bg-emerald-600/10 text-xs h-8"
                        >
                          Detalhes
                        </Button>
                        {!isCollaborator && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openSellPackage(client)}
                            className={`${clientPackagesSummary[client.id]?.hasActive ? 'border-emerald-600 text-emerald-400 hover:bg-emerald-600/10' : clientPackagesSummary[client.id]?.hasAny ? 'border-blue-600 text-blue-400 hover:bg-blue-600/10' : 'border-gray-600 text-[#a1a1aa] hover:bg-gray-700'} px-3 h-8 text-xs`}
                          >
                            <DollarSign className="w-3 h-3 mr-1" /> Pacote
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(client)}
                          className="border-gray-600 text-[#a1a1aa] hover:bg-gray-700 px-3 h-8"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(client.id, client.name)}
                          className="border-red-600 text-red-400 hover:bg-red-600/10 px-3 h-8"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {filteredClients.length === 0 && (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#71717a] mb-2">
                {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? 'Tente ajustar sua busca ou cadastre um novo cliente'
                  : 'Comece adicionando seu primeiro cliente'
                }
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setShowAddDialog(true)}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Cliente
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Cliente */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-2xl mx-auto h-[85vh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-xl">
          {/* Header fixo */}
          <DialogHeader className="border-b border-[#27272a] pb-3 md:pb-4 flex-shrink-0">
            <DialogTitle className="text-[#ededed] text-base md:text-xl font-semibold flex items-center gap-2">
              <div className="p-1.5 md:p-2 rounded-lg bg-tymer-primary/15 border border-tymer-primary/30">
                <Users className="w-4 h-4 md:w-5 md:h-5 text-tymer-primary" />
              </div>
              Detalhes do Cliente
            </DialogTitle>
            <DialogDescription className="text-[#71717a] text-sm hidden md:block">
              Informações completas e estatísticas do cliente
            </DialogDescription>
          </DialogHeader>
          
          {/* Conteúdo com scroll */}
          <div className="overflow-y-auto flex-1 px-4 sm:px-6">
            {selectedClient && (
              <div className="space-y-4 md:space-y-6 mt-3 md:mt-4">
                {/* Seção de Informações Básicas */}
                <div className="bg-gradient-to-br from-tymer-primary/15 to-tymer-primary/5 p-3 md:p-4 rounded-lg border border-tymer-primary/25 md:bg-tymer-card/50 space-y-3 md:space-y-4">
                  <div className="flex items-center gap-2 mb-2 md:mb-3">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-tymer-primary rounded-full"></div>
                    <h3 className="text-[#ededed] font-medium text-sm md:text-base">Informações Básicas</h3>
                  </div>
                  
                  {/* Layout mobile otimizado */}
                  <div className="block md:hidden space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-2">
                        <Label className="text-[#71717a] text-xs">Nome Completo</Label>
                        <div className="bg-[#27272a]/70 border border-emerald-500/30 rounded-md px-3 py-2.5 text-[#ededed] text-sm font-medium flex items-center justify-between">
                          <span>{selectedClient.name}</span>
                          <Badge className={selectedClient.isActive 
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 px-2 py-1 text-xs' 
                            : 'bg-red-500/15 text-red-400 border-red-500/30 px-2 py-1 text-xs'
                          }>
                            {selectedClient.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-[#71717a] text-xs">Telefone</Label>
                        <div className="bg-[#27272a]/70 border border-emerald-500/30 rounded-md px-3 py-2.5 text-[#ededed] text-sm">
                          {selectedClient.phone}
                        </div>
                      </div>
                    </div>
                    
                    {selectedClient.email && (
                      <div className="space-y-2">
                        <Label className="text-[#71717a] text-xs">E-mail</Label>
                        <div className="bg-[#27272a]/70 border border-emerald-500/30 rounded-md px-3 py-2.5 text-[#ededed] text-sm break-all">
                          {selectedClient.email}
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3">
                      {selectedClient.birthday && (
                        <div className="space-y-2">
                          <Label className="text-[#71717a] text-xs">Aniversário</Label>
                          <div className="bg-[#27272a]/70 border border-emerald-500/30 rounded-md px-3 py-2.5 text-[#ededed] text-sm">
                            {formatBrazilDateOnly(selectedClient.birthday)}
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <Label className="text-[#71717a] text-xs">Cliente desde</Label>
                        <div className="bg-[#27272a]/70 border border-emerald-500/30 rounded-md px-3 py-2.5 text-[#ededed] text-sm">
                          {formatBrazilDate(new Date(selectedClient.createdAt))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Layout desktop (grid 2x3) */}
                  <div className="hidden md:grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#71717a] text-sm">Nome</Label>
                      <div className="bg-[#27272a] border border-[#3f3f46] rounded-md px-3 py-2 text-[#ededed] text-base flex items-center justify-between">
                        <span>{selectedClient.name}</span>
                        <Badge className={selectedClient.isActive 
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 px-3 py-1.5' 
                          : 'bg-red-500/15 text-red-400 border-red-500/30 px-3 py-1.5'
                        }>
                          {selectedClient.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[#71717a] text-sm">Telefone</Label>
                      <div className="bg-[#27272a] border border-[#3f3f46] rounded-md px-3 py-2 text-[#ededed] text-base">
                        {selectedClient.phone}
                      </div>
                    </div>
                    
                    {selectedClient.email && (
                      <div className="space-y-2 col-span-2">
                        <Label className="text-[#71717a] text-sm">E-mail</Label>
                        <div className="bg-[#27272a] border border-[#3f3f46] rounded-md px-3 py-2 text-[#ededed] text-base break-all">
                          {selectedClient.email}
                        </div>
                      </div>
                    )}
                    
                    {selectedClient.birthday && (
                      <div className="space-y-2">
                        <Label className="text-[#71717a] text-sm">Data de Nascimento</Label>
                        <div className="bg-[#27272a] border border-[#3f3f46] rounded-md px-3 py-2 text-[#ededed] text-base">
                          {formatBrazilDateOnly(selectedClient.birthday)}
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label className="text-[#71717a] text-sm">Cliente desde</Label>
                      <div className="bg-[#27272a] border border-[#3f3f46] rounded-md px-3 py-2 text-[#ededed] text-base">
                        {formatBrazilDate(new Date(selectedClient.createdAt))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seção de Observações */}
                {selectedClient.notes && (
                  <div className="bg-gradient-to-br from-purple-500/5 to-purple-600/5 border border-purple-500/20 rounded-lg p-3 md:p-4 md:bg-transparent md:border-none md:rounded-none">
                    <div className="flex items-center gap-2 mb-3 md:mb-4">
                      <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-purple-400 md:bg-purple-500 rounded-full"></div>
                      <h3 className="text-[#ededed] font-medium text-sm md:text-base">Observações</h3>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="bg-[#27272a]/70 md:bg-[#27272a] border border-purple-500/30 md:border-[#3f3f46] rounded-md px-3 py-3 md:py-2 text-[#ededed] text-sm md:text-base min-h-[60px] md:min-h-20 leading-relaxed">
                        {selectedClient.notes}
                      </div>
                    </div>
                  </div>
                )}

                {/* Seção de Estatísticas */}
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-tymer-primary rounded-full"></div>
                    <h3 className="text-[#ededed] font-medium text-sm md:text-base">Estatísticas</h3>
                  </div>
                  
                  {/* Layout mobile otimizado */}
                  <div className="block md:hidden space-y-2">
                    {/* Primeiro card - Agendamentos (destaque) */}
                    <div className="bg-[#27272a]/50 border border-[#3f3f46] rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-white mb-1">
                        {calculateClientStats(selectedClient).totalAppointments}
                      </div>
                      <div className="text-xs text-tymer-icon">Total de Agendamentos</div>
                    </div>
                    
                    {/* Cards secundários em grid 2x1 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#27272a]/50 border border-[#3f3f46] rounded-lg p-3 text-center">
                        <div className="text-base font-bold text-white mb-1 leading-tight">
                          {new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL',
                            maximumFractionDigits: 0
                          }).format(calculateClientStats(selectedClient).totalSpent)}
                        </div>
                        <div className="text-xs text-tymer-icon leading-tight">Total Gasto</div>
                      </div>
                      
                      <div className="bg-[#27272a]/50 border border-[#3f3f46] rounded-lg p-3 text-center">
                        <div className="text-base font-bold text-white mb-1 leading-tight">
                          {new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL',
                            maximumFractionDigits: 0
                          }).format(calculateClientStats(selectedClient).averageTicket)}
                        </div>
                        <div className="text-xs text-tymer-icon leading-tight">Ticket Médio</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Layout desktop (3 colunas) */}
                  <div className="hidden md:grid grid-cols-3 gap-4">
                    <div className="bg-[#27272a] border border-[#3f3f46] rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-white mb-1">
                        {calculateClientStats(selectedClient).totalAppointments}
                      </div>
                      <div className="text-sm text-tymer-icon">Agendamentos</div>
                    </div>
                    
                    <div className="bg-[#27272a] border border-[#3f3f46] rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-white mb-1">
                        {new Intl.NumberFormat('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL',
                          maximumFractionDigits: 0
                        }).format(calculateClientStats(selectedClient).totalSpent)}
                      </div>
                      <div className="text-sm text-tymer-icon">Total Gasto</div>
                    </div>
                    
                    <div className="bg-[#27272a] border border-[#3f3f46] rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-white mb-1">
                        {new Intl.NumberFormat('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL',
                          maximumFractionDigits: 0
                        }).format(calculateClientStats(selectedClient).averageTicket)}
                      </div>
                      <div className="text-sm text-tymer-icon">Ticket Médio</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer fixo */}
          <div className="flex gap-3 p-4 sm:p-6 flex-shrink-0 pt-1 md:pt-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDetailsModal(false)} 
              className="flex-1 border-[#3f3f46] text-[#ededed] md:text-[#71717a] hover:bg-[#27272a] hover:border-[#52525b] md:hover:text-[#ededed] transition-all duration-200 h-10 md:min-h-[44px]"
            >
              Fechar
            </Button>
            <Button 
              onClick={() => {
                if (selectedClient) {
                  const phone = selectedClient.phone.replace(/\D/g, '')
                  const message = `Olá ${selectedClient.name}! Como posso ajudá-lo hoje?`
                  window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank')
                }
              }}
              className="flex-1 bg-tymer-primary hover:bg-tymer-primary/90 text-white shadow-lg shadow-tymer-primary/20 transition-all duration-200 h-10 md:min-h-[44px]"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Enviar WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação para Excluir Cliente */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => {
        if (!open) {
          setConfirmDialog({
            isOpen: false,
            clientId: '',
            clientName: ''
          })
        }
      }}>
        <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-lg mx-auto h-auto sm:max-h-[90vh] flex flex-col rounded-xl">
          {/* Header Fixo */}
          <DialogHeader className="border-b border-[#27272a] pb-3 md:pb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-[#ededed] text-lg md:text-xl font-semibold">
                  Excluir Cliente
                </DialogTitle>
                <DialogDescription className="text-[#a1a1aa] text-sm md:text-base">
                  Tem certeza que deseja excluir este cliente permanentemente?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {/* Conteúdo com informações do cliente */}
          <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4">
            <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 p-3 md:p-4 rounded-lg border border-red-500/20 space-y-3 md:space-y-4">
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-red-400 rounded-full"></div>
                <h3 className="text-[#ededed] font-medium text-sm md:text-base">Detalhes do Cliente</h3>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-[#71717a] text-xs md:text-sm">Cliente</label>
                  <div className="bg-[#27272a]/70 border border-red-500/30 rounded-md px-3 py-2.5 text-[#ededed] text-sm md:text-base font-medium">
                    {confirmDialog.clientName}
                  </div>
                </div>
                
                <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 mt-3">
                  <p className="text-red-400 text-xs md:text-sm">
                    ⚠️ Todos os agendamentos e histórico associados a este cliente serão removidos permanentemente.
                  </p>
                </div>
                
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3">
                  <p className="text-amber-400 text-xs md:text-sm">
                    💡 Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer com botões */}
          <div className="border-t border-[#27272a] pt-3 md:pt-4 px-4 sm:px-6 pb-4 sm:pb-6 flex-shrink-0">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setConfirmDialog({
                  isOpen: false,
                  clientId: '',
                  clientName: ''
                })}
                className="border-[#27272a] hover:bg-[#27272a] w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
              >
                Excluir Permanentemente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Vender Pacote */}
      <Dialog open={isSellPackageOpen} onOpenChange={setIsSellPackageOpen}>
        <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-lg mx-auto h-auto sm:max-h-[90vh] flex flex-col rounded-xl">
          <DialogHeader>
            <DialogTitle>Pacote</DialogTitle>
            <DialogDescription>Gerenciar pacotes do cliente {selectedClient?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Lista de pacotes já vendidos para este cliente */}
            <div className="bg-[#121214] border border-[#27272a] rounded p-3">
              <div className="text-sm font-medium text-[#ededed] mb-2">Pacotes do cliente</div>
              {loadingClientPackages ? (
                <div className="text-[#71717a] text-sm">Carregando...</div>
              ) : clientPackagesList.length === 0 ? (
                <div className="text-[#71717a] text-sm">Nenhum pacote encontrado</div>
              ) : (
                <>
                  <div className="space-y-2">
                    {clientPackagesList.map((p) => {
                      const remaining = Math.max((Number(p.creditsTotal || 0) - Number(p.usedCredits || 0)), 0)
                      const isExpired = p.expiresAt ? new Date(p.expiresAt).getTime() < Date.now() : false
                      const statusLabel = remaining > 0 && !isExpired ? 'Ativo' : 'Expirado'
                      const statusClass = remaining > 0 && !isExpired ? 'text-emerald-400 border-emerald-600/30 bg-emerald-600/5' : 'text-[#a1a1aa] border-[#3f3f46] bg-transparent'
                      return (
                        <div key={p.id} className="flex items-center justify-between text-sm bg-[#18181b] border border-[#27272a] rounded p-2">
                          <div className="flex-1 mr-3">
                            <div className="flex items-center gap-2">
                              <div className="text-[#ededed] font-medium">{p.name}</div>
                              <span className={`text-[10px] px-2 py-0.5 rounded border ${statusClass}`}>{statusLabel}</span>
                            </div>
                            <div className="text-[#a1a1aa] text-xs">
                              Comprado em {new Date(p.purchasedAt).toLocaleDateString('pt-BR')}
                              {p.expiresAt ? ` • Válido até ${new Date(p.expiresAt).toLocaleDateString('pt-BR')}` : ' • Sem validade'}
                            </div>
                            {/* Opcional: valores financeiros (placeholder até termos a origem no backend) */}
                            {/* <div className="text-[#a1a1aa] text-[11px] mt-0.5">Preço: R$ 0,00 • Estorno: R$ 0,00</div> */}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={`text-xs font-semibold ${remaining > 0 && !isExpired ? 'text-emerald-400' : 'text-[#a1a1aa]'}`}>
                              Saldo: {remaining}
                            </div>
                            <Button size="sm" variant="outline" className="border-red-600 text-red-400 hover:bg-red-600/10"
                              disabled={processingAction === p.id}
                              onClick={() => deactivateClientPackage(p.id)}
                            >{processingAction === p.id ? 'Processando...' : 'Desativar'}</Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {clientPackagesMeta && (clientPackagesMeta.total > clientPackagesMeta.pageSize) && (
                    <div className="flex items-center justify-between pt-3">
                      <div className="text-xs text-[#a1a1aa]">Total: {clientPackagesMeta.total}</div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="border-[#3f3f46] text-[#a1a1aa] hover:bg-[#27272a]"
                          disabled={clientPackagesPage <= 1 || loadingClientPackages}
                          onClick={() => loadClientPackagesPage(clientPackagesPage - 1)}
                        >Anterior</Button>
                        <div className="text-xs text-[#a1a1aa]">Página {clientPackagesMeta.page}</div>
                        <Button size="sm" variant="outline" className="border-[#3f3f46] text-[#a1a1aa] hover:bg-[#27272a]"
                          disabled={!clientPackagesMeta.hasNext || loadingClientPackages}
                          onClick={() => loadClientPackagesPage(clientPackagesPage + 1)}
                        >Próxima</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="text-sm font-medium text-[#ededed]">Vender novo pacote</div>
            <div className="space-y-2">
              <Label>Pacote</Label>
              <select className="w-full bg-[#27272a] border-[#3f3f46] rounded px-3 py-2" value={selectedPackageId} onChange={e => setSelectedPackageId(e.target.value)}>
                <option value="" disabled>Selecione...</option>
                {availablePackages.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Preço (opcional)</Label>
              <Input type="number" step="0.01" placeholder="Usar preço do pacote" value={overridePrice} onChange={e => setOverridePrice(e.target.value)} className="bg-[#27272a] border-[#3f3f46]" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-3 flex-col sm:flex-row">
            <Button variant="secondary" onClick={() => setIsSellPackageOpen(false)} disabled={selling} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={sellPackage} className="w-full sm:w-auto bg-tymer-primary hover:bg-tymer-primary/80" disabled={selling}>{selling ? 'Confirmando…' : 'Confirmar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
