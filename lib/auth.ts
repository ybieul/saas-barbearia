import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

// Declaração global para evitar erro TS ao usar flag de aviso em DEV
declare global {
  // eslint-disable-next-line no-var
  var __DEV_JWT_WARNING_SHOWN: boolean | undefined
}

// Interface unificada utilizada em todo o backend
export interface AuthUser {
  userId: string
  tenantId: string
  email: string
  role: string
  professionalId?: string
}

// Erros específicos para facilitar debug/log e permitir respostas HTTP adequadas
export class AuthError extends Error {
  status: number
  code: string
  constructor(message: string, code: string = 'AUTH_ERROR', status = 401) {
    super(message)
    this.code = code
    this.status = status
  }
}

// Resolve o segredo JWT garantindo que em produção não exista fallback inseguro
function getJwtSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new AuthError('Configuração inválida: NEXTAUTH_SECRET ausente', 'MISSING_SECRET', 500)
    }
    // Ambiente não-produção: permitir execução, mas avisar claramente
    if (!global.__DEV_JWT_WARNING_SHOWN) {
      global.__DEV_JWT_WARNING_SHOWN = true
      console.warn('[auth] ⚠️ NEXTAUTH_SECRET não definido. Usando segredo inseguro de DEV. NÃO usar em produção.')
    }
    return 'dev-insecure-secret'
  }
  return secret
}

// Extrai token de múltiplas fontes para compatibilidade gradual
function extractToken(request: NextRequest): string | null {
  // 1. Authorization: Bearer
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  // 2. Cookie moderno auth_token
  const cookieAuth = request.cookies.get('auth_token')?.value
  if (cookieAuth) return cookieAuth
  // 3. Cookie legado token
  const legacy = request.cookies.get('token')?.value
  if (legacy) return legacy
  // 4. Header alternativo x-auth-token
  const alt = request.headers.get('x-auth-token')
  if (alt) return alt
  return null
}

// Função principal de verificação importada pelas rotas
export function verifyToken(request: NextRequest): AuthUser {
  const token = extractToken(request)
  if (!token) {
    throw new AuthError('Token não fornecido', 'TOKEN_MISSING')
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any
    if (!decoded || !decoded.tenantId) {
      throw new AuthError('Token inválido: tenantId não encontrado', 'TENANT_ID_MISSING')
    }
    return {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      email: decoded.email,
      role: decoded.role,
      professionalId: decoded.professionalId
    }
  } catch (err: any) {
    if (err instanceof AuthError) throw err
    // Diferenciar expiração
    if (err?.name === 'TokenExpiredError') {
      throw new AuthError('Token expirado', 'TOKEN_EXPIRED')
    }
    throw new AuthError('Token inválido', 'TOKEN_INVALID')
  }
}

export function requireTenantAccess(user: AuthUser, requestedTenantId?: string): void {
  if (requestedTenantId && user.tenantId !== requestedTenantId) {
    throw new AuthError('Acesso negado ao tenant solicitado', 'TENANT_FORBIDDEN', 403)
  }
}

// Helper opcional para rotas: encapsula verificação + acesso
export function authenticate(request: NextRequest, tenantId?: string): AuthUser {
  const user = verifyToken(request)
  if (tenantId) requireTenantAccess(user, tenantId)
  return user
}
