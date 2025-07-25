// Exemplos de uso dos componentes de avatar profissional
// Este arquivo serve como referência para implementação em outras partes do sistema

import { ProfessionalAvatar } from "@/components/professional-avatar"
import { ProfessionalAvatarUpload } from "@/components/professional-avatar-upload"

// ===== EXEMPLO 1: Lista de profissionais (Agenda, Dashboard, etc.) =====
function ProfessionalList({ professionals }) {
  return (
    <div className="space-y-4">
      {professionals.map((professional) => (
        <div key={professional.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-100">
          {/* Avatar simples para listagem */}
          <ProfessionalAvatar 
            avatar={professional.avatar}
            name={professional.name}
            size="md"
          />
          <div>
            <h3 className="font-medium">{professional.name}</h3>
            <p className="text-sm text-gray-600">{professional.specialty}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ===== EXEMPLO 2: Card de profissional com destaque =====
function ProfessionalCard({ professional }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col items-center text-center">
        {/* Avatar grande para destaque */}
        <ProfessionalAvatar 
          avatar={professional.avatar}
          name={professional.name}
          size="xl"
          className="mb-4"
        />
        <h2 className="text-xl font-bold">{professional.name}</h2>
        <p className="text-gray-600">{professional.specialty}</p>
        <div className="mt-4 space-y-2">
          <p className="text-sm">📧 {professional.email}</p>
          <p className="text-sm">📱 {professional.phone}</p>
        </div>
      </div>
    </div>
  )
}

// ===== EXEMPLO 3: Dropdown/Select de profissional =====
function ProfessionalSelect({ professionals, onSelect, selectedId }) {
  return (
    <select onChange={(e) => onSelect(e.target.value)} value={selectedId}>
      <option value="">Selecione um profissional</option>
      {professionals.map((professional) => (
        <option key={professional.id} value={professional.id}>
          {professional.name}
        </option>
      ))}
    </select>
  )
}

// Versão mais rica com avatares (usando componente customizado)
function ProfessionalSelectRich({ professionals, onSelect, selectedId }) {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-3 border rounded-lg bg-white"
      >
        {selectedId ? (
          <>
            <ProfessionalAvatar 
              avatar={professionals.find(p => p.id === selectedId)?.avatar}
              name={professionals.find(p => p.id === selectedId)?.name}
              size="sm"
            />
            <span>{professionals.find(p => p.id === selectedId)?.name}</span>
          </>
        ) : (
          <span className="text-gray-500">Selecione um profissional</span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10">
          {professionals.map((professional) => (
            <button
              key={professional.id}
              onClick={() => {
                onSelect(professional.id)
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
            >
              <ProfessionalAvatar 
                avatar={professional.avatar}
                name={professional.name}
                size="sm"
              />
              <div>
                <div className="font-medium">{professional.name}</div>
                <div className="text-sm text-gray-600">{professional.specialty}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ===== EXEMPLO 4: Modal de perfil completo com edição =====
function ProfessionalProfileModal({ professional, isOpen, onClose, canEdit = false }) {
  const [isEditingAvatar, setIsEditingAvatar] = useState(false)
  
  const handleAvatarChange = async (avatarBase64) => {
    try {
      // Chamar API para atualizar avatar
      await updateProfessionalAvatar(professional.id, avatarBase64)
      setIsEditingAvatar(false)
      // Recarregar dados do profissional
      // refreshProfessional()
    } catch (error) {
      console.error('Erro ao atualizar avatar:', error)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <ProfessionalAvatar 
              avatar={professional.avatar}
              name={professional.name}
              size="xl"
            />
            {canEdit && (
              <button
                onClick={() => setIsEditingAvatar(true)}
                className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div>
            <h2 className="text-xl font-bold">{professional.name}</h2>
            <p className="text-gray-600">{professional.specialty}</p>
          </div>
          
          {/* Informações do profissional */}
          <div className="text-left space-y-2">
            <p><strong>Email:</strong> {professional.email}</p>
            <p><strong>Telefone:</strong> {professional.phone}</p>
            <p><strong>Especialidade:</strong> {professional.specialty}</p>
          </div>
        </div>
        
        {/* Modal para editar avatar */}
        <Dialog open={isEditingAvatar} onOpenChange={setIsEditingAvatar}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Alterar Foto</DialogTitle>
            </DialogHeader>
            <ProfessionalAvatarUpload
              currentAvatar={professional.avatar}
              professionalName={professional.name}
              onAvatarChange={handleAvatarChange}
              size="lg"
            />
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}

// ===== EXEMPLO 5: Chat/Mensagens com avatar =====
function ChatMessage({ message, professional }) {
  return (
    <div className="flex items-start gap-3 p-3">
      <ProfessionalAvatar 
        avatar={professional.avatar}
        name={professional.name}
        size="sm"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{professional.name}</span>
          <span className="text-xs text-gray-500">{message.timestamp}</span>
        </div>
        <p className="text-sm">{message.content}</p>
      </div>
    </div>
  )
}

// ===== EXEMPLO 6: Agenda - Professional Slot =====
function AgendaSlot({ appointment }) {
  return (
    <div className="bg-blue-100 p-3 rounded-lg border-l-4 border-blue-500">
      <div className="flex items-center gap-2 mb-2">
        <ProfessionalAvatar 
          avatar={appointment.professional.avatar}
          name={appointment.professional.name}
          size="xs"
        />
        <span className="text-sm font-medium">{appointment.professional.name}</span>
      </div>
      <div className="text-sm">
        <p className="font-medium">{appointment.service.name}</p>
        <p className="text-gray-600">{appointment.client.name}</p>
        <p className="text-gray-500">{appointment.time}</p>
      </div>
    </div>
  )
}

export {
  ProfessionalList,
  ProfessionalCard,
  ProfessionalSelect,
  ProfessionalSelectRich,
  ProfessionalProfileModal,
  ChatMessage,
  AgendaSlot
}
