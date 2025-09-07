"use client"

import type React from "react"

import { useState } from "react"
import AuthLogo from "@/components/auth-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, ArrowLeft, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage("")
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      if (response.ok) {
        setEmailSent(true)
        toast({ title: 'Email enviado!', description: 'Verifique sua caixa de entrada para redefinir sua senha.' })
      } else if (response.status === 404) {
        setErrorMessage('Email não encontrado. Verifique e tente novamente.')
        toast({ title: 'Email não encontrado', description: 'Verifique se digitou corretamente.', variant: 'destructive' })
      } else if (response.status === 403) {
        setErrorMessage('Conta inativa. Entre em contato com o suporte.')
        toast({ title: 'Conta inativa', description: 'Entre em contato com o suporte para reativação.', variant: 'destructive' })
      } else {
        setErrorMessage(data.error || 'Erro ao enviar email')
        toast({ title: 'Erro', description: data.error || 'Erro ao enviar email', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Erro ao solicitar redefinição:', error)
      setErrorMessage('Erro interno. Tente novamente mais tarde.')
      toast({ title: 'Erro', description: 'Erro interno. Tente novamente mais tarde.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="flex w-full max-w-sm flex-col">
          <div className="mb-6 flex justify-center"><AuthLogo sizePreset="default" /></div>
          <Card className="w-full bg-gradient-to-r from-[#27272a]/80 to-[#3f3f46]/60 border border-[#3f3f46]/50 shadow-lg">
            <CardHeader className="pb-4 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-900/20"><CheckCircle className="h-8 w-8 text-[#10b981]" /></div>
              <CardTitle className="text-2xl font-bold text-[#ededed]">Email Enviado!</CardTitle>
              <CardDescription className="text-center text-[#71717a]">Enviamos as instruções para redefinir sua senha para <strong className="text-[#10b981]">{email}</strong></CardDescription>
            </CardHeader>
            <CardContent className="pt-2 text-center space-y-6">
              <div className="rounded-xl border border-tymer-primary/30 bg-gradient-to-r from-tymer-primary/15 to-tymer-primary/5 p-6 text-left">
                <h3 className="mb-4 font-medium text-[#ededed]">Próximos passos:</h3>
                <ul className="space-y-2 text-sm text-[#a1a1aa]">
                  <li>• Verifique sua caixa de entrada</li>
                  <li>• Clique no link recebido no email</li>
                  <li>• Defina uma nova senha</li>
                  <li>• Faça login com a nova senha</li>
                </ul>
              </div>
              <div className="text-sm text-[#71717a]">
                <p>Não recebeu o email?</p>
                <p>Verifique sua pasta de spam ou <button onClick={() => { setEmailSent(false); setEmail('') }} className="font-medium text-[#10b981] transition-colors hover:text-[#059669]">tente novamente</button></p>
              </div>
              <Link href="/login"><Button className="w-full bg-tymer-primary text-white transition-colors hover:bg-tymer-primary/80">Voltar para o Login</Button></Link>
            </CardContent>
          </Card>
          <div className="mt-6 text-center text-sm text-muted-foreground"><Link href="/" className="hover:text-primary">← Voltar para o site</Link></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex w-full max-w-sm flex-col">
        <div className="mb-6 flex justify-center"><AuthLogo sizePreset="default" /></div>
        <Card className="w-full bg-gradient-to-r from-[#27272a]/80 to-[#3f3f46]/60 border border-[#3f3f46]/50 shadow-lg">
          <CardHeader className="pb-4 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-tymer-primary/10"><Mail className="h-8 w-8 text-tymer-primary" /></div>
            <CardTitle className="text-2xl font-bold text-[#ededed]">Redefinir Senha</CardTitle>
            <CardDescription className="text-[#71717a]">Digite seu email para receber as instruções de redefinição</CardDescription>
          </CardHeader>
            <CardContent className="pt-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#ededed]">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} className="bg-[#3f3f46] border-[#52525b] text-[#ededed] placeholder:text-[#a1a1aa] focus:border-tymer-primary focus:ring-tymer-primary focus-visible:ring-tymer-primary" required />
              </div>
              {errorMessage && <div className="rounded-md border border-red-600/30 bg-red-900/20 px-4 py-3 text-sm text-red-400">{errorMessage}</div>}
              <Button type="submit" className="w-full bg-tymer-primary text-white transition-all duration-200 hover:bg-tymer-primary/80" disabled={isLoading}>{isLoading ? 'Enviando...' : 'Enviar Link de Redefinição'}</Button>
            </form>
            <div className="mt-6 text-center">
              <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-[#71717a] transition-colors hover:text-tymer-primary"><ArrowLeft className="h-4 w-4" />Voltar para o Login</Link>
            </div>
          </CardContent>
        </Card>
        <div className="mt-6 text-center text-sm text-muted-foreground"><Link href="/" className="hover:text-primary">← Voltar para o site</Link></div>
      </div>
    </div>
  )
}
