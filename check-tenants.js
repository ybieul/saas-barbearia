const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Verificando tenants no banco...\n')
    
    const tenants = await prisma.business.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    if (tenants.length === 0) {
      console.log('❌ Nenhum tenant encontrado no banco de dados.')
      console.log('💡 Execute o seed para criar dados de teste: npm run db:seed')
    } else {
      console.log(`✅ Encontrados ${tenants.length} tenant(s):\n`)
      
      tenants.forEach((tenant, index) => {
        console.log(`${index + 1}. ${tenant.name}`)
        console.log(`   📧 Email: ${tenant.email}`)
        console.log(`   📱 Telefone: ${tenant.phone}`)
        console.log(`   🔗 Slug: ${tenant.slug}`)
        console.log(`   📅 Criado: ${tenant.createdAt.toLocaleDateString('pt-BR')}`)
        console.log('')
      })
      
      console.log('💡 Use um dos slugs acima para testar as APIs.')
      console.log('📝 Exemplo: node test-apis-node.js ' + tenants[0].slug)
    }
    
  } catch (error) {
    console.error('❌ Erro ao consultar banco:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
