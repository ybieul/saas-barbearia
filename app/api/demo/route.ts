import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json({
      message: 'API de dados demo desabilitada. Use o seed para popular o banco de dados.',
      instruction: 'Execute: npm run seed'
    }, { status: 410 })
  } catch (error) {
    console.error('Erro na API de dados demo:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
