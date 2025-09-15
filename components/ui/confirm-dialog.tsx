import React from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Trash2, UserX, X } from "lucide-react"

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  confirmVariant?: "default" | "destructive"
  cancelText?: string
  type?: 'professional' | 'service' | 'template' | 'default'
  itemName?: string
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  confirmVariant = "destructive",
  cancelText = "Cancelar",
  type = 'default',
  itemName
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  // Determinar ícone baseado no tipo
  const getIcon = () => {
    switch (type) {
      case 'professional':
        return <UserX className="w-5 h-5 text-white" />
      case 'service':
        return <X className="w-5 h-5 text-white" />
      case 'template':
        return <Trash2 className="w-5 h-5 text-white" />
      default:
        return <AlertTriangle className="w-5 h-5 text-white" />
    }
  }

  // Determinar tema baseado no tipo
  const getThemeClasses = () => {
    if (confirmVariant === "destructive") {
      return {
        gradient: 'from-red-500/10 to-red-600/5',
        border: 'border-red-500/20',
        fieldBorder: 'border-red-500/30',
        iconBg: 'bg-gradient-to-br from-red-500 to-red-600',
        indicator: 'bg-red-400',
        warning: 'bg-red-500/10 border-red-500/20 text-red-400'
      }
    }
    return {
      gradient: 'from-blue-500/10 to-blue-600/5',
      border: 'border-blue-500/20',
      fieldBorder: 'border-blue-500/30',
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      indicator: 'bg-blue-400',
      warning: 'bg-blue-500/10 border-blue-500/20 text-blue-400'
    }
  }

  const themeClasses = getThemeClasses()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-lg mx-auto h-auto sm:max-h-[90vh] flex flex-col rounded-xl">
        {/* Header Fixo */}
        <DialogHeader className="border-b border-[#27272a] pb-3 md:pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${themeClasses.iconBg}`}>
              {getIcon()}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-[#ededed] text-lg md:text-xl font-semibold">
                {title}
              </DialogTitle>
              <DialogDescription className="text-[#a1a1aa] text-sm md:text-base">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        {/* Conteúdo com informações do item */}
        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4">
          <div className={`bg-gradient-to-br p-3 md:p-4 rounded-lg border space-y-3 md:space-y-4 ${themeClasses.gradient} ${themeClasses.border}`}>
            <div className="flex items-center gap-2 mb-2 md:mb-3">
              <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${themeClasses.indicator}`}></div>
              <h3 className="text-[#ededed] font-medium text-sm md:text-base">
                {type === 'professional' ? 'Detalhes do Profissional' : 
                 type === 'service' ? 'Detalhes do Serviço' :
                 type === 'template' ? 'Detalhes do Template' : 'Detalhes do Item'}
              </h3>
            </div>
            
            {itemName && (
              <div className="space-y-2">
                <label className="text-[#71717a] text-xs md:text-sm">
                  {type === 'professional' ? 'Profissional' : 
                   type === 'service' ? 'Serviço' :
                   type === 'template' ? 'Template' : 'Item'}
                </label>
                <div className={`bg-[#27272a]/70 border rounded-md px-3 py-2.5 text-[#ededed] text-sm md:text-base font-medium ${themeClasses.fieldBorder}`}>
                  {itemName}
                </div>
              </div>
            )}
            
            <div className={`border rounded-md p-3 mt-3 ${themeClasses.warning}`}>
              <p className="text-xs md:text-sm">
                ⚠️ Esta ação não pode ser desfeita. 
                {type === 'professional' && ' Todos os agendamentos associados a este profissional poderão ser afetados.'}
                {type === 'service' && ' Todos os agendamentos que usam este serviço poderão ser afetados.'}
                {type === 'template' && ' Este template será removido permanentemente.'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer com botões */}
        <div className="border-t border-[#27272a] pt-3 md:pt-4 px-4 sm:px-6 pb-4 sm:pb-6 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="border-[#27272a] hover:bg-[#27272a] w-full sm:w-auto"
            >
              {cancelText}
            </Button>
            <Button 
              onClick={handleConfirm}
              className={`w-full sm:w-auto ${
                confirmVariant === "destructive" 
                  ? "bg-red-600 hover:bg-red-700" 
                  : "bg-[#10b981] hover:bg-[#059669]"
              }`}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
