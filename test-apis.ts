/**
 * 🧪 Script de Teste - APIs Públicas de Agendamento
 * 
 * Este script testa todas as APIs públicas para garantir que estão funcionando
 * corretamente em produção com dados reais.
 */

// Função para testar uma API
async function testAPI(url: string, description: string) {
  try {
    console.log(`🔍 Testando: ${description}`)
    console.log(`📡 URL: ${url}`)
    
    const response = await fetch(url)
    const status = response.status
    
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Status: ${status}`)
      console.log(`📊 Dados:`, JSON.stringify(data, null, 2))
      return { success: true, status, data }
    } else {
      const error = await response.text()
      console.log(`❌ Status: ${status}`)
      console.log(`🚨 Erro:`, error)
      return { success: false, status, error }
    }
  } catch (error) {
    console.log(`💥 Erro de rede:`, error)
    return { success: false, error }
  }
}

// URLs de teste (substitua 'YOUR_TENANT_SLUG' pelo slug real do tenant)
const TENANT_SLUG = 'YOUR_TENANT_SLUG' // Substituir por slug real
const BASE_URL = 'http://localhost:3000'

async function runTests() {
  console.log('🚀 Iniciando testes das APIs públicas...\n')
  
  const tests = [
    {
      url: `${BASE_URL}/api/public/business/${TENANT_SLUG}`,
      description: 'Buscar dados do negócio'
    },
    {
      url: `${BASE_URL}/api/public/business/${TENANT_SLUG}/services`,
      description: 'Buscar serviços'
    },
    {
      url: `${BASE_URL}/api/public/business/${TENANT_SLUG}/professionals`,
      description: 'Buscar profissionais'
    },
    {
      url: `${BASE_URL}/api/public/business/${TENANT_SLUG}/working-hours`,
      description: 'Buscar horários de funcionamento'
    },
    {
      url: `${BASE_URL}/api/public/business/${TENANT_SLUG}/availability?date=2025-07-30&serviceDuration=30`,
      description: 'Verificar disponibilidade (sem profissional específico)'
    },
    {
      url: `${BASE_URL}/api/public/clients/search?phone=11999999999&businessSlug=${TENANT_SLUG}`,
      description: 'Buscar cliente por telefone'
    }
  ]

  const results = []
  
  for (const test of tests) {
    const result = await testAPI(test.url, test.description)
    results.push({ ...test, result })
    console.log('\n' + '='.repeat(80) + '\n')
  }

  // Resumo dos testes
  const successCount = results.filter(r => r.result.success).length
  const totalCount = results.length
  
  console.log('📋 RESUMO DOS TESTES:')
  console.log(`✅ Sucessos: ${successCount}/${totalCount}`)
  console.log(`❌ Falhas: ${totalCount - successCount}/${totalCount}`)
  
  if (successCount === totalCount) {
    console.log('\n🎉 Todos os testes passaram! APIs funcionando corretamente.')
  } else {
    console.log('\n⚠️ Alguns testes falharam. Verifique os logs acima.')
  }
}

// Executar os testes
runTests().catch(console.error)

export { testAPI, runTests }
