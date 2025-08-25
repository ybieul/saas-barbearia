const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkAutomationSettings() {
  console.log('🔍 Verificando configurações de automação...')
  
  try {
    const tenants = await prisma.tenant.findMany({
      select: { id: true, businessName: true }
    })
    
    console.log('📋 Tenants encontrados:', tenants.length)
    
    for (const tenant of tenants) {
      console.log(`\n🏢 Tenant: ${tenant.businessName} (${tenant.id})`)
      
      const settings = await prisma.$queryRaw`
        SELECT automationType, isEnabled 
        FROM automation_settings 
        WHERE establishmentId = ${tenant.id}
      `
      
      if (settings.length === 0) {
        console.log('❌ Nenhuma configuração de automação encontrada!')
      } else {
        console.log('📋 Configurações encontradas:', settings)
      }
    }
    
    const reminders = await prisma.$queryRaw`
      SELECT * FROM appointment_reminders 
      ORDER BY sentAt DESC 
      LIMIT 5
    `
    
    console.log(`\n📬 Lembretes enviados: ${reminders.length}`)
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAutomationSettings()
