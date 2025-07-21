"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Scissors, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await login(email, password)
      
      console.log('Login result:', result) // Debug
      
      if (result.success) {
        toast({
          title: "Login realizado com sucesso!",
          description: "Você será redirecionado para o dashboard.",
        })
      } else {
        // Verificar se é erro de usuário não encontrado
        const errorMessage = result.error || ""
        
        console.log('Error message:', errorMessage) // Debug
        console.log('needsRegistration:', result.needsRegistration) // Debug
        
        if (result.needsRegistration === true || errorMessage.includes("não encontrado") || errorMessage.includes("não possui cadastro")) {
          toast({
            title: "🚫 Cadastro necessário",
            description: "Este e-mail não está cadastrado. Clique em 'Cadastre-se grátis' abaixo para criar sua conta.",
            variant: "destructive",
            duration: 8000,
          })
        } else if (errorMessage.includes("Senha incorreta") || errorMessage.includes("senha")) {
          toast({
            title: "❌ Senha incorreta",
            description: "Verifique se digitou a senha corretamente.",
            variant: "destructive",
            duration: 5000,
          })
        } else {
          toast({
            title: "Erro no login",
            description: result.error || "Credenciais inválidas",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('Erro no login:', error)
      
      // Verificar se é erro de rede ou servidor
      const errorStr = error?.toString() || ""
      if (errorStr.includes("401") || errorStr.includes("Unauthorized")) {
        toast({
          title: "🚫 E-mail não encontrado",
          description: "Este e-mail não está cadastrado. Clique em 'Cadastre-se grátis' para criar sua conta.",
          variant: "destructive",
          duration: 8000,
        })
      } else {
        toast({
          title: "Erro interno",
          description: "Tente novamente mais tarde.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#18181b] to-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center space-x-2 mb-8">
          <div className="w-10 h-10 bg-gradient-to-r from-[#10b981] to-[#059669] rounded-lg flex items-center justify-center shadow-lg shadow-[#10b981]/25">
            <Scissors className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-[#10b981] to-[#fbbf24] bg-clip-text text-transparent">
            AgendaPro
          </span>
        </div>

        <Card className="bg-[#18181b] border-[#27272a] shadow-2xl">
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
                  className="bg-[#3f3f46] border-[#52525b] text-[#ededed] placeholder:text-[#a1a1aa] focus:border-[#10b981] focus:ring-[#10b981]"
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
                    className="bg-[#3f3f46] border-[#52525b] text-[#ededed] placeholder:text-[#a1a1aa] focus:border-[#10b981] focus:ring-[#10b981] pr-10"
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
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white border-0 transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-[#71717a]">
                Não tem uma conta?{" "}
                <Link href="/register" className="text-[#10b981] hover:text-[#059669] font-medium transition-colors">
                  Cadastre-se grátis
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Link href="/" className="text-[#71717a] hover:text-[#ededed] text-sm transition-colors">
            ← Voltar para o site
          </Link>
        </div>
      </div>
    </div>
  )
}
