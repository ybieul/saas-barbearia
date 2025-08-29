import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getBrazilDayOfWeek, getBrazilDayNameEn, debugTimezone, toLocalISOString, parseDatabaseDateTime, getBrazilNow, formatBrazilDate, formatBrazilTime, parseBirthDate } from '@/lib/timezone'
import { whatsappTemplates } from '@/lib/whatsapp-server'
import { sendMultiTenantWhatsAppMessage } from '@/lib/whatsapp-multi-tenant'
import { getTenantWhatsAppConfig, isAutomationEnabled } from '@/lib/whatsapp-tenant-helper'
import { randomBytes } from 'crypto'

// Função para gerar ID único (similar ao cuid do Prisma)
function generateId(): string {
  return randomBytes(12).toString('base64url')
}

// 🚀 FUNÇÃO MULTI-TENANT: Enviar mensagem de confirmação para agendamentos públicos
async function sendPublicConfirmationMessage(
  appointment: any, 
  client: any, 
  professional: any, 
  services: any[], 
  business: any, 
  totalDuration: number, 
  totalPrice: number
) {
  console.log(`📧 [PUBLIC-CONFIRMATION] Iniciando processo de confirmação para agendamento público: ${appointment.id}`)
  
  // ✅ VERIFICAÇÃO 1: Buscar configuração WhatsApp do tenant (business)
  const tenantConfig = await getTenantWhatsAppConfig(business.id)
  
  if (!tenantConfig || !tenantConfig.instanceName) {
    console.log(`⚠️ [PUBLIC-CONFIRMATION] Tenant ${business.id} não possui instância WhatsApp configurada`)
    return
  }
  
  console.log(`✅ [PUBLIC-CONFIRMATION] Instância WhatsApp encontrada: ${tenantConfig.instanceName}`)

  // ✅ VERIFICAÇÃO 2: Verificar se a automação de confirmação está ativa
  const automationEnabled = await isAutomationEnabled(business.id, 'confirmation')
  
  if (!automationEnabled) {
    console.log(`⚠️ [PUBLIC-CONFIRMATION] Automação de confirmação desabilitada para tenant: ${business.id}`)
    return
  }

  console.log(`✅ [PUBLIC-CONFIRMATION] Automação de confirmação ativa`)

  // ✅ VERIFICAÇÃO 3: Verificar se já foi enviada uma confirmação para este agendamento
  const existingConfirmation = await prisma.appointmentReminder.findFirst({
    where: {
      appointmentId: appointment.id,
      reminderType: 'confirmation'
    }
  })
  
  if (existingConfirmation) {
    console.log(`⚠️ [PUBLIC-CONFIRMATION] Confirmação já foi enviada para este agendamento: ${appointment.id}`)
    return
  }

  // ✅ VERIFICAÇÃO 4: Verificar se o cliente tem telefone
  if (!client.phone) {
    console.log(`❌ [PUBLIC-CONFIRMATION] Cliente não possui telefone cadastrado: ${client.name}`)
    return
  }

  console.log(`✅ [PUBLIC-CONFIRMATION] Todas as verificações passaram - enviando confirmação`)

  // Preparar dados para o template
  const appointmentDate = new Date(appointment.dateTime)
  const templateData = {
    clientName: client.name,
    businessName: tenantConfig.businessName || 'Nossa Empresa',
    service: services.map((s: any) => s.name).join(', '),
    professional: professional?.name || 'Profissional',
    date: formatBrazilDate(appointmentDate),
    time: formatBrazilTime(appointmentDate, 'HH:mm'),
    totalTime: totalDuration,
    price: totalPrice,
    businessPhone: tenantConfig.businessPhone || '',
  }

  // Gerar mensagem e enviar usando instância específica do tenant
  const message = whatsappTemplates.confirmation(templateData)
  
  console.log(`📤 [PUBLIC-CONFIRMATION] Enviando via instância: ${tenantConfig.instanceName}`)
  console.log(`📱 [PUBLIC-CONFIRMATION] Para cliente: ${client.name} (${client.phone})`)
  
  const success = await sendMultiTenantWhatsAppMessage({
    to: client.phone,
    message,
    instanceName: tenantConfig.instanceName,
    type: 'confirmation',
  })

  if (success) {
    // Registrar o envio na tabela appointment_reminders
    await prisma.appointmentReminder.create({
      data: {
        id: generateId(),
        appointmentId: appointment.id,
        reminderType: 'confirmation',
        sentAt: getBrazilNow(),
      }
    })
    
    console.log(`✅ [PUBLIC-CONFIRMATION] Confirmação enviada com sucesso para: ${client.name} via instância ${tenantConfig.instanceName}`)
  } else {
    console.error(`❌ [PUBLIC-CONFIRMATION] Falha ao enviar confirmação WhatsApp para: ${client.name}`)
  }
}

