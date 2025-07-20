import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET - Verificar status da base de dados (apenas para desenvolvimento)
export async function GET(request: NextRequest) {
  try {
    // Contar quantos tenants existem
    const tenantCount = await prisma.tenant.count()
    
    // Contar quantos profissionais existem
    const professionalCount = await prisma.professional.count()
    
    // Contar quantos serviços existem
    const serviceCount = await prisma.service.count()

    // Se não há tenants, retornar sugestão
    if (tenantCount === 0) {
      return NextResponse.json({
        message: 'Sistema limpo - pronto para produção',
        status: 'empty',
        counts: {
          tenants: tenantCount,
          professionals: professionalCount,
          services: serviceCount
        },
        suggestion: 'Use a página de registro para criar a primeira conta'
      })
    }

    // Buscar primeiro tenant para teste (sem dados sensíveis)
    const firstTenant = await prisma.tenant.findFirst({
      select: {
        id: true,
        email: true,
        businessName: true,
        isActive: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      message: 'Base de dados conectada com sucesso',
      status: 'connected',
      counts: {
        tenants: tenantCount,
        professionals: professionalCount,
        services: serviceCount
      },
      firstTenant: firstTenant
    })

  } catch (error) {
    console.error('Erro ao verificar base de dados:', error)
    return NextResponse.json(
      { 
        message: 'Erro de conexão com a base de dados', 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      },
      { status: 500 }
    )
  }
}
