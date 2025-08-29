// Script para diagnosticar e corrigir contagem de automações ativas
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixAutomationCount() {
  try {
    console.log('🔍 Diagnosticando automações ativas...')
    
    // Buscar todos os tenants e suas automações
    const allAutomations = await prisma.$queryRaw`
      SELECT etablishmentId, automationType, isEnabled 
      FROM automation_settings 
      WHERE isEnabled = 1
    `
    
    console.log('📊 Automações ativas encontradas:')
    console.table(allAutomations)
    
    // Contar por tenant
    const countByTenant = {}
    allAutomations.forEach(automation => {
      const tenantId = automation.etablishmentId || automation.establishmentId
      if (!countByTenant[tenantId]) {
        countByTenant[tenantId] = { total: 0, types: [] }
      }
      countByTenant[tenantId].total++
      countByTenant[tenantId].types.push(automation.automationType)
    })
    
    console.log('\n📈 Contagem por tenant:')
    for (const [tenantId, data] of Object.entries(countByTenant)) {
      console.log(`Tenant ${tenantId}: ${data.total} automações ativas`)
      console.log(`  - Tipos: ${data.types.join(', ')}`)
      
      if (data.types.includes('reactivation')) {
        console.log(`  ⚠️ PROBLEMA: Inclui 'reactivation' que foi removida do frontend!`)
      }
    }
    
    // Opção para desativar automações de reativação
    console.log('\n🔧 Para corrigir, descomente as linhas abaixo:')
    console.log('// const result = await prisma.$executeRaw`')
    console.log('//   UPDATE automation_settings SET isEnabled = 0')  
    console.log('//   WHERE automationType = "reactivation"')
    console.log('// `')
    console.log('// console.log(`✅ Desativadas ${result} automações de reativação`)')
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixAutomationCount()
