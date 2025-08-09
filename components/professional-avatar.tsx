"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User } from "lucide-react"

interface ProfessionalAvatarProps {
  avatar?: string | null
  name: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
  showInitials?: boolean
}

export function ProfessionalAvatar({ 
  avatar, 
  name, 
  size = "md", 
  className = "",
  showInitials = true 
}: ProfessionalAvatarProps) {
  
  // Configurações de tamanho
  const sizeClasses = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-sm", 
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg"
  }

  // Gerar iniciais do nome
  const getInitials = (fullName: string) => {
    if (!fullName) return "?"
    
    return fullName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Avatar className={`${sizeClasses[size]} ${className} border border-[#27272a] rounded-lg`}>
      <AvatarImage 
        src={avatar || undefined} 
        alt={`Foto de ${name}`}
        className="object-cover rounded-lg"
      />
      <AvatarFallback className="bg-[#27272a] text-[#a1a1aa] font-medium rounded-lg">
        {showInitials ? (
          getInitials(name)
        ) : (
          <User className="w-1/2 h-1/2" />
        )}
      </AvatarFallback>
    </Avatar>
  )
}
