import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// GET - Listar profissionais do tenant
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const specialty = searchParams.get('specialty')

    const where: any = {
      tenantId: user.tenantId
    }

    if (status) {
      where.isActive = status === 'active'
    }

    console.log('GET profissionais - Filtros:', { 
      tenantId: user.tenantId, 
      status, 
      isActiveFilter: where.isActive,
      where 
    })

    if (specialty) {
      where.specialty = {
        contains: specialty,
        mode: 'insensitive'
      }
    }

    const professionals = await prisma.professional.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        services: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
            category: true
          }
        },
        appointments: {
          where: {
            status: {
              in: ['CONFIRMED', 'COMPLETED']
            }
          },
          select: {
            id: true,
            dateTime: true,
            status: true
          }
        },
        _count: {
          select: {
            appointments: {
              where: {
                status: 'COMPLETED'
              }
            }
          }
        }
      }
    })

    console.log('✅ GET profissionais - Resultado:', {
      total: professionals.length,
      ids: professionals.map(p => ({ id: p.id, name: p.name, isActive: p.isActive }))
    })

    return NextResponse.json({ professionals })
  } catch (error) {
    console.error('Erro ao buscar profissionais:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// POST - Criar profissional
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { 
      name, 
      email, 
      phone, 
      specialty, 
      commission, 
      serviceIds,
      workingHours 
    } = await request.json()

    if (!name || !phone || !specialty) {
      return NextResponse.json(
        { message: 'Nome, telefone e especialidade são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se já existe profissional com mesmo email/telefone no tenant
    if (email) {
      const existingByEmail = await prisma.professional.findFirst({
        where: {
          email,
          tenantId: user.tenantId
        }
      })

      if (existingByEmail) {
        return NextResponse.json(
          { message: 'Já existe um profissional com este email' },
          { status: 409 }
        )
      }
    }

    const existingByPhone = await prisma.professional.findFirst({
      where: {
        phone,
        tenantId: user.tenantId
      }
    })

    if (existingByPhone) {
      return NextResponse.json(
        { message: 'Já existe um profissional com este telefone' },
        { status: 409 }
      )
    }

    // Verificar se os serviços pertencem ao tenant
    if (serviceIds && serviceIds.length > 0) {
      const services = await prisma.service.findMany({
        where: {
          id: { in: serviceIds },
          tenantId: user.tenantId
        }
      })

      if (services.length !== serviceIds.length) {
        return NextResponse.json(
          { message: 'Um ou mais serviços não foram encontrados' },
          { status: 404 }
        )
      }
    }

    const professional = await prisma.professional.create({
      data: {
        name,
        email,
        phone,
        specialty,
        commission: commission || 0,
        workingHours: workingHours || {},
        isActive: true,
        tenantId: user.tenantId,
        services: serviceIds && serviceIds.length > 0 ? {
          connect: serviceIds.map((id: string) => ({ id }))
        } : undefined
      },
      include: {
        services: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
            category: true
          }
        },
        _count: {
          select: {
            appointments: {
              where: {
                status: 'COMPLETED'
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ professional, message: 'Profissional criado com sucesso' })
  } catch (error) {
    console.error('Erro ao criar profissional:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// PUT - Atualizar profissional
export async function PUT(request: NextRequest) {
  try {
    const user = verifyToken(request)
    const { 
      id, 
      name, 
      email, 
      phone, 
      specialty, 
      commission, 
      serviceIds,
      workingHours,
      isActive,
      avatar 
    } = await request.json()

    if (!id) {
      return NextResponse.json(
        { message: 'ID do profissional é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o profissional pertence ao tenant
    const existingProfessional = await prisma.professional.findFirst({
      where: {
        id,
        tenantId: user.tenantId
      }
    })

    if (!existingProfessional) {
      return NextResponse.json(
        { message: 'Profissional não encontrado' },
        { status: 404 }
      )
    }

    // Verificar conflitos de email/telefone
    if (email && email !== existingProfessional.email) {
      const existingByEmail = await prisma.professional.findFirst({
        where: {
          email,
          tenantId: user.tenantId,
          id: { not: id }
        }
      })

      if (existingByEmail) {
        return NextResponse.json(
          { message: 'Já existe um profissional com este email' },
          { status: 409 }
        )
      }
    }

    if (phone && phone !== existingProfessional.phone) {
      const existingByPhone = await prisma.professional.findFirst({
        where: {
          phone,
          tenantId: user.tenantId,
          id: { not: id }
        }
      })

      if (existingByPhone) {
        return NextResponse.json(
          { message: 'Já existe um profissional com este telefone' },
          { status: 409 }
        )
      }
    }

    // Verificar serviços se foram fornecidos
    if (serviceIds && serviceIds.length > 0) {
      const services = await prisma.service.findMany({
        where: {
          id: { in: serviceIds },
          tenantId: user.tenantId
        }
      })

      if (services.length !== serviceIds.length) {
        return NextResponse.json(
          { message: 'Um ou mais serviços não foram encontrados' },
          { status: 404 }
        )
      }
    }

    const professional = await prisma.professional.update({
      where: { id },
      data: {
        name: name || existingProfessional.name,
        email: email || existingProfessional.email,
        phone: phone || existingProfessional.phone,
        specialty: specialty || existingProfessional.specialty,
        commission: commission !== undefined ? commission : existingProfessional.commission,
        workingHours: workingHours || existingProfessional.workingHours,
        isActive: isActive !== undefined ? isActive : existingProfessional.isActive,
        avatar: avatar !== undefined ? avatar : existingProfessional.avatar,
        services: serviceIds ? {
          set: serviceIds.map((serviceId: string) => ({ id: serviceId }))
        } : undefined
      },
      include: {
        services: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
            category: true
          }
        },
        _count: {
          select: {
            appointments: {
              where: {
                status: 'COMPLETED'
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ professional, message: 'Profissional atualizado com sucesso' })
  } catch (error) {
    console.error('Erro ao atualizar profissional:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}

// DELETE - Excluir profissional permanentemente
export async function DELETE(request: NextRequest) {
  try {
    const user = verifyToken(request)
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    console.log('DELETE profissional - ID:', id, 'TenantID:', user.tenantId)

    if (!id) {
      return NextResponse.json(
        { message: 'ID do profissional é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o profissional pertence ao tenant
    const existingProfessional = await prisma.professional.findFirst({
      where: {
        id,
        tenantId: user.tenantId
      }
    })

    console.log('Profissional encontrado:', existingProfessional ? 'SIM' : 'NÃO')

    if (!existingProfessional) {
      return NextResponse.json(
        { message: 'Profissional não encontrado' },
        { status: 404 }
      )
    }

    // EXCLUIR PERMANENTEMENTE DO BANCO DE DADOS
    await prisma.professional.delete({
      where: { id }
    })

    console.log('✅ Profissional EXCLUÍDO PERMANENTEMENTE do banco:', {
      id: existingProfessional.id,
      name: existingProfessional.name
    })

    return NextResponse.json({ 
      message: 'Profissional excluído permanentemente',
      success: true,
      professional: { 
        id: existingProfessional.id, 
        name: existingProfessional.name
      }
    })
  } catch (error) {
    console.error('Erro ao excluir profissional:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}
