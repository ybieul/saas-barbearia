import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET - Listar templates do tenant
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    
    console.log('GET templates - TenantID:', user.tenantId)
    
    const templates = await prisma.promotionTemplate.findMany({
      where: {
        tenantId: user.tenantId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log('Templates encontrados:', templates.length)
    
    return NextResponse.json({ 
      templates,
      success: true 
    })
  } catch (error) {
    console.error('Erro ao buscar templates:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// POST - Criar template
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { name, title, message } = await request.json()
    
    console.log('POST template - Dados:', { name, title, message, tenantId: user.tenantId })
    
    if (!name || !message) {
      return NextResponse.json(
        { message: 'Nome e mensagem são obrigatórios' },
        { status: 400 }
      )
    }
    
    const template = await prisma.promotionTemplate.create({
      data: {
        name: name.trim(),
        title: title?.trim() || '',
        message: message.trim(),
        tenantId: user.tenantId
      }
    })
    
    console.log('Template criado:', template.id)
    
    return NextResponse.json({ 
      template,
      success: true 
    })
  } catch (error) {
    console.error('Erro ao criar template:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// PUT - Atualizar template
export async function PUT(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { id, name, title, message } = await request.json()
    
    console.log('PUT template - Dados:', { id, name, title, message, tenantId: user.tenantId })
    
    if (!id || !name || !message) {
      return NextResponse.json(
        { message: 'ID, nome e mensagem são obrigatórios' },
        { status: 400 }
      )
    }
    
    // Verificar se o template pertence ao tenant
    const existingTemplate = await prisma.promotionTemplate.findFirst({
      where: {
        id,
        tenantId: user.tenantId
      }
    })
    
    if (!existingTemplate) {
      return NextResponse.json(
        { message: 'Template não encontrado' },
        { status: 404 }
      )
    }
    
    const template = await prisma.promotionTemplate.update({
      where: { id },
      data: {
        name: name.trim(),
        title: title?.trim() || '',
        message: message.trim(),
        updatedAt: new Date()
      }
    })
    
    console.log('Template atualizado:', template.id)
    
    return NextResponse.json({ 
      template,
      success: true 
    })
  } catch (error) {
    console.error('Erro ao atualizar template:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// DELETE - Deletar template
export async function DELETE(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    console.log('DELETE template - ID:', id, 'TenantID:', user.tenantId)
    
    if (!id) {
      return NextResponse.json(
        { message: 'ID do template é obrigatório' },
        { status: 400 }
      )
    }
    
    // Verificar se o template pertence ao tenant
    const existingTemplate = await prisma.promotionTemplate.findFirst({
      where: {
        id,
        tenantId: user.tenantId
      }
    })
    
    if (!existingTemplate) {
      return NextResponse.json(
        { message: 'Template não encontrado' },
        { status: 404 }
      )
    }
    
    await prisma.promotionTemplate.delete({
      where: { id }
    })
    
    console.log('Template deletado:', id)
    
    return NextResponse.json({ 
      message: 'Template deletado com sucesso',
      success: true 
    })
  } catch (error) {
    console.error('Erro ao deletar template:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}
