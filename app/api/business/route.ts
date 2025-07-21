import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET - Buscar dados do estabelecimento/tenant
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    
    console.log('GET business data - TenantID:', user.tenantId)
    
    const tenant = await prisma.tenant.findUnique({
      where: {
        id: user.tenantId
      },
      select: {
        businessName: true,
        email: true,
        businessPhone: true,
        businessAddress: true,
        businessLogo: true,
        businessCnpj: true,
        businessConfig: true
      }
    })
    
    if (!tenant) {
      return NextResponse.json(
        { message: 'Estabelecimento não encontrado' },
        { status: 404 }
      )
    }
    
    // Extrair customLink do businessConfig se existir
    const businessConfig = tenant.businessConfig as any
    const customLink = businessConfig?.customLink || ''
    
    const businessData = {
      name: tenant.businessName || '',
      email: tenant.email || '',
      phone: tenant.businessPhone || '',
      address: tenant.businessAddress || '',
      customLink: customLink,
      logo: tenant.businessLogo || '',
      cnpj: tenant.businessCnpj || ''
    }
    
    console.log('Business data encontrado:', businessData)
    
    return NextResponse.json({ 
      businessData,
      success: true 
    })
  } catch (error) {
    console.error('Erro ao buscar dados do estabelecimento:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// PUT - Atualizar dados do estabelecimento/tenant
export async function PUT(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { name, email, phone, address, customLink, logo } = await request.json()
    
    console.log('PUT business data - Dados:', { name, email, phone, address, customLink, logo: logo ? 'Logo incluída' : 'Sem logo', tenantId: user.tenantId })
    
    if (!name) {
      return NextResponse.json(
        { message: 'Nome do estabelecimento é obrigatório' },
        { status: 400 }
      )
    }
    
    // Buscar config atual para preservar outras configurações
    const currentTenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { businessConfig: true }
    })
    
    const currentConfig = (currentTenant?.businessConfig as any) || {}
    const updatedConfig = {
      ...currentConfig,
      customLink: customLink || ''
    }
    
    const tenant = await prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        businessName: name.trim(),
        email: email?.trim() || null,
        businessPhone: phone?.trim() || null,
        businessAddress: address?.trim() || null,
        businessLogo: logo?.trim() || null,
        businessConfig: updatedConfig,
        updatedAt: new Date()
      }
    })
    
    console.log('Dados do estabelecimento atualizados:', tenant.id)
    
    return NextResponse.json({ 
      message: 'Dados do estabelecimento atualizados com sucesso',
      success: true 
    })
  } catch (error) {
    console.error('Erro ao atualizar dados do estabelecimento:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}
