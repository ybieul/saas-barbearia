import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedWhatsAppMessages() {
  try {
    console.log('🌱 Iniciando seed de mensagens WhatsApp...')

    // Buscar um tenant existente (primeiro tenant no banco)
    const tenant = await prisma.tenant.findFirst()
    
    if (!tenant) {
      console.log('❌ Nenhum tenant encontrado. Execute o seed principal primeiro.')
      return
    }

    console.log(`📍 Usando tenant: ${tenant.businessName || tenant.name} (${tenant.id})`)

    // Criar algumas mensagens de WhatsAppLog (promoções/reativações)
    const whatsappLogs = await Promise.all([
      prisma.whatsAppLog.create({
        data: {
          tenantId: tenant.id,
          to: '21988131173',
          message: 'Olá Anderson M L FALCE! Sentimos sua falta. Que tal agendar um novo atendimento? Temos ofertas especiais! 🎯 *Super Promoção Especial* 🎯\n\n⭐ Corte + Sobrancelha por apenas R$ 30,00\n⭐ Válido até o final do mês\n⭐ Agende já pelo link: https://agendapro.com/[customLink]\n\nNão perca essa oportunidade! 💪',
          type: 'PROMOTION',
          status: 'SENT',
          sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
        }
      }),
      prisma.whatsAppLog.create({
        data: {
          tenantId: tenant.id,
          to: '24981757112',
          message: 'Olá Gabriel Teste2! Sentimos sua falta. Que tal agendar um novo atendimento? Temos ofertas especiais! 🎯 *Super Promoção Especial* 🎯\n\n⭐ Corte + Sobrancelha por apenas R$ 30,00\n⭐ Válido até o final do mês\n⭐ Agende já pelo link: https://agendapro.com/[customLink]\n\nNão perca essa oportunidade! 💪',
          type: 'PROMOTION',
          status: 'SENT',
          sentAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 horas atrás
        }
      }),
      prisma.whatsAppLog.create({
        data: {
          tenantId: tenant.id,
          to: '24981298447',
          message: 'Olá Eduarda Vianna! Sentimos sua falta. Que tal agendar um novo atendimento? Temos ofertas especiais! 🎯 *Super Promoção Especial* 🎯\n\n⭐ Corte + Sobrancelha por apenas R$ 30,00\n⭐ Válido até o final do mês\n⭐ Agende já pelo link: https://agendapro.com/[customLink]\n\nNão perca essa oportunidade! 💪',
          type: 'PROMOTION',
          status: 'SENT',
          sentAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 horas atrás
        }
      })
    ])

    console.log(`✅ Criadas ${whatsappLogs.length} mensagens no WhatsAppLog`)

    // Buscar alguns agendamentos existentes para criar AppointmentReminders
    const appointments = await prisma.appointment.findMany({
      where: { tenantId: tenant.id },
      take: 3,
      orderBy: { createdAt: 'desc' }
    })

    if (appointments.length > 0) {
      const appointmentReminders = await Promise.all(
        appointments.map((appointment, index) => 
          prisma.appointmentReminder.create({
            data: {
              appointmentId: appointment.id,
              reminderType: index === 0 ? 'confirmation' : index === 1 ? 'reminder_24h' : 'reminder_2h',
              sentAt: new Date(Date.now() - (index + 1) * 30 * 60 * 1000), // 30min, 60min, 90min atrás
            }
          })
        )
      )

      console.log(`✅ Criados ${appointmentReminders.length} lembretes de agendamento`)
    } else {
      console.log('⚠️  Nenhum agendamento encontrado para criar lembretes')
    }

    // Exibir resumo
    const totalWhatsappLogs = await prisma.whatsAppLog.count({
      where: { tenantId: tenant.id }
    })
    
    const totalReminders = await prisma.appointmentReminder.count({
      where: {
        appointment: {
          tenantId: tenant.id
        }
      }
    })

    console.log('\n📊 RESUMO FINAL:')
    console.log(`📱 WhatsApp Logs: ${totalWhatsappLogs}`)
    console.log(`⏰ Appointment Reminders: ${totalReminders}`)
    console.log(`📈 Total de mensagens: ${totalWhatsappLogs + totalReminders}`)
    console.log('\n🎉 Seed de mensagens WhatsApp concluído com sucesso!')

  } catch (error) {
    console.error('❌ Erro durante o seed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  seedWhatsAppMessages()
}

export { seedWhatsAppMessages }
