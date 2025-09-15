import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Building, User } from "lucide-react"
import { useApi } from "@/hooks/use-api"

interface Professional {
  id: string
  name: string
  isActive: boolean
}

interface ProfileSelectorProps {
  selectedProfile: string
  onProfileChange: (profile: string, professionalData?: Professional) => void
}

export function ProfileSelector({ selectedProfile, onProfileChange }: ProfileSelectorProps) {
  const { request, loading, error } = useApi()
  const [professionals, setProfessionals] = useState<Professional[]>([])

  // Buscar lista de profissionais
  useEffect(() => {
    const fetchProfessionals = async () => {
      try {
        const response = await request('/api/professionals?status=active') as { professionals: Professional[] }
        setProfessionals(response?.professionals || [])
      } catch (err) {
        console.error('Erro ao carregar profissionais:', err)
      }
    }

    fetchProfessionals()
  }, [request])

  const handleProfileChange = (profileId: string) => {
    if (profileId === "establishment") {
      onProfileChange(profileId)
    } else {
      const professional = professionals.find(p => p.id === profileId)
      onProfileChange(profileId, professional)
    }
  }

  return (
    <div className="space-y-2 mb-6">
      <Label htmlFor="profile-selector" className="text-[#a1a1aa] text-sm font-medium">
        Gerenciar horários de:
      </Label>
      <Select value={selectedProfile} onValueChange={handleProfileChange}>
        <SelectTrigger 
          id="profile-selector"
          className="bg-[#27272a] border-[#52525b] text-[#ededed] focus:ring-[#10b981] focus:border-[#10b981] w-full max-w-sm"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#27272a] border-[#52525b]">
          <SelectItem value="establishment" className="text-[#ededed] focus:bg-[#3f3f46] focus:text-[#ededed]">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              <span>Horários do Estabelecimento</span>
            </div>
          </SelectItem>
          {loading ? (
            <SelectItem value="loading" disabled className="text-[#71717a]">
              Carregando profissionais...
            </SelectItem>
          ) : error ? (
            <SelectItem value="error" disabled className="text-red-400">
              Erro ao carregar profissionais
            </SelectItem>
          ) : professionals.length === 0 ? (
            <SelectItem value="empty" disabled className="text-[#71717a]">
              Nenhum profissional cadastrado
            </SelectItem>
          ) : (
            professionals.map((professional) => (
              <SelectItem 
                key={professional.id} 
                value={professional.id}
                className="text-[#ededed] focus:bg-[#3f3f46] focus:text-[#ededed]"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{professional.name}</span>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  )
}
