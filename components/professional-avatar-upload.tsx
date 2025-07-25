"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { User, Upload, Camera, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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

  // Configurações de tamanho
  const sizeConfig = {
    sm: { container: "w-16 h-16", text: "text-xs" },
    md: { container: "w-24 h-24", text: "text-sm" },
    lg: { container: "w-32 h-32", text: "text-base" }
  }

  const currentSize = sizeConfig[size]

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
        title: "Imagem carregada!",
        description: "Clique em 'Salvar' para confirmar a alteração.",
        variant: "default",
      })
    } catch (error) {
      console.error('Erro ao processar imagem:', error)
      toast({
        title: "Erro no processamento",
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
      // Não mostramos toast aqui pois o dialog será fechado automaticamente
      // O toast será mostrado pela função pai após o fechamento do modal
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

  // Função para remover avatar
  const handleRemoveAvatar = async () => {
    setIsUploading(true)
    try {
      await onAvatarChange(null)
      setPreviewAvatar(null)
      toast({
        title: "Foto removida!",
        description: "A foto de perfil foi removida com sucesso.",
        variant: "default",
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

  // Cancelar preview
  const handleCancelPreview = () => {
    setPreviewAvatar(currentAvatar || null)
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
    <div className="flex flex-col items-center space-y-4">
      {/* Avatar Display */}
      <div className={`relative ${currentSize.container}`}>
        <Avatar className={`${currentSize.container} border-2 border-[#27272a]`}>
          <AvatarImage 
            src={previewAvatar || undefined} 
            alt={`Foto de ${professionalName}`}
            className="object-cover"
          />
          <AvatarFallback className="bg-[#27272a] text-[#a1a1aa] font-medium">
            {previewAvatar ? (
              <div className="animate-pulse">
                <User className="w-1/2 h-1/2" />
              </div>
            ) : (
              getInitials(professionalName)
            )}
          </AvatarFallback>
        </Avatar>

        {/* Indicador de carregamento */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#10b981]"></div>
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="flex flex-col gap-3 items-center">
        {/* Input de arquivo (oculto) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {/* Botões principais */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Botão de upload */}
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            variant="outline"
            size="sm"
            className="border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#ededed] w-full sm:w-auto min-h-[44px] touch-manipulation"
          >
            <Camera className="w-4 h-4 mr-2" />
            {previewAvatar ? 'Alterar' : 'Adicionar'} Foto
          </Button>

          {/* Botão de remover (apenas se há avatar) */}
          {previewAvatar && (
            <Button
              onClick={handleRemoveAvatar}
              disabled={disabled || isUploading}
              variant="outline"
              size="sm"
              className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white w-full sm:w-auto min-h-[44px] touch-manipulation"
            >
              <X className="w-4 h-4 mr-2" />
              Remover
            </Button>
          )}
        </div>

        {/* Ações de confirmação (apenas se há mudanças) */}
        {hasChanges && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={handleSaveAvatar}
              disabled={disabled || isUploading}
              size="sm"
              className="bg-[#10b981] hover:bg-[#059669] text-white w-full sm:w-auto min-h-[44px] touch-manipulation"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                "Salvar Alteração"
              )}
            </Button>
            <Button
              onClick={handleCancelPreview}
              disabled={disabled || isUploading}
              variant="outline"
              size="sm"
              className="border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a] w-full sm:w-auto min-h-[44px] touch-manipulation"
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {/* Informações sobre formato e tamanho */}
      <div className={`text-center ${currentSize.text} text-[#71717a] max-w-xs px-4`}>
        <div className="space-y-1">
          <p className="font-medium">Requisitos:</p>
          <p>• JPG, PNG, WEBP</p>
          <p>• Máximo: 5MB</p>
          <p>• Preferencialmente quadrada</p>
        </div>
      </div>
    </div>
  )
}
