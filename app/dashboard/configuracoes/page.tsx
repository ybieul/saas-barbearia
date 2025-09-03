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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { formatBrazilDate, parseDate } from "@/lib/timezone"
import { formatCurrency } from "@/lib/currency"
import { ProfessionalAvatar } from "@/components/professional-avatar"
import { ProfessionalAvatarUpload } from "@/components/professional-avatar-upload"
import ServiceImage from "@/components/service-image"
import ServiceImageUpload from "@/components/service-image-upload"
import { ProfileSelector } from "@/components/profile-selector"
import { ProfessionalScheduleManager } from "@/components/professional-schedule-manager"
import { ScheduleExceptionsManager } from "@/components/schedule-exceptions-manager"
import { useProfessionals } from "@/hooks/use-api"
import { useServices } from "@/hooks/use-services"
import { usePromotionTemplates } from "@/hooks/use-promotion-templates"
import { useWorkingHours } from "@/hooks/use-working-hours"
import { useBusinessData } from "@/hooks/use-business-data"
import { useSubscription } from "@/hooks/use-subscription"
import { useAuth } from "@/hooks/use-auth"
import { QrCodeModal } from "@/components/qr-code-modal"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  QrCode,
  Copy,
  Lock,
  Eye,
  EyeOff,
  Check,
} from "lucide-react"

