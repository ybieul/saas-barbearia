"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  Calendar,
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
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/hooks/use-auth"

const menuItems = [
  { icon: BarChart3, label: "Dashboard", href: "/dashboard", description: "Visão geral do negócio" },
  { icon: Calendar, label: "Agenda", href: "/dashboard/agenda", description: "Gerenciar agendamentos" },
  { icon: Users, label: "Clientes", href: "/dashboard/clientes", description: "Base de clientes" },
  { icon: UserX, label: "Clientes Inativos", href: "/dashboard/clientes-inativos", description: "Reativar clientes" },
  { icon: DollarSign, label: "Relatório e Financeiro", href: "/dashboard/financeiro", description: "Receitas, relatórios e análises" },
  { icon: MessageCircle, label: "WhatsApp", href: "/dashboard/whatsapp", description: "Automação de mensagens" },
  { icon: Settings, label: "Configurações", href: "/dashboard/configuracoes", description: "Configurar estabelecimento" },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout } = useAuth()
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
      document.body.classList.add('mobile-menu-open')
    } else {
      document.body.classList.remove('mobile-menu-open')
    }

    // Cleanup quando componente desmonta
    return () => {
      document.body.classList.remove('mobile-menu-open')
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#ededed]">Carregando...</div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex">
        {/* Sidebar */}
        <div className={`sidebar-mobile ${sidebarOpen ? 'open' : ''} lg:hidden`}>
        
        {/* Header da Sidebar */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-[#27272a]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-xl flex items-center justify-center shadow-lg shadow-[#10b981]/25">
              <Scissors className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="responsive-text-xl font-bold bg-gradient-to-r from-[#10b981] to-[#fbbf24] bg-clip-text text-transparent">
                AgendaPro
              </span>
              <p className="responsive-text-xs text-[#a1a1aa]">Dashboard</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-[#3f3f46] hover:text-[#ededed] hover:bg-[#27272a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Perfil */}
        <div className="sidebar-profile">
          <div className="flex items-center space-x-4">
            <div className="avatar-responsive-md bg-gradient-to-br from-[#27272a] to-[#18181b] rounded-xl flex items-center justify-center shadow-lg">
              <UserCircle className="w-7 h-7 text-[#71717a]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="responsive-text-sm font-semibold text-[#ededed] truncate">
                {user?.name || 'Usuário'}
              </p>
              <p className="responsive-text-xs text-[#a1a1aa] truncate">
                {user?.email || 'usuario@email.com'}
              </p>
              <div className="flex items-center mt-1">
                <div className="w-2 h-2 bg-[#10b981] rounded-full mr-2"></div>
                <span className="responsive-text-xs text-[#10b981]">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {menuItems.map((item) => (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`nav-item group ${
                  pathname === item.href
                    ? 'bg-gradient-to-r from-[#10b981]/20 to-[#059669]/20 text-[#10b981] border border-[#10b981]/30 shadow-lg shadow-[#10b981]/10'
                    : 'text-[#a1a1aa] hover:text-[#ededed] hover:bg-[#27272a]/50'
                }`}
              >
                <item.icon className={`mr-4 h-5 w-5 transition-colors ${
                  pathname === item.href ? 'text-[#10b981]' : 'text-[#a1a1aa] group-hover:text-[#ededed]'
                }`} />
                <div className="flex-1">
                  <div className="font-medium">{item.label}</div>
                  <div className="responsive-text-xs text-[#71717a] group-hover:text-[#ededed]/70">
                    {item.description}
                  </div>
                </div>
                {pathname === item.href && (
                  <div className="w-2 h-2 bg-[#10b981] rounded-full" />
                )}
              </Link>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-[#27272a]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 responsive-text-sm font-medium text-[#a1a1aa] hover:text-[#ededed] hover:bg-red-500/10 hover:border-red-500/30 rounded-xl transition-all border border-transparent"
          >
            <LogOut className="mr-4 h-5 w-5" />
            Sair da Conta
          </button>
        </div>
      </div>

      {/* Sidebar Desktop */}
      <div className="sidebar-desktop bg-[#18181b]/95 backdrop-blur-xl border-r border-[#27272a]">
        
        {/* Header da Sidebar */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-[#27272a]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-xl flex items-center justify-center shadow-lg shadow-[#10b981]/25">
              <Scissors className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-[#10b981] to-[#fbbf24] bg-clip-text text-transparent">
                AgendaPro
              </span>
              <p className="text-xs text-[#a1a1aa]">Dashboard</p>
            </div>
          </div>
        </div>

        {/* Perfil */}
        <div className="p-6 border-b border-[#27272a]">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#27272a] to-[#18181b] rounded-xl flex items-center justify-center shadow-lg">
              <UserCircle className="w-7 h-7 text-[#71717a]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#ededed] truncate">
                {user?.name || 'Usuário'}
              </p>
              <p className="text-xs text-[#a1a1aa] truncate">
                {user?.email || 'usuario@email.com'}
              </p>
              <div className="flex items-center mt-1">
                <div className="w-2 h-2 bg-[#10b981] rounded-full mr-2"></div>
                <span className="text-xs text-[#10b981]">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {menuItems.map((item) => (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  pathname === item.href
                    ? 'bg-gradient-to-r from-[#10b981]/20 to-[#059669]/20 text-[#10b981] border border-[#10b981]/30 shadow-lg shadow-[#10b981]/10'
                    : 'text-[#a1a1aa] hover:text-[#ededed] hover:bg-[#27272a]/50'
                }`}
              >
                <item.icon className={`mr-4 h-5 w-5 transition-colors ${
                  pathname === item.href ? 'text-[#10b981]' : 'text-[#a1a1aa] group-hover:text-[#ededed]'
                }`} />
                <div className="flex-1">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-[#71717a] group-hover:text-[#ededed]/70">
                    {item.description}
                  </div>
                </div>
                {pathname === item.href && (
                  <div className="w-2 h-2 bg-[#10b981] rounded-full" />
                )}
              </Link>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-[#27272a]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 text-sm font-medium text-[#a1a1aa] hover:text-[#ededed] hover:bg-red-500/10 hover:border-red-500/30 rounded-xl transition-all border border-transparent"
          >
            <LogOut className="mr-4 h-5 w-5" />
            Sair da Conta
          </button>
        </div>
      </div>

      {/* Overlay para Mobile */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="mobile-overlay"
        />
      )}

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-80">
        {/* Header */}
        <header className="dashboard-header flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-[#a1a1aa] hover:text-[#ededed] hover:bg-[#27272a] rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center space-x-4">
            {/* Data e Hora */}
            <div className="hidden md:block text-right">
              <div className="responsive-text-sm font-medium text-[#ededed]">
                {formatDate()}
              </div>
              <div className="responsive-text-xs text-[#a1a1aa] flex items-center justify-end">
                <Clock className="w-3 h-3 mr-1" />
                {formatTime()}
              </div>
            </div>
            
            {/* Avatar do Usuário */}
            <div className="avatar-responsive-sm bg-gradient-to-br from-[#10b981] to-[#059669] rounded-lg flex items-center justify-center shadow-lg cursor-pointer">
              <UserCircle className="w-5 h-5 text-white" />
            </div>
          </div>
        </header>

        {/* Conteúdo da Página */}
        <main className="content-container">
          {children}
        </main>
      </div>
    </div>
    </ProtectedRoute>
  )
}
