import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getBrazilNow, getBrazilStartOfDay, getBrazilEndOfDay, toLocalDateString, toLocalISOString } from '@/lib/timezone'

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
        const brazilCurrent = getBrazilNow()
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
      
      // Agendamentos concluídos - incluir mais status
      prisma.appointment.count({
        where: {
          tenantId: user.tenantId,
          status: {
            in: ['COMPLETED', 'IN_PROGRESS']
          },
          dateTime: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      
      // Receita total do período - incluir mais status
      prisma.appointment.aggregate({
        where: {
          tenantId: user.tenantId,
          status: {
            in: ['COMPLETED', 'IN_PROGRESS'] // Incluir em andamento também
          },
          dateTime: {
            gte: startDate,
            lte: endDate
          },
          totalPrice: {
            gt: 0 // Apenas com valor > 0
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
      
      // Próximos agendamentos - AGENDAMENTOS DO DIA ATUAL (SEM FILTRO DE HORÁRIO)
      prisma.appointment.findMany({
        where: {
          tenantId: user.tenantId,
          dateTime: {
            gte: getBrazilStartOfDay(getBrazilNow()), // Desde o início do dia atual
            lte: getBrazilEndOfDay(getBrazilNow()) // Até o final do dia atual
          },
          status: {
            in: ['CONFIRMED', 'IN_PROGRESS'] // Apenas não concluídos
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
          avatar: true // Incluir avatar dos profissionais
        }
      }),

      // Próximo agendamento - AGENDAMENTO DO DIA ATUAL (SEM FILTRO DE HORÁRIO)
      prisma.appointment.findFirst({
        where: {
          tenantId: user.tenantId,
          dateTime: {
            gte: getBrazilStartOfDay(getBrazilNow()), // Desde o início do dia atual
            lte: getBrazilEndOfDay(getBrazilNow()) // Até o final do dia atual
          },
          status: {
            in: ['CONFIRMED', 'IN_PROGRESS'] // Apenas não concluídos
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

    // Buscar próximos agendamentos por profissional - AGENDAMENTOS DO DIA ATUAL (SEM FILTRO DE HORÁRIO)
    const nextAppointmentsByProfessional = await Promise.all(
      professionals.map(async (prof) => {
        const nextAppointment = await prisma.appointment.findFirst({
          where: {
            tenantId: user.tenantId,
            professionalId: prof.id,
            dateTime: {
              gte: getBrazilStartOfDay(getBrazilNow()), // Desde o início do dia atual
              lte: getBrazilEndOfDay(getBrazilNow()) // Até o final do dia atual
            },
            status: {
              in: ['CONFIRMED', 'IN_PROGRESS'] // Apenas não concluídos
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
            }
          }
        })

        return {
          professional: {
            id: prof.id,
            name: prof.name,
            avatar: prof.avatar // Incluir avatar
          },
          nextAppointment: nextAppointment ? {
            id: nextAppointment.id,
            time: new Date(nextAppointment.dateTime).toTimeString().substring(0, 5),
            date: new Date(nextAppointment.dateTime).toLocaleDateString('pt-BR'),
            client: nextAppointment.endUser?.name || 'Cliente sem nome',
            service: nextAppointment.services?.length > 0 ? nextAppointment.services.map(s => s.name).join(' + ') : 'Serviço não informado',
            duration: nextAppointment.services?.length > 0 ? nextAppointment.services.reduce((total, s) => total + (s.duration || 0), 0) : 30,
            status: nextAppointment.status,
            totalPrice: Number(nextAppointment.totalPrice) || 0
          } : null
        }
      })
    )

    // Calcular métricas
    const revenue = totalRevenue._sum.totalPrice || 0
    const conversionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0
    const cancellationRate = totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0

    // Dados para sparklines - últimos 7 dias (simplificado)
    const sparklineData: Array<{
      date: string
      revenue: number
      appointments: number
      clients: number
    }> = []
    for (let i = 6; i >= 0; i--) {
      const date = getBrazilStartOfDay(getBrazilNow())
      date.setDate(date.getDate() - i)
      const endOfDay = getBrazilEndOfDay(date)
      
        // Simplificar - fazer uma query por vez
        const dayRevenue = await prisma.appointment.aggregate({
          where: {
            tenantId: user.tenantId,
            status: {
              in: ['COMPLETED', 'IN_PROGRESS'] // Incluir mais status
            },
            dateTime: {
              gte: date,
              lte: endOfDay
            },
            totalPrice: {
              gt: 0
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
            }
            // Remover filtro de status - contar todos
          }
        })
        
        // Contar clientes únicos que tiveram agendamentos no dia
        const dayClientsResult = await prisma.appointment.findMany({
          where: {
            tenantId: user.tenantId,
            dateTime: {
              gte: date,
              lte: endOfDay
            }
          },
          select: {
            endUserId: true
          },
          distinct: ['endUserId']
        })
        
        sparklineData.push({
          date: toLocalDateString(date), // 🇧🇷 CORREÇÃO: Usar função brasileira
          revenue: Number(dayRevenue._sum.totalPrice || 0),
          appointments: dayAppointments,
          clients: dayClientsResult.length
        })
    }
    if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Sparkline data calculado:', sparklineData)
    console.log('🔍 Revenue array:', sparklineData.map(d => d.revenue))
    console.log('🔍 Appointments array:', sparklineData.map(d => d.appointments))
    console.log('🔍 Clients array:', sparklineData.map(d => d.clients))
    }

    // Calcular taxa de ocupação por profissional (usando horário real de funcionamento)
    const professionalsWithOccupancy = await Promise.all(
      professionals.map(async (prof) => {
        // Buscar agendamentos do profissional para hoje
        const professionalAppointments = await prisma.appointment.findMany({
          where: {
            tenantId: user.tenantId,
            professionalId: prof.id,
            dateTime: {
              gte: getBrazilStartOfDay(getBrazilNow()),
              lte: getBrazilEndOfDay(getBrazilNow())
            },
            status: {
              not: 'CANCELLED' // Excluir cancelados
            }
          },
          include: {
            services: {
              select: {
                duration: true
              }
            }
          }
        })

        // Calcular total de minutos ocupados
        const totalOccupiedMinutes = professionalAppointments.reduce((sum, apt) => {
          const serviceDuration = apt.services?.reduce((total, service) => total + (service.duration || 30), 0) || 30
          return sum + serviceDuration
        }, 0)

        // Buscar horário de funcionamento para hoje
        const today = getBrazilNow()
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
        
        const workingHour = await prisma.workingHours.findFirst({
          where: {
            tenantId: user.tenantId,
            dayOfWeek: dayName,
            isActive: true
          }
        })

        // Calcular minutos disponíveis baseado no horário real
        let totalAvailableMinutes = 600 // Default 10 horas
        
        if (workingHour && workingHour.startTime && workingHour.endTime) {
          const [startHour, startMinute] = workingHour.startTime.split(':').map(Number)
          const [endHour, endMinute] = workingHour.endTime.split(':').map(Number)
          
          const startTotalMinutes = startHour * 60 + startMinute
          const endTotalMinutes = endHour * 60 + endMinute
          
          totalAvailableMinutes = endTotalMinutes - startTotalMinutes
          
          console.log(`🕐 Horário ${dayName}: ${workingHour.startTime} - ${workingHour.endTime} = ${totalAvailableMinutes} minutos`)
        } else {
          console.log(`⚠️  Horário não configurado para ${dayName}, usando padrão: ${totalAvailableMinutes} minutos`)
        }
        
        const occupancyRate = totalAvailableMinutes > 0 
          ? Math.round((totalOccupiedMinutes / totalAvailableMinutes) * 100) 
          : 0
        
        console.log(`🔍 Professional ${prof.name}: ${totalOccupiedMinutes}min/${totalAvailableMinutes}min = ${occupancyRate}%`)
        
        return {
          id: prof.id,
          name: prof.name,
          appointmentsToday: professionalAppointments.length,
          occupancyRate: Math.min(occupancyRate, 100) // Máximo 100%
        }
      })
    )

    // Calcular ocupação geral baseada nos profissionais
    const averageOccupancyRate = professionalsWithOccupancy.length > 0 
      ? Math.round(professionalsWithOccupancy.reduce((avg, prof) => avg + prof.occupancyRate, 0) / professionalsWithOccupancy.length)
      : 0

    console.log('🔍 Profissionais com ocupação calculada:', professionalsWithOccupancy)
    console.log('🔍 Taxa de ocupação média:', averageOccupancyRate)

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

    console.log('🔍 Resultados das queries (DETALHADO):', {
      totalClients,
      activeClients,
      totalAppointments,
      completedAppointments,
      revenue: Number(revenue),
      revenueRaw: totalRevenue._sum.totalPrice,
      todayAppointmentsCount: todayAppointments.length,
      professionalsCount: professionals.length,
      nextAppointmentExists: !!nextAppointment,
      period,
      dateRange: {
        startDate: toLocalISOString(startDate), // 🇧🇷 CORREÇÃO: Usar função brasileira
        endDate: toLocalISOString(endDate), // 🇧🇷 CORREÇÃO: Usar função brasileira
        brazilNow: toLocalISOString(getBrazilNow()) // 🇧🇷 CORREÇÃO: Usar função brasileira
      }
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
          occupancyRate: averageOccupancyRate
        },
        stats: {
          totalRevenue: Number(revenue),
          totalClients,
          totalAppointments,
          occupancyRate: averageOccupancyRate
        },
        todayAppointments: todayAppointments.map(apt => ({
          id: apt.id,
          time: new Date(apt.dateTime).toTimeString().substring(0, 5),
          client: apt.endUser?.name || 'Cliente sem nome',
          service: apt.services?.length > 0 ? apt.services.map(s => s.name).join(' + ') : 'Serviço não informado',
          professional: apt.professional?.name || 'Sem profissional',
          status: apt.status,
          totalPrice: apt.totalPrice || 0
        })),
        nextAppointment: nextAppointment ? {
          id: nextAppointment.id,
          time: new Date(nextAppointment.dateTime).toTimeString().substring(0, 5),
          date: new Date(nextAppointment.dateTime).toDateString(),
          client: nextAppointment.endUser?.name || 'Cliente sem nome',
          service: nextAppointment.services?.length > 0 ? nextAppointment.services.map(s => s.name).join(' + ') : 'Serviço não informado',
          professional: nextAppointment.professional?.name || 'Sem profissional',
          duration: nextAppointment.services?.length > 0 ? nextAppointment.services.reduce((total, s) => total + (s.duration || 0), 0) : 30,
          totalPrice: Number(nextAppointment.totalPrice) || 0
        } : null,
        nextAppointmentsByProfessional: nextAppointmentsByProfessional.filter(item => item.nextAppointment !== null), // Apenas profissionais com próximos agendamentos
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
