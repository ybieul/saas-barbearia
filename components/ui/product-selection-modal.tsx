import React, { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Search, Package, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react'

export interface ProductCartItem {
  productId: string
  name: string
  salePrice: number
  stock: number
  quantity: number
}

interface ProductSelectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cart: ProductCartItem[]
  onCartChange: (next: ProductCartItem[]) => void
}

export function ProductSelectionModal({ open, onOpenChange, cart, onCartChange }: ProductSelectionModalProps) {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])

  // Reset minimal quando fecha
  useEffect(() => {
    if (!open) {
      setSearch('')
      setResults([])
      setLoading(false)
    }
  }, [open])

  // Buscar produtos com debounce
  useEffect(() => {
    if (!open) return
    const t = setTimeout(async () => {
      try {
        setLoading(true)
        const sp = new URLSearchParams()
        if (search) sp.set('search', search)
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        const res = await fetch(`/api/products${sp.size ? `?${sp.toString()}` : ''}`, {
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        })
        const data = await res.json()
        setResults(Array.isArray((data as any)?.products) ? (data as any).products : [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [open, search])

  const addToCart = (p: any) => {
    onCartChange((() => {
      const exists = cart.find(i => i.productId === p.id)
      if (exists) {
        return cart.map(i => i.productId === p.id ? { ...i, quantity: Math.min(i.quantity + 1, Number(p.stockQuantity ?? 0)) } : i)
      }
      return [...cart, { productId: p.id, name: p.name, salePrice: Number(p.salePrice || 0), stock: Number(p.stockQuantity ?? 0), quantity: 1 }]
    })())
  }

  const inc = (id: string) => onCartChange(cart.map(i => i.productId === id ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) } : i))
  const dec = (id: string) => onCartChange(cart.map(i => i.productId === id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))
  const rm = (id: string) => onCartChange(cart.filter(i => i.productId !== id))

  const subtotal = useMemo(() => cart.reduce((s, i) => s + (i.salePrice * i.quantity), 0), [cart])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#18181b] border-[#27272a] text-[#ededed] w-[calc(100vw-2rem)] max-w-md sm:max-w-lg mx-auto h-auto max-h-[85vh] flex flex-col rounded-xl">
        <DialogHeader className="border-b border-[#27272a] pb-3">
          <DialogTitle className="text-[#ededed] text-base md:text-xl font-semibold flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" /> Selecionar produtos
          </DialogTitle>
          <DialogDescription className="text-[#71717a] text-xs md:text-sm">
            Adicione itens ao carrinho e ajuste as quantidades.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-2.5 text-[#71717a]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto por nome..."
              className="pl-8 w-full h-10 rounded-md bg-[#27272a] border border-[#3f3f46] text-[#ededed] px-3"
            />
          </div>

          {/* Lista */}
          <div className="rounded-md border border-[#27272a] bg-[#0f0f10] max-h-64 overflow-auto">
            {loading ? (
              <div className="p-3 text-sm text-[#71717a]">Carregando…</div>
            ) : (results || []).length === 0 ? (
              <div className="p-3 text-sm text-[#71717a]">Nenhum produto encontrado</div>
            ) : (
              <ul className="divide-y divide-[#1f1f23]">
                {results.map((p: any) => (
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

          {/* Carrinho */}
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
                      onCartChange(cart.map(i => i.productId===item.productId?{...i, quantity:v}:i))
                    }}/>
                    <button className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-[#3f3f46]" onClick={() => inc(item.productId)}><Plus className="w-4 h-4"/></button>
                    <button className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-red-600 text-red-400" onClick={() => rm(item.productId)}><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              ))}
              <div className="text-right text-sm">Total de produtos: <span className="font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}</span></div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-[#27272a] pt-3 px-4 sm:px-6">
          <div className="flex w-full justify-between items-center gap-3">
            <div className="text-xs md:text-sm text-[#a1a1aa]">Itens no carrinho: <span className="font-semibold text-[#ededed]">{cart.reduce((a,c)=>a+c.quantity,0)}</span></div>
            <div className="flex gap-2">
              <Button variant="outline" className="border-[#3f3f46] text-[#ededed]" onClick={() => onOpenChange(false)}>Concluir</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
