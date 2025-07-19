import React from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  confirmVariant?: "default" | "destructive"
  cancelText?: string
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  confirmVariant = "destructive",
  cancelText = "Cancelar"
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#3f3f46] border-[#52525b] text-[#ededed] max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <DialogTitle className="text-[#ededed] text-lg">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-[#a1a1aa] text-left ml-13">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-[#52525b] text-[#a1a1aa] hover:text-[#ededed] hover:bg-[#52525b] bg-transparent"
          >
            {cancelText}
          </Button>
          <Button 
            onClick={handleConfirm}
            variant={confirmVariant}
            className={
              confirmVariant === "destructive" 
                ? "bg-red-600 hover:bg-red-700 text-white border-0" 
                : "bg-[#10b981] hover:bg-[#059669] text-white border-0"
            }
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
