"use client"

import type React from "react"

import { useState } from "react"
import AuthLogo from "@/components/auth-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff } from "lucide-react"
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.businessName,
          email: formData.email,
          password: formData.password,
          businessName: formData.businessName,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('auth_user', JSON.stringify(data.user))
        document.cookie = `auth_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}`
        notification.success('Conta criada com sucesso!')
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
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex w-full max-w-sm flex-col">
        <div className="mb-6 flex justify-center">
          <AuthLogo sizePreset="default" />
        </div>
        <Card className="w-full bg-gradient-to-r from-[#27272a]/80 to-[#3f3f46]/60 border border-[#3f3f46]/50 shadow-lg">
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-2xl font-bold text-[#ededed]">Crie sua conta</CardTitle>
            <CardDescription className="text-[#71717a]">Comece a transformar seu negócio hoje mesmo</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-[#ededed]">Nome da Barbearia/Salão</Label>
                <Input id="businessName" type="text" placeholder="Ex: Barbearia do João" value={formData.businessName} onChange={e => handleInputChange('businessName', e.target.value)} className="bg-[#3f3f46] border-[#52525b] text-[#ededed] placeholder:text-[#a1a1aa] focus:border-tymer-primary focus:ring-tymer-primary focus-visible:ring-tymer-primary" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#ededed]">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} className="bg-[#3f3f46] border-[#52525b] text-[#ededed] placeholder:text-[#a1a1aa] focus:border-tymer-primary focus:ring-tymer-primary focus-visible:ring-tymer-primary" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#ededed]">Senha</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={formData.password} onChange={e => handleInputChange('password', e.target.value)} className="bg-[#3f3f46] border-[#52525b] text-[#ededed] placeholder:text-[#a1a1aa] focus:border-tymer-primary focus:ring-tymer-primary focus-visible:ring-tymer-primary pr-10" minLength={6} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 transform text-[#71717a] transition-colors hover:text-[#ededed]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[#ededed]">Confirmar Senha</Label>
                <div className="relative">
                  <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Digite a senha novamente" value={formData.confirmPassword} onChange={e => handleInputChange('confirmPassword', e.target.value)} className="bg-[#3f3f46] border-[#52525b] text-[#ededed] placeholder:text-[#a1a1aa] focus:border-tymer-primary focus:ring-tymer-primary focus-visible:ring-tymer-primary pr-10" required />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 transform text-[#71717a] transition-colors hover:text-[#ededed]">{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-tymer-primary text-white transition-all duration-200 hover:bg-tymer-primary/80" disabled={isLoading}>{isLoading ? 'Criando conta...' : 'Criar Conta'}</Button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-[#71717a]">Já tem uma conta? <Link href="/login" className="font-medium text-[#10b981] transition-colors hover:text-[#059669]">Faça login</Link></p>
            </div>
          </CardContent>
        </Card>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary">← Voltar para o site</Link>
        </div>
      </div>
    </div>
  )
}
