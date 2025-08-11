"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { formatBrazilDate, parseDate } from "@/lib/timezone"
import { formatCurrency } from "@/lib/currency"
import { ProfessionalAvatar } from "@/components/professional-avatar"
import { ProfessionalAvatarUpload } from "@/components/professional-avatar-upload"
import ServiceImage from "@/components/service-image"
import ServiceImageUpload from "@/components/service-image-upload"
import { useProfessionals } from "@/hooks/use-api"
import { useServices } from "@/hooks/use-services"
import { usePromotionTemplates } from "@/hooks/use-promotion-templates"
import { useWorkingHours } from "@/hooks/use-working-hours"
import { useBusinessData } from "@/hooks/use-business-data"
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
  Camera,
  X,
} from "lucide-react"

export default function ConfiguracoesPage() {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState("estabelecimento")

  // Função para gerar horários
  const generateTimeOptions = () => {
    const times = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        times.push(timeString)
      }
    }
    return times
  }

  // Hook para dados do estabelecimento integrado ao banco de dados
  const { 
    businessData, 
    loading: businessLoading,
    saving: businessSaving,
    error: businessError,
    updateBusinessData,
    updateField,
    uploadLogo
  } = useBusinessData()

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

  // Estado para dialog de confirmação
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: '',
    item: null as any,
    title: '',
    description: '',
    action: null as (() => void) | null
  })

  // Hook para gerenciar profissionais com banco de dados
  const {
    professionals,
    loading: professionalsLoading,
    error: professionalsError,
    createProfessional,
    updateProfessional,
    updateProfessionalAvatar,
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
    updateServiceImage,
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

  // Estados para edição de profissionais
  const [isEditProfessionalOpen, setIsEditProfessionalOpen] = useState(false)
  const [editingProfessional, setEditingProfessional] = useState<any>(null)
  const [editProfessional, setEditProfessional] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: ""
  })

  // Estados para upload de avatar
  const [isAvatarUploadOpen, setIsAvatarUploadOpen] = useState(false)
  const [selectedProfessionalForAvatar, setSelectedProfessionalForAvatar] = useState<any>(null)

  // Estados para edição de serviços
  const [isEditServiceOpen, setIsEditServiceOpen] = useState(false)
  const [editingService, setEditingService] = useState<any>(null)
  const [editService, setEditService] = useState({
    name: "",
    description: "",
    price: "",
    duration: ""
  })

  // Estados para upload de imagem de serviços
  const [isServiceImageUploadOpen, setIsServiceImageUploadOpen] = useState(false)
  const [selectedServiceForImage, setSelectedServiceForImage] = useState<any>(null)

  // Hook para horários integrado ao banco de dados
  const { 
    workingHours: workingHoursData, 
    loading: workingHoursLoading,
    error: workingHoursError,
    updateWorkingHours 
  } = useWorkingHours()

  const [promotions, setPromotions] = useState<any[]>([])

  // Converter dados do banco para formato da UI
  const convertToUIFormat = (dbWorkingHours: any[]) => {
    const defaultHours = {
      monday: { start: "08:00", end: "18:00", active: true },
      tuesday: { start: "08:00", end: "18:00", active: true },
      wednesday: { start: "08:00", end: "18:00", active: true },
      thursday: { start: "08:00", end: "18:00", active: true },
      friday: { start: "08:00", end: "18:00", active: true },
      saturday: { start: "08:00", end: "16:00", active: true },
      sunday: { start: "09:00", end: "15:00", active: false },
    }
    
    const uiFormat = { ...defaultHours }
    
    dbWorkingHours.forEach(hours => {
      if (uiFormat[hours.dayOfWeek as keyof typeof uiFormat]) {
        uiFormat[hours.dayOfWeek as keyof typeof uiFormat] = {
          start: hours.startTime,
          end: hours.endTime,
          active: hours.isActive
        }
      }
    })
    
    return uiFormat
  }

  // Converter formato da UI para o banco
  const convertToDBFormat = (uiWorkingHours: any) => {
    return Object.entries(uiWorkingHours).map(([dayOfWeek, hours]: [string, any]) => ({
      dayOfWeek,
      startTime: hours.start,
      endTime: hours.end,
      isActive: hours.active
    }))
  }

  // Horários formatados para a UI
  const workingHours = convertToUIFormat(workingHoursData || [])

  // Função para atualizar um horário específico
  const handleWorkingHoursChange = async (day: string, field: string, value: any) => {
    const updatedWorkingHours = {
      ...workingHours,
      [day]: { ...workingHours[day as keyof typeof workingHours], [field]: value }
    }
    
    // Validação para horários de abertura e fechamento
    if (field === 'start' || field === 'end') {
      const dayHours = updatedWorkingHours[day as keyof typeof updatedWorkingHours]
      const startTime = field === 'start' ? value : dayHours.start
      const endTime = field === 'end' ? value : dayHours.end
      
      // Converter para minutos para comparação
      const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1])
      const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1])
      
      if (startMinutes >= endMinutes) {
        toast({
          title: "Horário inválido",
          description: "O horário de abertura deve ser anterior ao horário de fechamento.",
          variant: "destructive",
        })
        return
      }
    }
    
    try {
      const dbFormat = convertToDBFormat(updatedWorkingHours)
      await updateWorkingHours(dbFormat)
      
      toast({
        title: "Horário atualizado!",
        description: "O horário foi atualizado com sucesso.",
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "Erro ao atualizar horário",
        description: "Ocorreu um erro ao salvar o horário. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://agendapro.com/${businessData.customLink}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    try {
      await updateBusinessData(businessData)
      toast({
        title: "Configurações salvas!",
        description: "As configurações do estabelecimento foram salvas com sucesso.",
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "Erro ao salvar!",
        description: "Ocorreu um erro ao salvar as configurações. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const logoBase64 = await uploadLogo(file)
      updateField('logo', logoBase64)
      
      toast({
        title: "Logo carregada!",
        description: "Logo do estabelecimento foi carregada com sucesso.",
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "Erro no upload!",
        description: error instanceof Error ? error.message : "Erro ao carregar logo.",
        variant: "destructive",
      })
    }
  }

  // Função para abrir dialog de confirmação
  const openConfirmDialog = (type: string, item: any, title: string, description: string, action: () => void) => {
    setConfirmDialog({
      isOpen: true,
      type,
      item,
      title,
      description,
      action
    })
  }

  // Função para fechar dialog de confirmação
  const closeConfirmDialog = () => {
    setConfirmDialog({
      isOpen: false,
      type: '',
      item: null,
      title: '',
      description: '',
      action: null
    })
  }

  // Função para executar a ação confirmada
  const handleConfirmAction = () => {
    if (confirmDialog.action) {
      confirmDialog.action()
    }
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

  const handleUpdateProfessional = async () => {
    if (!editProfessional.name.trim()) {
      toast({
        title: "Erro de validação",
        description: "Nome do profissional é obrigatório!",
        variant: "destructive",
      })
      return
    }

    try {
      await updateProfessional({ 
        id: editingProfessional.id, 
        name: editProfessional.name.trim(),
        email: editProfessional.email.trim(),
        phone: editProfessional.phone.trim(),
        specialty: editProfessional.specialty.trim()
      })
      
      setIsEditProfessionalOpen(false)
      setEditingProfessional(null)
      setEditProfessional({ name: "", email: "", phone: "", specialty: "" })
      
      toast({
        title: "Profissional atualizado!",
        description: "Os dados do profissional foram atualizados com sucesso.",
        variant: "default",
      })
      
      await fetchProfessionals()
    } catch (error) {
      toast({
        title: "Erro ao atualizar profissional",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      })
    }
  }

  const handleEditProfessional = (professional: any) => {
    setEditingProfessional(professional)
    setEditProfessional({
      name: professional.name || "",
      email: professional.email || "",
      phone: professional.phone || "",
      specialty: professional.specialty || ""
    })
    setIsEditProfessionalOpen(true)
  }

  const handleCancelEditProfessional = () => {
    setIsEditProfessionalOpen(false)
    setEditingProfessional(null)
    setEditProfessional({ name: "", email: "", phone: "", specialty: "" })
  }

  // Função para lidar com upload de avatar do profissional
  const handleProfessionalAvatarChange = async (professionalId: string, avatarBase64: string | null) => {
    try {
      await updateProfessionalAvatar(professionalId, avatarBase64)
      // Recarregar a lista de profissionais para mostrar a nova foto
      await fetchProfessionals()
      // Mostrar feedback de sucesso
      toast({
        title: "Foto atualizada!",
        description: "A foto de perfil foi atualizada com sucesso.",
        variant: "default",
      })
      // Fechar o modal após sucesso
      handleCloseAvatarUpload()
      return Promise.resolve()
    } catch (error) {
      console.error('Erro ao atualizar avatar:', error)
      toast({
        title: "Erro no upload",
        description: "Ocorreu um erro ao atualizar a foto. Tente novamente.",
        variant: "destructive",
      })
      throw error
    }
  }

  // Função para abrir dialog de upload de avatar
  const handleOpenAvatarUpload = (professional: any) => {
    setSelectedProfessionalForAvatar(professional)
    setIsAvatarUploadOpen(true)
  }

  // Função para fechar dialog de upload de avatar
  const handleCloseAvatarUpload = () => {
    setSelectedProfessionalForAvatar(null)
    setIsAvatarUploadOpen(false)
  }

  // Funções para gerenciar upload de imagem de serviços
  const handleServiceImageChange = async (serviceId: string, imageBase64: string | null) => {
    try {
      await updateServiceImage(serviceId, imageBase64)
      // Recarregar a lista de serviços para mostrar a nova imagem
      await fetchServices()
      // Mostrar feedback de sucesso
      toast({
        title: "Imagem atualizada!",
        description: "A imagem do serviço foi atualizada com sucesso.",
        variant: "default",
      })
      // Fechar o modal após sucesso
      handleCloseServiceImageUpload()
      return Promise.resolve()
    } catch (error) {
      console.error('Erro ao atualizar imagem do serviço:', error)
      toast({
        title: "Erro no upload",
        description: "Ocorreu um erro ao atualizar a imagem. Tente novamente.",
        variant: "destructive",
      })
      throw error
    }
  }

  // Função para abrir dialog de upload de imagem do serviço
  const handleOpenServiceImageUpload = (service: any) => {
    setSelectedServiceForImage(service)
    setIsServiceImageUploadOpen(true)
  }

  // Função para fechar dialog de upload de imagem do serviço
  const handleCloseServiceImageUpload = () => {
    setSelectedServiceForImage(null)
    setIsServiceImageUploadOpen(false)
  }

  const handleRemoveProfessional = async (id: string, name: string) => {
    const executeRemoval = async () => {
      try {
        console.log('🚀 Removendo profissional:', { id, name })
        
        // Chamar a API de exclusão
        await deleteProfessional(id)
        
        // Recarregar a lista
        await fetchProfessionals()
        
        // Mostrar sucesso
        toast({
          title: "Profissional removido!",
          description: `${name} foi removido com sucesso.`,
          variant: "default",
        })
        
        console.log('✅ Profissional removido com sucesso')
      } catch (error) {
        console.error('❌ Erro ao remover profissional:', error)
        toast({
          title: "Erro ao remover profissional",
          description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
          variant: "destructive",
        })
      }
    }

    // Abrir dialog de confirmação
    openConfirmDialog(
      'professional',
      { id, name },
      'Remover Profissional?',
      `Deseja realmente remover o profissional "${name}"? Esta ação não pode ser desfeita.`,
      executeRemoval
    )
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

  const handleUpdateService = async () => {
    if (!editService.name.trim()) {
      toast({
        title: "Erro de validação",
        description: "Nome do serviço é obrigatório!",
        variant: "destructive",
      })
      return
    }

    try {
      await updateService({ 
        id: editingService.id, 
        name: editService.name.trim(),
        description: editService.description.trim(),
        price: parseFloat(editService.price) || 0,
        duration: parseInt(editService.duration) || 0
      })
      
      setIsEditServiceOpen(false)
      setEditingService(null)
      setEditService({ name: "", description: "", price: "", duration: "" })
      
      toast({
        title: "Serviço atualizado!",
        description: "Os dados do serviço foram atualizados com sucesso.",
        variant: "default",
      })
      
      await fetchServices()
    } catch (error) {
      toast({
        title: "Erro ao atualizar serviço",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      })
    }
  }

  const handleEditService = (service: any) => {
    setEditingService(service)
    setEditService({
      name: service.name || "",
      description: service.description || "",
      price: (typeof service.price === 'number' ? service.price : 0).toString(),
      duration: (typeof service.duration === 'number' ? service.duration : 0).toString()
    })
    setIsEditServiceOpen(true)
  }

  const handleCancelEditService = () => {
    setIsEditServiceOpen(false)
    setEditingService(null)
    setEditService({ name: "", description: "", price: "", duration: "" })
  }

  const handleRemoveService = async (id: string, name: string) => {
    const executeRemoval = async () => {
      try {
        const result = await deleteService(id)
        console.log('Resultado da exclusão do serviço:', result)
        
        // A função deleteService retorna os dados ou null
        // Consideramos sucesso se não houve erro (não lançou exceção)
        toast({
          title: "Serviço removido!",
          description: `Serviço "${name}" foi removido com sucesso.`,
          variant: "default",
        })
        // Recarrega os dados dos serviços
        await fetchServices()
      } catch (error) {
        console.error('Erro ao remover serviço:', error)
        toast({
          title: "Erro ao remover serviço",
          description: servicesError || "Ocorreu um erro inesperado.",
          variant: "destructive",
        })
      }
    }

    openConfirmDialog(
      'service',
      { id, name },
      'Remover Serviço?',
      `Deseja realmente remover o serviço "${name}"? Esta ação não pode ser desfeita.`,
      executeRemoval
    )
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
    const executeRemoval = async () => {
      try {
        const success = await deleteTemplate(id)
        console.log('Resultado da exclusão do template:', success)
        
        // A função deleteTemplate retorna um boolean
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
      } catch (error) {
        console.error('Erro ao excluir template:', error)
        toast({
          title: "Erro ao excluir template",
          description: "Ocorreu um erro inesperado.",
          variant: "destructive",
        })
      }
    }

    openConfirmDialog(
      'template',
      { id, name },
      'Excluir Template?',
      `Deseja realmente excluir o template "${name}"? Esta ação não pode ser desfeita.`,
      executeRemoval
    )
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
          <h1 className="text-2xl md:text-3xl font-bold text-[#ededed]">Configurações</h1>
          <p className="text-[#3f3f46]">Gerencie as configurações do seu estabelecimento</p>
        </div>
        {/* Botão Salvar apenas na aba Estabelecimento */}
        {activeTab === "estabelecimento" && (
          <Button 
            onClick={handleSave} 
            disabled={businessSaving}
            className="bg-[#10b981] hover:bg-[#059669] text-[#ededed] disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {businessSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="space-y-6">
        <div className="border-b border-[#27272a] relative">
          {/* Indicador de scroll apenas no mobile */}
          <div className="block sm:hidden">
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-[#3f3f46] rounded-full opacity-50"></div>
            <div className="text-xs text-[#71717a] text-center mb-2">← Deslize para ver mais abas →</div>
          </div>
          
          <div className="flex gap-4 sm:gap-8 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveTab("estabelecimento")}
              className={`flex items-center gap-2 px-3 py-3 sm:px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "estabelecimento"
                  ? "border-[#10b981] text-[#10b981]"
                  : "border-transparent text-[#71717a] hover:text-[#ededed]"
              }`}
            >
              <Building className="w-4 h-4" />
              <span className="hidden xs:inline">Estabelecimento</span>
              <span className="xs:hidden">Estabelec.</span>
            </button>
            <button
              onClick={() => setActiveTab("profissionais")}
              className={`flex items-center gap-2 px-3 py-3 sm:px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "profissionais"
                  ? "border-[#10b981] text-[#10b981]"
                  : "border-transparent text-[#71717a] hover:text-[#ededed]"
              }`}
            >
              <User className="w-4 h-4" />
              <span className="hidden xs:inline">Profissionais</span>
              <span className="xs:hidden">Profiss.</span>
            </button>
            <button
              onClick={() => setActiveTab("servicos")}
              className={`flex items-center gap-2 px-3 py-3 sm:px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
              className={`flex items-center gap-2 px-3 py-3 sm:px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
              className={`flex items-center gap-2 px-3 py-3 sm:px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "promocoes"
                  ? "border-[#10b981] text-[#10b981]"
                  : "border-transparent text-[#71717a] hover:text-[#ededed]"
              }`}
            >
              <Percent className="w-4 h-4" />
              Promoções
            </button>
          </div>
        </div>

        {/* Conteúdo das Abas */}
        <div className="mt-6">
          {/* Estabelecimento Tab */}
          {activeTab === "estabelecimento" && (
            <Card className="bg-[#18181b] border-[#27272a]">
              <CardHeader>
                <CardTitle className="text-[#a1a1aa] text-lg sm:text-xl">Dados do Estabelecimento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {businessLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="text-[#71717a]">Carregando dados do estabelecimento...</div>
                  </div>
                ) : businessError ? (
                  <div className="text-red-400 text-center py-8">
                    Erro ao carregar dados: {businessError}
                  </div>
                ) : (
                  <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="businessName" className="text-[#ededed]">
                      Nome do Estabelecimento
                    </Label>
                    <Input
                      id="businessName"
                      value={businessData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                      placeholder="Nome do Estabelecimento"
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
                      onChange={(e) => updateField('email', e.target.value)}
                      className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                      placeholder="Seu e-mail"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[#ededed]">
                      Telefone
                    </Label>
                    <Input
                      id="phone"
                      value={businessData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
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
                      onChange={(e) => {
                        // Formatar automaticamente para URL válida
                        const formattedValue = e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, '-') // Substitui caracteres inválidos por hífen
                          .replace(/-+/g, '-') // Remove hífens duplicados
                          .replace(/^-|-$/g, '') // Remove hífens do início e fim
                        updateField('customLink', formattedValue)
                      }}
                      className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                      placeholder="Exemplo: barbearia-do-jorge"
                    />
                    <div className="text-xs text-[#71717a] space-y-1">
                      <p>💡 <strong>Como usar:</strong> Use apenas letras, números e hífen (-)</p>
                      <p>✅ <strong>Correto:</strong> barbearia-do-jorge, cortes-modernos</p>
                      <p>❌ <strong>Evite:</strong> espaços, acentos ou caracteres especiais</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-[#ededed]">
                    Endereço
                  </Label>
                  <Input
                    id="address"
                    value={businessData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                    placeholder="Seu Endereço"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram" className="text-[#ededed]">
                    Instagram
                  </Label>
                  <Input
                    id="instagram"
                    value={businessData.instagram}
                    onChange={(e) => updateField('instagram', e.target.value)}
                    className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                    placeholder="https://instagram.com/seuperfil ou @seuperfil"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#ededed]">Logo do Estabelecimento</Label>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center border-2 border-dashed border-[#3f3f46] overflow-hidden mx-auto sm:mx-0">
                      {businessData.logo ? (
                        <img 
                          src={businessData.logo} 
                          alt="Logo" 
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Scissors className="w-6 h-6 sm:w-8 sm:h-8 text-[#ededed]" />
                      )}
                    </div>
                    <div className="space-y-3 sm:space-y-2 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
                        <Button 
                          size="sm"
                          variant="outline" 
                          className="border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent w-full sm:w-auto"
                          onClick={() => document.getElementById('logo-upload')?.click()}
                          title="Alterar logo do estabelecimento"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          {businessData.logo ? 'Alterar Logo' : 'Fazer Upload'}
                        </Button>
                        {businessData.logo && (
                          <Button 
                            size="sm"
                            variant="outline" 
                            className="border-red-600 text-red-400 hover:text-red-300 bg-transparent w-full sm:w-auto"
                            onClick={() => updateField('logo', '')}
                            title="Remover logo"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Remover
                          </Button>
                        )}
                      </div>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <div className="text-xs text-[#71717a] space-y-1">
                        <p>📐 <strong>Recomendado:</strong> 150x150px (quadrada)</p>
                        <p>📁 <strong>Formatos:</strong> JPG, PNG, GIF (máx. 5MB)</p>
                        <p>✨ <strong>Dica:</strong> Imagem será redimensionada automaticamente</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-900/20 rounded-lg border border-emerald-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon className="w-4 h-4 text-[#10b981]" />
                    <span className="text-[#10b981] font-medium">Link Público do Agendamento</span>
                  </div>
                  <p className="text-emerald-300 text-sm">https://agendapro.com/agendamento/{businessData.customLink || 'seu-link-personalizado'}</p>
                </div>
                </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Profissionais Tab */}
          {activeTab === "profissionais" && (
            <div className="space-y-6">
              {/* Seção de Profissionais */}
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
                      <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed]">
                        <DialogHeader className="text-center pb-4">
                          <DialogTitle className="text-xl font-semibold text-[#ededed] flex items-center justify-center gap-2">
                            <User className="w-5 h-5 text-[#10b981]" />
                            Adicionar Novo Profissional
                          </DialogTitle>
                          <DialogDescription className="text-[#71717a] text-sm">
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
                              disabled={professionalsLoading}
                            >
                              {professionalsLoading ? "Adicionando..." : "Adicionar Profissional"}
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
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
                          Carregando profissionais...
                        </div>
                      </div>
                    ) : professionalsError ? (
                      <div className="text-center py-8 text-red-400">
                        <p>Erro ao carregar profissionais: {professionalsError}</p>
                        <Button 
                          onClick={() => fetchProfessionals()}
                          variant="outline"
                          className="mt-4 border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent"
                        >
                          Tentar Novamente
                        </Button>
                      </div>
                    ) : professionals.length === 0 ? (
                      <div className="text-center py-8 text-[#71717a]">
                        <User className="w-12 h-12 mx-auto mb-4 text-[#3f3f46]" />
                        <p className="text-lg mb-2">Nenhum profissional cadastrado</p>
                        <p className="text-sm">Clique em "Novo Profissional" para adicionar o primeiro profissional.</p>
                      </div>
                    ) : (
                      professionals.map((professional) => (
                        <div
                          key={professional.id}
                          className="p-4 bg-gray-900/50 rounded-lg border border-[#52525b] hover:bg-gray-800/50 transition-colors"
                        >
                          {/* Header com avatar e ações - Mobile-friendly */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <ProfessionalAvatar 
                                avatar={professional.avatar}
                                name={professional.name || "Profissional"}
                                size="lg"
                                className="flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <h3 className="text-[#ededed] font-medium truncate">
                                  {professional.name || "Nome não informado"}
                                </h3>
                                <p className="text-xs text-[#71717a]">
                                  {professional.specialty || "Especialidade não informada"}
                                </p>
                              </div>
                            </div>
                            
                            {/* Ações - Stack vertical em mobile */}
                            <div className="flex sm:flex-row flex-col gap-1 sm:gap-2 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenAvatarUpload(professional)}
                                className="border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent h-8 w-8 p-0 sm:w-auto sm:p-2"
                                title="Alterar foto de perfil"
                              >
                                <Camera className="w-4 h-4" />
                                <span className="hidden sm:inline ml-2">Foto</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditProfessional(professional)}
                                className="border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent h-8 w-8 p-0 sm:w-auto sm:p-2"
                                title="Editar profissional"
                              >
                                <Edit className="w-4 h-4" />
                                <span className="hidden sm:inline ml-2">Editar</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRemoveProfessional(professional.id, professional.name)}
                                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-[#ededed] bg-transparent h-8 w-8 p-0 sm:w-auto sm:p-2"
                                disabled={professionalsLoading}
                                title="Remover profissional"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline ml-2">Remover</span>
                              </Button>
                            </div>
                          </div>

                          {/* Informações em grid responsivo */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-[#71717a]">E-mail</Label>
                              <div className="bg-[#27272a] border border-[#3f3f46] rounded-md px-3 py-2 text-[#ededed] text-sm break-all">
                                {professional.email || "Não informado"}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-[#71717a]">Telefone</Label>
                              <div className="bg-[#27272a] border border-[#3f3f46] rounded-md px-3 py-2 text-[#ededed] text-sm">
                                {professional.phone || "Não informado"}
                              </div>
                            </div>
                          </div>

                          {/* Metadados */}
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#71717a]">
                            <Badge variant={professional.isActive ? "default" : "secondary"} className="text-xs">
                              {professional.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                            {professional.createdAt && (
                              <span>Cadastrado: {formatBrazilDate(professional.createdAt)}</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Dialog para editar profissional */}
              <Dialog open={isEditProfessionalOpen} onOpenChange={setIsEditProfessionalOpen}>
                <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed]">
                  <DialogHeader className="text-center pb-4">
                    <DialogTitle className="text-xl font-semibold text-[#ededed] flex items-center justify-center gap-2">
                      <Edit className="w-5 h-5 text-[#10b981]" />
                      Editar Profissional
                    </DialogTitle>
                    <DialogDescription className="text-[#71717a] text-sm">{}
                      Atualize os dados do profissional
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="editProfessionalName" className="text-[#ededed]">
                        Nome Completo *
                      </Label>
                      <Input
                        id="editProfessionalName"
                        value={editProfessional.name}
                        onChange={(e) => setEditProfessional({ ...editProfessional, name: e.target.value })}
                        className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                        placeholder="Digite o nome do profissional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editProfessionalEmail" className="text-[#ededed]">
                        E-mail
                      </Label>
                      <Input
                        id="editProfessionalEmail"
                        type="email"
                        value={editProfessional.email}
                        onChange={(e) => setEditProfessional({ ...editProfessional, email: e.target.value })}
                        className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                        placeholder="profissional@email.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editProfessionalPhone" className="text-[#ededed]">
                        Telefone
                      </Label>
                      <Input
                        id="editProfessionalPhone"
                        value={editProfessional.phone}
                        onChange={(e) => setEditProfessional({ ...editProfessional, phone: e.target.value })}
                        className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editProfessionalSpecialty" className="text-[#ededed]">
                        Especialidade
                      </Label>
                      <Input
                        id="editProfessionalSpecialty"
                        value={editProfessional.specialty}
                        onChange={(e) => setEditProfessional({ ...editProfessional, specialty: e.target.value })}
                        className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                        placeholder="Ex: Corte masculino, Barba, etc."
                      />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                      <Button 
                        variant="outline" 
                        onClick={handleCancelEditProfessional}
                        className="border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleUpdateProfessional}
                        className="bg-blue-500 hover:bg-blue-600 text-[#ededed]"
                        disabled={professionalsLoading}
                      >
                        {professionalsLoading ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Dialog para upload de avatar */}
              <Dialog open={isAvatarUploadOpen} onOpenChange={setIsAvatarUploadOpen}>
                <DialogContent className="bg-[#0a0a0a] border-[#1a1a1a] text-[#ededed] max-w-lg mx-4 sm:mx-auto backdrop-blur-xl">
                  <DialogHeader className="sr-only">
                    <DialogTitle>Alterar Foto de Perfil</DialogTitle>
                  </DialogHeader>
                  {/* Header com gradiente */}
                  <div className="relative p-6 border-b border-[#1a1a1a]">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-full flex items-center justify-center mx-auto mb-3">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-[#ededed] mb-2">Foto de Perfil</h2>
                      <p className="text-[#71717a] text-sm">
                        {selectedProfessionalForAvatar?.name && `Alterar foto de perfil de ${selectedProfessionalForAvatar.name}`}
                      </p>
                    </div>
                  </div>

                  {/* Conteúdo principal */}
                  <div className="p-6 space-y-6">
                    {/* Preview da foto */}
                    <div className="flex justify-center">
                      <div className="relative">
                        <div className="w-32 h-32 rounded-lg border-4 border-[#1a1a1a] overflow-hidden bg-[#18181b] flex items-center justify-center">
                          {selectedProfessionalForAvatar?.avatar ? (
                            <img 
                              src={selectedProfessionalForAvatar.avatar} 
                              alt={selectedProfessionalForAvatar.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-lg flex items-center justify-center">
                              <span className="text-white font-bold text-xl">
                                {selectedProfessionalForAvatar?.name?.charAt(0) || 'P'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botões de ação */}
                    <div className="flex gap-3 justify-center">
                      <Button
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/jpeg,image/jpg,image/png,image/gif';
                          input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              try {
                                // Validar tipo de arquivo
                                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
                                if (!allowedTypes.includes(file.type)) {
                                  toast({
                                    title: "Formato não suportado",
                                    description: "Use apenas JPG, PNG ou GIF.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                // Validar tamanho (5MB)
                                if (file.size > 5 * 1024 * 1024) {
                                  toast({
                                    title: "Arquivo muito grande",
                                    description: "O arquivo deve ter no máximo 5MB.",
                                    variant: "destructive",
                                  });
                                  return;
                                }

                                // Usar a mesma abordagem do estabelecimento
                                const base64 = await uploadLogo(file);
                                await handleProfessionalAvatarChange(selectedProfessionalForAvatar.id, base64);
                              } catch (error) {
                                console.error('Erro ao processar arquivo:', error);
                                toast({
                                  title: "Erro no upload",
                                  description: "Erro ao processar o arquivo selecionado.",
                                  variant: "destructive",
                                });
                              }
                            }
                          };
                          input.click();
                        }}
                        className="bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white border-0 px-6 py-2.5"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Alterar Foto
                      </Button>
                      
                      {selectedProfessionalForAvatar?.avatar && (
                        <Button
                          variant="outline"
                          onClick={() => handleProfessionalAvatarChange(selectedProfessionalForAvatar.id, null)}
                          className="border-red-600/50 text-red-400 hover:bg-red-600/20 hover:border-red-500 px-6 py-2.5"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remover Foto
                        </Button>
                      )}
                    </div>

                    {/* Requisitos com emojis */}
                    <div className="bg-[#111111] rounded-lg p-4 border border-[#1a1a1a]">
                      <div className="space-y-2 text-sm text-[#a1a1aa]">
                        <p className="text-[#ededed] font-medium mb-3 text-center">Requisitos</p>
                        <div className="space-y-1.5">
                          <p>📐 <strong>Resolução:</strong> 1024x1024px (quadrada)</p>
                          <p>📁 <strong>Formatos:</strong> JPG, PNG, GIF (máx. 5MB)</p>
                          <p>✨ <strong>Dica:</strong> Imagem será redimensionada automaticamente</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-6 border-t border-[#1a1a1a] bg-[#0f0f0f]">
                    <Button 
                      variant="outline" 
                      onClick={handleCloseAvatarUpload}
                      className="w-full border-[#3f3f46] text-[#71717a] hover:text-[#ededed] hover:bg-[#1a1a1a] py-2.5"
                    >
                      Fechar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Serviços Tab */}
          {activeTab === "servicos" && (
            <div className="space-y-6">
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
                    <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] max-w-md mx-4 sm:mx-auto">
                      <DialogHeader className="text-center pb-4">
                        <DialogTitle className="text-xl font-semibold text-[#ededed] flex items-center justify-center gap-2">
                          <Wrench className="w-5 h-5 text-[#10b981]" />
                          Novo Serviço
                        </DialogTitle>
                        <DialogDescription className="text-[#71717a] text-sm">
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
                            <Label htmlFor="servicePrice" className="text-[#ededed]">Preço (R$) *</Label>
                            <Input
                              id="servicePrice"
                              type="number"
                              step="0.01"
                              value={newService.price}
                              onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                              className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                              placeholder="0,00"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="serviceDuration" className="text-[#ededed]">Duração (min) *</Label>
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
                            className="border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent min-h-[44px] px-6 touch-manipulation"
                          >
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleAddService}
                            className="bg-purple-500 hover:bg-purple-600 text-[#ededed] min-h-[44px] px-6 touch-manipulation"
                            disabled={servicesLoading}
                          >
                            {servicesLoading ? "Adicionando..." : "Adicionar Serviço"}
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
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        Carregando serviços...
                      </div>
                    </div>
                  ) : servicesError ? (
                    <div className="text-center py-8 text-red-400">
                      <p>Erro ao carregar serviços: {servicesError}</p>
                      <Button 
                        onClick={() => fetchServices()}
                        variant="outline"
                        className="mt-4 border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent"
                      >
                        Tentar Novamente
                      </Button>
                    </div>
                  ) : dbServices.length === 0 ? (
                    <div className="text-center py-8 text-[#71717a]">
                      <Wrench className="w-12 h-12 mx-auto mb-4 text-[#3f3f46]" />
                      <p className="text-lg mb-2">Nenhum serviço cadastrado</p>
                      <p className="text-sm">Clique em "Novo Serviço" para adicionar o primeiro serviço.</p>
                    </div>
                  ) : (
                    dbServices.map((service) => (
                      <div
                        key={service.id}
                        className="p-4 bg-gray-900/50 rounded-lg border border-[#52525b] hover:bg-gray-800/50 transition-colors"
                      >
                        {/* Header com imagem e ações - Mobile-friendly */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <ServiceImage 
                              image={service.image}
                              name={service.name || "Serviço"}
                              size="lg"
                              className="flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <h3 className="text-[#ededed] font-medium truncate">
                                {service.name || "Nome não informado"}
                              </h3>
                              <p className="text-xs text-[#71717a] truncate">
                                {service.description || "Descrição não informada"}
                              </p>
                            </div>
                          </div>
                          
                          {/* Ações - Stack vertical em mobile */}
                          <div className="flex sm:flex-row flex-col gap-1 sm:gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenServiceImageUpload(service)}
                              className="border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent h-8 w-8 p-0 sm:w-auto sm:p-2"
                              title="Alterar imagem do serviço"
                            >
                              <Camera className="w-4 h-4" />
                              <span className="hidden sm:inline ml-2">Foto</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditService(service)}
                              className="border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent h-8 w-8 p-0 sm:w-auto sm:p-2"
                              title="Editar serviço"
                            >
                              <Edit className="w-4 h-4" />
                              <span className="hidden sm:inline ml-2">Editar</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveService(service.id, service.name)}
                              className="border-red-600 text-red-400 hover:bg-red-600 hover:text-[#ededed] bg-transparent h-8 w-8 p-0 sm:w-auto sm:p-2"
                              disabled={servicesLoading}
                              title="Remover serviço"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="hidden sm:inline ml-2">Remover</span>
                            </Button>
                          </div>
                        </div>

                        {/* Informações em grid responsivo */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-[#71717a]">Preço</Label>
                            <div className="bg-[#27272a] border border-[#3f3f46] rounded-md px-3 py-2 text-[#ededed] text-sm font-medium">
                              R$ {formatCurrency(service.price)}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-[#71717a]">Duração</Label>
                            <div className="bg-[#27272a] border border-[#3f3f46] rounded-md px-3 py-2 text-[#ededed] text-sm">
                              {service.duration || 0} minutos
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-[#71717a]">Categoria</Label>
                            <div className="bg-[#27272a] border border-[#3f3f46] rounded-md px-3 py-2 text-[#ededed] text-sm">
                              {service.category || "Geral"}
                            </div>
                          </div>
                        </div>

                        {/* Metadados */}
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#71717a]">
                          <Badge variant={service.isActive ? "default" : "secondary"} className="text-xs">
                            {service.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                          {service.createdAt && (
                            <span>Cadastrado: {formatBrazilDate(parseDate(service.createdAt))}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Dialog para editar serviço */}
            <Dialog open={isEditServiceOpen} onOpenChange={setIsEditServiceOpen}>
              <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] max-w-md mx-4 sm:mx-auto">
                <DialogHeader className="text-center pb-4">
                  <DialogTitle className="text-xl font-semibold text-[#ededed] flex items-center justify-center gap-2">
                    <Edit className="w-5 h-5 text-[#10b981]" />
                    Editar Serviço
                  </DialogTitle>
                  <DialogDescription className="text-[#71717a] text-sm">
                    Atualize os dados do serviço
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="editServiceName" className="text-[#ededed]">Nome do Serviço *</Label>
                    <Input
                      id="editServiceName"
                      value={editService.name}
                      onChange={(e) => setEditService({ ...editService, name: e.target.value })}
                      className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                      placeholder="Ex: Corte masculino"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editServiceDescription" className="text-[#ededed]">Descrição</Label>
                    <Input
                      id="editServiceDescription"
                      value={editService.description}
                      onChange={(e) => setEditService({ ...editService, description: e.target.value })}
                      className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                      placeholder="Descrição do serviço"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editServicePrice" className="text-[#ededed]">Preço (R$) *</Label>
                      <Input
                        id="editServicePrice"
                        type="number"
                        step="0.01"
                        value={editService.price}
                        onChange={(e) => setEditService({ ...editService, price: e.target.value })}
                        className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editServiceDuration" className="text-[#ededed]">Duração (min) *</Label>
                      <Input
                        id="editServiceDuration"
                        type="number"
                        value={editService.duration}
                        onChange={(e) => setEditService({ ...editService, duration: e.target.value })}
                        className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                        placeholder="30"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <Button 
                      variant="outline" 
                      onClick={handleCancelEditService}
                      className="border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent min-h-[44px] px-6 touch-manipulation"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleUpdateService}
                      className="bg-purple-500 hover:bg-purple-600 text-[#ededed] min-h-[44px] px-6 touch-manipulation"
                      disabled={servicesLoading}
                    >
                      {servicesLoading ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Dialog para upload de imagem do serviço */}
            <Dialog open={isServiceImageUploadOpen} onOpenChange={setIsServiceImageUploadOpen}>
              <DialogContent className="bg-[#0a0a0a] border-[#1a1a1a] text-[#ededed] max-w-lg mx-4 sm:mx-auto backdrop-blur-xl">
                <DialogHeader className="sr-only">
                  <DialogTitle>Alterar Imagem do Serviço</DialogTitle>
                </DialogHeader>
                {/* Header com gradiente */}
                <div className="relative p-6 border-b border-[#1a1a1a]">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-full flex items-center justify-center mx-auto mb-3">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#ededed] mb-2">Imagem do Serviço</h2>
                    <p className="text-[#71717a] text-sm">
                      {selectedServiceForImage?.name && `Alterar imagem do serviço ${selectedServiceForImage.name}`}
                    </p>
                  </div>
                </div>

                {/* Conteúdo principal */}
                <div className="p-6 space-y-6">
                  {/* Preview da imagem */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-lg border-4 border-[#1a1a1a] overflow-hidden bg-[#18181b] flex items-center justify-center">
                        {selectedServiceForImage?.image ? (
                          <img 
                            src={selectedServiceForImage.image} 
                            alt={selectedServiceForImage.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xl">
                              {selectedServiceForImage?.name?.charAt(0) || 'S'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botões de ação */}
                  <div className="flex gap-3 justify-center">
                    <Button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/jpeg,image/jpg,image/png,image/gif';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            try {
                              // Validar tipo de arquivo
                              const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
                              if (!allowedTypes.includes(file.type)) {
                                toast({
                                  title: "Formato não suportado",
                                  description: "Use apenas JPG, PNG ou GIF.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              // Validar tamanho (5MB)
                              if (file.size > 5 * 1024 * 1024) {
                                toast({
                                  title: "Arquivo muito grande",
                                  description: "O arquivo deve ter no máximo 5MB.",
                                  variant: "destructive",
                                });
                                return;
                              }

                              // Usar a mesma abordagem do estabelecimento
                              const base64 = await uploadLogo(file);
                              await handleServiceImageChange(selectedServiceForImage.id, base64);
                            } catch (error) {
                              console.error('Erro ao processar arquivo:', error);
                              toast({
                                title: "Erro no upload",
                                description: "Erro ao processar o arquivo selecionado.",
                                variant: "destructive",
                              });
                            }
                          }
                        };
                        input.click();
                      }}
                      className="bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white border-0 px-6 py-2.5"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Alterar Foto
                    </Button>
                    
                    {selectedServiceForImage?.image && (
                      <Button
                        variant="outline"
                        onClick={() => handleServiceImageChange(selectedServiceForImage.id, null)}
                        className="border-red-600/50 text-red-400 hover:bg-red-600/20 hover:border-red-500 px-6 py-2.5"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remover Foto
                      </Button>
                    )}
                  </div>

                  {/* Requisitos com emojis */}
                  <div className="bg-[#111111] rounded-lg p-4 border border-[#1a1a1a]">
                    <div className="space-y-2 text-sm text-[#a1a1aa]">
                      <p className="text-[#ededed] font-medium mb-3 text-center">Requisitos</p>
                      <div className="space-y-1.5">
                        <p>📐 <strong>Resolução:</strong> 1024x1024px (quadrada)</p>
                        <p>📁 <strong>Formatos:</strong> JPG, PNG, GIF (máx. 5MB)</p>
                        <p>✨ <strong>Dica:</strong> Imagem será redimensionada automaticamente</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#1a1a1a] bg-[#0f0f0f]">
                  <Button 
                    variant="outline" 
                    onClick={handleCloseServiceImageUpload}
                    className="w-full border-[#3f3f46] text-[#71717a] hover:text-[#ededed] hover:bg-[#1a1a1a] py-2.5"
                  >
                    Fechar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
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
                {workingHoursLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="w-6 h-6 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-[#71717a]">Carregando horários...</span>
                  </div>
                ) : workingHoursError ? (
                  <div className="text-red-400 text-center py-8 bg-red-900/10 rounded-lg border border-red-700/30">
                    <p className="font-medium">Erro ao carregar horários</p>
                    <p className="text-sm mt-1">{workingHoursError}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(workingHours).map(([day, hours]) => (
                      <div key={day} className="group relative bg-[#27272a]/50 hover:bg-[#27272a] transition-colors rounded-xl border border-[#3f3f46] overflow-hidden">
                        <div className="p-5">
                          <div className="flex items-center justify-between">
                            {/* Lado esquerdo - Dia e Switch */}
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <Switch
                                  checked={hours.active}
                                  onCheckedChange={(checked) =>
                                    handleWorkingHoursChange(day, 'active', checked)
                                  }
                                  className="data-[state=checked]:bg-[#10b981]"
                                />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[#ededed] font-semibold text-lg">
                                  {day === 'monday' && 'Segunda-feira'}
                                  {day === 'tuesday' && 'Terça-feira'}
                                  {day === 'wednesday' && 'Quarta-feira'}
                                  {day === 'thursday' && 'Quinta-feira'}
                                  {day === 'friday' && 'Sexta-feira'}
                                  {day === 'saturday' && 'Sábado'}
                                  {day === 'sunday' && 'Domingo'}
                                </span>
                                <span className="text-[#71717a] text-sm">
                                  {hours.active ? 'Estabelecimento aberto' : 'Estabelecimento fechado'}
                                </span>
                              </div>
                            </div>

                            {/* Lado direito - Horários ou Status */}
                            <div className="flex items-center gap-3">
                              {hours.active ? (
                                <div className="flex items-center gap-3 bg-[#18181b] rounded-lg p-3 border border-[#3f3f46]">
                                  <div className="flex flex-col items-center">
                                    <label className="text-[#a1a1aa] text-xs font-medium mb-1">Abertura</label>
                                    <Select
                                      value={hours.start}
                                      onValueChange={(value) => handleWorkingHoursChange(day, 'start', value)}
                                    >
                                      <SelectTrigger className="bg-[#27272a] border-[#52525b] text-[#ededed] w-24 h-9 text-center font-mono focus:ring-[#10b981] focus:border-[#10b981]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-[#27272a] border-[#52525b] max-h-60">
                                        {generateTimeOptions().map((time) => (
                                          <SelectItem key={time} value={time} className="text-[#ededed] focus:bg-[#3f3f46] focus:text-[#ededed]">
                                            {time}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex items-center px-2">
                                    <span className="text-[#71717a] font-medium">até</span>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <label className="text-[#a1a1aa] text-xs font-medium mb-1">Fechamento</label>
                                    <Select
                                      value={hours.end}
                                      onValueChange={(value) => handleWorkingHoursChange(day, 'end', value)}
                                    >
                                      <SelectTrigger className="bg-[#27272a] border-[#52525b] text-[#ededed] w-24 h-9 text-center font-mono focus:ring-[#10b981] focus:border-[#10b981]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-[#27272a] border-[#52525b] max-h-60">
                                        {generateTimeOptions().map((time) => (
                                          <SelectItem key={time} value={time} className="text-[#ededed] focus:bg-[#3f3f46] focus:text-[#ededed]">
                                            {time}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 px-4 py-2 bg-red-900/20 rounded-lg border border-red-700/30">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <span className="text-red-400 font-medium">Fechado</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Indicador visual sutil */}
                        <div className={`h-1 w-full transition-colors ${
                          hours.active ? 'bg-gradient-to-r from-[#10b981] to-[#059669]' : 'bg-gradient-to-r from-red-600 to-red-700'
                        }`}></div>
                      </div>
                    ))}
                    
                    {/* Informações adicionais */}
                    <div className="mt-6 p-4 bg-blue-900/10 rounded-lg border border-blue-700/30">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">ℹ</span>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-blue-400 font-medium">Informações Importantes</h4>
                          <ul className="text-blue-300 text-sm space-y-1">
                            <li>• Os horários definidos aqui controlam quando novos agendamentos podem ser feitos</li>
                            <li>• Agendamentos já existentes não são afetados pelas mudanças</li>
                            <li>• As alterações são salvas automaticamente</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Promoções Tab */}
          {activeTab === "promocoes" && (
            <Card className="bg-[#18181b] border-[#27272a]">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-[#a1a1aa]">Templates de Promoção</CardTitle>
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
                    <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] max-w-md mx-4 sm:mx-auto">
                      <DialogHeader className="text-center pb-4">
                        <DialogTitle className="text-xl font-semibold text-[#ededed] flex items-center justify-center gap-2">
                          <Plus className="w-5 h-5 text-[#10b981]" />
                          {editingTemplate ? 'Editar Template' : 'Novo Template'}
                        </DialogTitle>
                        <DialogDescription className="text-[#71717a] text-sm">
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
                            placeholder="Olá [nome]! Aproveite nossa promoção especial de Natal com 20% de desconto em todos os serviços! 🎁✂️"
                          />
                          <div className="text-xs text-[#fbbf24] bg-[#fbbf24]/10 p-2 rounded border border-[#fbbf24]/20">
                            💡 <strong>Dica:</strong> Use <code className="bg-[#27272a] px-1 rounded">[nome]</code> para personalizar automaticamente com o nome do cliente
                          </div>
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
                <div className="space-y-6">
                  {/* Explicação da funcionalidade [nome] */}
                  <div className="p-4 bg-gradient-to-r from-[#fbbf24]/10 to-[#f59e0b]/10 rounded-lg border border-[#fbbf24]/30">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-[#fbbf24] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MessageSquare className="w-4 h-4 text-[#0a0a0a]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-[#fbbf24] font-medium mb-2">🚀 Personalização Automática</h3>
                        <p className="text-[#71717a] text-sm mb-3">
                          Use <code className="bg-[#27272a] px-2 py-1 rounded text-[#fbbf24]">[nome]</code> nos seus templates para personalizar automaticamente as mensagens com o nome de cada cliente.
                        </p>
                        <div className="space-y-2">
                          <div className="text-xs">
                            <span className="text-[#71717a]">📝 Exemplo:</span>
                            <div className="bg-[#27272a] p-2 rounded mt-1 text-[#ededed]">
                              "Olá [nome]! Temos uma promoção especial para você! 🎉"
                            </div>
                          </div>
                          <div className="text-xs">
                            <span className="text-[#71717a]">📤 Será enviado como:</span>
                            <div className="bg-[#1f2937] p-2 rounded mt-1 text-[#10b981]">
                              "Olá João! Temos uma promoção especial para você! 🎉"
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lista de templates */}
                  <div className="space-y-4">
                    {templatesLoading ? (
                      <div className="text-center py-8 text-[#71717a]">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-[#fbbf24] border-t-transparent rounded-full animate-spin"></div>
                          Carregando templates...
                        </div>
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
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-[#3f3f46]" />
                        <p className="text-lg mb-2">Nenhum template cadastrado</p>
                        <p className="text-sm">Clique em "Novo Template" para criar o primeiro template de promoção.</p>
                      </div>
                    ) : (
                      promotionTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="p-4 bg-gray-900/50 rounded-lg border border-[#52525b] hover:bg-gray-800/50 transition-colors"
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
                          {template.message.includes('[nome]') && (
                            <div className="mt-2 text-xs text-[#fbbf24] flex items-center gap-1">
                              ✨ <span>Este template será personalizado automaticamente com o nome do cliente</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog de Confirmação */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirmDialog}
        onConfirm={handleConfirmAction}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText="Remover"
        confirmVariant="destructive"
        cancelText="Cancelar"
      />
    </div>
  )
}
