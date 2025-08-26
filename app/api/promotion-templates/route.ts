import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// Templates padrão para novos usuários
const DEFAULT_TEMPLATES = [
  {
    name: "Desconto de Retorno 20%",
    title: "20% OFF", 
    message: "Olá [nome]! 😊\n\nSentimos sua falta! ❤️\n\nQue tal voltar com um desconto especial de 20% OFF em qualquer serviço?\n\n✨ Oferta válida até 31/07/2025\n🗓️ Agende já pelo link\n\nEstamos esperando você! 🙋‍♀️"
  },
  {
    name: "Promoção Especial",
    title: "30% OFF",
    message: "🎉 Oferta Especial! 🎉\n\nOlá [nome], tudo bem?\n\nTemos uma super promoção para você:\n💸 30% de desconto em todos os serviços!\n\n⏰ Oferta por tempo limitado\n📲 Agende agora"
  },
  {
    name: "Volte Sempre",
    title: "15% OFF", 
    message: "Oi [nome]! Como você está? 😊\n\nQueremos você de volta!\n🎁 15% de desconto especial\n💈 Seus serviços favoritos te aguardam\n\n🗓️ Marque seu horário"
  }
]

// Função para criar templates padrão para novos usuários
async function createDefaultTemplates(tenantId: string) {
  try {
    console.log('Criando templates padrão para tenant:', tenantId)
    
    const createdTemplates = await Promise.all(
      DEFAULT_TEMPLATES.map(template =>
        prisma.promotionTemplate.create({
          data: {
            name: template.name,
            title: template.title,
            message: template.message,
            tenantId: tenantId
          }
        })
      )
    )
    
    console.log('Templates padrão criados:', createdTemplates.length)
    return createdTemplates
  } catch (error) {
    console.error('Erro ao criar templates padrão:', error)
    return []
  }
}

// GET - Listar templates do tenant
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    
    console.log('GET templates - TenantID:', user.tenantId)
    
    let templates = await prisma.promotionTemplate.findMany({
      where: {
        tenantId: user.tenantId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // Se o usuário não tem templates, criar os padrão
    if (templates.length === 0) {
      console.log('Nenhum template encontrado, criando templates padrão...')
      const defaultTemplates = await createDefaultTemplates(user.tenantId)
      templates = defaultTemplates
    }
    
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
