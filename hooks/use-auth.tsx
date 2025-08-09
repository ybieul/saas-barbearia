'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
  email: string
  businessName: string
  avatar?: string
  role: string
  tenantId: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<{ 
    success: boolean; 
    error?: string; 
    suggestion?: string; 
    needsRegistration?: boolean 
  }>
  logout: () => void
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Verificar se há token salvo no localStorage ao carregar
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('auth_user')

    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setToken(savedToken)
        setUser(userData)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Erro ao recuperar dados do usuário:', error)
        }
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        setToken(data.token)
        
        // Salvar no localStorage
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('auth_user', JSON.stringify(data.user))
        
        // Salvar cookie para o middleware
        document.cookie = `auth_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}` // 7 dias
        
        router.push('/dashboard')
        return { success: true }
      } else {
        // Capturar diferentes tipos de erro
        if (process.env.NODE_ENV === 'development') {
          console.log('Response status:', response.status)
          console.log('Response data:', data)
        }
        
        // Sempre verificar se é erro de usuário não encontrado primeiro
        if (data.needsRegistration === true || 
            data.message?.includes('não encontrado') || 
            data.message?.includes('não possui cadastro') ||
            data.message?.includes('E-mail não encontrado')) {
          return { 
            success: false, 
            error: data.message || 'E-mail não encontrado',
            suggestion: data.suggestion || 'Clique em "Cadastre-se" para criar sua conta.',
            needsRegistration: true
          }
        }
        
        return { success: false, error: data.message || 'Credenciais inválidas' }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro no login:', error)
      }
      return { success: false, error: 'Erro de conexão' }
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    
    // Remover cookie
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;'
    
    router.push('/login')
  }

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user && !!token,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
