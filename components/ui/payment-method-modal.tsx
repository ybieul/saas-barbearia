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
import { CreditCard, DollarSign, Smartphone, CheckCircle2, User, Scissors, Clock, Receipt } from "lucide-react"

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
      description: "Pagamento em espécie"
    },
    {
      id: "PIX",
      label: "PIX",
      icon: Smartphone,
      description: "Transferência instantânea"
    },
    {
      id: "CARD",
      label: "Cartão",
      icon: CreditCard,
      description: "Débito ou crédito"
    }
  ]

  const handlePaymentSelect = (method: string) => {
    onSelectPayment(method)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:w-full sm:max-w-md mx-auto h-auto sm:h-auto flex flex-col rounded-xl">
        {/* Header fixo */}
        <DialogHeader className="border-b border-[#27272a] pb-3 md:pb-4 flex-shrink-0">
          <DialogTitle className="text-[#ededed] text-base md:text-xl font-semibold flex items-center gap-2">
            <div className="p-1.5 md:p-2 rounded-lg bg-tymer-primary/15 border border-tymer-primary/30">
              <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-tymer-primary" />
            </div>
            Como foi pago?
          </DialogTitle>
          <DialogDescription className="text-[#71717a] text-sm hidden md:block">
            Selecione a forma de pagamento utilizada pelo cliente
          </DialogDescription>
        </DialogHeader>
        
        {/* Conteúdo com scroll */}
        <div className="overflow-y-auto flex-1 px-4 sm:px-6">
          <div className="space-y-4 md:space-y-6 mt-3 md:mt-4">
            {/* Seção de Resumo do Agendamento */}
            {appointmentData && (
              <div className="bg-gradient-to-br from-tymer-primary/15 to-tymer-primary/5 p-3 md:p-4 rounded-lg border border-tymer-primary/25 md:bg-tymer-card/50 space-y-3 md:space-y-4">
                <div className="flex items-center gap-2 mb-2 md:mb-3">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-tymer-primary rounded-full"></div>
                  <h3 className="text-[#ededed] font-medium text-sm md:text-base">Resumo do Atendimento</h3>
                </div>
                
                <div className="space-y-2 md:space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm text-[#a1a1aa] flex items-center gap-2">
                      <User className="w-3 h-3 md:w-4 md:h-4" />
                      Cliente:
                    </span>
                    <span className="text-xs md:text-sm font-medium text-[#ededed]">{appointmentData.client}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2 sm:items-center sm:gap-0">
                    <span className="text-xs md:text-sm text-[#a1a1aa] flex items-center gap-2 flex-shrink-0">
                      <Scissors className="w-3 h-3 md:w-4 md:h-4" />
                      Serviço:
                    </span>
                    <span className="text-xs md:text-sm font-medium text-[#ededed] text-right sm:text-left break-words">{appointmentData.service}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm text-[#a1a1aa] flex items-center gap-2">
                      <Clock className="w-3 h-3 md:w-4 md:h-4" />
                      Horário:
                    </span>
                    <span className="text-xs md:text-sm font-medium text-[#ededed]">{appointmentData.time}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-tymer-primary/25 md:border-tymer-border">
                    <span className="text-xs md:text-sm font-medium text-[#a1a1aa] flex items-center gap-2">
                      <Receipt className="w-3 h-3 md:w-4 md:h-4" />
                      Total:
                    </span>
                    <Badge className="bg-tymer-primary/20 text-tymer-primary border border-tymer-primary/30 text-xs md:text-sm">
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(appointmentData.totalPrice)}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Seção de Formas de Pagamento */}
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center gap-2 md:hidden">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                <h3 className="text-[#ededed] font-medium text-sm">Forma de Pagamento</h3>
              </div>
              
              <div className="space-y-2 md:space-y-3">
                {paymentMethods.map((method) => {
                  const IconComponent = method.icon
                  return (
                    <Button
                      key={method.id}
                      onClick={() => handlePaymentSelect(method.id)}
                      disabled={isLoading}
                      variant="ghost"
                      type="button"
                      className={`bg-gradient-to-r from-[#27272a]/80 to-[#3f3f46]/60 border border-[#3f3f46]/50 rounded-lg p-4 shadow-lg text-[#ededed] w-full h-auto justify-start gap-3`}
                    >
                      <div className="bg-[#2d2d30] rounded-full p-1.5 md:p-2 flex-shrink-0 border border-[#3a3a3d]">
                        <IconComponent className="w-4 h-4 md:w-5 md:h-5 text-tymer-icon" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-semibold text-sm md:text-base flex items-center gap-2 text-[#ededed]">
                          {method.label}
                        </div>
                        <div className="text-xs md:text-sm text-tymer-icon">{method.description}</div>
                      </div>
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer fixo */}
        <DialogFooter className="border-t border-[#27272a] pt-3 md:pt-4 flex-shrink-0 px-4 sm:px-6">
          <div className="flex justify-center w-full">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent min-h-[48px] sm:min-h-[44px] px-6 touch-manipulation w-full sm:w-auto"
            >
              Cancelar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
