import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Templates padrão para novos tenants
const DEFAULT_TEMPLATES = [
  {
    name: "Desconto de Retorno 20%",
    title: "20% OFF", 
    message: "Olá! 😊\n\nSentimos sua falta! ❤️\n\nQue tal voltar com um desconto especial de 20% OFF em qualquer serviço?\n\n✨ Oferta válida até 31/07/2025\n📅 Agende já pelo link\n\nEstamos esperando você! 🙋‍♀️",
    isActive: true
  },
  {
    name: "Promoção Especial",
    title: "30% OFF",
    message: "🎉 Oferta Especial! 🎉\n\nOlá, tudo bem?\n\nTemos uma super promoção para você:\n💸 30% de desconto em todos os serviços!\n\n⏰ Oferta por tempo limitado\n📲 Agende agora",
    isActive: true
  },
  {
    name: "Volte Sempre",
    title: "15% OFF", 
    message: "Oi! Como você está? 😊\n\nQueremos você de volta!\n🎁 15% de desconto especial\n💈 Seus serviços favoritos te aguardam\n\n📅 Marque seu horário",
    isActive: true
  }
]

// Simulação de banco em memória para desenvolvimento (remover em produção)
const globalForTemplates = globalThis as unknown as {
  userTemplates: { [userId: string]: any[] } | undefined
}

if (!globalForTemplates.userTemplates) {
  globalForTemplates.userTemplates = {}
}

const memoryTemplates = globalForTemplates.userTemplates

// Função para obter tenant atual
async function getCurrentTenant(request?: NextRequest) {
  try {
    if (!request) {
      return { id: 'anonymous', email: 'anonymous@barbershop.com' }
    }
    
    // Priorizar header customizado enviado pelo frontend
    let tenantId = request.headers.get('x-user-id') || request.headers.get('x-tenant-id')
    
    if (!tenantId) {
      // Fallback: gerar ID único baseado em sessão
      const sessionData = request.headers.get('user-agent') || 'default'
      tenantId = `tenant_${sessionData.slice(-8).replace(/[^a-zA-Z0-9]/g, '')}`
    }
    
    // TODO: Em produção, buscar tenant real do banco:
    // const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
    
    return { id: tenantId, email: `${tenantId}@barbershop.com` }
  } catch (error) {
    console.error('Erro ao obter tenant:', error)
    const randomId = Math.random().toString(36).substring(2, 8)
    return { id: `tenant_${randomId}`, email: `tenant_${randomId}@barbershop.com` }
  }
}

// GET - Listar todos os templates de promoção do tenant atual
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant(request)
    const tenantId = tenant.id
    
    // TODO: Implementar busca real no MySQL quando migração estiver completa
    /*
    try {
      const templates = await prisma.promotionTemplate.findMany({
        where: {
          tenantId: tenantId,
          isActive: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      return NextResponse.json({ templates })
    } catch (dbError) {
      console.log('Database not ready, using memory fallback:', dbError)
    }
    */
    
    // Fallback em memória para desenvolvimento
    if (!memoryTemplates[tenantId]) {
      memoryTemplates[tenantId] = DEFAULT_TEMPLATES.map((t, index) => ({
        ...t,
        id: `${tenantId}_${index + 1}`,
        tenantId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
    }
    
    const templates = memoryTemplates[tenantId].filter(t => t.isActive)
    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Erro ao buscar templates:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar novo template de promoção  
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, title, message } = body
    const tenant = await getCurrentTenant(request)
    const tenantId = tenant.id

    // Validação básica
    if (!name || !message) {
      return NextResponse.json(
        { error: 'Nome e mensagem são obrigatórios' },
        { status: 400 }
      )
    }

    // TODO: Criar no MySQL quando migração estiver completa
    /*
    try {
      const newTemplate = await prisma.promotionTemplate.create({
        data: {
          name: name.trim(),
          title: title?.trim() || 'Promoção',
          message: message.trim(),
          tenantId: tenantId,
          isActive: true
        }
      })
      return NextResponse.json({ template: newTemplate }, { status: 201 })
    } catch (dbError) {
      console.log('Database not ready, using memory fallback:', dbError)
    }
    */

    // Fallback em memória
    if (!memoryTemplates[tenantId]) {
      memoryTemplates[tenantId] = []
    }

    const newTemplate = {
      id: `${tenantId}_${Date.now()}`,
      name: name.trim(),
      title: title?.trim() || 'Promoção',
      message: message.trim(),
      isActive: true,
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    memoryTemplates[tenantId].push(newTemplate)
    return NextResponse.json({ template: newTemplate }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar template:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar template existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, title, message } = body
    const tenant = await getCurrentTenant(request)
    const tenantId = tenant.id

    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório' },
        { status: 400 }
      )
    }

    // TODO: Atualizar no MySQL
    /*
    try {
      const updatedTemplate = await prisma.promotionTemplate.update({
        where: { 
          id: id,
          tenantId: tenantId 
        },
        data: {
          ...(name && { name: name.trim() }),
          ...(title !== undefined && { title: title.trim() }),
          ...(message && { message: message.trim() }),
        }
      })
      return NextResponse.json({ template: updatedTemplate })
    } catch (dbError) {
      console.log('Database not ready, using memory fallback:', dbError)
    }
    */

    // Fallback em memória
    if (!memoryTemplates[tenantId]) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }

    const templateIndex = memoryTemplates[tenantId].findIndex(t => t.id === id && t.tenantId === tenantId)
    
    if (templateIndex === -1) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }

    const updatedTemplate = {
      ...memoryTemplates[tenantId][templateIndex],
      ...(name && { name: name.trim() }),
      ...(title !== undefined && { title: title.trim() }),
      ...(message && { message: message.trim() }),
      updatedAt: new Date().toISOString()
    }

    memoryTemplates[tenantId][templateIndex] = updatedTemplate
    return NextResponse.json({ template: updatedTemplate })
  } catch (error) {
    console.error('Erro ao atualizar template:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Remover template
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const tenant = await getCurrentTenant(request)
    const tenantId = tenant.id

    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório' },
        { status: 400 }
      )
    }

    // TODO: Deletar no MySQL
    /*
    try {
      await prisma.promotionTemplate.update({
        where: { 
          id: id,
          tenantId: tenantId 
        },
        data: { isActive: false }
      })
      return NextResponse.json({ message: 'Template removido com sucesso' })
    } catch (dbError) {
      console.log('Database not ready, using memory fallback:', dbError)
    }
    */

    // Fallback em memória
    if (!memoryTemplates[tenantId]) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }

    const templateIndex = memoryTemplates[tenantId].findIndex(t => t.id === id && t.tenantId === tenantId)
    
    if (templateIndex === -1) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }

    memoryTemplates[tenantId][templateIndex].isActive = false
    memoryTemplates[tenantId][templateIndex].updatedAt = new Date().toISOString()

    return NextResponse.json({ message: 'Template removido com sucesso' })
  } catch (error) {
    console.error('Erro ao remover template:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
