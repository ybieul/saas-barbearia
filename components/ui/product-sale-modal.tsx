"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Package, Plus, Minus, User, ShoppingCart } from "lucide-react"

type Professional = { id: string; name: string }

type Product = {
  id: string
  name: string
  description?: string | null
  salePrice: string | number
  costPrice?: string | number | null
  stockQuantity?: number | null
}

interface ProductSaleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  professionals?: Professional[]
  defaultProfessionalId?: string
}

export function ProductSaleModal({
  isOpen,
  onClose,
  onSuccess,
  professionals = [],
  defaultProfessionalId,
}: ProductSaleModalProps) {
  const [search, setSearch] = React.useState("")
  const [products, setProducts] = React.useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = React.useState(false)
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null)
  const [quantity, setQuantity] = React.useState<number>(1)
  const [selectedProfessional, setSelectedProfessional] = React.useState<string | undefined>(defaultProfessionalId)
  const [clientId, setClientId] = React.useState<string>("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Reset quando abrir/fechar
  React.useEffect(() => {
    if (!isOpen) {
      setSearch("")
      setProducts([])
      setSelectedProduct(null)
      setQuantity(1)
      setSelectedProfessional(defaultProfessionalId)
      setClientId("")
      setError(null)
    }
  }, [isOpen, defaultProfessionalId])

  // Debounce básico
  const debouncedRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchProducts = React.useCallback(async (term: string) => {
    try {
      setLoadingProducts(true)
      const sp = new URLSearchParams()
      if (term) sp.set("search", term)
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      const res = await fetch(`/api/products${sp.size ? `?${sp.toString()}` : ""}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok) throw new Error("Falha ao buscar produtos")
      const data = await res.json()
      setProducts(Array.isArray(data?.products) ? data.products : [])
    } catch (e) {
      setProducts([])
    } finally {
      setLoadingProducts(false)
    }
  }, [])

  React.useEffect(() => {
    if (!isOpen) return
    if (debouncedRef.current) clearTimeout(debouncedRef.current)
    debouncedRef.current = setTimeout(() => {
      fetchProducts(search.trim())
    }, 250)
    return () => { if (debouncedRef.current) clearTimeout(debouncedRef.current) }
  }, [isOpen, search, fetchProducts])

  const canSubmit = React.useMemo(() => {
    if (!selectedProduct) return false
    const q = Number(quantity)
    if (!q || q <= 0) return false
    const stock = Number(selectedProduct.stockQuantity ?? 0)
    if (stock < q) return false
    return true
  }, [selectedProduct, quantity])

  const totalPrice = React.useMemo(() => {
    if (!selectedProduct) return 0
    const price = Number(selectedProduct.salePrice || 0)
    const q = Number(quantity || 0)
    return Math.max(0, price * q)
  }, [selectedProduct, quantity])

  const submitSale = async () => {
    if (!selectedProduct) return
    try {
      setSubmitting(true)
      setError(null)
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      const body = {
        items: [
          {
            productId: selectedProduct.id,
            quantity: Number(quantity),
            professionalId: selectedProfessional || undefined,
          },
        ],
        clientId: clientId || undefined,
      }
      const res = await fetch("/api/product-sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.message || "Falha ao registrar venda")
      }
      onSuccess?.()
      onClose()
    } catch (e: any) {
      setError(e?.message || "Erro ao registrar venda")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-xl mx-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Registrar Venda de Produto
          </DialogTitle>
          <DialogDescription className="text-[#a1a1aa]">
            Selecione o produto, defina a quantidade e confirme a venda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Busca de produtos */}
          <div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-2.5 text-[#71717a]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto por nome..."
                className="pl-8 bg-[#27272a] border-[#3f3f46] text-[#ededed]"
              />
            </div>
            <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-[#27272a] bg-[#0f0f10]">
              {loadingProducts ? (
                <div className="p-3 text-sm text-[#71717a]">Carregando produtos...</div>
              ) : products.length === 0 ? (
                <div className="p-3 text-sm text-[#71717a]">Nenhum produto encontrado</div>
              ) : (
                <ul className="divide-y divide-[#1f1f23]">
                  {products.map((p) => {
                    const price = Number(p.salePrice || 0)
                    const stock = Number(p.stockQuantity ?? 0)
                    const selected = selectedProduct?.id === p.id
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedProduct(p)}
                          className={`w-full text-left p-3 hover:bg-[#1a1a1e] flex items-center justify-between ${selected ? "bg-[#151518]" : ""}`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-tymer-icon" />
                              <span className="font-medium text-sm">{p.name}</span>
                            </div>
                            <div className="text-xs text-[#a1a1aa] mt-1 line-clamp-1">{p.description || ""}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}</div>
                            <div className="text-xs text-[#a1a1aa]">Estoque: {stock}</div>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Produto selecionado e quantidade */}
          {selectedProduct && (
            <div className="p-3 rounded-md border border-[#27272a] bg-[#0f0f10]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{selectedProduct.name}</div>
                  <div className="text-xs text-[#a1a1aa]">Estoque disponível: {Number(selectedProduct.stockQuantity ?? 0)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="border-[#3f3f46]">
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 text-center bg-[#27272a] border-[#3f3f46]"
                  />
                  <Button variant="outline" size="icon" onClick={() => setQuantity(q => q + 1)} className="border-[#3f3f46]">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-2 text-sm">
                Total: <span className="font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPrice)}</span>
              </div>
            </div>
          )}

          {/* Profissional (opcional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#a1a1aa] mb-1">Profissional (opcional)</label>
              <Select value={selectedProfessional || ""} onValueChange={(v) => setSelectedProfessional(v || undefined)}>
                <SelectTrigger className="bg-[#27272a] border-[#3f3f46] text-[#ededed]">
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent className="bg-[#18181b] border-[#27272a] text-[#ededed]">
                  <SelectItem value="">Nenhum</SelectItem>
                  {professionals.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs text-[#a1a1aa] mb-1">Cliente (opcional, ID)</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-2 top-2.5 text-[#71717a]" />
                <Input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="ID do cliente (opcional)"
                  className="pl-8 bg-[#27272a] border-[#3f3f46] text-[#ededed]"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-2">{error}</div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <div className="flex items-center justify-between w-full">
            {selectedProduct ? (
              <Badge className="bg-tymer-primary/20 text-tymer-primary border border-tymer-primary/30">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPrice)}
              </Badge>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={submitting} className="border-[#3f3f46]">Cancelar</Button>
              <Button onClick={submitSale} disabled={!canSubmit || submitting} className="bg-primary hover:bg-primary/80 text-primary-foreground">
                {submitting ? "Registrando..." : "Registrar Venda"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
