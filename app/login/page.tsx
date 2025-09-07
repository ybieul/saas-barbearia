"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image" // (pode ser removido futuramente se não usado em outro lugar)
import AuthLogo from "@/components/auth-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const { login, isAuthenticated, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  // Se já estiver autenticado, redirecionar para dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, authLoading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage("") // Limpar erro anterior

    try {
      const result = await login(email, password)
      
      console.log('Login result:', result) // Debug
      
      if (result.success) {
        setErrorMessage("") // Limpar erro se login for bem-sucedido
        toast({
          title: "Login realizado com sucesso!",
          description: "Você será redirecionado para o dashboard.",
        })
      } else {
        // Mostrar mensagem de erro diretamente na tela
        const errorMessage = result.error || ""
        
        console.log('Error message:', errorMessage) // Debug
        console.log('needsRegistration:', result.needsRegistration) // Debug
        
        if (result.needsRegistration === true || errorMessage.includes("não encontrado") || errorMessage.includes("não possui cadastro")) {
          setErrorMessage("E-mail não encontrado. Faça seu cadastro primeiro.")
        } else if (errorMessage.includes("Senha incorreta") || errorMessage.includes("senha")) {
          setErrorMessage("Usuário ou senha incorreto.")
        } else {
          setErrorMessage("Usuário ou senha incorreto.")
        }
      }
    } catch (error) {
      console.error('Erro no login:', error)
      
      // Verificar se é erro de rede ou servidor
      const errorStr = error?.toString() || ""
      if (errorStr.includes("401") || errorStr.includes("Unauthorized")) {
        setErrorMessage("E-mail não encontrado. Faça seu cadastro primeiro.")
      } else {
        setErrorMessage("Erro interno. Tente novamente mais tarde.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#18181b] to-[#0a0a0a] p-4">
      
      {/* Layout com espaçamento distribuído */}
      <div className="flex min-h-screen flex-col items-center">
        
        {/* Espaço superior flexível */}
        <div className="flex-1 flex items-end justify-center pb-4">
          <AuthLogo className="drop-shadow-[0_0_20px_rgba(139,92,246,0.4)]" sizePreset="default" />
        </div>

        {/* Container do Formulário - Centralizado */}
        <div className="w-full max-w-md">
        <Card className="bg-gradient-to-r from-[#27272a]/80 to-[#3f3f46]/60 border border-[#3f3f46]/50 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-[#ededed]">Bem-vindo de volta</CardTitle>
            <CardDescription className="text-[#71717a]">Entre na sua conta para acessar o painel</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#ededed]">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-[#3f3f46] border-[#52525b] text-[#ededed] placeholder:text-[#a1a1aa] focus:border-tymer-primary focus:ring-tymer-primary focus-visible:ring-tymer-primary pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#71717a] hover:text-[#ededed] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {/* Mensagem de erro inline */}
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
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
              
              {/* Link "Esqueci minha senha" */}
              <div className="text-center">
                <Link 
                  href="/recuperar-senha" 
                  className="text-sm text-[#71717a] hover:text-tymer-primary transition-colors"
                >
                  Esqueceu sua senha?
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Link voltar ao site */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-[#71717a] hover:text-[#ededed] text-sm transition-colors">
            ← Voltar para o site
          </Link>
        </div>
        </div>
        
        {/* Espaço inferior flexível */}
        <div className="flex-1"></div>
        
      </div>
    </div>
  )
}
