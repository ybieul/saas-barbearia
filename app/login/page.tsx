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
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-[#0a0a0a] via-[#18181b] to-[#0a0a0a] p-4">
      <div className="w-full max-w-sm">
        {/* Linha da logo */}
        <div className="flex justify-center">
          <div className="w-56 mb-6 drop-shadow-[0_0_20px_rgba(139,92,246,0.35)]">
            <AuthLogo sizePreset="default" className="w-full" />
          </div>
        </div>
        {/* Linha do formulário */}
        <Card className="w-full bg-gradient-to-r from-[#27272a]/80 to-[#3f3f46]/60 border border-[#3f3f46]/50 shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-[#ededed]">Bem-vindo de volta</CardTitle>
            <CardDescription className="text-[#71717a]">Entre na sua conta para acessar o painel</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#ededed]">Email</Label>
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
                <Label htmlFor="password" className="text-[#ededed]">Senha</Label>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 transform text-[#71717a] transition-colors hover:text-[#ededed]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {errorMessage && (
                <div className="rounded-md border border-red-600/30 bg-red-900/20 px-4 py-3 text-sm text-red-400">
                  {errorMessage}
                </div>
              )}
              <Button
                type="submit"
                className="w-full bg-tymer-primary text-white transition-all duration-200 hover:bg-tymer-primary/80"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
              <div className="text-center">
                <Link href="/recuperar-senha" className="text-sm text-[#71717a] transition-colors hover:text-tymer-primary">Esqueceu sua senha?</Link>
              </div>
            </form>
          </CardContent>
        </Card>
        {/* Linha do link voltar */}
        <div className="mt-6 text-center text-sm text-[#71717a]">
          <Link href="/" className="transition-colors hover:text-[#ededed]">← Voltar para o site</Link>
        </div>
      </div>
    </div>
  )
}
