/**
 * 🔍 Script para verificar dados de teste no banco
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkTestData() {
  console.log('🔍 Verificando dados de teste no banco...\n')

  try {
    // Verificar estabelecimentos
    const businesses = await prisma.business.findMany({
      include: {
        professionals: true,
        services: true
      }
    })

    console.log(`📊 Estabelecimentos: ${businesses.length}`)
    
    if (businesses.length > 0) {
      const business = businesses[0]
      console.log(`🏪 Primeiro estabelecimento: ${business.businessName}`)
      console.log(`🔗 Slug: ${business.slug}`)
      console.log(`👥 Profissionais: ${business.professionals.length}`)
      console.log(`✂️ Serviços: ${business.services.length}`)
      
      console.log('\n🔗 URL de teste para página pública:')
      console.log(`http://localhost:3000/agendamento/${business.slug}`)
      
      // Verificar profissionais com horários específicos
      if (business.professionals.length > 0) {
        console.log('\n👨‍💼 Profissionais:')
        for (const prof of business.professionals) {
          console.log(`  - ${prof.name}`)
          if (prof.workingDays) {
            console.log(`    📅 Dias de trabalho: ${prof.workingDays}`)
          }
          if (prof.workingHours) {
            console.log(`    ⏰ Horários específicos: ${prof.workingHours.substring(0, 100)}...`)
          }
        }
      }
    } else {
      console.log('❌ Nenhum estabelecimento encontrado!')
      console.log('💡 Execute o seed para criar dados de teste: npx prisma db seed')
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTestData()
