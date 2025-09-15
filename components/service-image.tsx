'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface ServiceImageProps {
  image?: string | null
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function ServiceImage({ 
  image, 
  name, 
  size = 'md', 
  className 
}: ServiceImageProps) {
  const sizeClasses = {
    xs: 'w-8 h-8 text-xs',
    sm: 'w-12 h-12 text-sm',
    md: 'w-16 h-16 text-base',
    lg: 'w-24 h-24 text-lg',
    xl: 'w-32 h-32 text-xl'
  }

  // Gerar iniciais do serviço
  const getServiceInitials = (serviceName: string) => {
    return serviceName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  // Gerar cor baseada no nome do serviço (para consistência)
  const getServiceColor = (serviceName: string) => {
    const colors = [
      'from-purple-500 to-purple-600',
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600',
      'from-yellow-500 to-yellow-600',
      'from-red-500 to-red-600',
      'from-indigo-500 to-indigo-600',
      'from-pink-500 to-pink-600',
      'from-teal-500 to-teal-600',
    ]
    
    // Usar hash simples do nome para escolher cor consistente
    let hash = 0
    for (let i = 0; i < serviceName.length; i++) {
      hash = serviceName.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div className={cn(
      'rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0',
      sizeClasses[size],
      className
    )}>
      {image ? (
        <img 
          src={image} 
          alt={`Imagem do serviço ${name}`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className={cn(
          'w-full h-full bg-gradient-to-br flex items-center justify-center',
          getServiceColor(name || 'Serviço')
        )}>
          <span className="text-white font-semibold">
            {getServiceInitials(name || 'SV')}
          </span>
        </div>
      )}
    </div>
  )
}
