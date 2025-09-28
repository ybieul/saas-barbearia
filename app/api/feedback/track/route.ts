import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Rota pública: /api/feedback/track?token=XYZ
// Implementação usando SQL cru para contornar client Prisma não regenerado ainda.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  if (!token) {
    return NextResponse.json({ message: 'Token ausente' }, { status: 400 })
  }
  try {
    // Buscar appointment + tenant via SQL cru
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT a.id as appointmentId, a.feedbackLinkClicked, t.googleReviewLink
      FROM appointments a
      JOIN tenants t ON t.id = a.tenantId
      WHERE a.feedbackToken = ?
      LIMIT 1
    `, token)

    if (!rows.length || !rows[0].googleReviewLink) {
      return NextResponse.json({ message: 'Token inválido' }, { status: 404 })
    }
    const row = rows[0]

    if (!row.feedbackLinkClicked) {
      await prisma.$executeRawUnsafe(`
        UPDATE appointments SET feedbackLinkClicked = 1, feedbackLinkClickedAt = ? WHERE id = ?
      `, new Date(), row.appointmentId)
    }

    return NextResponse.redirect(row.googleReviewLink as string, { status: 302 })
  } catch (e) {
    console.error('Erro tracking feedback:', e)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
