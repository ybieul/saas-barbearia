import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

interface AuthUser {
  userId: string
  tenantId: string
  email: string
  role: string
}

function verifyToken(request: NextRequest): AuthUser {
  // Tentar obter token do header Authorization
  let token = request.headers.get('authorization')?.replace('Bearer ', '')
  
  // Se não tiver no header, tentar obter do cookie
  if (!token) {
    token = request.cookies.get('token')?.value
  }
  
  // Se ainda não tiver, tentar obter do header x-auth-token
  if (!token) {
    token = request.headers.get('x-auth-token') || undefined
  }

  if (!token) {
    throw new Error('Token não fornecido')
  }

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

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação JWT
    const user = verifyToken(req)

    const { searchParams } = new URL(req.url)
    const hours = parseInt(searchParams.get('hours') || '24')
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type') // Filtro opcional por tipo

    console.log(`🔍 [API] Buscando WhatsApp logs para tenant ${user.tenantId} - Últimas ${hours}h`)

    // Calcular data de início
    const startDate = new Date()
    startDate.setHours(startDate.getHours() - hours)

    // Construir filtros
    const whereClause: any = {
      tenantId: user.tenantId,
      createdAt: {
        gte: startDate
      }
    }

    if (type) {
      whereClause.type = type.toUpperCase()
    }

    // Buscar logs do banco
    const logs = await prisma.whatsAppLog.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      select: {
        id: true,
        to: true,
        message: true,
        type: true,
        status: true,
        sentAt: true,
        createdAt: true,
        errorMessage: true,
        attempts: true
      }
    })

    // Calcular estatísticas
    const stats = await prisma.whatsAppLog.groupBy({
      by: ['status'],
      where: whereClause,
      _count: {
        id: true
      }
    })

    // Transformar estatísticas em formato mais amigável
    const statsFormatted = {
      total: logs.length,
      sent: stats.find(s => s.status === 'SENT')?._count.id || 0,
      delivered: stats.find(s => s.status === 'DELIVERED')?._count.id || 0,
      read: stats.find(s => s.status === 'READ')?._count.id || 0,
      failed: stats.find(s => s.status === 'FAILED')?._count.id || 0,
      pending: stats.find(s => s.status === 'PENDING')?._count.id || 0
    }

    console.log(`✅ [API] Encontrados ${logs.length} logs de WhatsApp`)

    return NextResponse.json({
      success: true,
      data: {
        logs,
        stats: statsFormatted
      }
    })

  } catch (error) {
    console.error('❌ [API] Erro ao buscar WhatsApp logs:', error)
    
    if (error instanceof Error && error.message.includes('Token')) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 401 })
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 })
  }
}
