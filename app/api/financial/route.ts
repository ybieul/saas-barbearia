import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { toLocalISOString, parseDatabaseDateTime } from '@/lib/timezone'

// GET - Listar registros financeiros do tenant
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // INCOME, EXPENSE
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const category = searchParams.get('category')

    const where: any = {
      tenantId: user.tenantId
    }

    if (type) {
      where.type = type
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    } else if (startDate) {
      where.date = {
        gte: new Date(startDate)
      }
    } else if (endDate) {
      where.date = {
        lte: new Date(endDate)
      }
    }

    if (category) {
      where.category = category
    }

    const financialRecords = await prisma.financialRecord.findMany({
      where,
      orderBy: { date: 'desc' }
    })

    return NextResponse.json({ financialRecords })
  } catch (error) {
    console.error('Erro ao buscar registros financeiros:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// POST - Criar registro financeiro
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { 
      type, 
      amount, 
      description, 
      category, 
      date, 
      paymentMethod,
      reference
    } = await request.json()

    if (!type || !amount || !description || !category) {
      return NextResponse.json(
        { message: 'Tipo, valor, descrição e categoria são obrigatórios' },
        { status: 400 }
      )
    }

    if (!['INCOME', 'EXPENSE'].includes(type)) {
      return NextResponse.json(
        { message: 'Tipo deve ser INCOME ou EXPENSE' },
        { status: 400 }
      )
    }

    const financialRecord = await prisma.financialRecord.create({
      data: {
        type,
        amount: parseFloat(amount),
        description,
        category,
        date: date ? toLocalISOString(parseDatabaseDateTime(date)) : toLocalISOString(new Date()),
        paymentMethod,
        reference: reference || null,
        tenantId: user.tenantId
      }
    })

    return NextResponse.json({ financialRecord, message: 'Registro financeiro criado com sucesso' })
  } catch (error) {
    console.error('Erro ao criar registro financeiro:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// PUT - Atualizar registro financeiro
export async function PUT(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { 
      id, 
      type, 
      amount, 
      description, 
      category, 
      date, 
      paymentMethod,
      reference
    } = await request.json()

    if (!id) {
      return NextResponse.json(
        { message: 'ID do registro é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o registro pertence ao tenant
    const existingRecord = await prisma.financialRecord.findFirst({
      where: {
        id,
        tenantId: user.tenantId
      }
    })

    if (!existingRecord) {
      return NextResponse.json(
        { message: 'Registro financeiro não encontrado' },
        { status: 404 }
      )
    }

    if (type && !['INCOME', 'EXPENSE'].includes(type)) {
      return NextResponse.json(
        { message: 'Tipo deve ser INCOME ou EXPENSE' },
        { status: 400 }
      )
    }

    const financialRecord = await prisma.financialRecord.update({
      where: { id },
      data: {
        type: type || existingRecord.type,
        amount: amount ? parseFloat(amount) : existingRecord.amount,
        description: description || existingRecord.description,
        category: category || existingRecord.category,
        date: date ? toLocalISOString(parseDatabaseDateTime(date)) : existingRecord.date,
        paymentMethod: paymentMethod || existingRecord.paymentMethod,
        reference: reference !== undefined ? reference : existingRecord.reference
      }
    })

    return NextResponse.json({ financialRecord, message: 'Registro financeiro atualizado com sucesso' })
  } catch (error) {
    console.error('Erro ao atualizar registro financeiro:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// DELETE - Remover registro financeiro
export async function DELETE(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { message: 'ID do registro é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o registro pertence ao tenant
    const existingRecord = await prisma.financialRecord.findFirst({
      where: {
        id,
        tenantId: user.tenantId
      }
    })

    if (!existingRecord) {
      return NextResponse.json(
        { message: 'Registro financeiro não encontrado' },
        { status: 404 }
      )
    }

    await prisma.financialRecord.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Registro financeiro removido com sucesso' })
  } catch (error) {
    console.error('Erro ao remover registro financeiro:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}
