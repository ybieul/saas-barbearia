import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getBrazilNow, getBrazilStartOfDay, getBrazilEndOfDay, utcToBrazil } from '@/lib/timezone'

// GET - Buscar dados do dashboard do tenant
export async function GET(request: NextRequest) {
  try {
    console.log('� === API DASHBOARD CHAMADA ===')
    const user = verifyToken(request)
    console.log('🔍 User tenant:', user.tenantId)
    
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'today'
    console.log('🔍 Period solicitado:', period)

    let startDate: Date
    let endDate: Date = getBrazilNow()

    switch (period) {
      case 'today':
        startDate = getBrazilStartOfDay(getBrazilNow())
        endDate = getBrazilEndOfDay(getBrazilNow())
        break
      case 'week':
        startDate = getBrazilStartOfDay(getBrazilNow())
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate = getBrazilStartOfDay(getBrazilNow())
        const brazilCurrent = utcToBrazil(getBrazilNow())
        startDate.setMonth(brazilCurrent.getMonth() - 1)
        break
      case 'year':
        startDate = getBrazilStartOfDay(getBrazilNow())
        startDate.setFullYear(startDate.getFullYear() - 1)
        break
      default:
        startDate = getBrazilStartOfDay(getBrazilNow())
        endDate = getBrazilEndOfDay(getBrazilNow())
    }

    // Métricas do tenant
    const [
      totalClients,
      activeClients,
      totalAppointments,
      completedAppointments,
      totalRevenue,
      pendingAppointments,
      cancelledAppointments,
      recentAppointments,
      todayAppointments,
      professionals,
      nextAppointment
    ] = await Promise.all([
      // Total de clientes do tenant
      prisma.endUser.count({
        where: { tenantId: user.tenantId }
      }),
      
      // Clientes ativos do tenant
      prisma.endUser.count({
        where: { 
          tenantId: user.tenantId,
          isActive: true 
        }
      }),
      
      // Total de agendamentos do período
      prisma.appointment.count({
        where: {
          tenantId: user.tenantId,
          dateTime: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      
      // Agendamentos concluídos
      prisma.appointment.count({
        where: {
          tenantId: user.tenantId,
          status: 'COMPLETED',
          dateTime: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      
      // Receita total do período
      prisma.appointment.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'COMPLETED',
          dateTime: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          totalPrice: true
        }
      }),
      
      // Agendamentos pendentes/agendados
      prisma.appointment.count({
        where: {
          tenantId: user.tenantId,
          status: {
            in: ['CONFIRMED']
          },
          dateTime: {
            gte: getBrazilNow() // Apenas futuros
          }
        }
      }),
      
      // Agendamentos cancelados
      prisma.appointment.count({
        where: {
          tenantId: user.tenantId,
          status: 'CANCELLED',
          dateTime: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      
      // Próximos agendamentos
      prisma.appointment.findMany({
        where: {
          tenantId: user.tenantId,
          dateTime: {
            gte: getBrazilNow()
          },
          status: {
            in: ['CONFIRMED']
          }
        },
        take: 5,
        orderBy: { dateTime: 'asc' },
        include: {
          endUser: {
            select: {
              name: true,
              phone: true
            }
          },
          services: {
            select: {
              name: true,
              duration: true
            }
          },
          professional: {
            select: {
              name: true
            }
          }
        }
      }),

      // Agendamentos de hoje - para dashboard
      prisma.appointment.findMany({
        where: {
          tenantId: user.tenantId,
          dateTime: {
            gte: getBrazilStartOfDay(getBrazilNow()),
            lte: getBrazilEndOfDay(getBrazilNow())
          }
          // Remover filtro de status para pegar todos os agendamentos
        },
        orderBy: { dateTime: 'asc' },
        include: {
          endUser: {
            select: {
              name: true,
              phone: true
            }
          },
          services: {
            select: {
              name: true,
              duration: true,
              price: true
            }
          },
          professional: {
            select: {
              name: true
            }
          }
        }
      }),

      // Profissionais com estatísticas
      prisma.professional.findMany({
        where: {
          tenantId: user.tenantId
          // Remover filtro isActive para pegar todos
        },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              appointments: {
                where: {
                  dateTime: {
                    gte: getBrazilStartOfDay(getBrazilNow()),
                    lte: getBrazilEndOfDay(getBrazilNow())
                  }
                  // Remover filtro de status
                }
              }
            }
          }
        }
      }),

      // Próximo agendamento
      prisma.appointment.findFirst({
        where: {
          tenantId: user.tenantId,
          dateTime: {
            gte: getBrazilNow()
          },
          status: {
            in: ['CONFIRMED']
          }
        },
        orderBy: { dateTime: 'asc' },
        include: {
          endUser: {
            select: {
              name: true,
              phone: true
            }
          },
          services: {
            select: {
              name: true,
              duration: true
            }
          },
          professional: {
            select: {
              name: true
            }
          }
        }
      })
    ])

    // Calcular métricas
    const revenue = totalRevenue._sum.totalPrice || 0
    const conversionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0
    const cancellationRate = totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0

    // Dados para sparklines - últimos 7 dias (simplificado)
    const sparklineData = []
    for (let i = 6; i >= 0; i--) {
      const date = getBrazilStartOfDay(getBrazilNow())
      date.setDate(date.getDate() - i)
      const endOfDay = getBrazilEndOfDay(date)
      
      // Simplificar - fazer uma query por vez
      const dayRevenue = await prisma.appointment.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'COMPLETED',
          dateTime: {
            gte: date,
            lte: endOfDay
          }
        },
        _sum: {
          totalPrice: true
        }
      })
      
      const dayAppointments = await prisma.appointment.count({
        where: {
          tenantId: user.tenantId,
          dateTime: {
            gte: date,
            lte: endOfDay
          },
          status: {
            in: ['CONFIRMED', 'COMPLETED', 'IN_PROGRESS']
          }
        }
      })
      
      sparklineData.push({
        date: date.toISOString().split('T')[0],
        revenue: dayRevenue._sum.totalPrice || 0,
        appointments: dayAppointments,
        clients: 0 // Simplificar por agora
      })
    }

    // Calcular taxa de ocupação por profissional (simplificado)
    const professionalsWithOccupancy = professionals.map((prof) => {
      // Simplificar - 10 slots por dia base
      const totalSlots = 10
      const occupiedSlots = prof._count.appointments
      const occupancyRate = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0
      
      return {
        id: prof.id,
        name: prof.name,
        appointmentsToday: prof._count.appointments,
        occupancyRate: Math.min(occupancyRate, 100) // Máximo 100%
      }
    })

    console.log('🔍 Professionals with occupancy:', professionalsWithOccupancy)

    // TODO: Reativar depois se necessário
    // Dados para gráficos - receita por dia (últimos 7 dias)
    // const dailyRevenue = []
    // for (let i = 6; i >= 0; i--) {
    //   const date = getBrazilStartOfDay(getBrazilNow())
    //   date.setDate(date.getDate() - i)
    //   
    //   const endOfDay = getBrazilEndOfDay(date)
    //   
    //   const dayRevenue = await prisma.appointment.aggregate({
    //     where: {
    //       tenantId: user.tenantId,
    //       status: 'COMPLETED',
    //       dateTime: {
    //         gte: date,
    //         lte: endOfDay
    //       }
    //     },
    //     _sum: {
    //       totalPrice: true
    //     }
    //   })
    //   
    //   dailyRevenue.push({
    //     date: date.toISOString().split('T')[0],
    //     revenue: dayRevenue._sum.totalPrice || 0
    //   })
    // }

    console.log('🔍 Resultados das queries:', {
      totalClients,
      activeClients,
      totalAppointments,
      completedAppointments,
      revenue: Number(revenue),
      todayAppointmentsCount: todayAppointments.length,
      professionalsCount: professionals.length,
      nextAppointmentExists: !!nextAppointment
    })

    console.log('🔍 Today appointments raw:', todayAppointments.slice(0, 2)) // Primeiros 2 para debug
    console.log('🔍 Professionals raw:', professionals.slice(0, 2)) // Primeiros 2 para debug

    return NextResponse.json({
      data: {
        // Estrutura simplificada que o frontend espera
        summary: {
          totalClients,
          activeClients,
          totalAppointments,
          completedAppointments,
          revenue: Number(revenue),
          pendingAppointments,
          conversionRate: Math.round(conversionRate * 100) / 100,
          cancellationRate: Math.round(cancellationRate * 100) / 100,
          occupancyRate: professionalsWithOccupancy.length > 0 
            ? Math.round(professionalsWithOccupancy.reduce((avg, prof) => avg + prof.occupancyRate, 0) / professionalsWithOccupancy.length)
            : 0
        },
        stats: {
          totalRevenue: Number(revenue),
          totalClients,
          totalAppointments,
          occupancyRate: professionalsWithOccupancy.length > 0 
            ? Math.round(professionalsWithOccupancy.reduce((avg, prof) => avg + prof.occupancyRate, 0) / professionalsWithOccupancy.length)
            : 0
        },
        todayAppointments: todayAppointments.map(apt => ({
          id: apt.id,
          time: utcToBrazil(new Date(apt.dateTime)).toTimeString().substring(0, 5),
          client: apt.endUser?.name || 'Cliente sem nome',
          service: apt.services?.length > 0 ? apt.services.map(s => s.name).join(' + ') : 'Serviço não informado',
          professional: apt.professional?.name || 'Sem profissional',
          status: apt.status,
          totalPrice: apt.totalPrice || 0
        })),
        nextAppointment: nextAppointment ? {
          id: nextAppointment.id,
          time: utcToBrazil(new Date(nextAppointment.dateTime)).toTimeString().substring(0, 5),
          date: utcToBrazil(new Date(nextAppointment.dateTime)).toDateString(),
          client: nextAppointment.endUser?.name || 'Cliente sem nome',
          service: nextAppointment.services?.length > 0 ? nextAppointment.services.map(s => s.name).join(' + ') : 'Serviço não informado',
          professional: nextAppointment.professional?.name || 'Sem profissional',
          duration: nextAppointment.services?.length > 0 ? nextAppointment.services.reduce((total, s) => total + (s.duration || 0), 0) : 30
        } : null,
        professionals: professionalsWithOccupancy,
        sparklines: {
          revenue: sparklineData.map(d => d.revenue),
          appointments: sparklineData.map(d => d.appointments),
          clients: sparklineData.map(d => d.clients),
          dates: sparklineData.map(d => d.date)
        },
        // Dados para compatibilidade
        recentAppointments,
        period
      }
    })
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: error instanceof Error && error.message.includes('Token') ? 401 : 500 }
    )
  }
}
