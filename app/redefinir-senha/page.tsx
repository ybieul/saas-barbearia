"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import Image from "next/image" // pode ser removido se não houver mais usos diretos
import AuthLogo from "@/components/auth-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

function RedefinirSenhaContent() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [token, setToken] = useState<string | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      setErrorMessage('Token de redefinição não encontrado. Solicite uma nova redefinição.')
      return
    }
    setToken(tokenParam)
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token) {
      setErrorMessage('Token inválido. Solicite uma nova redefinição.')
      return
    }

    setIsLoading(true)
    setErrorMessage("")
    setSuccessMessage("")

    // Validações no frontend
    if (newPassword.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres')
      setIsLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('As senhas não coincidem')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token, 
          newPassword, 
          confirmPassword 
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(data.message)
        toast({
          title: "Senha redefinida!",
          description: "Sua senha foi alterada com sucesso. Clique em 'Ir para o Login' para acessar sua conta.",
        })
      } else {
        setErrorMessage(data.error || 'Erro ao redefinir senha')
        toast({
          title: "Erro",
          description: data.error || 'Erro ao redefinir senha',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Erro ao redefinir senha:', error)
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

  if (successMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#18181b] to-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo padronizada - espaçamento ajustado */}
          <div className="flex justify-center mb-8">
            <AuthLogo />
          </div>

          <Card className="bg-[#18181b] border-[#27272a] shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-[#10b981]" />
              </div>
              <CardTitle className="text-2xl font-bold text-[#ededed]">Senha Redefinida!</CardTitle>
              <CardDescription className="text-[#71717a] text-center">
                {successMessage}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="bg-[#065f46]/10 border border-[#10b981]/20 rounded-lg p-4 mb-4">
                <p className="text-[#ededed] font-medium">Senha redefinida com sucesso.</p>
                <p className="text-sm text-[#71717a] mt-2">Clique no botão abaixo para acessar o login.</p>
              </div>
              
              <Link href="/login">
                <Button className="w-full bg-tymer-primary hover:bg-tymer-primary/80 text-white">
                  Ir para o Login
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
  {/* Logo padronizada - espaçamento ajustado */}
  <div className="flex justify-center mb-8">
          <AuthLogo />
        </div>

        <Card className="bg-[#18181b] border-[#27272a] shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-tymer-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-tymer-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-[#ededed]">Nova Senha</CardTitle>
            <CardDescription className="text-[#71717a]">
              Digite sua nova senha abaixo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!token ? (
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-red-400">Token de redefinição inválido ou expirado</p>
                <Link href="/recuperar-senha">
                  <Button className="w-full bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white">
                    Solicitar Nova Redefinição
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-[#ededed]">
                    Nova Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Digite sua nova senha"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-[#3f3f46] border-[#52525b] text-[#ededed] placeholder:text-[#a1a1aa] focus:border-tymer-primary focus:ring-tymer-primary focus-visible:ring-tymer-primary pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#71717a] hover:text-[#ededed] transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-[#71717a]">Mínimo de 6 caracteres</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-[#ededed]">
                    Confirmar Nova Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirme sua nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-[#3f3f46] border-[#52525b] text-[#ededed] placeholder:text-[#a1a1aa] focus:border-tymer-primary focus:ring-tymer-primary focus-visible:ring-tymer-primary pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#71717a] hover:text-[#ededed] transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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
                  {isLoading ? "Redefinindo..." : "Redefinir Senha"}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link href="/login" className="text-[#71717a] hover:text-white text-sm transition-colors">
                Voltar para o Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#18181b] to-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <AuthLogo />
          </div>
          <Card className="bg-[#18181b] border-[#27272a] shadow-2xl">
            <CardContent className="p-8 text-center">
              <p className="text-[#71717a]">Carregando...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <RedefinirSenhaContent />
    </Suspense>
  )
}
