"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Camera, X } from "lucide-react"

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
    <div className="space-y-4 sm:space-y-6">
      {/* Header com ícone e título */}
      <div className="text-center">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
          <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
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
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg sm:text-xl">
                  {getInitials(professionalName)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {!hasChanges ? (
          <>
            {/* Input de arquivo (oculto) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
              disabled={disabled || isUploading}
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white border-0 px-6 py-2.5 w-full sm:w-auto min-h-[44px] touch-manipulation"
            >
              <Camera className="w-4 h-4 mr-2" />
              {previewAvatar ? 'Alterar Foto' : 'Adicionar Foto'}
            </Button>
            
            {previewAvatar && (
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
          </>
        ) : (
          /* Botões de confirmação quando há mudanças */
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={handleSaveAvatar}
              disabled={disabled || isUploading}
              className="bg-[#10b981] hover:bg-[#059669] text-white w-full sm:w-auto min-h-[44px] touch-manipulation"
            >
              {isUploading ? "Salvando..." : "Salvar Alteração"}
            </Button>
            <Button
              onClick={handleCancelPreview}
              disabled={disabled || isUploading}
              variant="outline"
              className="border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a] w-full sm:w-auto min-h-[44px] touch-manipulation"
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>

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
