import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, DollarSign, Smartphone } from "lucide-react"

interface PaymentMethodModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectPayment: (method: string) => void
  appointmentData?: {
    client: string
    service: string
    totalPrice: number
    time: string
  }
  isLoading?: boolean
}

export function PaymentMethodModal({
  isOpen,
  onClose,
  onSelectPayment,
  appointmentData,
  isLoading = false
}: PaymentMethodModalProps) {
  const paymentMethods = [
    {
      id: "CASH",
      label: "Dinheiro",
      icon: DollarSign,
      color: "bg-green-500 hover:bg-green-600",
      description: "Pagamento em espécie"
    },
    {
      id: "PIX",
      label: "PIX",
      icon: Smartphone,
      color: "bg-blue-500 hover:bg-blue-600",
      description: "Transferência instantânea"
    },
    {
      id: "CARD",
      label: "Cartão",
      icon: CreditCard,
      color: "bg-purple-500 hover:bg-purple-600",
      description: "Débito ou crédito"
    }
  ]

  const handlePaymentSelect = (method: string) => {
    onSelectPayment(method)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#18181b] border-[#27272a]">
        <DialogHeader>
          <DialogTitle className="text-[#ededed] text-lg">
            💰 Como foi pago?
          </DialogTitle>
          
          {appointmentData && (
            <div className="bg-[#0a0a0a]/50 rounded-lg p-3 mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#a1a1aa]">Cliente:</span>
                <span className="text-sm font-medium text-[#ededed]">{appointmentData.client}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#a1a1aa]">Serviço:</span>
                <span className="text-sm font-medium text-[#ededed]">{appointmentData.service}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#a1a1aa]">Horário:</span>
                <span className="text-sm font-medium text-[#ededed]">{appointmentData.time}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#27272a]">
                <span className="text-sm font-medium text-[#a1a1aa]">Total:</span>
                <Badge className="bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30">
                  {new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  }).format(appointmentData.totalPrice)}
                </Badge>
              </div>
            </div>
          )}
          
          <DialogDescription className="text-[#a1a1aa] mt-3">
            Selecione como o cliente realizou o pagamento deste serviço:
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-4">
          {paymentMethods.map((method) => {
            const IconComponent = method.icon
            return (
              <Button
                key={method.id}
                onClick={() => handlePaymentSelect(method.id)}
                disabled={isLoading}
                className={`${method.color} text-white h-auto p-4 justify-start gap-3 transition-all hover:scale-105`}
              >
                <div className="bg-white/20 rounded-full p-2">
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-base">{method.label}</div>
                  <div className="text-xs opacity-90">{method.description}</div>
                </div>
              </Button>
            )
          })}
        </div>

        <DialogFooter className="flex-col gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full border-[#27272a] text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#ededed]"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
