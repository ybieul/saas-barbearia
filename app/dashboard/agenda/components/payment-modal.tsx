"use client"

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: any
}

export default function PaymentModal({
  isOpen,
  onClose,
  appointment
}: PaymentModalProps) {
  
  // TODO: Implementar modal de pagamento
  // Por enquanto apenas um placeholder
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Processar Pagamento</DialogTitle>
          <DialogDescription>
            Modal de pagamento será implementado em breve.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-4 text-center text-muted-foreground">
          <p>Funcionalidade de pagamento em desenvolvimento...</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
