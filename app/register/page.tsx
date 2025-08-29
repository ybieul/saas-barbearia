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
import { useNotification } from "@/hooks/use-notification"

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    businessName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const notification = useNotification()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      notification.error("As senhas não coincidem!")
      return
    }

    if (formData.password.length < 6) {
      notification.error("A senha deve ter pelo menos 6 caracteres!")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.businessName,
          email: formData.email,
          password: formData.password,
          businessName: formData.businessName,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Usar os mesmos nomes que o AuthProvider usa
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('auth_user', JSON.stringify(data.user))
        
        // Salvar cookie para o middleware (mesmo padrão do AuthProvider)
        document.cookie = `auth_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}` // 7 dias
        
        notification.success('Conta criada com sucesso!')
        
        // Redirecionar para login para garantir fluxo correto
        router.push('/login')
      } else {
        notification.error(data.message || 'Erro ao criar conta')
      }
    } catch (error) {
      console.error('Erro no registro:', error)
      notification.error('Erro interno. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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
            <CardTitle className="text-2xl font-bold text-[#ededed]">Crie sua conta</CardTitle>
            <CardDescription className="text-[#71717a]">Comece a transformar seu negócio hoje mesmo</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-[#ededed]">
                  Nome da Barbearia/Salão
                </Label>
                <Input
                  id="businessName"
                  type="text"
                  placeholder="Ex: Barbearia do João"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  className="bg-[#3f3f46] border-[#52525b] text-[#ededed] placeholder:text-[#a1a1aa] focus:border-[#10b981] focus:ring-[#10b981]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#ededed]">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
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
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="bg-[#3f3f46] border-[#52525b] text-[#ededed] placeholder:text-[#a1a1aa] focus:border-[#10b981] focus:ring-[#10b981] pr-10"
                    minLength={6}
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
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[#ededed]">
                  Confirmar Senha
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Digite a senha novamente"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className="bg-[#3f3f46] border-[#52525b] text-[#ededed] placeholder:text-[#a1a1aa] focus:border-[#10b981] focus:ring-[#10b981] pr-10"
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
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white border-0 transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? "Criando conta..." : "Criar Conta"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-[#71717a]">
                Já tem uma conta?{" "}
                <Link href="/login" className="text-[#10b981] hover:text-[#059669] font-medium transition-colors">
                  Faça login
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
