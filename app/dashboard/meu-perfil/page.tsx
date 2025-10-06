"use client"

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'

export default function MeuPerfilPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!user) return null
  if (user.role !== 'COLLABORATOR') {
    // Apenas colaboradores acessam esta página
    if (typeof window !== 'undefined') router.replace('/dashboard')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast({ title: 'As senhas não coincidem', variant: 'destructive' })
      return
    }
    if (newPassword.length < 6) {
      toast({ title: 'Senha deve ter pelo menos 6 caracteres', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/me/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Erro', description: data.message || 'Falha ao alterar senha', variant: 'destructive' })
      } else {
        toast({ title: 'Senha alterada com sucesso' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err:any) {
      toast({ title: 'Erro inesperado', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#ededed]">Meu Perfil</h1>
        <p className="text-sm text-[#71717a]">Gerencie sua senha de acesso ao sistema.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-[#18181b] border border-[#27272a] p-6 rounded-xl">
        <div className="space-y-2">
          <Label className="text-[#ededed] text-sm">Senha Atual</Label>
          <Input
            type={showPasswords ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[#ededed] text-sm">Nova Senha</Label>
          <Input
            type={showPasswords ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[#ededed] text-sm">Confirmar Nova Senha</Label>
          <Input
            type={showPasswords ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="bg-[#27272a] border-[#3f3f46] text-[#ededed]"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="showPasswords"
            type="checkbox"
            checked={showPasswords}
            onChange={(e) => setShowPasswords(e.target.checked)}
            className="h-4 w-4 rounded border-[#3f3f46] bg-[#27272a]" />
          <Label htmlFor="showPasswords" className="text-sm text-[#a1a1aa] cursor-pointer">Mostrar senhas</Label>
        </div>
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') }}
            className="flex-1 border-[#3f3f46] text-[#71717a] hover:text-[#ededed] bg-transparent"
          >
            Limpar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-tymer-primary hover:bg-tymer-primary/80 text-white"
          >
            {isSubmitting ? 'Salvando...' : 'Alterar Senha'}
          </Button>
        </div>
      </form>
    </div>
  )
}
