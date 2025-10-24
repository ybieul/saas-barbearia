"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { Plus, Edit, Trash2, PackageMinus } from 'lucide-react'

interface Product {
  id: string
  name: string
  description?: string | null
  costPrice: number
  salePrice: number
  stockQuantity: number
  minStockAlert?: number | null
  isActive: boolean
}

export default function InventoryPage() {
  const { token } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<{ totalCostValue: number; belowMinCount: number; potentialProfit: number } | null>(null)
  const [ranking, setRanking] = useState<Array<{ productId: string; name: string; profit: number; revenue: number; quantity: number }>>([])

  // Modal states
  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState<null | Product>(null)
  const [openStock, setOpenStock] = useState<null | Product>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    costPrice: '',
    salePrice: '',
    stockQuantity: '0',
    minStockAlert: ''
  })
  const [stockQuantity, setStockQuantity] = useState('0')

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }), [token])

  async function fetchProducts() {
    setLoading(true)
    try {
      const res = await fetch('/api/products', { headers })
      const data = await res.json()
      setProducts(data.products || [])
    } finally {
      setLoading(false)
    }
  }

  async function fetchSummary() {
    try {
      const res = await fetch('/api/products/summary', { headers })
      const data = await res.json()
      setSummary(data)
    } catch (e) {
      // noop
    }
  }

  async function fetchRanking() {
    try {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const params = new URLSearchParams({ type: 'profitability', from: start.toISOString().slice(0,10), to: to.toISOString().slice(0,10) })
      const res = await fetch(`/api/reports?${params.toString()}`, { headers })
      const json = await res.json()
      setRanking(json?.data?.profitability?.topProfitableProducts || [])
    } catch {}
  }

  useEffect(() => {
    fetchProducts()
    fetchSummary()
    fetchRanking()
  }, [token])

  function resetForm(p?: Product) {
    if (p) {
      setForm({
        name: p.name,
        description: p.description || '',
        costPrice: String(p.costPrice ?? ''),
        salePrice: String(p.salePrice ?? ''),
        stockQuantity: String(p.stockQuantity ?? '0'),
        minStockAlert: p.minStockAlert != null ? String(p.minStockAlert) : ''
      })
      setStockQuantity(String(p.stockQuantity ?? '0'))
    } else {
      setForm({ name: '', description: '', costPrice: '', salePrice: '', stockQuantity: '0', minStockAlert: '' })
      setStockQuantity('0')
    }
  }

  async function onCreate() {
    const body = {
      ...form,
      costPrice: parseFloat(form.costPrice),
      salePrice: parseFloat(form.salePrice),
      stockQuantity: parseInt(form.stockQuantity || '0'),
      minStockAlert: form.minStockAlert ? parseInt(form.minStockAlert) : null
    }
    const res = await fetch('/api/products', { method: 'POST', headers, body: JSON.stringify(body) })
    if (res.ok) {
      setOpenCreate(false)
      resetForm()
      fetchProducts(); fetchSummary()
    }
  }

  async function onEdit() {
    if (!openEdit) return
    const body = {
      id: openEdit.id,
      ...form,
      costPrice: parseFloat(form.costPrice),
      salePrice: parseFloat(form.salePrice),
      stockQuantity: parseInt(form.stockQuantity || '0'),
      minStockAlert: form.minStockAlert ? parseInt(form.minStockAlert) : null
    }
    const res = await fetch('/api/products', { method: 'PUT', headers, body: JSON.stringify(body) })
    if (res.ok) {
      setOpenEdit(null)
      resetForm()
      fetchProducts(); fetchSummary()
    }
  }

  async function onDelete(p: Product) {
    if (!confirm(`Remover produto ${p.name}?`)) return
    const res = await fetch(`/api/products?id=${p.id}`, { method: 'DELETE', headers })
    if (res.ok) { fetchProducts(); fetchSummary() }
  }

  async function onAdjustStock() {
    if (!openStock) return
    const res = await fetch(`/api/products/${openStock.id}/stock`, { method: 'PATCH', headers, body: JSON.stringify({ newQuantity: parseInt(stockQuantity || '0') }) })
    if (res.ok) {
      setOpenStock(null)
      fetchProducts(); fetchSummary()
    }
  }

  const currency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Gestão de Estoque</h1>
        <Button onClick={() => { resetForm(); setOpenCreate(true) }}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar Produto
        </Button>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Valor Total em Estoque (Custo)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currency(summary?.totalCostValue || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Produtos Abaixo do Mínimo</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.belowMinCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Lucro Potencial em Estoque</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currency(summary?.potentialProfit || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de produtos */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Preço Venda</TableHead>
                  <TableHead>Preço Custo</TableHead>
                  <TableHead>Alerta Mínimo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const low = p.minStockAlert != null && p.stockQuantity <= (p.minStockAlert || 0)
                  return (
                    <TableRow key={p.id} className={low ? 'bg-red-500/10' : ''}>
                      <TableCell>
                        <div className="font-medium">{p.name}</div>
                        {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                      </TableCell>
                      <TableCell className={low ? 'text-red-500 font-semibold' : ''}>{p.stockQuantity}</TableCell>
                      <TableCell>{currency(p.salePrice)}</TableCell>
                      <TableCell>{currency(p.costPrice)}</TableCell>
                      <TableCell>{p.minStockAlert ?? '-'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="secondary" size="sm" onClick={() => { resetForm(p); setOpenEdit(p) }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => onDelete(p)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setOpenStock(p); setStockQuantity(String(p.stockQuantity)) }}>
                          <PackageMinus className="h-4 w-4" /> Ajustar Estoque
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {products.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Nenhum produto cadastrado.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Ranking de Produtos Mais Lucrativos */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Produtos Mais Lucrativos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Lucro</TableHead>
                  <TableHead>Receita</TableHead>
                  <TableHead>Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((r) => (
                  <TableRow key={r.productId}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{currency(r.profit)}</TableCell>
                    <TableCell>{currency(r.revenue)}</TableCell>
                    <TableCell>{r.quantity}</TableCell>
                  </TableRow>
                ))}
                {ranking.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Sem dados no período.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Criar */}
      <Dialog open={openCreate} onOpenChange={(o) => { if (!o) setOpenCreate(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Produto</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label>Preço de Custo</Label>
              <Input type="number" step="0.01" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} />
            </div>
            <div>
              <Label>Preço de Venda</Label>
              <Input type="number" step="0.01" value={form.salePrice} onChange={e => setForm(f => ({ ...f, salePrice: e.target.value }))} />
            </div>
            <div>
              <Label>Estoque Inicial</Label>
              <Input type="number" value={form.stockQuantity} onChange={e => setForm(f => ({ ...f, stockQuantity: e.target.value }))} />
            </div>
            <div>
              <Label>Alerta Mínimo</Label>
              <Input type="number" value={form.minStockAlert} onChange={e => setForm(f => ({ ...f, minStockAlert: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
            <Button onClick={onCreate}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      <Dialog open={!!openEdit} onOpenChange={(o) => { if (!o) setOpenEdit(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label>Preço de Custo</Label>
              <Input type="number" step="0.01" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} />
            </div>
            <div>
              <Label>Preço de Venda</Label>
              <Input type="number" step="0.01" value={form.salePrice} onChange={e => setForm(f => ({ ...f, salePrice: e.target.value }))} />
            </div>
            <div>
              <Label>Estoque</Label>
              <Input type="number" value={form.stockQuantity} onChange={e => setForm(f => ({ ...f, stockQuantity: e.target.value }))} />
            </div>
            <div>
              <Label>Alerta Mínimo</Label>
              <Input type="number" value={form.minStockAlert} onChange={e => setForm(f => ({ ...f, minStockAlert: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(null)}>Cancelar</Button>
            <Button onClick={onEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Ajustar Estoque */}
      <Dialog open={!!openStock} onOpenChange={(o) => { if (!o) setOpenStock(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Estoque</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-2">
            <div>
              <Label>Quantidade Atual</Label>
              <Input type="number" value={stockQuantity} onChange={e => setStockQuantity(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenStock(null)}>Cancelar</Button>
            <Button onClick={onAdjustStock}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
