import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET - Buscar dados do estabelecimento/tenant
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    
    console.log('GET business data - TenantID:', user.tenantId)
    
    const result = await prisma.$queryRaw`
      SELECT 
        businessName, 
        email, 
        businessPhone, 
        businessAddress, 
        businessLogo, 
        businessCnpj, 
        businessInstagram,
        businessConfig
      FROM tenants 
      WHERE id = ${user.tenantId}
    ` as any[]
    
    if (!result || result.length === 0) {
      return NextResponse.json(
        { message: 'Estabelecimento não encontrado' },
        { status: 404 }
      )
    }
    
    const tenant = result[0]
    
    // Extrair customLink do businessConfig de forma segura
    let businessConfig: any = {}
    try {
      if (tenant.businessConfig) {
        if (typeof tenant.businessConfig === 'string') {
          businessConfig = JSON.parse(tenant.businessConfig)
        } else {
          businessConfig = tenant.businessConfig
        }
      }
    } catch (error) {
      console.warn('Erro ao parsear businessConfig:', error)
      businessConfig = {}
    }
    
    const customLink = businessConfig?.customLink || ''
    
    const businessData = {
      name: tenant.businessName || '',
      email: tenant.email || '',
      phone: tenant.businessPhone || '',
      address: tenant.businessAddress || '',
      customLink: customLink,
      logo: tenant.businessLogo || '',
      cnpj: tenant.businessCnpj || '',
      instagram: tenant.businessInstagram || ''
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
    const { name, email, phone, address, customLink, logo, instagram } = await request.json()
    
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

    // Truncar logo se for muito grande (limite de 65000 caracteres para VARCHAR)
    let processedLogo = logo?.trim() || null
    if (processedLogo && processedLogo.length > 65000) {
      console.warn('Logo muito grande, será truncada')
      processedLogo = null // Remover logo se for muito grande
    }

    const tenant = await prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        businessName: name.trim(),
        email: email?.trim() || null,
        businessPhone: phone?.trim() || null,
        businessAddress: address?.trim() || null,
        businessInstagram: instagram?.trim() || null,
        businessLogo: processedLogo,
        businessConfig: updatedConfig,
        updatedAt: new Date()
      } as any
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
