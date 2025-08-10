"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Users, Search, Plus, Phone, MessageCircle, Calendar, DollarSign, Edit, Trash2 } from "lucide-react"
import { useClients } from "@/hooks/use-api"
import { getBrazilNow, formatBrazilDate } from "@/lib/timezone"

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

  useEffect(() => {
    fetchClients(true) // Buscar apenas clientes ativos
  }, [fetchClients])

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

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  )

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
          <h1 className="text-2xl font-bold text-[#ededed]">Clientes</h1>
          <p className="text-[#a1a1aa]">Gerencie sua base de clientes</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white"
              onClick={() => resetForm()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#18181b] border-[#27272a]">
            <DialogHeader>
              <DialogTitle className="text-[#ededed]">
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
              <DialogDescription className="text-[#3f3f46]">
                {editingClient ? 'Edite as informações do cliente' : 'Adicione um novo cliente à sua base'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#ededed]">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[#ededed]">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#ededed]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthday" className="text-[#ededed]">Data de Nascimento</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
                  className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-[#ededed]">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                  placeholder="Preferências, alergias, etc..."
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm} className="border-[#27272a] text-[#ededed] hover:bg-[#27272a]">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white">
                  {editingClient ? 'Salvar' : 'Criar Cliente'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and filters */}
      <Card className="bg-[#18181b] border-[#27272a]">
        <CardContent className="p-4">
          <div className="flex gap-4">
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

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#18181b] border-[#27272a]">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between sm:justify-between gap-2 sm:gap-0">
              <div className="text-left sm:text-left">
                <p className="text-[#a1a1aa] text-sm">Total de Clientes</p>
                <p className="text-xl sm:text-2xl font-bold text-[#ededed]">{clients.length}</p>
              </div>
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-[#10b981]" />
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
              <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-[#10b981]" />
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
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" />
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
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients list */}
      <Card className="bg-[#18181b] border-[#27272a]">
        <CardContent className="p-0">
          {/* Header da tabela - apenas desktop */}
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-[#27272a] text-sm font-medium text-[#a1a1aa]">
            <div className="col-span-2">Cliente</div>
            <div className="col-span-2">Contato</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1">Agendamentos</div>
            <div className="col-span-2">Total Gasto</div>
            <div className="col-span-2">Última Visita</div>
            <div className="col-span-2">Ações</div>
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
                  <div className="hidden md:grid grid-cols-12 gap-4 p-4 hover:bg-[#27272a]/80 transition-colors">
                    {/* Cliente */}
                    <div className="col-span-2">
                      <div>
                        <h3 className="font-medium text-white">{client.name}</h3>
                        <p className="text-xs text-[#71717a]">
                          Cliente desde {formatBrazilDate(client.createdAt)}
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
                    <div className="col-span-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(client)}
                          className="border-emerald-600 text-[#10b981] hover:bg-emerald-600/10 px-2 py-1 h-8 text-xs"
                        >
                          Ver Detalhes
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(client)}
                          className="border-gray-600 text-[#a1a1aa] hover:bg-gray-700 px-2 py-1 h-8"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(client.id, client.name)}
                          className="border-red-600 text-red-400 hover:bg-red-600/10 px-2 py-1 h-8"
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
                          <h3 className="font-medium text-white text-base">{client.name}</h3>
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
                              Desde {formatBrazilDate(client.createdAt)}
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
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(client)}
                          className="flex-1 border-emerald-600 text-[#10b981] hover:bg-emerald-600/10 text-xs h-8"
                        >
                          Ver Detalhes
                        </Button>
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
        <DialogContent className="bg-gray-900 border-[#27272a] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Detalhes do Cliente</DialogTitle>
            <DialogDescription className="text-[#71717a]">
              Informações completas e estatísticas do cliente
            </DialogDescription>
          </DialogHeader>
          
          {selectedClient && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-[#71717a] mb-2">Nome</h3>
                  <p className="text-white">{selectedClient.name}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-[#71717a] mb-2">Status</h3>
                  <Badge className={getStatusColor(selectedClient.isActive ? 'active' : 'inactive')}>
                    {getStatusLabel(selectedClient.isActive ? 'active' : 'inactive')}
                  </Badge>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-[#71717a] mb-2">Telefone</h3>
                  <p className="text-white">{selectedClient.phone}</p>
                </div>
                
                {selectedClient.email && (
                  <div>
                    <h3 className="text-sm font-medium text-[#71717a] mb-2">E-mail</h3>
                    <p className="text-white">{selectedClient.email}</p>
                  </div>
                )}

                {selectedClient.birthday && (
                  <div>
                    <h3 className="text-sm font-medium text-[#71717a] mb-2">Data de Nascimento</h3>
                    <p className="text-white">
                      {formatBrazilDate(new Date(selectedClient.birthday))}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-[#71717a] mb-2">Cliente desde</h3>
                  <p className="text-white">
                    {formatBrazilDate(new Date(selectedClient.createdAt))}
                  </p>
                </div>
              </div>

              {selectedClient.notes && (
                <div>
                  <h3 className="text-sm font-medium text-[#71717a] mb-2">Observações</h3>
                  <p className="text-white bg-gray-800 p-3 rounded-lg">{selectedClient.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#10b981]">
                    {calculateClientStats(selectedClient).totalAppointments}
                  </div>
                  <div className="text-sm text-[#71717a]">Agendamentos</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#10b981]">
                    {new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    }).format(calculateClientStats(selectedClient).totalSpent)}
                  </div>
                  <div className="text-sm text-[#71717a]">Total Gasto</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#10b981]">
                    {new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    }).format(calculateClientStats(selectedClient).averageTicket)}
                  </div>
                  <div className="text-sm text-[#71717a]">Ticket Médio</div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <Button 
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => {
                    const phone = selectedClient.phone.replace(/\D/g, '')
                    const message = `Olá ${selectedClient.name}! Como posso ajudá-lo hoje?`
                    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank')
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Enviar WhatsApp
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 border-gray-600 text-[#a1a1aa] hover:bg-gray-700"
                  onClick={() => {
                    setShowDetailsModal(false)
                    // Aqui você pode implementar a navegação para agenda
                    // router.push('/dashboard/agenda?cliente=' + selectedClient.id)
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Novo Agendamento
                </Button>
              </div>
            </div>
          )}
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
        <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed]">
          <DialogHeader>
            <DialogTitle className="text-[#ededed]">
              Excluir Cliente
            </DialogTitle>
            <DialogDescription className="text-[#a1a1aa]">
              Tem certeza que deseja excluir este cliente permanentemente? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-2">
              <p className="text-[#ededed]">
                <strong>Cliente:</strong> {confirmDialog.clientName}
              </p>
              <p className="text-[#71717a] text-sm">
                Todos os agendamentos e histórico associados a este cliente serão removidos.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({
                isOpen: false,
                clientId: '',
                clientName: ''
              })}
              className="border-[#27272a] hover:bg-[#27272a]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
