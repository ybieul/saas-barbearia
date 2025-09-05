"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  DollarSign,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Scissors,
  UserX,
  MessageCircle,
  UserCircle,
  Clock,
  Crown,
  Calendar,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/hooks/use-auth"
import { useBusinessInfo } from "@/hooks/use-business-info"

const menuItems = [
  { icon: BarChart3, label: "Dashboard", href: "/dashboard", description: "Visão geral do negócio" },
  { icon: Calendar, label: "Agenda", href: "/dashboard/agenda", description: "Gerenciar agendamentos" },
  { icon: Users, label: "Clientes", href: "/dashboard/clientes", description: "Base de clientes" },
  { icon: UserX, label: "Clientes Inativos", href: "/dashboard/clientes-inativos", description: "Reativar clientes" },
  { icon: DollarSign, label: "Relatório e Financeiro", href: "/dashboard/financeiro", description: "Receitas, relatórios e análises" },
  { icon: MessageCircle, label: "WhatsApp", href: "/dashboard/whatsapp", description: "Automação de mensagens" },
  { icon: Crown, label: "Minha Assinatura", href: "/dashboard/assinatura", description: "Gerenciar plano e assinatura" },
  { icon: Settings, label: "Configurações", href: "/dashboard/configuracoes", description: "Configurar estabelecimento" },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout } = useAuth()
  const { businessInfo, loading: businessLoading } = useBusinessInfo()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const router = useRouter()
  const pathname = usePathname()

  // Atualizar hora a cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Atualiza a cada minuto

    return () => clearInterval(timer)
  }, [])

  const handleLogout = () => {
    logout()
  }

  // Bloquear scroll quando sidebar móvel estiver aberta
  useEffect(() => {
    if (sidebarOpen) {
      // Bloquear scroll
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      // Restaurar scroll
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }

    // Cleanup quando componente desmonta
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [sidebarOpen])

  const formatDate = () => {
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    
    const dayName = days[currentTime.getDay()]
    const day = currentTime.getDate()
    const month = months[currentTime.getMonth()]
    const year = currentTime.getFullYear()
    
    return `${dayName}, ${day} de ${month} de ${year}`
  }

  const formatTime = () => {
    return currentTime.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-tymer-bg flex items-center justify-center">
        <div className="text-[#ededed]">Carregando...</div>
      </div>
    )
  }

  // Determinar se assinatura está bloqueada (token enriquecido pode não estar no contexto; usar businessInfo se tiver ou fallback user)
  // Como não temos diretamente isActive aqui via contexto enriquecido, assumimos que logout/middleware já tratam.
  // Para reforço: considerar custom claim armazenado no localStorage.
  const isSubscriptionBlocked = typeof window !== 'undefined' && !localStorage.getItem('auth_token') ? false : false

  // Bloqueio de navegação: ler token para extrair isActive (operação leve client-side)
  let tokenIsActive: boolean | null = null
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('auth_token')
      if (raw) {
        const payloadBase64 = raw.split('.')[1]
        const decoded = JSON.parse(atob(payloadBase64))
        tokenIsActive = decoded.isActive
      }
    } catch {
      tokenIsActive = null
    }
  }
  const navigationLocked = tokenIsActive === false

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-tymer-bg text-tymer-text flex">
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-tymer-sidebar/95 backdrop-blur-xl border-r border-tymer-border transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:inset-0 flex flex-col`}>
        
        {/* Header da Sidebar */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-[#27272a] flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 flex items-center justify-center overflow-hidden">
              <img
                src="/img/simbolo-tymerbook.png"
                alt="TymerBook"
                className="h-10 w-10 object-contain"
              />
            </div>
            <div>
              <span className="text-xl font-bold text-foreground">TymerBook</span>
              <p className="text-xs text-tymer-textgray">Painel Administrativo</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-tymer-muted hover:text-tymer-text hover:bg-tymer-border rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Container scrollável */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-[#27272a] scrollbar-thumb-[#10b981]">
          {/* Perfil */}
          <div className="p-6 border-b border-[#27272a]">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-tymer-border to-tymer-card rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                {businessInfo?.businessLogo ? (
                  <img 
                    src={businessInfo.businessLogo} 
                    alt={businessInfo.businessName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserCircle className="w-7 h-7 text-[#71717a]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm lg:text-base font-semibold text-[#ededed] truncate">
                  {businessInfo?.businessName || 'Estabelecimento'}
                </p>
                <p className="text-xs lg:text-sm text-[#a1a1aa] truncate">
                  {businessInfo?.email || 'email@estabelecimento.com'}
                </p>
                <div className="flex items-center mt-1">
                  <div className="w-2 h-2 bg-[#10b981] rounded-full mr-2 animate-pulse"></div>
                  <span className="text-xs text-[#10b981]">Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navegação */}
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const disabledByPlan = navigationLocked && item.href !== '/dashboard/assinatura'
              return (
                <div key={item.href}>
                  <Link
                    href={disabledByPlan ? '/dashboard/assinatura' : item.href}
                    onClick={(e) => {
                      if (disabledByPlan) {
                        e.preventDefault()
                        router.push('/dashboard/assinatura?reason=' + (tokenIsActive === false ? 'inativa' : 'expirada'))
                        setSidebarOpen(false)
                        return
                      }
                      setSidebarOpen(false)
                    }}
                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                      pathname === item.href
                        ? 'bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 shadow-lg shadow-primary/10'
                        : disabledByPlan
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-tymer-border/50'
                    }`}
                    aria-disabled={disabledByPlan}
                    tabIndex={disabledByPlan ? -1 : 0}
                  >
                    <item.icon className={`mr-4 h-5 w-5 transition-colors ${
                      pathname === item.href ? 'text-foreground' : 'text-[#a1a1aa] group-hover:text-[#ededed]'
                    }`} />
                    <div className="flex-1">
                      <div className={`font-medium ${pathname === item.href ? 'text-foreground' : 'text-tymer-muted group-hover:text-foreground'}`}>{item.label}</div>
                      <div className={`text-xs group-hover:text-[#ededed]/70 ${pathname === item.href ? 'text-[#a1a1aa]' : 'text-[#71717a]' }`}>
                        {disabledByPlan ? 'Bloqueado - assinatura inativa' : item.description}
                      </div>
                    </div>
                    {pathname === item.href && (
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    )}
                  </Link>
                </div>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-[#27272a] mt-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 text-sm font-medium text-tymer-muted hover:text-tymer-text hover:bg-red-500/10 hover:border-red-500/30 rounded-xl transition-all border border-transparent"
            >
              <LogOut className="mr-4 h-5 w-5" />
              Sair da Conta
            </button>
          </div>

          {/* Espaço extra para navegadores mobile */}
          <div className="h-16 lg:hidden"></div>
        </div>
      </div>

      {/* Overlay para Mobile */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-tymer-bg/50 z-40 lg:hidden backdrop-blur-sm"
        />
      )}

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-tymer-card/50 backdrop-blur-xl border-b border-tymer-border h-16 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-tymer-muted hover:text-tymer-text hover:bg-tymer-border rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center space-x-4">
            {/* Data e Hora */}
            <div className="hidden md:block text-right">
              <div className="text-sm font-medium text-[#ededed]">
                {formatDate()}
              </div>
              <div className="text-xs text-[#a1a1aa] flex items-center justify-end">
                <Clock className="w-3 h-3 mr-1" />
                {formatTime()}
              </div>
            </div>
            
            {/* Avatar do Usuário */}
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg cursor-pointer border border-primary/40">
              <UserCircle className="w-5 h-5 text-white" />
            </div>
          </div>
        </header>

        {/* Conteúdo da Página */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
    </ProtectedRoute>
  )
}
