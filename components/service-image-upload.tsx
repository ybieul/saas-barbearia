'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, X, Check } from 'lucide-react'
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

  const getServiceInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header com ícone e título */}
      <div className="text-center">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 border border-purple-500/30">
          <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#ededed] mb-1 sm:mb-2">Imagem do Serviço</h2>
        <p className="text-[#71717a] text-xs sm:text-sm">
          Alterar imagem do serviço {serviceName}
        </p>
      </div>

      {/* Preview da imagem */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg border-4 border-[#27272a] overflow-hidden bg-[#18181b] flex items-center justify-center">
            {isUploading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#10b981]"></div>
              </div>
            ) : previewCandidate ? (
              <img
                src={previewCandidate}
                alt="Pré-visualização"
                className="w-full h-full object-cover"
              />
            ) : preview ? (
              <img
                src={preview}
                alt={`Imagem do serviço ${serviceName}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg sm:text-xl">
                  {getServiceInitials(serviceName)}
                </span>
              </div>
            )}
          </div>
        </div>
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
            <Check className="w-4 h-4" />
            <span className="ml-2">Confirmar</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancelImage}
            disabled={isUploading}
            className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white min-h-[44px] touch-manipulation"
          >
            <X className="w-4 h-4" />
            <span className="ml-2">Cancelar</span>
          </Button>
        </div>
      )}

      {/* Botões de ação principais */}
      {!previewCandidate && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleUploadClick}
              disabled={isUploading}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 px-6 py-2.5 w-full sm:w-auto min-h-[44px] touch-manipulation"
            >
              <Camera className="w-4 h-4 mr-2" />
              {preview ? 'Alterar Foto' : 'Adicionar Foto'}
            </Button>          {preview && (
            <Button
              variant="outline"
              onClick={handleRemoveImage}
              disabled={isUploading}
              className="border-red-600/50 text-red-400 hover:bg-red-600/20 hover:border-red-500 px-6 py-2.5 w-full sm:w-auto min-h-[44px] touch-manipulation"
            >
              <X className="w-4 h-4 mr-2" />
              Remover Foto
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

      {/* Requisitos com emojis */}
      <div className="bg-[#111111] rounded-lg p-3 sm:p-4 border border-[#27272a]">
        <div className="space-y-2 text-xs sm:text-sm text-[#a1a1aa]">
          <p className="text-[#ededed] font-medium mb-2 sm:mb-3 text-center text-sm sm:text-base">Requisitos</p>
          <div className="space-y-1 sm:space-y-1.5">
            <p className="text-xs sm:text-sm">📐 <strong>Resolução:</strong> 1024×1024px (quadrada)</p>
            <p className="text-xs sm:text-sm">📁 <strong>Formatos:</strong> JPG, PNG, WEBP (máx. 5MB)</p>
            <p className="text-xs sm:text-sm">✨ <strong>Dica:</strong> Imagem será redimensionada automaticamente</p>
          </div>
        </div>
      </div>
    </div>
  )
}
