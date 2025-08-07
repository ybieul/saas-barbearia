"use client"

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, XCircle, Trash2 } from "lucide-react"

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  type: 'complete' | 'cancel' | 'delete' | null
  clientName: string
  serviceName: string
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  type,
  clientName,
  serviceName
}: ConfirmDialogProps) {
  
  const getConfig = () => {
    switch (type) {
      case 'complete':
        return {
          icon: <CheckCircle className="h-6 w-6 text-green-600" />,
          title: 'Finalizar Agendamento',
          description: `Confirmar que o agendamento de ${serviceName} para ${clientName} foi realizado?`,
          confirmText: 'Finalizar',
          confirmVariant: 'default' as const,
          cancelText: 'Cancelar'
        }
      case 'cancel':
        return {
          icon: <XCircle className="h-6 w-6 text-orange-600" />,
          title: 'Cancelar Agendamento',
          description: `Tem certeza que deseja cancelar o agendamento de ${serviceName} para ${clientName}?`,
          confirmText: 'Sim, Cancelar',
          confirmVariant: 'destructive' as const,
          cancelText: 'Não Cancelar'
        }
      case 'delete':
        return {
          icon: <Trash2 className="h-6 w-6 text-red-600" />,
          title: 'Excluir Agendamento',
          description: `Tem certeza que deseja excluir permanentemente o agendamento de ${serviceName} para ${clientName}? Esta ação não pode ser desfeita.`,
          confirmText: 'Sim, Excluir',
          confirmVariant: 'destructive' as const,
          cancelText: 'Não Excluir'
        }
      default:
        return {
          icon: <AlertTriangle className="h-6 w-6 text-yellow-600" />,
          title: 'Confirmar Ação',
          description: 'Tem certeza que deseja continuar?',
          confirmText: 'Confirmar',
          confirmVariant: 'default' as const,
          cancelText: 'Cancelar'
        }
    }
  }

  const config = getConfig()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            {config.icon}
          </div>
          <div className="text-center">
            <DialogTitle className="text-lg font-semibold">
              {config.title}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-gray-600">
              {config.description}
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            {config.cancelText}
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={onConfirm}
            className="flex-1"
          >
            {config.confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
