import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  try {
    // Limpar dados existentes (opcional)
    console.log('🧹 Limpando dados existentes...')
    await prisma.promotionTemplate.deleteMany()
    await prisma.whatsAppLog.deleteMany()
    await prisma.financialRecord.deleteMany()
    await prisma.appointment.deleteMany()
    await prisma.servicePackageService.deleteMany()
    await prisma.servicePackage.deleteMany()
    await prisma.service.deleteMany()
    await prisma.professional.deleteMany()
    await prisma.endUser.deleteMany()
    await prisma.tenant.deleteMany()

    // Criar tenant demo (Barbearia)
    console.log('👤 Criando tenant demo...')
    const hashedPassword = await bcrypt.hash('123456', 12)
    
    const demoTenant = await prisma.tenant.create({
      data: {
        email: 'demo@barbeariademo.com',
        name: 'João Silva',
        password: hashedPassword,
        phone: '(11) 99999-9999',
        businessName: 'Barbearia do João',
        businessAddress: 'Rua das Flores, 123 - São Paulo, SP',
        businessPhone: '(11) 3456-7890',
        businessCnpj: '12.345.678/0001-90',
        businessPlan: 'PREMIUM',
        isActive: true
      }
    })

    console.log(`✅ Tenant criado: ${demoTenant.businessName} (ID: ${demoTenant.id})`)

    // Criar segundo tenant
    const tenant2 = await prisma.tenant.create({
      data: {
        email: 'admin@barbeariamoderna.com',
        name: 'Maria Santos',
        password: hashedPassword,
        phone: '(11) 88888-8888',
        businessName: 'Barbearia Moderna',
        businessAddress: 'Av. Paulista, 1000 - São Paulo, SP',
        businessPhone: '(11) 2222-3333',
        businessCnpj: '98.765.432/0001-10',
        businessPlan: 'BASIC',
        isActive: true
      }
    })

    console.log(`✅ Segundo tenant criado: ${tenant2.businessName} (ID: ${tenant2.id})`)

    // Criar profissionais para o primeiro tenant
    console.log('💇‍♂️ Criando profissionais...')
    const professionals = await prisma.professional.createMany({
      data: [
        {
          name: 'Carlos Barbeiro',
          email: 'carlos@barbeariademo.com',
          phone: '(11) 97777-7777',
          specialty: 'Cortes masculinos e barba',
          salary: 2500.00,
          commission: 15.00,
          tenantId: demoTenant.id
        },
        {
          name: 'Pedro Estilista',
          email: 'pedro@barbeariademo.com',
          phone: '(11) 96666-6666',
          specialty: 'Especialista em design de sobrancelhas',
          salary: 2000.00,
          commission: 20.00,
          tenantId: demoTenant.id
        }
      ]
    })

    console.log(`✅ Profissionais criados: ${professionals.count}`)

    // Criar serviços
    console.log('✂️ Criando serviços...')
    const services = await prisma.service.createMany({
      data: [
        {
          name: 'Corte Simples',
          description: 'Corte de cabelo tradicional masculino',
          price: 25.00,
          duration: 30,
          category: 'Cabelo',
          tenantId: demoTenant.id
        },
        {
          name: 'Corte + Barba',
          description: 'Corte de cabelo com aparagem de barba',
          price: 40.00,
          duration: 50,
          category: 'Combo',
          tenantId: demoTenant.id
        },
        {
          name: 'Barba Completa',
          description: 'Aparagem, hidratação e finalização da barba',
          price: 20.00,
          duration: 25,
          category: 'Barba',
          tenantId: demoTenant.id
        },
        {
          name: 'Sobrancelha',
          description: 'Design e aparagem de sobrancelhas',
          price: 15.00,
          duration: 20,
          category: 'Estética',
          tenantId: demoTenant.id
        },
        {
          name: 'Cabelo + Barba + Sobrancelha',
          description: 'Pacote completo de cuidados masculinos',
          price: 65.00,
          duration: 90,
          category: 'Premium',
          tenantId: demoTenant.id
        }
      ]
    })

    console.log(`✅ Serviços criados: ${services.count}`)

    // Criar clientes finais (EndUsers)
    console.log('👥 Criando clientes finais...')
    const endUsers = await prisma.endUser.createMany({
      data: [
        {
          name: 'Ricardo Oliveira',
          email: 'ricardo@email.com',
          phone: '(11) 99123-4567',
          birthday: new Date('1990-03-15'),
          address: 'Rua A, 123 - Vila Madalena',
          totalVisits: 5,
          totalSpent: 200.00,
          lastVisit: new Date('2025-01-10'),
          tenantId: demoTenant.id
        },
        {
          name: 'Fernando Costa',
          email: 'fernando@email.com',
          phone: '(11) 98765-4321',
          birthday: new Date('1985-07-22'),
          address: 'Av. B, 456 - Pinheiros',
          totalVisits: 12,
          totalSpent: 480.00,
          lastVisit: new Date('2025-01-08'),
          tenantId: demoTenant.id
        },
        {
          name: 'Gabriel Santos',
          email: 'gabriel@email.com',
          phone: '(11) 97654-3210',
          birthday: new Date('1992-11-05'),
          address: 'Rua C, 789 - Itaim Bibi',
          totalVisits: 3,
          totalSpent: 120.00,
          lastVisit: new Date('2025-01-12'),
          tenantId: demoTenant.id
        },
        {
          name: 'Marcos Lima',
          email: 'marcos@email.com',
          phone: '(11) 96543-2109',
          birthday: new Date('1988-02-28'),
          totalVisits: 8,
          totalSpent: 320.00,
          lastVisit: new Date('2025-01-05'),
          tenantId: demoTenant.id
        }
      ]
    })

    console.log(`✅ Clientes finais criados: ${endUsers.count}`)

    // Buscar dados criados para criar agendamentos
    const createdServices = await prisma.service.findMany({
      where: { tenantId: demoTenant.id }
    })
    const createdProfessionals = await prisma.professional.findMany({
      where: { tenantId: demoTenant.id }
    })
    const createdEndUsers = await prisma.endUser.findMany({
      where: { tenantId: demoTenant.id }
    })

    // Criar agendamentos
    console.log('📅 Criando agendamentos...')
    const today = new Date()
    const appointments = []

    for (let i = 0; i < 15; i++) {
      const appointmentDate = new Date(today)
      appointmentDate.setDate(today.getDate() + Math.floor(i / 3))
      
      const hours = [9, 10, 11, 14, 15, 16, 17]
      const hour = hours[i % hours.length]
      appointmentDate.setHours(hour, 0, 0, 0)

      const service = createdServices[i % createdServices.length]
      const professional = createdProfessionals[i % createdProfessionals.length]
      const endUser = createdEndUsers[i % createdEndUsers.length]

      appointments.push({
        dateTime: appointmentDate,
        duration: service.duration,
        totalPrice: Number(service.price),
        status: (i < 5 ? 'COMPLETED' : 'CONFIRMED') as 'COMPLETED' | 'CONFIRMED',
        paymentMethod: (['CASH', 'CARD', 'PIX'][i % 3]) as 'CASH' | 'CARD' | 'PIX',
        paymentStatus: (i < 5 ? 'PAID' : 'PENDING') as 'PAID' | 'PENDING',
        tenantId: demoTenant.id,
        endUserId: endUser.id,
        serviceId: service.id,
        professionalId: professional.id
      })
    }

    await prisma.appointment.createMany({ data: appointments })
    console.log(`✅ Agendamentos criados: ${appointments.length}`)

    // Criar templates de promoção
    console.log('📢 Criando templates de promoção...')
    const promotionTemplates = await prisma.promotionTemplate.createMany({
      data: [
        {
          name: 'Desconto Cliente Novo',
          title: '20% OFF - Primeira Visita',
          message: 'Bem-vindo à nossa barbearia! 🎉\n\nGanhe 20% de desconto na sua primeira visita.\n\n📅 Agende já!',
          tenantId: demoTenant.id
        },
        {
          name: 'Promoção Fim de Semana',
          title: 'Weekend Special - 15% OFF',
          message: 'Final de semana é hora de se cuidar! 💈\n\n15% de desconto aos sábados e domingos.\n\n⏰ Vagas limitadas!',
          tenantId: demoTenant.id
        },
        {
          name: 'Pacote Completo',
          title: 'Combo Premium',
          message: 'Cabelo + Barba + Sobrancelha por apenas R$ 65,00! 🔥\n\nEconomize R$ 15,00 no pacote completo.\n\n📲 Agende agora!',
          tenantId: demoTenant.id
        }
      ]
    })

    console.log(`✅ Templates de promoção criados: ${promotionTemplates.count}`)

    // Criar registros financeiros
    console.log('💰 Criando registros financeiros...')
    const financialRecords = await prisma.financialRecord.createMany({
      data: [
        {
          type: 'INCOME',
          amount: 25.00,
          description: 'Corte simples - Ricardo',
          category: 'Serviços',
          paymentMethod: 'CASH',
          tenantId: demoTenant.id
        },
        {
          type: 'INCOME',
          amount: 40.00,
          description: 'Corte + Barba - Fernando',
          category: 'Serviços',
          paymentMethod: 'CARD',
          tenantId: demoTenant.id
        },
        {
          type: 'EXPENSE',
          amount: 150.00,
          description: 'Produtos para cabelo',
          category: 'Material',
          tenantId: demoTenant.id
        },
        {
          type: 'EXPENSE',
          amount: 80.00,
          description: 'Energia elétrica',
          category: 'Contas',
          tenantId: demoTenant.id
        }
      ]
    })

    console.log(`✅ Registros financeiros criados: ${financialRecords.count}`)

    console.log('\n🎉 Seed concluído com sucesso!')
    console.log('\n📊 Dados criados:')
    console.log(`- ${1} Tenant principal (Barbearia do João)`)
    console.log(`- ${1} Tenant secundário (Barbearia Moderna)`)
    console.log(`- ${2} Profissionais`)
    console.log(`- ${5} Serviços`)
    console.log(`- ${4} Clientes finais`)
    console.log(`- ${15} Agendamentos`)
    console.log(`- ${3} Templates de promoção`)
    console.log(`- ${4} Registros financeiros`)
    
    console.log('\n🔑 Credenciais de acesso:')
    console.log('Email: demo@barbeariademo.com')
    console.log('Senha: 123456')
    console.log('\nEmail: admin@barbeariamoderna.com')
    console.log('Senha: 123456')

  } catch (error) {
    console.error('❌ Erro durante o seed:', error)
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro fatal:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
