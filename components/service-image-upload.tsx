'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Upload, X, Loader2, Check } from 'lucide-react'
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
  const [previewCandidate, setPreviewCandidate] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24', 
    lg: 'w-32 h-32'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  const buttonSizes = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  }

  const getServiceInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
  }

  const handleUploadClick = () => {
    if (previewCandidate) {
      setPreviewCandidate(null)
    } else {
      fileInputRef.current?.click()
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validação de tipo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione uma imagem JPG, PNG ou WEBP.",
        variant: "destructive"
      })
      return
    }

    // Validação de tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive"
      })
      return
    }

    try {
      const processedImage = await processImage(file)
      setPreviewCandidate(processedImage)
      
      toast({
        title: "📸 Pré-visualização pronta",
        description: "Confirme ou cancele a alteração abaixo.",
      })
    } catch (error) {
      console.error('Erro ao processar imagem:', error)
      toast({
        title: "Erro ao processar imagem",
        description: "Tente novamente com outra imagem.",
        variant: "destructive"
      })
    }

    // Limpa o input
    event.target.value = ''
  }

  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Canvas context não disponível'))
        return
      }

      img.onload = () => {
        // Configurar tamanho do canvas
        const targetSize = 300
        canvas.width = targetSize
        canvas.height = targetSize

        // Calcular dimensões para crop centralizado
        const { width, height } = img
        const aspectRatio = width / height
        
        let sourceX = 0, sourceY = 0, sourceWidth = width, sourceHeight = height
        
        if (aspectRatio > 1) {
          // Imagem mais larga que alta
          sourceWidth = height
          sourceX = (width - height) / 2
        } else {
          // Imagem mais alta que larga
          sourceHeight = width
          sourceY = (height - width) / 2
        }

        // Desenhar imagem redimensionada e cortada
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, targetSize, targetSize)
        
        ctx.drawImage(
          img,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, targetSize, targetSize
        )

        // Converter para base64
        const base64 = canvas.toDataURL('image/jpeg', 0.9)
        resolve(base64)
      }

      img.onerror = () => reject(new Error('Erro ao carregar imagem'))
      img.src = URL.createObjectURL(file)
    })
  }

  const handleConfirmImage = async () => {
    if (!previewCandidate) return

    setIsUploading(true)
    try {
      await onImageChange(previewCandidate)
      setPreview(previewCandidate)
      setPreviewCandidate(null)
      
      toast({
        title: "✅ Imagem salva",
        description: "A imagem do serviço foi atualizada com sucesso.",
      })
    } catch (error) {
      console.error('Erro ao salvar imagem:', error)
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a imagem. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancelImage = () => {
    setPreviewCandidate(null)
    toast({
      title: "❌ Alteração cancelada",
      description: "A imagem anterior foi mantida.",
    })
  }

  const handleRemoveImage = async () => {
    if (previewCandidate) {
      handleCancelImage()
      return
    }

    setIsUploading(true)
    try {
      await onImageChange(null)
      setPreview(null)
      
      toast({
        title: "🗑️ Imagem removida",
        description: "A imagem do serviço foi removida.",
      })
    } catch (error) {
      console.error('Erro ao remover imagem:', error)
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover a imagem. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* Container da imagem */}
      <div className={`${sizeClasses[size]} rounded-lg overflow-hidden border-2 border-dashed border-[#3f3f46] relative bg-[#27272a] flex items-center justify-center`}>
        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        )}

        {previewCandidate ? (
          // Pré-visualização da nova imagem
          <>
            <img
              src={previewCandidate}
              alt="Pré-visualização"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-1 right-1 bg-blue-600 rounded-full p-1">
              <Camera className="w-3 h-3 text-white" />
            </div>
          </>
        ) : preview ? (
          // Imagem atual
          <>
            <img
              src={preview}
              alt={`Imagem do serviço ${serviceName}`}
              className="w-full h-full object-cover"
            />
            {isUploading && (
              <div className="absolute bottom-1 right-1 bg-green-600 rounded-full p-1">
                <X className="w-3 h-3 text-white" />
              </div>
            )}
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

      {/* Botões de pré-visualização */}
      {previewCandidate && (
        <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <Button
            size="sm"
            onClick={handleConfirmImage}
            disabled={isUploading}
            className="bg-green-600 hover:bg-green-700 text-white border-0 min-h-[44px] touch-manipulation"
          >
            <Check className={iconSizes[size]} />
            <span className="ml-2">Confirmar</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancelImage}
            disabled={isUploading}
            className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white min-h-[44px] touch-manipulation"
          >
            <X className={iconSizes[size]} />
            <span className="ml-2">Cancelar</span>
          </Button>
        </div>
      )}

      {/* Botões de ação principais */}
      {!previewCandidate && (
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
      )}

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
        <p className="font-medium text-center">Requisitos:</p>
        <p>• JPG, PNG, WEBP</p>
        <p>• Máximo: 5MB</p>
        <p>• Recomendado: 300x300px</p>
        {previewCandidate && (
          <p className="text-blue-600 dark:text-blue-400 font-medium">
            👆 <strong>Pré-visualização ativa</strong> - Confirme ou cancele acima
          </p>
        )}
      </div>
    </div>
  )
}
