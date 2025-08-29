// Correção direta: desativar automações de reativação
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔧 Desativando automações de reativação...')
    
    // Desativar todas as automações de reativação
    const result = await prisma.$executeRaw`
      UPDATE automation_settings 
      SET isEnabled = false 
      WHERE automationType = 'reactivation'
    `
    
    console.log(`✅ Desativadas ${result} automações de reativação`)
    
    // Verificar contagem atual por tenant
    const activeAutomations = await prisma.automationSetting.groupBy({
      by: ['establishmentId'],
      _count: {
        id: true
      },
      where: {
        isEnabled: true
      }
    })
    
    console.log('📊 Automações ativas por tenant após correção:')
    activeAutomations.forEach(tenant => {
      console.log(`Tenant ${tenant.establishmentId}: ${tenant._count.id} automações ativas`)
    })
    
    console.log('\n✅ Correção concluída! O card agora deve mostrar a contagem correta.')
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
