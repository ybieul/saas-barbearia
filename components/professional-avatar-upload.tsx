"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Camera, X, Check } from "lucide-react"

interface ProfessionalAvatarUploadProps {
  currentAvatar?: string | null
  professionalName: string
  onAvatarChange: (avatarBase64: string | null) => Promise<void>
  disabled?: boolean
  size?: "sm" | "md" | "lg"
}

export function ProfessionalAvatarUpload({
  currentAvatar,
  professionalName,
  onAvatarChange,
  disabled = false,
  size = "md"
}: ProfessionalAvatarUploadProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(currentAvatar || null)

  // Função para redimensionar e comprimir imagem
  const resizeAndCompressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Definir tamanho de saída (512x512px para otimização)
        const outputSize = 512
        canvas.width = outputSize
        canvas.height = outputSize

        // Calcular dimensões para crop centrado
        const minDimension = Math.min(img.width, img.height)
        const cropX = (img.width - minDimension) / 2
        const cropY = (img.height - minDimension) / 2

        // Desenhar imagem redimensionada e cortada
        ctx?.drawImage(
          img,
          cropX, cropY, minDimension, minDimension, // Fonte (crop quadrado)
          0, 0, outputSize, outputSize // Destino (512x512)
        )

        // Comprimir e converter para base64
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8) // 80% qualidade
        resolve(compressedDataUrl)
      }

      img.onerror = () => {
        reject(new Error('Erro ao carregar a imagem'))
      }

      img.src = URL.createObjectURL(file)
    })
  }

  // Função para validar arquivo
  const validateFile = (file: File): string | null => {
    // Verificar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return 'Formato não suportado. Use apenas JPG, PNG ou WEBP.'
    }

    // Verificar tamanho (5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB em bytes
    if (file.size > maxSize) {
      return 'Arquivo muito grande. Tamanho máximo: 5MB.'
    }

    return null
  }

  // Função para lidar com seleção de arquivo
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar arquivo
    const validationError = validateFile(file)
    if (validationError) {
      toast({
        title: "Arquivo inválido",
        description: validationError,
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      // Redimensionar e comprimir imagem
      const compressedImage = await resizeAndCompressImage(file)
      setPreviewAvatar(compressedImage)

      toast({
        title: "✅ Imagem carregada",
        description: "Clique em 'Confirmar' para salvar a alteração.",
        variant: "default",
      })
    } catch (error) {
      console.error('Erro ao processar imagem:', error)
      toast({
        title: "Erro ao processar",
        description: "Não foi possível processar a imagem. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      // Limpar input para permitir upload do mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Função para salvar avatar
  const handleSaveAvatar = async () => {
    if (!previewAvatar) return

    setIsUploading(true)
    try {
      await onAvatarChange(previewAvatar)
      
      toast({
        title: "✅ Foto salva",
        description: "A foto de perfil foi atualizada com sucesso.",
      })
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a foto. Tente novamente.",
        variant: "destructive",
      })
      // Reverter preview em caso de erro
      setPreviewAvatar(currentAvatar || null)
    } finally {
      setIsUploading(false)
    }
  }

  // Função para cancelar alteração
  const handleCancelAvatar = () => {
    setPreviewAvatar(currentAvatar || null)
    toast({
      title: "❌ Alteração cancelada",
      description: "A foto anterior foi mantida.",
    })
  }

  // Função para remover avatar
  const handleRemoveAvatar = async () => {
    setIsUploading(true)
    try {
      await onAvatarChange(null)
      setPreviewAvatar(null)
      
      toast({
        title: "🗑️ Foto removida",
        description: "A foto de perfil foi removida.",
      })
    } catch (error) {
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover a foto. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Iniciais do nome para fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const hasChanges = previewAvatar !== currentAvatar

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header com ícone e título */}
      <div className="text-center">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 border border-green-500/30">
          <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#ededed] mb-1 sm:mb-2">Foto de Perfil</h2>
        <p className="text-[#71717a] text-xs sm:text-sm">
          Alterar foto de perfil de {professionalName}
        </p>
      </div>

      {/* Preview da foto */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg border-4 border-[#27272a] overflow-hidden bg-[#18181b] flex items-center justify-center">
            {isUploading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#10b981]"></div>
              </div>
            ) : previewAvatar ? (
              <img 
                src={previewAvatar} 
                alt={professionalName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg sm:text-xl">
                  {getInitials(professionalName)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botões de pré-visualização estilo serviços */}
      {hasChanges && (
        <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 justify-center">
          <Button
            size="sm"
            onClick={handleSaveAvatar}
            disabled={disabled || isUploading}
            className="bg-green-600 hover:bg-green-700 text-white border-0 min-h-[44px] touch-manipulation"
          >
            <Check className="w-4 h-4" />
            <span className="ml-2">Confirmar</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancelAvatar}
            disabled={disabled || isUploading}
            className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white min-h-[44px] touch-manipulation"
          >
            <X className="w-4 h-4" />
            <span className="ml-2">Cancelar</span>
          </Button>
        </div>
      )}

      {/* Botões de ação principais */}
      {!hasChanges && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 px-6 py-2.5 w-full sm:w-auto min-h-[44px] touch-manipulation"
            >
              <Camera className="w-4 h-4 mr-2" />
              {previewAvatar ? 'Alterar Foto' : 'Adicionar Foto'}
            </Button>          {previewAvatar && (
            <Button
              variant="outline"
              onClick={handleRemoveAvatar}
              disabled={disabled || isUploading}
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
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
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
