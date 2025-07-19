"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useProfessionals, useServices } from "@/hooks/use-api"
import { usePromotionTemplates } from "@/hooks/use-promotion-templates"
import {
  Upload,
  Save,
  Scissors,
  Plus,
  Trash2,
  Building,
  User,
  Wrench,
  Clock,
  Percent,
  Link as LinkIcon,
  Edit,
  MessageSquare,
} from "lucide-react"

export default function ConfiguracoesPage() {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState("estabelecimento")
  const [businessData, setBusinessData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    customLink: "",
  })

  const [services, setServices] = useState<any[]>([])
  const [isNewServiceOpen, setIsNewServiceOpen] = useState(false)
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    price: "",
    duration: ""
  })

  // Estados para templates de promoção
  const {
    templates: promotionTemplates,
    loading: templatesLoading,
    error: templatesError,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate
  } = usePromotionTemplates()
  
  const [isNewTemplateOpen, setIsNewTemplateOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    title: "",
    message: ""
  })

  // Hook para gerenciar profissionais com banco de dados
  const {
    professionals,
    loading: professionalsLoading,
    error: professionalsError,
    createProfessional,
    updateProfessional,
    deleteProfessional,
    fetchProfessionals
  } = useProfessionals()

  // Hook para gerenciar serviços com banco de dados
  const {
    services: dbServices,
    loading: servicesLoading,
    error: servicesError,
    createService,
    updateService,
    deleteService,
    fetchServices
  } = useServices()

  // Carrega dados iniciais
  useEffect(() => {
    fetchProfessionals()
    fetchServices()
  }, [])
  
  const [isNewProfessionalOpen, setIsNewProfessionalOpen] = useState(false)
  const [newProfessional, setNewProfessional] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: ""
  })

  const [workingHours, setWorkingHours] = useState({
    monday: { start: "08:00", end: "18:00", active: true },
    tuesday: { start: "08:00", end: "18:00", active: true },
    wednesday: { start: "08:00", end: "18:00", active: true },
    thursday: { start: "08:00", end: "18:00", active: true },
    friday: { start: "08:00", end: "18:00", active: true },
    saturday: { start: "08:00", end: "16:00", active: true },
    sunday: { start: "09:00", end: "15:00", active: false },
  })

  const [promotions, setPromotions] = useState<any[]>([])

  const [notifications, setNotifications] = useState({
    whatsappReminders: true,
    emailNotifications: false,
    smsNotifications: false,
    reminderTime: 24,
  })

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://agendapro.com/${businessData.customLink}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = () => {
    toast({
      title: "Configurações salvas!",
      description: "As configurações foram salvas com sucesso.",
      variant: "default",
    })
  }

  const handleAddProfessional = async () => {
    if (!newProfessional.name.trim()) {
      toast({
        title: "Erro de validação",
        description: "Nome do profissional é obrigatório!",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await createProfessional({
        name: newProfessional.name.trim(),
        email: newProfessional.email.trim() || "",
        phone: newProfessional.phone.trim(),
        specialty: newProfessional.specialty.trim(),
      })

      if (result) {
        setNewProfessional({ name: "", email: "", phone: "", specialty: "" })
        setIsNewProfessionalOpen(false)
        toast({
          title: "Profissional adicionado!",
          description: `Profissional "${newProfessional.name}" foi adicionado com sucesso.`,
          variant: "default",
        })
        // Recarrega os dados dos profissionais
        await fetchProfessionals()
      }
    } catch (error) {
      toast({
        title: "Erro ao adicionar profissional",
        description: professionalsError || "Ocorreu um erro inesperado.",
        variant: "destructive",
      })
    }
  }

  const handleCancelAddProfessional = () => {
    setNewProfessional({ name: "", email: "", phone: "", specialty: "" })
    setIsNewProfessionalOpen(false)
  }

  const handleUpdateProfessional = async (id: string, field: string, value: string) => {
    // Debounce: aguarda 1 segundo de inatividade antes de salvar
    clearTimeout((window as any)[`updateTimeout_${id}_${field}`])
    
    ;(window as any)[`updateTimeout_${id}_${field}`] = setTimeout(async () => {
      await updateProfessional({ id, [field]: value })
    }, 1000)
  }

  const handleRemoveProfessional = async (id: string, name: string) => {
    if (confirm(`Deseja realmente remover o profissional "${name}"?`)) {
      try {
        const result = await deleteProfessional(id)
        if (result) {
          toast({
            title: "Profissional removido!",
            description: `Profissional "${name}" foi removido com sucesso.`,
            variant: "default",
          })
          // Recarrega os dados dos profissionais
          await fetchProfessionals()
        }
      } catch (error) {
        toast({
          title: "Erro ao remover profissional",
          description: professionalsError || "Ocorreu um erro inesperado.",
          variant: "destructive",
        })
      }
    }
  }

  const handleAddService = async () => {
    if (!newService.name.trim()) {
      toast({
        title: "Erro de validação",
        description: "Nome do serviço é obrigatório!",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await createService({
        name: newService.name.trim(),
        description: newService.description.trim() || "",
        price: parseFloat(newService.price) || 0,
        duration: parseInt(newService.duration) || 0,
        category: "Geral"
      })

      if (result) {
        setNewService({ name: "", description: "", price: "", duration: "" })
        setIsNewServiceOpen(false)
        toast({
          title: "Serviço adicionado!",
          description: `Serviço "${newService.name}" foi adicionado com sucesso.`,
          variant: "default",
        })
        // Recarrega os dados dos serviços
        await fetchServices()
      }
    } catch (error) {
      toast({
        title: "Erro ao adicionar serviço",
        description: servicesError || "Ocorreu um erro inesperado.",
        variant: "destructive",
      })
    }
  }

  const handleCancelAddService = () => {
    setNewService({ name: "", description: "", price: "", duration: "" })
    setIsNewServiceOpen(false)
  }

  const handleUpdateService = async (id: string, field: string, value: string | number) => {
    // Debounce: aguarda 1 segundo de inatividade antes de salvar
    clearTimeout((window as any)[`updateServiceTimeout_${id}_${field}`])
    
    ;(window as any)[`updateServiceTimeout_${id}_${field}`] = setTimeout(async () => {
      await updateService({ id, [field]: value })
    }, 1000)
  }

  const handleRemoveService = async (id: string, name: string) => {
    if (confirm(`Deseja realmente remover o serviço "${name}"?`)) {
      try {
        const result = await deleteService(id)
        if (result) {
          toast({
            title: "Serviço removido!",
            description: `Serviço "${name}" foi removido com sucesso.`,
            variant: "default",
          })
          // Recarrega os dados dos serviços
          await fetchServices()
        }
      } catch (error) {
        toast({
          title: "Erro ao remover serviço",
          description: servicesError || "Ocorreu um erro inesperado.",
          variant: "destructive",
        })
      }
    }
  }

  // Funções para gerenciar templates de promoção
  const handleAddTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.message.trim()) {
      toast({
        title: "Erro de validação",
        description: "Nome e mensagem são obrigatórios!",
        variant: "destructive",
      })
      return
    }

    const success = await addTemplate({
      name: newTemplate.name.trim(),
      title: newTemplate.title.trim() || "Promoção",
      message: newTemplate.message.trim()
    })

    if (success) {
      setNewTemplate({ name: "", title: "", message: "" })
      setIsNewTemplateOpen(false)
      toast({
        title: "Template adicionado!",
        description: "Template de promoção foi criado com sucesso.",
        variant: "default",
      })
    } else {
      toast({
        title: "Erro ao adicionar template",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      })
    }
  }

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template)
    setNewTemplate({
      name: template.name,
      title: template.title,
      message: template.message
    })
    setIsNewTemplateOpen(true)
  }

  const handleUpdateTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.message.trim()) {
      toast({
        title: "Erro de validação",
        description: "Nome e mensagem são obrigatórios!",
        variant: "destructive",
      })
      return
    }

    const success = await updateTemplate(editingTemplate.id, {
      name: newTemplate.name.trim(),
      title: newTemplate.title.trim(),
      message: newTemplate.message.trim()
    })

    if (success) {
      setNewTemplate({ name: "", title: "", message: "" })
      setEditingTemplate(null)
      setIsNewTemplateOpen(false)
      toast({
        title: "Template atualizado!",
        description: "Template de promoção foi atualizado com sucesso.",
        variant: "default",
      })
    } else {
      toast({
        title: "Erro ao atualizar template",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (confirm(`Deseja realmente excluir o template "${name}"?`)) {
      const success = await deleteTemplate(id)
      if (success) {
        toast({
          title: "Template excluído!",
          description: `Template "${name}" foi excluído com sucesso.`,
          variant: "default",
        })
      } else {
        toast({
          title: "Erro ao excluir template",
          description: "Ocorreu um erro inesperado.",
          variant: "destructive",
        })
      }
    }
  }

  const handleCancelTemplate = () => {
    setNewTemplate({ name: "", title: "", message: "" })
    setEditingTemplate(null)
    setIsNewTemplateOpen(false)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#ededed]">Configurações</h1>
          <p className="text-[#3f3f46]">Gerencie as configurações do seu estabelecimento</p>
        </div>
        <Button onClick={handleSave} className="bg-[#10b981] hover:bg-[#059669] text-[#ededed]">
          <Save className="w-4 h-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>

      {/* Tabs */}
      <div className="space-y-6">
        <div className="border-b border-[#27272a]">
          <div className="flex gap-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab("estabelecimento")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "estabelecimento"
                  ? "border-[#10b981] text-[#10b981]"
                  : "border-transparent text-[#71717a] hover:text-[#ededed]"
              }`}
            >
              <Building className="w-4 h-4" />
              Estabelecimento
            </button>
            <button
              onClick={() => setActiveTab("profissionais")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "profissionais"
                  ? "border-[#10b981] text-[#10b981]"
                  : "border-transparent text-[#71717a] hover:text-[#ededed]"
              }`}
            >
              <User className="w-4 h-4" />
              Profissionais
            </button>
            <button
              onClick={() => setActiveTab("servicos")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "servicos"
                  ? "border-[#10b981] text-[#10b981]"
                  : "border-transparent text-[#71717a] hover:text-[#ededed]"
              }`}
            >
              <Wrench className="w-4 h-4" />
              Serviços
            </button>
            <button
              onClick={() => setActiveTab("horarios")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "horarios"
                  ? "border-[#10b981] text-[#10b981]"
                  : "border-transparent text-[#71717a] hover:text-[#ededed]"
              }`}
            >
              <Clock className="w-4 h-4" />
              Horários
            </button>
            <button
              onClick={() => setActiveTab("promocoes")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "promocoes"
                  ? "border-[#10b981] text-[#10b981]"
                  : "border-transparent text-[#71717a] hover:text-[#ededed]"
              }`}
            >
              <Percent className="w-4 h-4" />
              Promoções (Beta)
            </button>
          </div>
        </div>

        {/* Conteúdo das Abas */}
        <div className="mt-6">
          {/* Estabelecimento Tab */}
          {activeTab === "estabelecimento" && (
            <Card className="bg-[#18181b] border-[#27272a]">
              <CardHeader>
                <CardTitle className="text-[#a1a1aa]">Dados do Estabelecimento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="businessName" className="text-[#ededed]">
                      Nome do Estabelecimento
                    </Label>
                    <Input
                      id="businessName"
                      value={businessData.name}
                      onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })}
                      className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                      placeholder="du corte"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[#ededed]">
                      E-mail
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={businessData.email}
                      onChange={(e) => setBusinessData({ ...businessData, email: e.target.value })}
                      className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                      placeholder="teste@teste.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[#ededed]">
                      Telefone
                    </Label>
                    <Input
                      id="phone"
                      value={businessData.phone}
                      onChange={(e) => setBusinessData({ ...businessData, phone: e.target.value })}
                      className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                      placeholder="(11) 11111-1111"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customLink" className="text-[#ededed]">
                      Link Personalizado
                    </Label>
                    <Input
                      id="customLink"
                      value={businessData.customLink}
                      onChange={(e) => setBusinessData({ ...businessData, customLink: e.target.value })}
                      className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                      placeholder="du-corte"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-[#ededed]">
                    Endereço
                  </Label>
                  <Input
                    id="address"
                    value={businessData.address}
                    onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                    className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                    placeholder="rua joao"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#ededed]">Logo do Estabelecimento</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <Scissors className="w-8 h-8 text-[#ededed]" />
                    </div>
                    <Button variant="outline" className="border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent">
                      <Upload className="w-4 h-4 mr-2" />
                      Fazer Upload
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-emerald-900/20 rounded-lg border border-emerald-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon className="w-4 h-4 text-[#10b981]" />
                    <span className="text-[#10b981] font-medium">Link Público do Agendamento</span>
                  </div>
                  <p className="text-emerald-300 text-sm">https://agendapro.com/du-corte</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Profissionais Tab */}
          {activeTab === "profissionais" && (
            <Card className="bg-[#18181b] border-[#27272a]">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-[#a1a1aa]">Profissionais</CardTitle>
                  <Dialog open={isNewProfessionalOpen} onOpenChange={setIsNewProfessionalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-500 hover:bg-blue-600 text-[#ededed]">
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Profissional
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#3f3f46] border-[#52525b] text-[#ededed]">
                      <DialogHeader>
                        <DialogTitle className="text-[#ededed]">Adicionar Novo Profissional</DialogTitle>
                        <DialogDescription className="text-[#71717a]">
                          Preencha os dados do novo profissional
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="professionalName" className="text-[#ededed]">
                            Nome Completo *
                          </Label>
                          <Input
                            id="professionalName"
                            value={newProfessional.name}
                            onChange={(e) => setNewProfessional({ ...newProfessional, name: e.target.value })}
                            className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                            placeholder="Digite o nome do profissional"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="professionalEmail" className="text-[#ededed]">
                            E-mail
                          </Label>
                          <Input
                            id="professionalEmail"
                            type="email"
                            value={newProfessional.email}
                            onChange={(e) => setNewProfessional({ ...newProfessional, email: e.target.value })}
                            className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                            placeholder="profissional@email.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="professionalPhone" className="text-[#ededed]">
                            Telefone
                          </Label>
                          <Input
                            id="professionalPhone"
                            value={newProfessional.phone}
                            onChange={(e) => setNewProfessional({ ...newProfessional, phone: e.target.value })}
                            className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                            placeholder="(11) 99999-9999"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="professionalSpecialty" className="text-[#ededed]">
                            Especialidade
                          </Label>
                          <Input
                            id="professionalSpecialty"
                            value={newProfessional.specialty}
                            onChange={(e) => setNewProfessional({ ...newProfessional, specialty: e.target.value })}
                            className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                            placeholder="Ex: Corte masculino, Barba, etc."
                          />
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                          <Button 
                            variant="outline" 
                            onClick={handleCancelAddProfessional}
                            className="border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent"
                          >
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleAddProfessional}
                            className="bg-blue-500 hover:bg-blue-600 text-[#ededed]"
                          >
                            Adicionar Profissional
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {professionalsLoading ? (
                    <div className="text-center py-8 text-[#71717a]">
                      Carregando profissionais...
                    </div>
                  ) : professionals.length === 0 ? (
                    <div className="text-center py-8 text-[#71717a]">
                      Nenhum profissional cadastrado. Clique em &quot;Novo Profissional&quot; para adicionar.
                    </div>
                  ) : (
                    professionals.map((professional) => (
                      <div
                        key={professional.id}
                        className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-[#52525b] gap-4"
                      >
                        <div className="flex items-center gap-4 flex-1 w-full">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-[#ededed]">
                              {professional.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .substring(0, 2)}
                            </span>
                          </div>
                          <div className="flex-1 w-full">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <Input
                                value={professional.name}
                                onChange={(e) => handleUpdateProfessional(professional.id, 'name', e.target.value)}
                                className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                                placeholder="Nome do profissional"
                              />
                              <Input
                                value={professional.email || ""}
                                onChange={(e) => handleUpdateProfessional(professional.id, 'email', e.target.value)}
                                className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                                placeholder="E-mail"
                              />
                              <Input
                                value={professional.phone || ""}
                                onChange={(e) => handleUpdateProfessional(professional.id, 'phone', e.target.value)}
                                className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                                placeholder="Telefone"
                              />
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveProfessional(professional.id, professional.name)}
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-[#ededed] bg-transparent flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Serviços Tab */}
          {activeTab === "servicos" && (
            <Card className="bg-[#18181b] border-[#27272a]">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-[#a1a1aa]">Serviços Oferecidos</CardTitle>
                  <Dialog open={isNewServiceOpen} onOpenChange={setIsNewServiceOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-purple-500 hover:bg-purple-600 text-[#ededed]">
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Serviço
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#3f3f46] border-[#52525b] text-[#ededed]">
                      <DialogHeader>
                        <DialogTitle className="text-[#ededed]">Novo Serviço</DialogTitle>
                        <DialogDescription className="text-[#71717a]">
                          Preencha os dados do novo serviço
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="serviceName" className="text-[#ededed]">Nome do Serviço *</Label>
                          <Input
                            id="serviceName"
                            value={newService.name}
                            onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                            className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                            placeholder="Ex: Corte masculino"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="serviceDescription" className="text-[#ededed]">Descrição</Label>
                          <Input
                            id="serviceDescription"
                            value={newService.description}
                            onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                            className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                            placeholder="Descrição do serviço"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="servicePrice" className="text-[#ededed]">Preço (R$)</Label>
                            <Input
                              id="servicePrice"
                              type="number"
                              value={newService.price}
                              onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                              className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                              placeholder="0,00"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="serviceDuration" className="text-[#ededed]">Duração (min)</Label>
                            <Input
                              id="serviceDuration"
                              type="number"
                              value={newService.duration}
                              onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                              className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                              placeholder="30"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                          <Button 
                            variant="outline" 
                            onClick={handleCancelAddService}
                            className="border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent"
                          >
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleAddService}
                            className="bg-purple-500 hover:bg-purple-600 text-[#ededed]"
                          >
                            Adicionar Serviço
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {servicesLoading ? (
                    <div className="text-center py-8 text-[#71717a]">
                      Carregando serviços...
                    </div>
                  ) : dbServices.length === 0 ? (
                    <div className="text-center py-8 text-[#71717a]">
                      Nenhum serviço cadastrado. Clique em &quot;Novo Serviço&quot; para adicionar.
                    </div>
                  ) : (
                    dbServices.map((service) => (
                      <div
                        key={service.id}
                        className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-[#52525b] gap-4"
                      >
                        <div className="flex items-center gap-4 flex-1 w-full">
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <Wrench className="w-6 h-6 text-[#ededed]" />
                          </div>
                          <div className="flex-1 w-full">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <Input
                                value={service.name}
                                onChange={(e) => handleUpdateService(service.id, 'name', e.target.value)}
                                className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                                placeholder="Nome do serviço"
                              />
                              <Input
                                value={service.description || ""}
                                onChange={(e) => handleUpdateService(service.id, 'description', e.target.value)}
                                className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                                placeholder="Descrição"
                              />
                              <Input
                                type="number"
                                value={service.price}
                                onChange={(e) => handleUpdateService(service.id, 'price', parseFloat(e.target.value) || 0)}
                                className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                                placeholder="Preço"
                              />
                              <Input
                                type="number"
                                value={service.duration}
                                onChange={(e) => handleUpdateService(service.id, 'duration', parseInt(e.target.value) || 0)}
                                className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                                placeholder="Duração (min)"
                              />
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveService(service.id, service.name)}
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-[#ededed] bg-transparent flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Horários Tab */}
          {activeTab === "horarios" && (
            <Card className="bg-[#18181b] border-[#27272a]">
              <CardHeader>
                <CardTitle className="text-[#a1a1aa]">Horários de Funcionamento</CardTitle>
                <CardDescription className="text-[#71717a]">
                  Defina os horários de funcionamento do seu estabelecimento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(workingHours).map(([day, hours]) => (
                    <div key={day} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-[#52525b]">
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={hours.active}
                          onCheckedChange={(checked) =>
                            setWorkingHours({
                              ...workingHours,
                              [day]: { ...hours, active: checked },
                            })
                          }
                        />
                        <span className="text-[#ededed] font-medium w-24 capitalize">
                          {day === 'monday' && 'Segunda'}
                          {day === 'tuesday' && 'Terça'}
                          {day === 'wednesday' && 'Quarta'}
                          {day === 'thursday' && 'Quinta'}
                          {day === 'friday' && 'Sexta'}
                          {day === 'saturday' && 'Sábado'}
                          {day === 'sunday' && 'Domingo'}
                        </span>
                      </div>
                      {hours.active && (
                        <div className="flex items-center gap-4">
                          <Input
                            type="time"
                            value={hours.start}
                            onChange={(e) =>
                              setWorkingHours({
                                ...workingHours,
                                [day]: { ...hours, start: e.target.value },
                              })
                            }
                            className="bg-[#27272a] border-[#3f3f46] text-[#ededed] w-32"
                          />
                          <span className="text-[#71717a]">às</span>
                          <Input
                            type="time"
                            value={hours.end}
                            onChange={(e) =>
                              setWorkingHours({
                                ...workingHours,
                                [day]: { ...hours, end: e.target.value },
                              })
                            }
                            className="bg-[#27272a] border-[#3f3f46] text-[#ededed] w-32"
                          />
                        </div>
                      )}
                      {!hours.active && (
                        <span className="text-[#71717a]">Fechado</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Promoções Tab */}
          {activeTab === "promocoes" && (
            <Card className="bg-[#18181b] border-[#27272a]">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-[#a1a1aa]">Templates de Promoção (Beta)</CardTitle>
                    <CardDescription className="text-[#71717a]">
                      Crie templates de mensagens promocionais para enviar aos seus clientes
                    </CardDescription>
                  </div>
                  <Dialog open={isNewTemplateOpen} onOpenChange={setIsNewTemplateOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0a0a0a]">
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Template
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#3f3f46] border-[#52525b] text-[#ededed] max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-[#ededed]">
                          {editingTemplate ? 'Editar Template' : 'Novo Template'}
                        </DialogTitle>
                        <DialogDescription className="text-[#71717a]">
                          {editingTemplate ? 'Edite o template de promoção' : 'Crie um novo template de promoção'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="templateName" className="text-[#ededed]">Nome do Template *</Label>
                          <Input
                            id="templateName"
                            value={newTemplate.name}
                            onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                            className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                            placeholder="Ex: Promoção de Natal"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="templateTitle" className="text-[#ededed]">Título da Promoção</Label>
                          <Input
                            id="templateTitle"
                            value={newTemplate.title}
                            onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                            className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                            placeholder="🎄 Promoção Especial de Natal!"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="templateMessage" className="text-[#ededed]">Mensagem *</Label>
                          <Textarea
                            id="templateMessage"
                            value={newTemplate.message}
                            onChange={(e) => setNewTemplate({ ...newTemplate, message: e.target.value })}
                            className="bg-[#27272a] border-[#3f3f46] text-[#ededed] min-h-[100px]"
                            placeholder="Olá! Aproveite nossa promoção especial de Natal com 20% de desconto em todos os serviços! 🎁✂️"
                          />
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                          <Button 
                            variant="outline" 
                            onClick={handleCancelTemplate}
                            className="border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent"
                          >
                            Cancelar
                          </Button>
                          <Button 
                            onClick={editingTemplate ? handleUpdateTemplate : handleAddTemplate}
                            className="bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0a0a0a]"
                          >
                            {editingTemplate ? 'Atualizar' : 'Criar'} Template
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {templatesLoading ? (
                    <div className="text-center py-8 text-[#71717a]">
                      Carregando templates...
                    </div>
                  ) : templatesError ? (
                    <div className="text-center py-8">
                      <p className="text-red-400">Erro ao carregar templates: {templatesError}</p>
                      <Button 
                        onClick={() => window.location.reload()}
                        className="mt-4 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0a0a0a]"
                      >
                        Tentar Novamente
                      </Button>
                    </div>
                  ) : promotionTemplates.length === 0 ? (
                    <div className="text-center py-8 text-[#71717a]">
                      Nenhum template cadastrado. Clique em &quot;Novo Template&quot; para criar o primeiro.
                    </div>
                  ) : (
                    promotionTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="p-4 bg-gray-900/50 rounded-lg border border-[#52525b]"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-[#ededed] font-medium">{template.name}</h3>
                            {template.title && (
                              <p className="text-[#fbbf24] text-sm mt-1">{template.title}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditTemplate(template)}
                              className="border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteTemplate(template.id, template.name)}
                              className="border-red-600 text-red-400 hover:bg-red-600 hover:text-[#ededed] bg-transparent"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-[#71717a] text-sm bg-[#27272a] p-3 rounded border border-[#3f3f46]">
                          {template.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
