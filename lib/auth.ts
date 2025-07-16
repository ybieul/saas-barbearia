import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

export interface AuthUser {
  userId: string
  tenantId: string
  email: string
  role: string
}

export function verifyToken(request: NextRequest): AuthUser {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    throw new Error('Token não fornecido')
  }

  const token = authHeader.replace('Bearer ', '')
  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret') as any
    
    if (!decoded.tenantId) {
      throw new Error('Token inválido: tenantId não encontrado')
    }

    return {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      email: decoded.email,
      role: decoded.role
    }
  } catch (error) {
    throw new Error('Token inválido')
  }
}

export function requireTenantAccess(user: AuthUser, requestedTenantId?: string): void {
  if (requestedTenantId && user.tenantId !== requestedTenantId) {
    throw new Error('Acesso negado: você não tem permissão para acessar este tenant')
  }
}
