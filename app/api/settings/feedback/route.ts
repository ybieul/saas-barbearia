import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, AuthError } from '@/lib/auth'

// GET: retorna googleReviewLink e template da automação feedback_request
export async function GET(req: NextRequest) {
  try {
    const user = verifyToken(req)

    // Buscar tenant para link
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { googleReviewLink: true }
    })

    // Buscar setting de automação
    const setting = await prisma.automationSetting.findUnique({
      where: {
        establishmentId_automationType: {
          establishmentId: user.tenantId,
          automationType: 'feedback_request'
        }
      }
    })

    return NextResponse.json({
      googleReviewLink: tenant?.googleReviewLink || null,
      isEnabled: setting?.isEnabled ?? false,
      messageTemplate: setting?.messageTemplate || null,
    })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message, code: error.code }, { status: error.status })
    }
    console.error('❌ [API][FEEDBACK][GET] Erro:', error)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}

// POST: salva googleReviewLink e/ou template + enable/disable
export async function POST(req: NextRequest) {
  try {
    const user = verifyToken(req)
    const { googleReviewLink, messageTemplate, isEnabled } = await req.json()

    // Atualizar link do tenant se enviado
    if (typeof googleReviewLink === 'string') {
      await prisma.tenant.update({
        where: { id: user.tenantId },
        data: { googleReviewLink }
      })
    }

    // Upsert da configuração da automação
    await prisma.automationSetting.upsert({
      where: {
        establishmentId_automationType: {
          establishmentId: user.tenantId,
          automationType: 'feedback_request'
        }
      },
      update: {
        isEnabled: typeof isEnabled === 'boolean' ? isEnabled : true,
        messageTemplate: messageTemplate || null
      },
      create: {
        establishmentId: user.tenantId,
        automationType: 'feedback_request',
        isEnabled: typeof isEnabled === 'boolean' ? isEnabled : true,
        messageTemplate: messageTemplate || null
      }
    })

    return NextResponse.json({
      message: 'Feedback settings saved',
      googleReviewLink: googleReviewLink || null,
      isEnabled: typeof isEnabled === 'boolean' ? isEnabled : true,
      messageTemplate: messageTemplate || null
    })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message, code: error.code }, { status: error.status })
    }
    console.error('❌ [API][FEEDBACK][POST] Erro:', error)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
