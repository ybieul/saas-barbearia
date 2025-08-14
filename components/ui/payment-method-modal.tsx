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
import { CreditCard, DollarSign, Smartphone, User, Clock, Scissors, X } from "lucide-react"

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
      color: "from-emerald-500 to-emerald-600",
      hoverColor: "hover:from-emerald-600 hover:to-emerald-700",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      description: "Pagamento em espécie",
      emoji: "💵"
    },
    {
      id: "PIX",
      label: "PIX",
      icon: Smartphone,
      color: "from-blue-500 to-blue-600",
      hoverColor: "hover:from-blue-600 hover:to-blue-700",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      description: "Transferência instantânea",
      emoji: "📱"
    },
    {
      id: "CARD",
      label: "Cartão",
      icon: CreditCard,
      color: "from-purple-500 to-purple-600",
      hoverColor: "hover:from-purple-600 hover:to-purple-700",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      description: "Débito ou crédito",
      emoji: "💳"
    }
  ]

  const handlePaymentSelect = (method: string) => {
    onSelectPayment(method)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-[#18181b] border-[#27272a] text-[#ededed] max-h-[90vh] overflow-y-auto">
        {/* Header melhorado */}
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#10b981]/20 to-[#059669]/20 rounded-full flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#10b981]" />
              </div>
              <DialogTitle className="text-[#ededed] text-xl font-semibold">
                Como foi pago?
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
              className="h-8 w-8 p-0 text-[#a1a1aa] hover:text-[#ededed] hover:bg-[#27272a] transition-colors"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <DialogDescription className="text-[#a1a1aa] text-sm leading-relaxed">
            Selecione como o cliente realizou o pagamento para concluir o atendimento
          </DialogDescription>
        </DialogHeader>

        {/* Informações do agendamento */}
        {appointmentData && (
          <div className="bg-gradient-to-br from-[#10b981]/10 to-[#059669]/5 rounded-lg p-4 border border-[#10b981]/20 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-[#10b981]">Detalhes do Atendimento</span>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#a1a1aa]" />
                  <span className="text-sm text-[#a1a1aa]">Cliente:</span>
                </div>
                <span className="text-sm font-medium text-[#ededed] text-right">{appointmentData.client}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-[#a1a1aa]" />
                  <span className="text-sm text-[#a1a1aa]">Serviço:</span>
                </div>
                <span className="text-sm font-medium text-[#ededed] text-right max-w-[200px] truncate" title={appointmentData.service}>
                  {appointmentData.service}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#a1a1aa]" />
                  <span className="text-sm text-[#a1a1aa]">Horário:</span>
                </div>
                <span className="text-sm font-medium text-[#ededed]">{appointmentData.time}</span>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-[#10b981]/20">
                <span className="text-base font-semibold text-[#ededed]">Total a Receber:</span>
                <Badge className="bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30 text-base font-bold px-3 py-1">
                  {new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  }).format(appointmentData.totalPrice)}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Métodos de pagamento melhorados */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[#a1a1aa] mb-3">Selecione a forma de pagamento:</h3>
          
          <div className="grid grid-cols-1 gap-3">
            {paymentMethods.map((method) => {
              const IconComponent = method.icon
              return (
                <Button
                  key={method.id}
                  onClick={() => handlePaymentSelect(method.id)}
                  disabled={isLoading}
                  className={`
                    bg-gradient-to-r ${method.color} ${method.hoverColor}
                    text-white h-auto p-4 justify-start gap-4 
                    transition-all duration-200 
                    hover:scale-[1.02] hover:shadow-lg
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                    group relative overflow-hidden
                    active:scale-[0.98]
                  `}
                >
                  {/* Efeito de brilho sutil */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  
                  <div className="flex items-center gap-4 relative z-10 w-full">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 flex-shrink-0">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{method.emoji}</span>
                        <span className="font-semibold text-lg">{method.label}</span>
                      </div>
                      <div className="text-sm opacity-90">{method.description}</div>
                    </div>
                    
                    {isLoading && (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0"></div>
                    )}
                  </div>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Footer melhorado */}
        <DialogFooter className="flex-col gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#ededed] h-11 transition-all duration-200"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-[#a1a1aa]/30 border-t-[#a1a1aa] rounded-full animate-spin"></div>
                <span>Processando...</span>
              </div>
            ) : (
              "Cancelar"
            )}
          </Button>
          
          {appointmentData && (
            <div className="text-center">
              <p className="text-xs text-[#71717a] leading-relaxed">
                O agendamento será marcado como concluído após selecionar o pagamento
              </p>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
