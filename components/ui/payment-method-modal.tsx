import React, { useEffect, useMemo, useState } from 'react'
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
import { CreditCard, DollarSign, Smartphone, CheckCircle2, User, Scissors, Clock, Receipt, Star, Search, Package, Plus, Minus, Trash2 } from "lucide-react"

// Cache leve em memória para resultados de cobertura por agendamento (TTL curto)
const COVERAGE_TTL_MS = 20000 // 20s
const coverageCache = new Map<string, { covered: boolean; ts: number }>()

interface PaymentMethodModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectPayment: (method: string) => void
  // Novo: conclusão com seleção de produtos
  enableProductSelection?: boolean
  onComplete?: (payload: { paymentMethod: string, soldProducts: Array<{ productId: string, quantity: number }> }) => void
  appointmentData?: {
    id?: string
    client: string
    service: string
    totalPrice: number
    time: string
  }
  isLoading?: boolean
  coverageInfo?: {
    covered: boolean
    coveredBy?: 'subscription' | 'package'
    packageName?: string
  }
}

export function PaymentMethodModal({
  isOpen,
  onClose,
  onSelectPayment,
  appointmentData,
  isLoading = false,
  coverageInfo,
  enableProductSelection,
  onComplete
}: PaymentMethodModalProps) {
  const basePaymentMethods = [
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

  const prepaidMethod = {
    id: "PREPAID",
    label: "Pré‑pago",
    icon: Star,
    description: "Coberto por assinatura ou pacote"
  }

  // Se coverageInfo foi passado, usar ele; senão fazer verificação assíncrona
  const [showPrepaid, setShowPrepaid] = React.useState<boolean>(false)
  const [checkingCoverage, setCheckingCoverage] = React.useState<boolean>(false)

  React.useEffect(() => {
    // Se coverageInfo foi passado como prop, usar ele diretamente
    if (coverageInfo !== undefined) {
      setShowPrepaid(!!coverageInfo.covered)
      setCheckingCoverage(false)
      return
    }

    // Senão, fazer verificação assíncrona (fallback para compatibilidade)
    const check = async () => {
      if (!isOpen || !appointmentData) return
      try {
        setCheckingCoverage(true)
        const apptId = (appointmentData as any).id as string | undefined

        if (!apptId) {
          setShowPrepaid(false)
          setCheckingCoverage(false)
          return
        }

        const cached = coverageCache.get(apptId)
        const now = Date.now()
        if (cached && now - cached.ts < COVERAGE_TTL_MS) {
          setShowPrepaid(!!cached.covered)
          setCheckingCoverage(false)
          return
        }

        const res = await fetch('/api/coverage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointmentId: (appointmentData as any).id })
        })
        if (!res.ok) {
          setShowPrepaid(false)
          coverageCache.set(apptId, { covered: false, ts: Date.now() })
          return
        }
        const decision = await res.json()
        const covered = !!decision?.covered
        setShowPrepaid(covered)
        coverageCache.set(apptId, { covered, ts: Date.now() })
      } catch {
        setShowPrepaid(false)
      } finally {
        setCheckingCoverage(false)
      }
    }
    check()
  }, [isOpen, appointmentData?.client, appointmentData?.service, appointmentData?.totalPrice, (appointmentData as any)?.id, coverageInfo])

  // ✅ OPÇÃO 1: Se coberto, mostrar APENAS pré-pago; senão mostrar opções normais
  const paymentMethods = React.useMemo(() => {
    if (coverageInfo?.covered || showPrepaid) {
      return [prepaidMethod]
    }
    return basePaymentMethods
  }, [coverageInfo, showPrepaid])

  // Estado: seleção de produtos (opcional)
  const [prodSearch, setProdSearch] = useState("")
  const [prodLoading, setProdLoading] = useState(false)
  const [prodResults, setProdResults] = useState<any[]>([])
  const [cart, setCart] = useState<Array<{ productId: string, name: string, salePrice: number, stock: number, quantity: number }>>([])

  // Reset quando fechar
  useEffect(() => {
    if (!isOpen) {
      setProdSearch("")
      setProdResults([])
      setCart([])
    }
  }, [isOpen])

  // Buscar produtos (debounce simples)
  useEffect(() => {
    if (!isOpen || !enableProductSelection) return
    const t = setTimeout(async () => {
      try {
        setProdLoading(true)
        const sp = new URLSearchParams()
        if (prodSearch) sp.set('search', prodSearch)
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        const res = await fetch(`/api/products${sp.size ? `?${sp.toString()}` : ''}`, {
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        })
        const data = await res.json()
        setProdResults(Array.isArray((data as any)?.products) ? (data as any).products : [])
      } catch {
        setProdResults([])
      } finally {
        setProdLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [isOpen, enableProductSelection, prodSearch])

  const addToCart = (p: any) => {
    setCart(prev => {
      const exists = prev.find(i => i.productId === p.id)
      if (exists) return prev.map(i => i.productId === p.id ? { ...i, quantity: Math.min(i.quantity + 1, Number(p.stockQuantity ?? 0)) } : i)
      return [...prev, { productId: p.id, name: p.name, salePrice: Number(p.salePrice || 0), stock: Number(p.stockQuantity ?? 0), quantity: 1 }]
    })
  }
  const inc = (id: string) => setCart(prev => prev.map(i => i.productId === id ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) } : i))
  const dec = (id: string) => setCart(prev => prev.map(i => i.productId === id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))
  const rm = (id: string) => setCart(prev => prev.filter(i => i.productId !== id))

  const soldProducts = useMemo(() => cart.map(i => ({ productId: i.productId, quantity: i.quantity })), [cart])
  const cartTotal = useMemo(() => cart.reduce((s, i) => s + (i.salePrice * i.quantity), 0), [cart])

  const handlePaymentSelect = (method: string) => {
    if (enableProductSelection && onComplete) {
      onComplete({ paymentMethod: method, soldProducts })
    } else {
      onSelectPayment(method)
    }
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

            {/* Banner de Cobertura */}
            {(coverageInfo?.covered || showPrepaid) && (
              <div className="bg-gradient-to-r from-purple-500/15 to-blue-500/15 border border-purple-500/30 rounded-lg p-3 md:p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-purple-500/20 rounded-full p-2 flex-shrink-0">
                    <Star className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[#ededed] font-semibold text-sm md:text-base mb-1">
                      {coverageInfo?.coveredBy === 'subscription' ? '✨ Coberto por Assinatura' : '🎁 Coberto por Pacote'}
                    </h4>
                    <p className="text-xs md:text-sm text-[#a1a1aa]">
                      {coverageInfo?.coveredBy === 'subscription' 
                        ? 'Este atendimento está coberto pela Assinatura Premium do cliente.'
                        : `Este atendimento está coberto pelo ${coverageInfo?.packageName || 'pacote'} do cliente.`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Seleção de Produtos (opcional) */}
            {enableProductSelection && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  <h3 className="text-[#ededed] font-medium text-sm">Produtos vendidos (opcional)</h3>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2 top-2.5 text-[#71717a]" />
                  <input
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    placeholder="Buscar produto por nome..."
                    className="pl-8 w-full h-10 rounded-md bg-[#27272a] border border-[#3f3f46] text-[#ededed] px-3"
                  />
                </div>
                <div className="max-h-40 overflow-auto rounded-md border border-[#27272a] bg-[#0f0f10]">
                  {prodLoading ? (
                    <div className="p-3 text-sm text-[#71717a]">Carregando…</div>
                  ) : (prodResults || []).length === 0 ? (
                    <div className="p-3 text-sm text-[#71717a]">Nenhum produto encontrado</div>
                  ) : (
                    <ul className="divide-y divide-[#1f1f23]">
                      {prodResults.map((p: any) => (
                        <li key={p.id}>
                          <button type="button" onClick={() => addToCart(p)} className="w-full text-left p-3 hover:bg-[#1a1a1e] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-tymer-icon" />
                              <div>
                                <div className="text-sm font-medium">{p.name}</div>
                                <div className="text-xs text-[#a1a1aa]">Estoque: {Number(p.stockQuantity ?? 0)}</div>
                              </div>
                            </div>
                            <div className="text-sm font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(p.salePrice || 0))}</div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {cart.length > 0 && (
                  <div className="space-y-2">
                    {cart.map(item => (
                      <div key={item.productId} className="flex items-center justify-between p-2 bg-[#0f0f10] border border-[#27272a] rounded-md">
                        <div>
                          <div className="text-sm font-medium">{item.name}</div>
                          <div className="text-xs text-[#a1a1aa]">Estoque: {item.stock}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-[#3f3f46]" onClick={() => dec(item.productId)}><Minus className="w-4 h-4"/></button>
                          <input className="w-12 h-8 text-center rounded-md bg-[#27272a] border border-[#3f3f46]" type="number" value={item.quantity} onChange={(e)=>{
                            const v = Math.max(1, Math.min(item.stock, Number(e.target.value)||1))
                            setCart(prev => prev.map(i => i.productId===item.productId?{...i, quantity:v}:i))
                          }}/>
                          <button className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-[#3f3f46]" onClick={() => inc(item.productId)}><Plus className="w-4 h-4"/></button>
                          <button className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-red-600 text-red-400" onClick={() => rm(item.productId)}><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </div>
                    ))}
                    <div className="text-right text-sm">Total de produtos: <span className="font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}</span></div>
                  </div>
                )}
              </div>
            )}

            {/* Seção de Formas de Pagamento */}
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center gap-2 md:hidden">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                <h3 className="text-[#ededed] font-medium text-sm">Forma de Pagamento</h3>
              </div>
              
              <div className="space-y-2 md:space-y-3">
                {checkingCoverage && (
                  <div className="text-xs text-[#71717a]">Verificando créditos disponíveis…</div>
                )}
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
