"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Mail, ArrowLeft, CheckCircle } from "lucide-react"
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setEmailSent(true)
        toast({
          title: "Email enviado!",
          description: "Verifique sua caixa de entrada para redefinir sua senha.",
        })
      } else if (response.status === 404) {
        setErrorMessage('Email não encontrado. Verifique e tente novamente.')
        toast({
          title: 'Email não encontrado',
          description: 'Verifique se digitou corretamente.',
          variant: 'destructive'
        })
      } else if (response.status === 403) {
        setErrorMessage('Conta inativa. Entre em contato com o suporte.')
        toast({
          title: 'Conta inativa',
          description: 'Entre em contato com o suporte para reativação.',
          variant: 'destructive'
        })
      } else {
        setErrorMessage(data.error || 'Erro ao enviar email')
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao enviar email',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Erro ao solicitar redefinição:', error)
      setErrorMessage('Erro interno. Tente novamente mais tarde.')
      toast({
        title: "Erro",
        description: "Erro interno. Tente novamente mais tarde.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#18181b] to-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center space-x-2 mb-8">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-tymer-primary/15 border border-tymer-primary/40 shadow-lg shadow-tymer-primary/20">
              <Calendar className="w-5 h-5 text-tymer-primary" />
            </div>
            <span className="text-2xl font-bold text-white">
              TymerBook
            </span>
          </div>

          <Card className="bg-[#18181b] border-[#27272a] shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-[#10b981]" />
              </div>
              <CardTitle className="text-2xl font-bold text-[#ededed]">Email Enviado!</CardTitle>
              <CardDescription className="text-[#71717a] text-center">
                Enviamos as instruções para redefinir sua senha para <strong className="text-[#10b981]">{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="bg-gradient-to-r from-tymer-primary/15 to-tymer-primary/5 border border-tymer-primary/30 rounded-xl p-6 mb-6 text-left animate-slide-up animate-delay-600">
                <h3 className="text-[#ededed] font-medium mb-4">Próximos passos:</h3>
                <ul className="text-sm text-[#a1a1aa] space-y-2">
                  <li>• Verifique sua caixa de entrada</li>
                  <li>• Clique no link recebido no email</li>
                  <li>• Defina uma nova senha</li>
                  <li>• Faça login com a nova senha</li>
                </ul>
              </div>
              
              <div className="text-sm text-[#71717a]">
                <p>Não recebeu o email?</p>
                <p>Verifique sua pasta de spam ou</p>
                <button
                  onClick={() => {
                    setEmailSent(false)
                    setEmail("")
                  }}
                  className="text-[#10b981] hover:text-[#059669] font-medium transition-colors"
                >
                  tente novamente
                </button>
              </div>
              
              <Link href="/login">
                <Button className="w-full bg-tymer-primary hover:bg-tymer-primary/80 text-white font-semibold transition-colors">
                  Voltar para o Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#18181b] to-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
          <div className="flex items-center justify-center space-x-2 mb-8">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-tymer-primary/15 border border-tymer-primary/40 shadow-lg shadow-tymer-primary/20">
              <Calendar className="w-5 h-5 text-tymer-primary" />
            </div>
            <span className="text-2xl font-bold text-white">
              TymerBook
            </span>
          </div>

        <Card className="bg-[#18181b] border-[#27272a] shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-tymer-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-tymer-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-[#ededed]">Redefinir Senha</CardTitle>
            <CardDescription className="text-[#71717a]">
              Digite seu email para receber as instruções de redefinição
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#ededed]">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#3f3f46] border-[#52525b] text-[#ededed] placeholder:text-[#a1a1aa] focus:border-tymer-primary focus:ring-tymer-primary focus-visible:ring-tymer-primary"
                  required
                />
              </div>
              
              {/* Mensagem de erro */}
              {errorMessage && (
                <div className="bg-red-900/20 border border-red-600/30 text-red-400 px-4 py-3 rounded-md text-sm">
                  {errorMessage}
                </div>
              )}
              
              <Button
                type="submit"
                className="w-full bg-tymer-primary hover:bg-tymer-primary/80 text-white border-0 transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? "Enviando..." : "Enviar Link de Redefinição"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-[#71717a] hover:text-white text-sm transition-colors flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar para o Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
