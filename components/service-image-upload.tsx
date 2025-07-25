'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Upload, X, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ServiceImageUploadProps {
  currentImage?: string | null
  serviceName: string
  onImageChange: (imageBase64: string | null) => Promise<void>
  size?: 'sm' | 'md' | 'lg'
}

export default function ServiceImageUpload({ 
  currentImage, 
  serviceName, 
  onImageChange,
  size = 'md' 
}: ServiceImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24', 
    lg: 'w-32 h-32'
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const buttonSizes = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-sm px-4 py-2'
  }

  // Função para redimensionar imagem
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Configurar tamanho da imagem (quadrada)
        const targetSize = 300
        canvas.width = targetSize
        canvas.height = targetSize

        // Calcular dimensões para crop centralizado
        const sourceSize = Math.min(img.width, img.height)
        const startX = (img.width - sourceSize) / 2
        const startY = (img.height - sourceSize) / 2

        if (ctx) {
          // Desenhar imagem redimensionada e cortada
          ctx.drawImage(
            img,
            startX, startY, sourceSize, sourceSize,
            0, 0, targetSize, targetSize
          )

          // Converter para base64 com qualidade otimizada
          const base64 = canvas.toDataURL('image/jpeg', 0.8)
          resolve(base64)
        } else {
          reject(new Error('Não foi possível processar a imagem'))
        }
      }

      img.onerror = () => reject(new Error('Erro ao carregar imagem'))
      img.src = URL.createObjectURL(file)
    })
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validações
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione apenas arquivos de imagem (JPG, PNG, WEBP).",
        variant: "destructive",
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      // Redimensionar e converter para base64
      const imageBase64 = await resizeImage(file)
      
      // Atualizar preview local imediatamente
      setPreview(imageBase64)
      
      // Chamar callback para salvar
      await onImageChange(imageBase64)
      
      toast({
        title: "Imagem atualizada!",
        description: "A imagem do serviço foi atualizada com sucesso.",
        variant: "default",
      })
    } catch (error) {
      console.error('Erro ao processar imagem:', error)
      
      // Reverter preview em caso de erro
      setPreview(currentImage || null)
      
      toast({
        title: "Erro ao processar imagem",
        description: error instanceof Error ? error.message : "Tente novamente com outra imagem.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = async () => {
    try {
      setIsUploading(true)
      setPreview(null)
      await onImageChange(null)
      
      toast({
        title: "Imagem removida",
        description: "A imagem do serviço foi removida com sucesso.",
        variant: "default",
      })
    } catch (error) {
      console.error('Erro ao remover imagem:', error)
      setPreview(currentImage || null)
      
      toast({
        title: "Erro ao remover imagem",
        description: "Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  // Gerar iniciais do serviço
  const getServiceInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Preview da imagem */}
      <div className={`${sizeClasses[size]} rounded-xl border-2 border-dashed border-[#3f3f46] bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center overflow-hidden relative group`}>
        {isUploading ? (
          <Loader2 className={`${iconSizes[size]} text-[#a1a1aa] animate-spin`} />
        ) : preview ? (
          <>
            <img 
              src={preview} 
              alt={`Imagem do serviço ${serviceName}`}
              className="w-full h-full object-cover"
            />
            {/* Overlay de ações */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleRemoveImage}
                className="bg-red-600 hover:bg-red-700 text-white border-0"
                disabled={isUploading}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </>
        ) : (
          // Fallback com iniciais do serviço
          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              {getServiceInitials(serviceName || 'SV')}
            </span>
          </div>
        )}
      </div>

      {/* Botões de ação */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleUploadClick}
          disabled={isUploading}
          className={`border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent ${buttonSizes[size]} min-h-[44px] touch-manipulation`}
        >
          {preview ? (
            <>
              <Camera className={iconSizes[size]} />
              <span className="hidden sm:inline ml-2">Alterar</span>
            </>
          ) : (
            <>
              <Upload className={iconSizes[size]} />
              <span className="hidden sm:inline ml-2">Upload</span>
            </>
          )}
        </Button>

        {preview && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRemoveImage}
            disabled={isUploading}
            className={`border-red-600 text-red-400 hover:bg-red-600 hover:text-white bg-transparent ${buttonSizes[size]} min-h-[44px] touch-manipulation`}
          >
            <X className={iconSizes[size]} />
            <span className="hidden sm:inline ml-2">Remover</span>
          </Button>
        )}
      </div>

      {/* Input file oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Dicas de uso */}
      <div className="text-xs text-[#71717a] text-center space-y-1 max-w-xs">
        <p>📐 <strong>Recomendado:</strong> 300x300px</p>
        <p>📁 <strong>Formatos:</strong> JPG, PNG, WEBP (máx. 5MB)</p>
        <p>✨ <strong>Automático:</strong> Redimensionamento e crop centralizado</p>
      </div>
    </div>
  )
}
