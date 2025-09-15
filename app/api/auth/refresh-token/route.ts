import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Token ausente' }, { status: 401 })
    }
    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret')
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: decoded.tenantId } })
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 })
    }

    const newToken = jwt.sign({
      userId: tenant.id,
      tenantId: tenant.id,
      email: tenant.email,
      role: tenant.role,
      isActive: tenant.isActive,
      businessPlan: tenant.businessPlan,
      subscriptionEnd: tenant.subscriptionEnd ? tenant.subscriptionEnd.toISOString() : null
    }, process.env.NEXTAUTH_SECRET || 'fallback-secret', { expiresIn: '7d' })

    const response = NextResponse.json({
      token: newToken,
      isActive: tenant.isActive,
      businessPlan: tenant.businessPlan,
      subscriptionEnd: tenant.subscriptionEnd
    })
    response.cookies.set('auth_token', newToken, { path: '/', maxAge: 60 * 60 * 24 * 7 })
    return response
  } catch (error) {
    console.error('[refresh-token] erro:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}