// Componente para alteração de senha
function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { token, isAuthenticated } = useAuth() // ✅ CORRIGIDO: Usar hook useAuth

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // ✅ CORRIGIDO: Verificar se está autenticado usando o hook
    if (!isAuthenticated || !token) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para alterar a senha",
        variant: "destructive",
      })
      return
    }
    
    // Validações básicas
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Erro",
        description: "Todos os campos são obrigatórios",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro", 
        description: "A nova senha e a confirmação não coincidem",
        variant: "destructive",
      })
      return
    }

    if (currentPassword === newPassword) {
      toast({
        title: "Erro",
        description: "A nova senha deve ser diferente da senha atual",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // ✅ CORRIGIDO: Usar o token do hook useAuth em vez do localStorage
      const response = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // ✅ Token do hook useAuth
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: data.message || "Senha alterada com sucesso!",
        })
        
        // Limpar campos
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        toast({
          title: "Erro",
          description: data.error || "Erro ao alterar senha",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error)
      toast({
        title: "Erro",
        description: "Erro interno. Tente novamente mais tarde.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-tymer-primary/10 rounded-lg flex items-center justify-center border border-tymer-primary/30">
          <Lock className="w-5 h-5 text-tymer-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[#ededed]">Alterar Senha</h3>
          <p className="text-sm text-[#71717a]">Mantenha sua conta segura alterando sua senha regularmente</p>
        </div>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-[#ededed]">
              Senha Atual
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-[#27272a] border-[#3f3f46] text-[#ededed] pr-10"
                placeholder="Digite sua senha atual"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#71717a] hover:text-[#ededed] transition-colors"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-[#ededed]">
              Nova Senha
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-[#27272a] border-[#3f3f46] text-[#ededed] pr-10"
                placeholder="Digite a nova senha"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#71717a] hover:text-[#ededed] transition-colors"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-[#71717a]">Mínimo de 6 caracteres</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-[#ededed]">
            Confirmar Nova Senha
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-[#27272a] border-[#3f3f46] text-[#ededed] pr-10"
              placeholder="Confirme a nova senha"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#71717a] hover:text-[#ededed] transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-tymer-primary hover:bg-tymer-primary/80 text-white border-0"
          >
            {isLoading ? "Alterando..." : "Alterar Senha"}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function ConfiguracoesPage() {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  // Estados para gerenciamento de horários
  const [selectedProfile, setSelectedProfile] = useState<string>("establishment");
  const [professionalName, setProfessionalName] = useState<string>("");
  
  const [activeTab, setActiveTab] = useState("estabelecimento")

  // Estado para o modal do QR Code
  const [isQrCodeModalOpen, setIsQrCodeModalOpen] = useState(false)

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

  // Hook para limites de assinatura
  const { planLimits, loading: limitsLoading } = useSubscription()

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

  // Previne foco automático no modal de editar profissional (apenas no primeiro input)
  useEffect(() => {
    if (isEditProfessionalOpen) {
      const timer = setTimeout(() => {
        // Remove foco apenas do primeiro input quando o modal abre
        const modal = document.querySelector('[data-state="open"]')
        if (modal) {
          const firstInput = modal.querySelector('input[id="editProfessionalName"]') as HTMLElement
          if (firstInput && firstInput === document.activeElement) {
            firstInput.blur()
          }
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [isEditProfessionalOpen])
  
  // Previne foco automático no modal de novo profissional (apenas no primeiro input)
  useEffect(() => {
    if (isNewProfessionalOpen) {
      const timer = setTimeout(() => {
        // Remove foco apenas do primeiro input quando o modal abre
        const modal = document.querySelector('[data-state="open"]')
        if (modal) {
          const firstInput = modal.querySelector('input[id="professionalName"]') as HTMLElement
          if (firstInput && firstInput === document.activeElement) {
            firstInput.blur()
          }
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [isNewProfessionalOpen])
  
  // Previne foco automático nos modais de serviços (apenas no primeiro input)
  useEffect(() => {
    if (isNewServiceOpen || isEditServiceOpen) {
      const timer = setTimeout(() => {
        // Remove foco apenas do primeiro input quando o modal abre
        const modal = document.querySelector('[data-state="open"]')
        if (modal) {
          const firstInput = modal.querySelector('input[id="serviceName"], input[id="editServiceName"]') as HTMLElement
          if (firstInput && firstInput === document.activeElement) {
            firstInput.blur()
          }
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [isNewServiceOpen, isEditServiceOpen])
  
  // Previne foco automático no modal de templates (apenas no primeiro input)
  useEffect(() => {
    if (isNewTemplateOpen) {
      const timer = setTimeout(() => {
        // Remove foco apenas do primeiro input quando o modal abre
        const modal = document.querySelector('[data-state="open"]')
        if (modal) {
          const firstInput = modal.querySelector('input[id="templateName"]') as HTMLElement
          if (firstInput && firstInput === document.activeElement) {
            firstInput.blur()
          }
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [isNewTemplateOpen])

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

  const handleCopyLink = async () => {
    if (!businessData.customLink) return
    
    const publicUrl = `https://tymerbook.com/agendamento/${businessData.customLink}`
    
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para a área de transferência.",
        variant: "default",
      })
    } catch (err) {
      console.error('Falha ao copiar o link para a área de transferência: ', err)
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleSave = async () => {
    try {
      await updateBusinessData(businessData)
      toast({
        title: "✅ Configurações salvas",
        description: "Todas as alterações foram salvas com sucesso.",
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Verifique sua conexão e tente novamente.",
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
        title: "✅ Logo carregada",
        description: "Logo do estabelecimento foi carregada com sucesso.",
        variant: "default",
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao carregar logo"
      
      // Notificações específicas baseadas no tipo de erro
      if (errorMessage.includes('deve ser uma imagem')) {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione uma imagem JPG, PNG, GIF ou WEBP.",
          variant: "destructive",
        })
      } else if (errorMessage.includes('máximo 5MB')) {
        toast({
          title: "Arquivo muito grande",
          description: "A imagem deve ter no máximo 5MB. Tente reduzir o tamanho.",
          variant: "destructive",
        })
      } else if (errorMessage.includes('processar imagem')) {
        toast({
          title: "Erro ao processar",
          description: "Não foi possível processar a imagem. Tente novamente.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Erro no upload",
          description: "Ocorreu um erro ao carregar a logo. Tente novamente.",
          variant: "destructive",
        })
      }
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
    } catch (error: any) {
      // Tratamento específico para erro de limite de plano
      if (error?.message?.includes('limite') || error?.message?.includes('atingiu')) {
        toast({
          title: "Limite de plano atingido",
          description: error.message || "Você atingiu o limite de profissionais para seu plano atual.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Erro ao adicionar profissional",
          description: professionalsError || error?.message || "Ocorreu um erro inesperado.",
          variant: "destructive",
        })
      }
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
    
    // Remover foco automático do primeiro input após abertura do modal
    setTimeout(() => {
      const activeElement = document.activeElement as HTMLElement
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        activeElement.blur()
      }
    }, 100)
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao atualizar avatar:', error)
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao atualizar imagem do serviço:', error)
      }
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
        if (process.env.NODE_ENV === 'development') {
          console.log('🚀 Removendo profissional:', { id, name })
        }
        
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
        
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Profissional removido com sucesso')
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Erro ao remover profissional:', error)
        }
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
        duration: parseInt(newService.duration) || 0
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
        if (process.env.NODE_ENV === 'development') {
          console.log('Resultado da exclusão do serviço:', result)
        }
        
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
        if (process.env.NODE_ENV === 'development') {
          console.error('Erro ao remover serviço:', error)
        }
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
        if (process.env.NODE_ENV === 'development') {
          console.log('Resultado da exclusão do template:', success)
        }
        
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
        if (process.env.NODE_ENV === 'development') {
          console.error('Erro ao excluir template:', error)
        }
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
      ? "border-tymer-primary text-tymer-primary"
                  : "border-transparent text-[#71717a] hover:text-[#ededed]"
              }`}
            >
              <Building className="w-4 h-4" />
              Estabelecimento
            </button>
    <button
              onClick={() => setActiveTab("profissionais")}
              className={`flex items-center gap-2 px-3 py-3 sm:px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "profissionais"
      ? "border-tymer-primary text-tymer-primary"
                  : "border-transparent text-[#71717a] hover:text-[#ededed]"
              }`}
            >
              <User className="w-4 h-4" />
              Profissionais
            </button>
    <button
              onClick={() => setActiveTab("servicos")}
              className={`flex items-center gap-2 px-3 py-3 sm:px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "servicos"
      ? "border-tymer-primary text-tymer-primary"
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
      ? "border-tymer-primary text-tymer-primary"
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
      ? "border-tymer-primary text-tymer-primary"
                  : "border-transparent text-[#71717a] hover:text-[#ededed]"
              }`}
            >
              <Percent className="w-4 h-4" />
              Promoções
            </button>
    <button
              onClick={() => setActiveTab("conta")}
              className={`flex items-center gap-2 px-3 py-3 sm:px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "conta"
      ? "border-tymer-primary text-tymer-primary"
                  : "border-transparent text-[#71717a] hover:text-[#ededed]"
              }`}
            >
              <User className="w-4 h-4" />
              Conta
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
                        // Permitir digitação livre de hífens, letras e números
                        const rawValue = e.target.value
                        
                        // Formatação mínima em tempo real - apenas conversões básicas
                        const processedValue = rawValue
                          .toLowerCase() // Converter para minúsculas
                          .replace(/\s/g, '-') // Converter espaços em hífens
                        
                        // Aplicar apenas se for diferente (evita loops)
                        if (processedValue !== businessData.customLink) {
                          updateField('customLink', processedValue)
                        }
                      }}
                      onBlur={(e) => {
                        // Limpeza completa apenas quando sair do campo
                        const cleanValue = e.target.value
                          .toLowerCase()
                          .replace(/\s+/g, '-') // Espaços -> hífens
                          .replace(/[^a-z0-9-]/g, '') // Manter apenas: letras, números, hífen
                          .replace(/-+/g, '-') // Múltiplos hífens -> hífen único
                          .replace(/^-|-$/g, '') // Remove hífens das pontas
                        
                        // Atualizar apenas se mudou
                        if (cleanValue !== businessData.customLink) {
                          updateField('customLink', cleanValue)
                        }
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

                {/* Botão Salvar Alterações */}
                <div className="flex justify-center sm:justify-end pt-4">
                  <Button 
                    onClick={handleSave} 
                    disabled={businessSaving}
                    className="bg-tymer-primary hover:bg-tymer-primary/80 text-white disabled:opacity-50 w-full sm:w-auto px-6 py-2.5"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {businessSaving ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>

                <div className="p-4 bg-tymer-primary/10 rounded-lg border border-tymer-primary/30">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon className="w-4 h-4 text-white" />
                    <span className="text-white font-medium">Link Público do Agendamento</span>
                  </div>
                  
                  {/* Container flexível para o link e botão copiar */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <p className="text-white text-sm flex-1 break-all">
                      https://tymerbook.com/agendamento/{businessData.customLink || 'seu-link-personalizado'}
                    </p>
                    <Button
                      onClick={handleCopyLink}
                      disabled={copied || !businessData.customLink}
                      variant="outline"
                      size="sm"
                      className="border-tymer-primary/50 text-white hover:bg-tymer-primary/20 hover:text-white transition-all duration-200 whitespace-nowrap"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Botão para gerar QR Code */}
                  <Button 
                    onClick={() => setIsQrCodeModalOpen(true)}
                    disabled={!businessData.customLink}
                    className="bg-tymer-primary hover:bg-tymer-primary/80 text-white w-full sm:w-auto"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Gerar QR Code para Impressão
                  </Button>
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
                  <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                    <div className="space-y-2">
                      <CardTitle className="text-[#a1a1aa] text-lg sm:text-xl">Profissionais</CardTitle>
                      
                      {/* Indicador de uso de profissionais */}
                      {!limitsLoading && planLimits?.professionals && (
                        <div className="flex items-center gap-2 text-sm">
                          {planLimits.professionals.limit === -1 ? (
                            <Badge variant="secondary" className="bg-tymer-accent/20 text-tymer-accent border-tymer-accent/30">
                              Profissionais ilimitados
                            </Badge>
                          ) : (
                            <Badge 
                              variant="secondary" 
                              className={`${
                                planLimits.professionals.current >= planLimits.professionals.limit
                                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                  : planLimits.professionals.current >= planLimits.professionals.limit * 0.8
                                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                  : 'bg-tymer-primary/20 text-tymer-primary border-tymer-primary/30'
                              }`}
                            >
                              {planLimits.professionals.current} de {planLimits.professionals.limit} profissionais
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <Dialog open={isNewProfessionalOpen} onOpenChange={setIsNewProfessionalOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          className="bg-tymer-primary hover:bg-tymer-primary/80 text-[#ededed] w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={
                            limitsLoading || 
                            (planLimits?.professionals && 
                             planLimits.professionals.limit !== -1 && 
                             planLimits.professionals.current >= planLimits.professionals.limit)
                          }
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Novo Profissional
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-2xl mx-auto h-[75vh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-xl">
                        {/* Header fixo */}
                        <DialogHeader className="border-b border-[#27272a] pb-3 md:pb-4 flex-shrink-0">
                          <DialogTitle className="text-[#ededed] text-base md:text-xl font-semibold flex items-center gap-2">
                            <div className="p-1.5 md:p-2 bg-tymer-primary/15 rounded-lg border border-tymer-primary/30">
                              <User className="w-4 h-4 md:w-5 md:h-5 text-tymer-primary" />
                            </div>
                            Novo Profissional
                          </DialogTitle>
                          <DialogDescription className="text-[#71717a] text-sm hidden md:block">
                            Adicione um novo profissional à sua equipe
                          </DialogDescription>
                        </DialogHeader>
                        
                        {/* Conteúdo com scroll */}
                        <div className="overflow-y-auto flex-1 px-4 sm:px-6">
                          <div className="space-y-4 md:space-y-6 mt-3 md:mt-4">
                            {/* Seção de Informações Básicas */}
                            <div className="bg-gradient-to-br from-tymer-primary/15 to-tymer-primary/5 p-3 md:p-4 rounded-lg border border-tymer-primary/25 md:bg-tymer-card/50 space-y-3 md:space-y-4">
                              <div className="flex items-center gap-2 mb-2 md:mb-3">
                                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-tymer-primary rounded-full"></div>
                                <h3 className="text-[#ededed] font-medium text-sm md:text-base">Informações Básicas</h3>
                              </div>
                              
                              <div className="space-y-3 md:space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="professionalName" className="text-[#ededed] text-sm font-medium">
                                    Nome Completo *
                                  </Label>
                                  <Input
                                    id="professionalName"
                                    value={newProfessional.name}
                                    onChange={(e) => setNewProfessional({ ...newProfessional, name: e.target.value })}
                                    className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                                    placeholder="Nome completo do profissional"
                                    autoFocus={false}
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="professionalEmail" className="text-[#ededed] text-sm font-medium">
                                    E-mail
                                  </Label>
                                  <Input
                                    id="professionalEmail"
                                    type="email"
                                    value={newProfessional.email}
                                    onChange={(e) => setNewProfessional({ ...newProfessional, email: e.target.value })}
                                    className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                                    placeholder="profissional@email.com"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Seção de Informações Adicionais */}
                            <div className="space-y-3 md:space-y-4">
                              <div className="flex items-center gap-2 md:hidden">
                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                                <h3 className="text-[#ededed] font-medium text-sm">Informações Adicionais</h3>
                              </div>
                              
                              <div className="space-y-3 md:space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="professionalPhone" className="text-[#ededed] text-sm font-medium">
                                    Telefone
                                  </Label>
                                  <Input
                                    id="professionalPhone"
                                    value={newProfessional.phone}
                                    onChange={(e) => setNewProfessional({ ...newProfessional, phone: e.target.value })}
                                    className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                                    placeholder="(11) 99999-9999"
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="professionalSpecialty" className="text-[#ededed] text-sm font-medium">
                                    Especialidade
                                  </Label>
                                  <Input
                                    id="professionalSpecialty"
                                    value={newProfessional.specialty}
                                    onChange={(e) => setNewProfessional({ ...newProfessional, specialty: e.target.value })}
                                    className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                                    placeholder="Ex: Corte masculino, Barba, etc."
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Footer fixo */}
                        <DialogFooter className="border-t border-[#27272a] pt-3 md:pt-4 flex-shrink-0 px-4 sm:px-6">
                          <div className="flex flex-row justify-center sm:justify-end gap-3 w-full">
                            <Button 
                              variant="outline" 
                              onClick={handleCancelAddProfessional}
                              className="border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent min-h-[48px] sm:min-h-[44px] px-6 touch-manipulation"
                            >
                              Cancelar
                            </Button>
                              <Button 
                              onClick={handleAddProfessional}
                              className="bg-tymer-primary hover:bg-tymer-primary/80 text-[#ededed] min-h-[48px] sm:min-h-[44px] px-6 touch-manipulation"
                              disabled={professionalsLoading}
                            >
                              {professionalsLoading ? "Adicionando..." : "Adicionar"}
                            </Button>
                          </div>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Alerta de limite de plano */}
                  {!limitsLoading && planLimits?.professionals && planLimits.professionals.limit !== -1 && (
                    <div className="mb-4">
                      {planLimits.professionals.current >= planLimits.professionals.limit ? (
                        <Alert className="border-red-500/20 bg-red-500/10">
                          <AlertDescription className="text-red-400">
                            <strong>Limite atingido!</strong> Você atingiu o limite de {planLimits.professionals.limit} profissionais para seu plano atual.
                            {planLimits.professionals.limit === 1 && (
                              <span> Considere fazer upgrade para o plano Premium (3 profissionais) ou Ultra (ilimitado).</span>
                            )}
                            {planLimits.professionals.limit === 5 && (
                              <span> Considere fazer upgrade para o plano Ultra (profissionais ilimitados).</span>
                            )}
                          </AlertDescription>
                        </Alert>
                      ) : planLimits.professionals.current >= planLimits.professionals.limit * 0.8 ? (
                        <Alert className="border-yellow-500/20 bg-yellow-500/10">
                          <AlertDescription className="text-yellow-400">
                            <strong>Atenção!</strong> Você está próximo do limite de profissionais ({planLimits.professionals.current} de {planLimits.professionals.limit}).
                          </AlertDescription>
                        </Alert>
                      ) : null}
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    {professionalsLoading ? (
                      <div className="text-center py-8 text-[#71717a]">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-tymer-primary border-t-transparent rounded-full animate-spin"></div>
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
                          className="p-3 sm:p-4 bg-tymer-card/50 rounded-lg border border-tymer-border hover:bg-tymer-card/70 transition-colors"
                        >
                          {/* Header com avatar e ações - Mobile-friendly */}
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <ProfessionalAvatar 
                                avatar={professional.avatar}
                                name={professional.name || "Profissional"}
                                size="lg"
                                className="flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <h3 className="text-[#ededed] font-medium truncate text-sm sm:text-base">
                                  {professional.name || "Nome não informado"}
                                </h3>
                                <p className="text-xs text-[#71717a]">
                                  {professional.specialty || "Especialidade não informada"}
                                </p>
                              </div>
                            </div>
                            
                            {/* Ações - Grid em mobile, horizontal no desktop */}
                            <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-2 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenAvatarUpload(professional)}
                                className="border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent w-full sm:w-auto"
                                title="Alterar foto de perfil"
                              >
                                <Camera className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Foto</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditProfessional(professional)}
                                className="border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent w-full sm:w-auto"
                                title="Editar profissional"
                              >
                                <Edit className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Editar</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRemoveProfessional(professional.id, professional.name)}
                                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-[#ededed] bg-transparent w-full sm:w-auto"
                                disabled={professionalsLoading}
                                title="Remover profissional"
                              >
                                <Trash2 className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Remover</span>
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
                              <span>Cadastrado: {formatBrazilDate(new Date(professional.createdAt))}</span>
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
                <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-2xl mx-auto h-[75vh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-xl">
                  {/* Header fixo */}
                  <DialogHeader className="border-b border-[#27272a] pb-3 md:pb-4 flex-shrink-0">
                    <DialogTitle className="text-[#ededed] text-base md:text-xl font-semibold flex items-center gap-2">
                      <div className="p-1.5 md:p-2 bg-tymer-primary/15 rounded-lg border border-tymer-primary/30">
                        <Edit className="w-4 h-4 md:w-5 md:h-5 text-tymer-primary" />
                      </div>
                      Editar Profissional
                    </DialogTitle>
                    <DialogDescription className="text-[#71717a] text-sm hidden md:block">
                      Atualize os dados do profissional
                    </DialogDescription>
                  </DialogHeader>
                  
                  {/* Conteúdo com scroll */}
                  <div className="overflow-y-auto flex-1 px-4 sm:px-6">
                    <div className="space-y-4 md:space-y-6 mt-3 md:mt-4">
                      {/* Seção de Informações Básicas */}
                      <div className="bg-gradient-to-br from-tymer-primary/15 to-tymer-primary/5 p-3 md:p-4 rounded-lg border border-tymer-primary/25 md:bg-tymer-card/50 space-y-3 md:space-y-4">
                        <div className="flex items-center gap-2 mb-2 md:mb-3">
                          <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-tymer-primary rounded-full"></div>
                          <h3 className="text-[#ededed] font-medium text-sm md:text-base">Informações Básicas</h3>
                        </div>
                        
                        <div className="space-y-3 md:space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="editProfessionalName" className="text-[#ededed] text-sm font-medium">
                              Nome Completo *
                            </Label>
                            <Input
                              id="editProfessionalName"
                              value={editProfessional.name}
                              onChange={(e) => setEditProfessional({ ...editProfessional, name: e.target.value })}
                              className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                              placeholder="Nome completo do profissional"
                              autoFocus={false}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="editProfessionalEmail" className="text-[#ededed] text-sm font-medium">
                              E-mail
                            </Label>
                            <Input
                              id="editProfessionalEmail"
                              type="email"
                              value={editProfessional.email}
                              onChange={(e) => setEditProfessional({ ...editProfessional, email: e.target.value })}
                              className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                              placeholder="profissional@email.com"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Seção de Informações Adicionais */}
                      <div className="space-y-3 md:space-y-4">
                        <div className="flex items-center gap-2 md:hidden">
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                          <h3 className="text-[#ededed] font-medium text-sm">Informações Adicionais</h3>
                        </div>
                        
                        <div className="space-y-3 md:space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="editProfessionalPhone" className="text-[#ededed] text-sm font-medium">
                              Telefone
                            </Label>
                            <Input
                              id="editProfessionalPhone"
                              value={editProfessional.phone}
                              onChange={(e) => setEditProfessional({ ...editProfessional, phone: e.target.value })}
                              className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                              placeholder="(11) 99999-9999"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="editProfessionalSpecialty" className="text-[#ededed] text-sm font-medium">
                              Especialidade
                            </Label>
                            <Input
                              id="editProfessionalSpecialty"
                              value={editProfessional.specialty}
                              onChange={(e) => setEditProfessional({ ...editProfessional, specialty: e.target.value })}
                              className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                              placeholder="Ex: Corte masculino, Barba, etc."
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Footer fixo */}
                  <DialogFooter className="border-t border-[#27272a] pt-3 md:pt-4 flex-shrink-0 px-4 sm:px-6">
                    <div className="flex flex-row justify-center sm:justify-end gap-3 w-full">
                      <Button 
                        variant="outline" 
                        onClick={handleCancelEditProfessional}
                        className="border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent min-h-[48px] sm:min-h-[44px] px-6 touch-manipulation"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleUpdateProfessional}
                        className="bg-tymer-primary hover:bg-tymer-primary/80 text-[#ededed] min-h-[48px] sm:min-h-[44px] px-6 touch-manipulation"
                        disabled={professionalsLoading}
                      >
                        {professionalsLoading ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Dialog para upload de avatar */}
              <Dialog open={isAvatarUploadOpen} onOpenChange={setIsAvatarUploadOpen}>
                <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-2xl mx-auto h-[75vh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-xl">
                  {/* Header fixo */}
                  <DialogHeader className="border-b border-[#27272a] pb-3 md:pb-4 flex-shrink-0">
                    <DialogTitle className="text-[#ededed] text-base md:text-xl font-semibold flex items-center gap-2">
                      <div className="p-1.5 md:p-2 bg-tymer-primary/15 rounded-lg border border-tymer-primary/30">
                        <Camera className="w-4 h-4 md:w-5 md:h-5 text-tymer-primary" />
                      </div>
                      Foto de Perfil
                    </DialogTitle>
                    <DialogDescription className="text-[#71717a] text-sm hidden md:block">
                      Altere a foto de perfil do profissional
                    </DialogDescription>
                  </DialogHeader>
                  
                  {/* Conteúdo com scroll */}
                  <div className="overflow-y-auto flex-1 px-4 sm:px-6">
                    <div className="mt-3 md:mt-4">
                      {selectedProfessionalForAvatar && (
                        <ProfessionalAvatarUpload
                          currentAvatar={selectedProfessionalForAvatar.avatar}
                          professionalName={selectedProfessionalForAvatar.name}
                          onAvatarChange={(avatar) => handleProfessionalAvatarChange(selectedProfessionalForAvatar.id, avatar)}
                          size="lg"
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* Footer fixo */}
                  <div className="flex gap-3 p-4 sm:p-6 flex-shrink-0 pt-1 md:pt-2">
                    <Button 
                      variant="outline" 
                      onClick={handleCloseAvatarUpload}
                      className="w-full border-[#3f3f46] text-[#ededed] md:text-[#71717a] hover:bg-[#27272a] hover:border-[#52525b] md:hover:text-[#ededed] transition-all duration-200 h-10 md:min-h-[44px]"
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
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                  <CardTitle className="text-lg sm:text-xl text-[#a1a1aa]">Serviços Oferecidos</CardTitle>
                  <Dialog open={isNewServiceOpen} onOpenChange={setIsNewServiceOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-tymer-primary hover:bg-tymer-primary/80 text-white w-full sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Serviço
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-2xl mx-auto h-[75vh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-xl">
                      {/* Header fixo */}
                      <DialogHeader className="border-b border-[#27272a] pb-3 md:pb-4 flex-shrink-0">
                        <DialogTitle className="text-[#ededed] text-base md:text-xl font-semibold flex items-center gap-2">
                          <div className="p-1.5 md:p-2 rounded-lg bg-tymer-primary/15 border border-tymer-primary/30">
                            <Wrench className="w-4 h-4 md:w-5 md:h-5 text-tymer-primary" />
                          </div>
                          Novo Serviço
                        </DialogTitle>
                        <DialogDescription className="text-[#71717a] text-sm hidden md:block">
                          Preencha os dados do novo serviço
                        </DialogDescription>
                      </DialogHeader>
                      
                      {/* Conteúdo com scroll */}
                      <div className="overflow-y-auto flex-1 px-4 sm:px-6">
                        <div className="space-y-4 md:space-y-6 mt-3 md:mt-4">
                          {/* Seção de Informações Básicas */}
                          <div className="bg-gradient-to-br from-tymer-primary/15 to-tymer-primary/5 p-3 md:p-4 rounded-lg border border-tymer-primary/25 md:bg-tymer-card/50 space-y-3 md:space-y-4">
                            <div className="flex items-center gap-2 mb-2 md:mb-3">
                              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-tymer-primary rounded-full"></div>
                              <h3 className="text-[#ededed] font-medium text-sm md:text-base">Informações do Serviço</h3>
                            </div>
                            
                            <div className="space-y-3 md:space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="serviceName" className="text-[#ededed] text-sm font-medium">
                                  Nome do Serviço *
                                </Label>
                                <Input
                                  id="serviceName"
                                  value={newService.name}
                                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                                  className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                                  placeholder="Ex: Corte masculino"
                                  autoFocus={false}
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="serviceDescription" className="text-[#ededed] text-sm font-medium">
                                  Descrição
                                </Label>
                                <Input
                                  id="serviceDescription"
                                  value={newService.description}
                                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                                  className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                                  placeholder="Descrição do serviço"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Seção de Valores e Duração */}
                          <div className="space-y-3 md:space-y-4">
                            <div className="flex items-center gap-2 md:hidden">
                              <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                              <h3 className="text-[#ededed] font-medium text-sm">Valores e Duração</h3>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="servicePrice" className="text-[#ededed] text-sm font-medium">
                                  Preço (R$) *
                                </Label>
                                <Input
                                  id="servicePrice"
                                  type="number"
                                  step="0.01"
                                  value={newService.price}
                                  onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                                  className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                                  placeholder="0,00"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="serviceDuration" className="text-[#ededed] text-sm font-medium">
                                  Duração (min) *
                                </Label>
                                <Input
                                  id="serviceDuration"
                                  type="number"
                                  value={newService.duration}
                                  onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                                  className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                                  placeholder="30"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Footer fixo */}
                      <div className="flex gap-3 p-4 sm:p-6 flex-shrink-0 pt-1 md:pt-2">
                        <Button 
                          variant="outline" 
                          onClick={handleCancelAddService}
                          className="flex-1 border-[#3f3f46] text-[#ededed] md:text-[#71717a] hover:bg-[#27272a] hover:border-[#52525b] md:hover:text-[#ededed] transition-all duration-200 h-10 md:min-h-[44px]"
                        >
                          Cancelar
                        </Button>
                        <Button 
                          onClick={handleAddService}
                          className="flex-1 bg-tymer-primary hover:bg-tymer-primary/80 text-white shadow-lg shadow-tymer-primary/20 transition-all duration-200 h-10 md:min-h-[44px]"
                          disabled={servicesLoading}
                        >
                          {servicesLoading ? "Adicionando..." : "Adicionar Serviço"}
                        </Button>
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
                        className="p-3 sm:p-4 bg-tymer-card/50 rounded-lg border border-tymer-border hover:bg-tymer-card/70 transition-colors"
                      >
                        {/* Header com imagem e ações - Mobile-friendly */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <ServiceImage 
                              image={service.image}
                              name={service.name || "Serviço"}
                              size="lg"
                              className="flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm sm:text-base text-[#ededed] font-medium truncate">
                                {service.name || "Nome não informado"}
                              </h3>
                              <p className="text-xs text-[#71717a] truncate">
                                {service.description || "Descrição não informada"}
                              </p>
                            </div>
                          </div>
                          
                          {/* Ações - Grid em mobile, flex em desktop */}
                          <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenServiceImageUpload(service)}
                              className="border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent w-full h-8 p-0 sm:w-auto sm:p-2"
                              title="Alterar imagem do serviço"
                            >
                              <Camera className="w-4 h-4" />
                              <span className="hidden sm:inline ml-2">Foto</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditService(service)}
                              className="border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent w-full h-8 p-0 sm:w-auto sm:p-2"
                              title="Editar serviço"
                            >
                              <Edit className="w-4 h-4" />
                              <span className="hidden sm:inline ml-2">Editar</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveService(service.id, service.name)}
                              className="border-red-600 text-red-400 hover:bg-red-600 hover:text-[#ededed] bg-transparent w-full h-8 p-0 sm:w-auto sm:p-2"
                              disabled={servicesLoading}
                              title="Remover serviço"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="hidden sm:inline ml-2">Remover</span>
                            </Button>
                          </div>
                        </div>

                        {/* Informações em grid responsivo */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-[#71717a]">Preço</Label>
                            <div className="bg-[#27272a] border border-[#3f3f46] rounded-md px-3 py-2 text-[#ededed] text-sm font-medium">
                              {formatCurrency(service.price)}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-[#71717a]">Duração</Label>
                            <div className="bg-[#27272a] border border-[#3f3f46] rounded-md px-3 py-2 text-[#ededed] text-sm">
                              {service.duration || 0} minutos
                            </div>
                          </div>
                        </div>

                        {/* Metadados */}
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#71717a]">
                          <Badge variant={service.isActive ? "default" : "secondary"} className="text-xs">
                            {service.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                          {service.createdAt && (
                            <span className="text-xs sm:text-sm">Cadastrado: {formatBrazilDate(new Date(service.createdAt))}</span>
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
              <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-2xl mx-auto h-[75vh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-xl">
                {/* Header fixo */}
                <DialogHeader className="border-b border-[#27272a] pb-3 md:pb-4 flex-shrink-0">
                  <DialogTitle className="text-[#ededed] text-base md:text-xl font-semibold flex items-center gap-2">
                    <div className="p-1.5 md:p-2 bg-gradient-to-br from-tymer-primary/15 to-tymer-primary/5 rounded-lg border border-tymer-primary/30">
                      <Edit className="w-4 h-4 md:w-5 md:h-5 text-tymer-primary" />
                    </div>
                    Editar Serviço
                  </DialogTitle>
                  <DialogDescription className="text-[#71717a] text-sm hidden md:block">
                    Atualize os dados do serviço
                  </DialogDescription>
                </DialogHeader>
                
                {/* Conteúdo com scroll */}
                <div className="overflow-y-auto flex-1 px-4 sm:px-6">
                  <div className="space-y-4 md:space-y-6 mt-3 md:mt-4">
          {/* Seção de Informações Básicas */}
          <div className="bg-gradient-to-br from-tymer-primary/15 to-tymer-primary/5 p-3 md:p-4 rounded-lg border border-tymer-primary/25 md:bg-tymer-card/50 space-y-3 md:space-y-4">
                      <div className="flex items-center gap-2 mb-2 md:mb-3">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-tymer-primary rounded-full"></div>
                        <h3 className="text-[#ededed] font-medium text-sm md:text-base">Informações do Serviço</h3>
                      </div>
                      
                      <div className="space-y-3 md:space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="editServiceName" className="text-[#ededed] text-sm font-medium">
                            Nome do Serviço *
                          </Label>
                          <Input
                            id="editServiceName"
                            value={editService.name}
                            onChange={(e) => setEditService({ ...editService, name: e.target.value })}
                            className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                            placeholder="Ex: Corte masculino"
                            autoFocus={false}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="editServiceDescription" className="text-[#ededed] text-sm font-medium">
                            Descrição
                          </Label>
                          <Input
                            id="editServiceDescription"
                            value={editService.description}
                            onChange={(e) => setEditService({ ...editService, description: e.target.value })}
                            className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                            placeholder="Descrição do serviço"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Seção de Valores e Duração */}
                    <div className="space-y-3 md:space-y-4">
                      <div className="flex items-center gap-2 md:hidden">
                        <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                        <h3 className="text-[#ededed] font-medium text-sm">Valores e Duração</h3>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="editServicePrice" className="text-[#ededed] text-sm font-medium">
                            Preço (R$) *
                          </Label>
                          <Input
                            id="editServicePrice"
                            type="number"
                            step="0.01"
                            value={editService.price}
                            onChange={(e) => setEditService({ ...editService, price: e.target.value })}
                            className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                            placeholder="0,00"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="editServiceDuration" className="text-[#ededed] text-sm font-medium">
                            Duração (min) *
                          </Label>
                          <Input
                            id="editServiceDuration"
                            type="number"
                            value={editService.duration}
                            onChange={(e) => setEditService({ ...editService, duration: e.target.value })}
                            className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                            placeholder="30"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Footer fixo */}
                <div className="flex gap-3 p-4 sm:p-6 flex-shrink-0 pt-1 md:pt-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCancelEditService}
                    className="flex-1 border-[#3f3f46] text-[#ededed] md:text-[#71717a] hover:bg-[#27272a] hover:border-[#52525b] md:hover:text-[#ededed] transition-all duration-200 h-10 md:min-h-[44px]"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleUpdateService}
                    className="flex-1 bg-tymer-primary hover:bg-tymer-primary/80 text-white shadow-lg shadow-tymer-primary/25 transition-all duration-200 h-10 md:min-h-[44px]"
                    disabled={servicesLoading}
                  >
                    {servicesLoading ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Dialog para upload de imagem do serviço */}
            <Dialog open={isServiceImageUploadOpen} onOpenChange={setIsServiceImageUploadOpen}>
              <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-2xl mx-auto h-[75vh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-xl">
                {/* Header fixo */}
                <DialogHeader className="border-b border-[#27272a] pb-3 md:pb-4 flex-shrink-0">
                  <DialogTitle className="text-[#ededed] text-base md:text-xl font-semibold flex items-center gap-2">
                    <div className="p-1.5 md:p-2 bg-gradient-to-br from-tymer-primary/15 to-tymer-primary/5 rounded-lg border border-tymer-primary/30">
                      <Camera className="w-4 h-4 md:w-5 md:h-5 text-tymer-primary" />
                    </div>
                    Imagem do Serviço
                  </DialogTitle>
                  <DialogDescription className="text-[#71717a] text-sm hidden md:block">
                    Altere a imagem do serviço
                  </DialogDescription>
                </DialogHeader>
                
                {/* Conteúdo com scroll */}
                <div className="overflow-y-auto flex-1 px-4 sm:px-6">
                  <div className="mt-3 md:mt-4">
                    {selectedServiceForImage && (
                      <ServiceImageUpload
                        currentImage={selectedServiceForImage.image}
                        serviceName={selectedServiceForImage.name}
                        onImageChange={(image) => handleServiceImageChange(selectedServiceForImage.id, image)}
                        size="lg"
                      />
                    )}
                  </div>
                </div>
                
                {/* Footer fixo */}
                <div className="flex gap-3 p-4 sm:p-6 flex-shrink-0 pt-1 md:pt-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCloseServiceImageUpload}
                    className="w-full border-[#3f3f46] text-[#ededed] md:text-[#71717a] hover:bg-[#27272a] hover:border-[#52525b] md:hover:text-[#ededed] transition-all duration-200 h-10 md:min-h-[44px]"
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
            <div className="space-y-6">
              {/* Seletor de Perfil */}
              <ProfileSelector 
                selectedProfile={selectedProfile}
                onProfileChange={(profile, professionalData) => {
                  setSelectedProfile(profile);
                  setProfessionalName(professionalData?.name || "");
                }}
              />

              {/* Renderização Condicional baseada no perfil selecionado */}
              {selectedProfile === "establishment" ? (
                // Interface existente para horários do estabelecimento
                <Card className="bg-[#18181b] border-[#27272a]">
                  <CardHeader>
                    <CardTitle className="text-[#a1a1aa] text-lg sm:text-xl">Horários de Funcionamento</CardTitle>
                    <CardDescription className="text-[#71717a]">
                      Defina os horários de funcionamento do seu estabelecimento
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {workingHoursLoading ? (
                      <div className="flex justify-center items-center py-8">
                        <div className="w-6 h-6 border-2 border-tymer-primary border-t-transparent rounded-full animate-spin"></div>
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
                            <div className="p-3 sm:p-5">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                {/* Lado esquerdo - Dia e Switch */}
                                <div className="flex items-center gap-3 sm:gap-4">
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
                                    <span className="text-[#ededed] font-semibold text-base sm:text-lg">
                                      {day === 'monday' && 'Segunda-feira'}
                                      {day === 'tuesday' && 'Terça-feira'}
                                      {day === 'wednesday' && 'Quarta-feira'}
                                      {day === 'thursday' && 'Quinta-feira'}
                                      {day === 'friday' && 'Sexta-feira'}
                                      {day === 'saturday' && 'Sábado'}
                                      {day === 'sunday' && 'Domingo'}
                                    </span>
                                    <span className="text-[#71717a] text-xs sm:text-sm">
                                      {hours.active ? 'Estabelecimento aberto' : 'Estabelecimento fechado'}
                                    </span>
                                  </div>
                                </div>

                                {/* Lado direito - Horários ou Status */}
                                <div className="flex items-center gap-2 sm:gap-3">
                                  {hours.active ? (
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 bg-[#18181b] rounded-lg p-2.5 sm:p-3 border border-[#3f3f46] w-full sm:w-auto">
                                      {/* Container de Abertura */}
                                      <div className="flex items-center justify-between sm:flex-col sm:items-center sm:justify-center">
                                        <label className="text-[#a1a1aa] text-xs font-medium sm:mb-1 flex-shrink-0 min-w-[60px] sm:min-w-0">Abertura</label>
                                        <Select
                                          value={hours.start}
                                          onValueChange={(value) => handleWorkingHoursChange(day, 'start', value)}
                                        >
                                          <SelectTrigger className="bg-[#27272a] border-[#52525b] text-[#ededed] w-20 sm:w-24 h-7 sm:h-9 text-center font-mono focus:ring-[#10b981] focus:border-[#10b981] text-xs sm:text-sm">
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
                                      
                                      {/* Separador "até" - apenas no desktop */}
                                      <div className="hidden sm:flex items-center justify-center px-2 order-3 sm:order-2">
                                        <span className="text-[#71717a] font-medium text-sm">até</span>
                                      </div>
                                      
                                      {/* Container de Fechamento */}
                                      <div className="flex items-center justify-between sm:flex-col sm:items-center sm:justify-center order-2 sm:order-3">
                                        <label className="text-[#a1a1aa] text-xs font-medium sm:mb-1 flex-shrink-0 min-w-[60px] sm:min-w-0">Fechamento</label>
                                        <Select
                                          value={hours.end}
                                          onValueChange={(value) => handleWorkingHoursChange(day, 'end', value)}
                                        >
                                          <SelectTrigger className="bg-[#27272a] border-[#52525b] text-[#ededed] w-20 sm:w-24 h-7 sm:h-9 text-center font-mono focus:ring-[#10b981] focus:border-[#10b981] text-xs sm:text-sm">
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
                                    <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-red-900/20 rounded-lg border border-red-700/30">
                                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                      <span className="text-red-400 font-medium text-xs sm:text-sm">Fechado</span>
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
                        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-900/10 rounded-lg border border-blue-700/30">
                          <div className="flex items-start gap-2 sm:gap-3">
                            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-tymer-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-white text-xs font-bold">ℹ</span>
                            </div>
                            <div className="space-y-1 sm:space-y-2">
                              <h4 className="text-tymer-primary font-medium text-sm sm:text-base">Informações Importantes</h4>
                              <ul className="text-blue-300 text-xs sm:text-sm space-y-0.5 sm:space-y-1">
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
              ) : (
                // Nova interface para horários dos profissionais
                <div className="space-y-6">
                  <ProfessionalScheduleManager 
                    professionalId={selectedProfile}
                    professionalName={professionalName}
                  />
                  <ScheduleExceptionsManager 
                    professionalId={selectedProfile}
                    professionalName={professionalName}
                  />
                </div>
              )}
            </div>
          )}

          {/* Promoções Tab */}
          {activeTab === "promocoes" && (
            <Card className="bg-[#18181b] border-[#27272a]">
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                  <div>
                    <CardTitle className="text-[#a1a1aa] text-lg sm:text-xl">Templates de Promoção</CardTitle>
                    <CardDescription className="text-[#71717a]">
                      Crie templates de mensagens promocionais para enviar aos seus clientes
                    </CardDescription>
                  </div>
                  <Dialog open={isNewTemplateOpen} onOpenChange={setIsNewTemplateOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-[#0a0a0a] shadow-lg shadow-amber-500/20 transition-all duration-200 w-full sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Template
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-2xl mx-auto h-[75vh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-xl">
                      {/* Header fixo */}
                      <DialogHeader className="border-b border-[#27272a] pb-3 md:pb-4 flex-shrink-0">
                        <DialogTitle className="text-[#ededed] text-base md:text-xl font-semibold flex items-center gap-2">
                          <div className="p-1.5 md:p-2 bg-gradient-to-br from-amber-500/20 to-yellow-600/20 rounded-lg">
                            <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-amber-400 md:text-amber-500" />
                          </div>
                          {editingTemplate ? 'Editar Template' : 'Novo Template'}
                        </DialogTitle>
                        <DialogDescription className="text-[#71717a] text-sm hidden md:block">
                          {editingTemplate ? 'Edite o template de promoção' : 'Crie um novo template de mensagem promocional'}
                        </DialogDescription>
                      </DialogHeader>
                      
                      {/* Conteúdo com scroll */}
                      <div className="overflow-y-auto flex-1 px-4 sm:px-6">
                        <div className="space-y-4 md:space-y-6 mt-3 md:mt-4">
                          {/* Seção de Informações Básicas */}
                          <div className="bg-gradient-to-br from-amber-500/10 to-yellow-600/5 p-3 md:p-4 rounded-lg border border-amber-500/20 md:border-[#27272a] md:bg-[#0a0a0a]/50 space-y-3 md:space-y-4">
                            <div className="flex items-center gap-2 mb-2 md:mb-3">
                              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-amber-400 md:bg-amber-500 rounded-full"></div>
                              <h3 className="text-[#ededed] font-medium text-sm md:text-base">Informações do Template</h3>
                            </div>
                            
                            <div className="space-y-3 md:space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="templateName" className="text-[#ededed] text-sm font-medium">
                                  Nome do Template *
                                </Label>
                                <Input
                                  id="templateName"
                                  value={newTemplate.name}
                                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                                  className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                                  placeholder="Ex: Promoção de Natal"
                                  autoFocus={false}
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="templateTitle" className="text-[#ededed] text-sm font-medium">
                                  Título da Promoção
                                </Label>
                                <Input
                                  id="templateTitle"
                                  value={newTemplate.title}
                                  onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                                  className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] h-10 md:h-11"
                                  placeholder="🎄 Promoção Especial de Natal!"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Seção de Mensagem */}
                          <div className="space-y-3 md:space-y-4">
                            <div className="flex items-center gap-2 md:hidden">
                              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                              <h3 className="text-[#ededed] font-medium text-sm">Conteúdo da Mensagem</h3>
                            </div>
                            
                            <div className="space-y-3 md:space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="templateMessage" className="text-[#ededed] text-sm font-medium">
                                  Mensagem *
                                </Label>
                                <Textarea
                                  id="templateMessage"
                                  value={newTemplate.message}
                                  onChange={(e) => setNewTemplate({ ...newTemplate, message: e.target.value })}
                                  className="bg-[#27272a]/50 md:bg-[#27272a] border-[#3f3f46] text-[#ededed] min-h-[180px] md:min-h-[200px] text-sm resize-none"
                                  placeholder="Olá [nome]! Aproveite nossa promoção especial de Natal com 20% de desconto em todos os serviços! 🎁✂️"
                                />
                              </div>
                              
                              {/* Dica sobre personalização */}
                              <div className="bg-gradient-to-r from-amber-500/10 to-yellow-600/10 p-3 rounded-lg border border-amber-500/20">
                                <div className="flex items-start gap-2">
                                  <div className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-[#0a0a0a] text-xs font-bold">!</span>
                                  </div>
                                  <div className="flex-1 text-xs">
                                    <p className="text-amber-400 font-medium mb-1">💡 Personalização Automática</p>
                                    <p className="text-[#a1a1aa] mb-2">
                                      Use <code className="bg-[#27272a] px-1.5 py-0.5 rounded text-amber-400 font-mono">[nome]</code> para personalizar automaticamente com o nome do cliente
                                    </p>
                                    <div className="space-y-1">
                                      <p className="text-[#71717a]">📝 Exemplo: "Olá [nome]! Temos uma oferta especial..."</p>
                                      <p className="text-[#71717a]">📤 Enviado: "Olá João! Temos uma oferta especial..."</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Footer fixo */}
                      <DialogFooter className="border-t border-[#27272a] pt-3 md:pt-4 flex-shrink-0 px-4 sm:px-6">
                        <div className="flex flex-row justify-center sm:justify-end gap-3 w-full">
                          <Button 
                            variant="outline" 
                            onClick={handleCancelTemplate}
                            className="border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent min-h-[48px] sm:min-h-[44px] px-6 touch-manipulation"
                          >
                            Cancelar
                          </Button>
                          <Button 
                            onClick={editingTemplate ? handleUpdateTemplate : handleAddTemplate}
                            className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-[#0a0a0a] shadow-lg shadow-amber-500/20 transition-all duration-200 min-h-[48px] sm:min-h-[44px] px-6 touch-manipulation"
                            disabled={templatesLoading}
                          >
                            {templatesLoading 
                              ? (editingTemplate ? "Atualizando..." : "Criando...") 
                              : (editingTemplate ? "Atualizar Template" : "Criar Template")
                            }
                          </Button>
                        </div>
                      </DialogFooter>
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
                          className="p-4 bg-tymer-card/50 rounded-lg border border-tymer-border hover:bg-tymer-card/70 transition-colors"
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

          {/* Conta Tab */}
          {activeTab === "conta" && (
            <Card className="bg-[#18181b] border-[#27272a]">
              <CardHeader>
                <CardTitle className="text-[#a1a1aa] text-lg sm:text-xl">Configurações da Conta</CardTitle>
                <CardDescription className="text-[#71717a]">
                  Gerencie as configurações de segurança da sua conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChangePasswordSection />
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
        type={confirmDialog.type as 'professional' | 'service' | 'template' | 'default'}
        itemName={confirmDialog.item?.name}
      />

      {/* Modal do QR Code */}
      <QrCodeModal
        isOpen={isQrCodeModalOpen}
        onClose={() => setIsQrCodeModalOpen(false)}
        customLink={businessData.customLink || ''}
        businessName={businessData.name || 'Estabelecimento'}
        businessLogo={businessData.logo}
      />
    </div>
  )
}