// POST - Criar agendamento público
export async function POST(request: NextRequest) {
  try {
    const {
      businessSlug,
      clientName,
      clientPhone,
      clientEmail,
      clientBirthDate,
      professionalId,
      serviceId,      // Serviço principal (compatibilidade)
      services,       // Array com todos os serviços (principal + upsells)
      appointmentDateTime,
      notes
    } = await request.json()

    // Validações básicas
    if (!businessSlug || !clientName || !clientPhone || !serviceId || !appointmentDateTime) {
      return NextResponse.json(
        { message: 'Campos obrigatórios: businessSlug, clientName, clientPhone, serviceId, appointmentDateTime' },
        { status: 400 }
      )
    }

    // Buscar tenant por customLink
    const business = await prisma.tenant.findFirst({
      where: {
        isActive: true,
        businessConfig: {
          path: '$.customLink',
          equals: businessSlug
        }
      }
    })

    if (!business) {
      return NextResponse.json(
        { message: 'Estabelecimento não encontrado ou inativo' },
        { status: 404 }
      )
    }

    // Buscar ou criar cliente
    let client = await prisma.endUser.findFirst({
      where: {
        tenantId: business.id,
        phone: clientPhone
      }
    })

    if (!client) {
      // Criar novo cliente
      client = await prisma.endUser.create({
        data: {
          tenantId: business.id,
          name: clientName,
          phone: clientPhone,
          email: clientEmail || null,
          birthday: clientBirthDate ? parseBirthDate(clientBirthDate) : null,
          notes: notes || null
        }
      })
    } else {
      // Atualizar dados do cliente existente se necessário
      if (client.name !== clientName || client.email !== clientEmail || (clientBirthDate && !client.birthday)) {
        client = await prisma.endUser.update({
          where: { id: client.id },
          data: {
            name: clientName,
            email: clientEmail || client.email,
            birthday: clientBirthDate ? parseBirthDate(clientBirthDate) : client.birthday,
            notes: notes || client.notes
          }
        })
      }
    }

    // ✅ NOVO: Calcular duração e preço total de TODOS os serviços
    let totalDuration = 0
    let totalPrice = 0
    let mainService = null

    if (services && Array.isArray(services) && services.length > 0) {
      // Se veio array de serviços (principal + upsells), calcular tudo
      const allServices = await prisma.service.findMany({
        where: { 
          id: { in: services },
          tenantId: business.id 
        }
      })

      if (allServices.length !== services.length) {
        return NextResponse.json(
          { message: 'Um ou mais serviços não foram encontrados' },
          { status: 404 }
        )
      }

      // Calcular totais
      totalDuration = allServices.reduce((sum, s) => sum + (s.duration || 0), 0)
      totalPrice = allServices.reduce((sum, s) => sum + Number(s.price || 0), 0)
      
      // Serviço principal é o primeiro do array
      mainService = allServices.find(s => s.id === serviceId) || allServices[0]
      
      console.log('🎯 Agendamento com upsells:', {
        totalServices: allServices.length,
        serviceNames: allServices.map(s => s.name),
        totalDuration: `${totalDuration} min`,
        totalPrice: `R$ ${totalPrice}`
      })
    } else {
      // Fallback: apenas serviço principal
      mainService = await prisma.service.findFirst({
        where: { id: serviceId, tenantId: business.id }
      })

      if (!mainService) {
        return NextResponse.json(
          { message: 'Serviço não encontrado' },
          { status: 404 }
        )
      }

      totalDuration = mainService.duration || 30
      totalPrice = Number(mainService.price || 0)
    }

    // Buscar profissional (se especificado)
    const professional = professionalId ? await prisma.professional.findFirst({
      where: { id: professionalId, tenantId: business.id }
    }) : null

    if (professionalId && !professional) {
      return NextResponse.json(
        { message: 'Profissional não encontrado' },
        { status: 404 }
      )
    }

    // 🔒 VALIDAÇÃO DE HORÁRIOS DE FUNCIONAMENTO - USANDO APENAS TIMEZONE BRASILEIRO
    const appointmentDate = parseDatabaseDateTime(appointmentDateTime) // 🇧🇷 CORREÇÃO: Usar função brasileira
    
    // 🇧🇷 EXPLÍCITO: Sistema brasileiro direto - SEM UTC
    debugTimezone(appointmentDate, 'Agendamento público recebido (BRASILEIRO)')
    
    // Verificar se a data não é no passado (USANDO APENAS TIMEZONE BRASILEIRO)
    const now = getBrazilNow() // 🇧🇷 CORREÇÃO: Usar função brasileira
    if (appointmentDate < now) {
      return NextResponse.json(
        { message: 'Não é possível agendar em datas/horários passados' },
        { status: 400 }
      )
    }
    
    // Obter horários de funcionamento do estabelecimento
    const workingHours = await prisma.workingHours.findMany({
      where: { tenantId: business.id }
    })
    
    if (!workingHours || workingHours.length === 0) {
      return NextResponse.json(
        { message: 'Horários de funcionamento não configurados' },
        { status: 400 }
      )
    }
    
    // 🇧🇷 NOVO: Obter dia da semana diretamente
    const dayOfWeek = getBrazilDayOfWeek(appointmentDate)
    const dayName = getBrazilDayNameEn(appointmentDate)
    
    console.log('🇧🇷 Validação de dia:', {
      appointmentDate: toLocalISOString(appointmentDate), // 🇧🇷 CORREÇÃO: Usar função brasileira
      dayOfWeek,
      dayName
    })
    
    // Obter configuração do dia da semana
    const dayConfig = workingHours.find(wh => wh.dayOfWeek === dayName.toLowerCase())
    
    if (!dayConfig || !dayConfig.isActive) {
      return NextResponse.json(
        { message: `Estabelecimento fechado ${dayName === 'Sunday' ? 'no domingo' : 
                            dayName === 'Monday' ? 'na segunda-feira' :
                            dayName === 'Tuesday' ? 'na terça-feira' :
                            dayName === 'Wednesday' ? 'na quarta-feira' :
                            dayName === 'Thursday' ? 'na quinta-feira' :
                            dayName === 'Friday' ? 'na sexta-feira' :
                            dayName === 'Saturday' ? 'no sábado' : 'neste dia'}` },
        { status: 400 }
      )
    }
    
    // 🇧🇷 NOVO: Verificar se horário está dentro do funcionamento (direto)
    const appointmentTime = appointmentDate.toTimeString().substring(0, 5) // HH:MM
    const startTime = dayConfig.startTime
    const endTime = dayConfig.endTime
    
    if (appointmentTime < startTime || appointmentTime >= endTime) {
      return NextResponse.json(
        { message: `Horário fora do funcionamento. Horário disponível: ${startTime} às ${endTime}` },
        { status: 400 }
      )
    }
    
    // 🔒 VALIDAÇÃO DE CONFLITOS (mesmo sistema do dashboard)
    const serviceDuration = totalDuration // Usar duração total calculada
    const appointmentEndTime = new Date(appointmentDate.getTime() + (serviceDuration * 60000))
    
    // Buscar agendamentos conflitantes (sem include para evitar problemas de schema)
    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        tenantId: business.id,
        dateTime: {
          gte: new Date(appointmentDate.getTime() - (2 * 60 * 60 * 1000)), // 2h antes
          lte: new Date(appointmentDate.getTime() + (2 * 60 * 60 * 1000))  // 2h depois
        },
        status: {
          not: 'CANCELLED'
        }
      }
    })
    
    // 🎯 ALOCAR PROFISSIONAL AUTOMATICAMENTE para "qualquer profissional"
    let finalProfessionalId = professionalId
    
    if (!professionalId) {
      // "Qualquer profissional": encontrar e alocar um profissional disponível
      const allProfessionals = await prisma.professional.findMany({
        where: { tenantId: business.id, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' } // Ordenar por nome para consistência
      })
      
      if (allProfessionals.length === 0) {
        return NextResponse.json(
          { message: 'Nenhum profissional ativo encontrado' },
          { status: 400 }
        )
      }
      
      // Encontrar o primeiro profissional disponível
      let availableProfessional = null
      
      for (const prof of allProfessionals) {
        const hasConflict = conflictingAppointments.some(existingApt => {
          if (existingApt.professionalId !== prof.id) return false
          
          const existingStart = existingApt.dateTime // 🇧🇷 CORREÇÃO FINAL: Usar Date object direto do Prisma
          const existingDuration = existingApt.duration || 30  // ✅ Usar duração do próprio agendamento
          const existingEnd = new Date(existingStart.getTime() + (existingDuration * 60000))
          
          return (appointmentDate < existingEnd) && (appointmentEndTime > existingStart)
        })
        
        if (!hasConflict) {
          availableProfessional = prof
          break // Primeiro disponível encontrado
        }
      }
      
      if (!availableProfessional) {
        return NextResponse.json(
          { message: 'Horário já ocupado - todos os profissionais estão indisponíveis' },
          { status: 400 }
        )
      }
      
      // Alocar o profissional encontrado
      finalProfessionalId = availableProfessional.id
      console.log(`✅ "Qualquer profissional" alocado para: ${availableProfessional.name} (${availableProfessional.id})`)
    } else {
      // Profissional específico: verificar conflitos apenas com este profissional
      for (const existingApt of conflictingAppointments) {
        if (existingApt.professionalId !== professionalId) continue
        
        const existingStart = existingApt.dateTime // 🇧🇷 CORREÇÃO FINAL: Usar Date object direto do Prisma
        const existingDuration = existingApt.duration || 30  // ✅ Usar duração do próprio agendamento
        const existingEnd = new Date(existingStart.getTime() + (existingDuration * 60000))
        
        // Verificar sobreposição
        const hasOverlap = (appointmentDate < existingEnd) && (appointmentEndTime > existingStart)
        
        if (hasOverlap) {
          return NextResponse.json(
            { message: 'Horário já ocupado por outro agendamento' },
            { status: 400 }
          )
        }
      }
    }

    // ✅ CRIAR AGENDAMENTO COM RELACIONAMENTO MANY-TO-MANY
    // Nota: Usar 'any' é necessário devido ao cache de tipos do Prisma local
    // Em produção, após deploy + migrate, os tipos estarão corretos
    const appointmentData: any = {
      tenantId: business.id,
      endUserId: client.id,
      professionalId: finalProfessionalId,
      dateTime: toLocalISOString(appointmentDate), // 🇧🇷 CORREÇÃO CRÍTICA: String em vez de Date object
      duration: totalDuration,
      totalPrice: totalPrice,
      status: 'CONFIRMED',
      notes: notes || null,
      paymentStatus: 'PENDING',
      // ✅ CONECTAR SERVIÇOS: Many-to-Many relationship
      services: {
        connect: services && Array.isArray(services) && services.length > 0
          ? services.map((serviceId: string) => ({ id: serviceId }))
          : [{ id: serviceId }]
      }
    }

    // ✅ CRIAR AGENDAMENTO (sem include para evitar conflitos de tipos)
    const appointment = await prisma.appointment.create({
      data: appointmentData
    })

    // ✅ BUSCAR DADOS RELACIONADOS APÓS CRIAÇÃO
    const [appointmentClient, appointmentProfessional, appointmentServices] = await Promise.all([
      prisma.endUser.findUnique({ where: { id: appointment.endUserId } }),
      appointment.professionalId 
        ? prisma.professional.findUnique({ where: { id: appointment.professionalId } })
        : null,
      prisma.service.findMany({
        where: { appointments: { some: { id: appointment.id } } }
      })
    ])

    console.log('✅ Agendamento público criado com many-to-many:', {
      id: appointment.id,
      clientName: appointmentClient?.name || 'Nome não encontrado',
      serviceNames: appointmentServices.map(s => s.name).join(', '),
      serviceCount: appointmentServices.length,
      totalDuration: `${totalDuration} min`,
      totalPrice: `R$ ${totalPrice}`,
      dateTimeISO: toLocalISOString(appointment.dateTime), // 🇧🇷 CORREÇÃO: Usar função brasileira
      dateTimeBrazil: appointment.dateTime.toString()
    })

    // ✅ NOVO: GATILHO DE CONFIRMAÇÃO AUTOMÁTICA VIA WHATSAPP
    try {
      await sendPublicConfirmationMessage(appointment, appointmentClient, appointmentProfessional, appointmentServices, business, totalDuration, totalPrice)
    } catch (whatsappError) {
      console.error('❌ Erro ao enviar confirmação WhatsApp:', whatsappError)
      // Não falhar a criação do agendamento por erro do WhatsApp
    }

    return NextResponse.json({
      message: 'Agendamento criado com sucesso!',
      appointment: {
        id: appointment.id,
        dateTime: appointment.dateTime,
        client: appointmentClient,
        services: appointmentServices,
        mainService: appointmentServices[0],
        professional: appointmentProfessional,
        status: appointment.status,
        totalServices: appointmentServices.length,
        totalDuration,
        totalPrice
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Erro ao criar agendamento público:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
