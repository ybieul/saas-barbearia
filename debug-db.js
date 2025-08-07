// Script para verificar dados do banco - Debug de relatórios
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function debugDatabase() {
  console.log('🔍 DEBUG: Verificando dados do banco...\n')
  
  try {
    // 1. Verificar tenants
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        businessName: true,
        email: true,
        isActive: true
      }
    })
    console.log('👥 TENANTS ENCONTRADOS:', tenants.length)
    tenants.forEach(tenant => {
      console.log(`   - ${tenant.businessName || tenant.name} (${tenant.email}) [${tenant.isActive ? 'ATIVO' : 'INATIVO'}]`)
    })
    console.log('')

    if (tenants.length === 0) {
      console.log('❌ PROBLEMA: Nenhum tenant encontrado!')
      return
    }

    // Pegar o primeiro tenant para análise
    const tenantId = tenants[0].id
    console.log(`🎯 ANALISANDO TENANT: ${tenants[0].businessName || tenants[0].name}\n`)

    // 2. Verificar agendamentos
    const allAppointments = await prisma.appointment.findMany({
      where: { tenantId },
      include: {
        endUser: { select: { name: true } },
        professional: { select: { name: true } },
        services: { select: { name: true, price: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
    
    console.log('📅 AGENDAMENTOS TOTAIS:', allAppointments.length)
    
    const completedAppointments = allAppointments.filter(app => app.status === 'COMPLETED')
    console.log('✅ AGENDAMENTOS CONCLUÍDOS:', completedAppointments.length)
    
    const scheduledAppointments = allAppointments.filter(app => app.status === 'SCHEDULED')
    console.log('⏰ AGENDAMENTOS AGENDADOS:', scheduledAppointments.length)
    
    const cancelledAppointments = allAppointments.filter(app => app.status === 'CANCELLED')
    console.log('❌ AGENDAMENTOS CANCELADOS:', cancelledAppointments.length)
    
    console.log('\n📊 AMOSTRA DOS ÚLTIMOS AGENDAMENTOS:')
    allAppointments.slice(0, 3).forEach((app, index) => {
      console.log(`   ${index + 1}. ${app.endUser?.name || 'N/A'} - ${app.status} - R$ ${app.totalPrice} - ${app.createdAt.toLocaleDateString('pt-BR')}`)
    })
    console.log('')

    // 3. Verificar receita total
    const revenueSum = await prisma.appointment.aggregate({
      _sum: { totalPrice: true },
      _count: { id: true },
      where: {
        tenantId,
        status: 'COMPLETED'
      }
    })
    
    console.log('💰 RECEITA TOTAL (COMPLETED):', revenueSum._sum.totalPrice || 0)
    console.log('📊 AGENDAMENTOS COMPLETED:', revenueSum._count || 0)
    console.log('')

    // 4. Verificar dados dos últimos 30 dias
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recent = await prisma.appointment.aggregate({
      _sum: { totalPrice: true },
      _count: { id: true },
      where: {
        tenantId,
        status: 'COMPLETED',
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    })
    
    console.log('📈 RECEITA ÚLTIMOS 30 DIAS:', recent._sum.totalPrice || 0)
    console.log('📊 AGENDAMENTOS ÚLTIMOS 30 DIAS:', recent._count || 0)
    console.log('')

    // 5. Verificar hoje
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
    
    const todayData = await prisma.appointment.aggregate({
      _sum: { totalPrice: true },
      _count: { id: true },
      where: {
        tenantId,
        status: 'COMPLETED',
        createdAt: {
          gte: todayStart,
          lt: todayEnd
        }
      }
    })
    
    console.log('📅 RECEITA HOJE:', todayData._sum.totalPrice || 0)
    console.log('📊 AGENDAMENTOS HOJE:', todayData._count || 0)
    console.log('')

    // 6. Verificar serviços
    const services = await prisma.service.findMany({
      where: { tenantId },
      select: { name: true, price: true, isActive: true }
    })
    
    console.log('🛍️ SERVIÇOS CADASTRADOS:', services.length)
    services.slice(0, 3).forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.name} - R$ ${service.price} [${service.isActive ? 'ATIVO' : 'INATIVO'}]`)
    })
    console.log('')

    // 7. Verificar profissionais
    const professionals = await prisma.professional.findMany({
      where: { tenantId },
      select: { name: true, isActive: true }
    })
    
    console.log('👨‍💼 PROFISSIONAIS CADASTRADOS:', professionals.length)
    professionals.forEach((prof, index) => {
      console.log(`   ${index + 1}. ${prof.name} [${prof.isActive ? 'ATIVO' : 'INATIVO'}]`)
    })
    console.log('')

    // 8. Verificar clientes
    const clients = await prisma.endUser.findMany({
      where: { tenantId },
      select: { name: true, isActive: true }
    })
    
    console.log('👤 CLIENTES CADASTRADOS:', clients.length)
    console.log('')

  } catch (error) {
    console.error('❌ ERRO:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

debugDatabase()
