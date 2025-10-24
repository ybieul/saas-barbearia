"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface PurchaseItem {
  id: string
  date: string
  productId: string
  productName: string
  quantity: number
  amount: number
  unitCost: number
  commissionEarned: number
}

export default function ClientDetailsPage() {
  const params = useParams() as { id: string }
  const [purchases, setPurchases] = useState<PurchaseItem[]>([])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    fetch(`/api/clients/${params.id}/product-purchases`, {
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    }).then(async (res) => {
      const json = await res.json()
      setPurchases(json?.purchases || [])
    }).catch(() => setPurchases([]))
  }, [params?.id])

  const currency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cliente</h1>
        <Link href="/dashboard/clientes"><Button variant="outline">Voltar</Button></Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Produtos Comprados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{p.productName}</TableCell>
                    <TableCell>{p.quantity}</TableCell>
                    <TableCell>{currency(p.amount)}</TableCell>
                    <TableCell>{currency(p.commissionEarned)}</TableCell>
                  </TableRow>
                ))}
                {purchases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Nenhuma compra registrada.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
