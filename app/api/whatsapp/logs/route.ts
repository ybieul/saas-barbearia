import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Buscar logs do WhatsApp
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    
    // Por enquanto retornar array vazio até implementação completa
    return NextResponse.json([])
    
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Erro ao buscar logs WhatsApp:', error)
    }
    
    if (error instanceof Error && error.message.includes('Token')) {
      return NextResponse.json(
        { message: error.message },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}