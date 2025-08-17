import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Endpoint de teste para depuração de timezone
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.error('=== TESTE TIMEZONE ===')
    console.error('Recebido:', body.testDatetime)
    console.error('Tipo:', typeof body.testDatetime)
    
    // Parse da string
    const [datePart, timePart] = body.testDatetime.split(' ')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute, second] = timePart.split(':').map(Number)
    
    const dateObj = new Date(year, month - 1, day, hour, minute, second)
    
    console.error('Date criado:', dateObj.toString())
    console.error('getHours():', dateObj.getHours())
    console.error('toISOString():', dateObj.toISOString())
    
    // Testar inserção no banco usando raw SQL
    const result = await prisma.$queryRaw`
      INSERT INTO schedule_exceptions (id, professional_id, start_datetime, end_datetime, reason, type, created_at, updated_at)
      VALUES ('test-timezone-123', 'test-prof-456', ${body.testDatetime}, ${body.testDatetime}, 'teste timezone', 'BLOCK', NOW(), NOW())
    `
    
    console.error('Raw SQL result:', result)
    
    // Buscar o registro inserido
    const inserted = await prisma.$queryRaw`
      SELECT start_datetime FROM schedule_exceptions WHERE id = 'test-timezone-123'
    `
    
    console.error('Registro inserido:', inserted)
    
    // Limpar o teste
    await prisma.$queryRaw`DELETE FROM schedule_exceptions WHERE id = 'test-timezone-123'`
    
    return NextResponse.json({
      received: body.testDatetime,
      parsed: dateObj.toString(),
      hours: dateObj.getHours(),
      inserted: inserted
    })
    
  } catch (error: any) {
    console.error('Erro no teste:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
