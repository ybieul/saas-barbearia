// Script de teste para a API do Portal do Cliente Kirvano
const fetch = require('node-fetch')

// Configurações de teste
const API_BASE = 'http://localhost:3000'
const FAKE_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJ0ZW5hbnRJZCI6InRlc3QtdGVuYW50LWlkIiwiZW1haWwiOiJ0ZXN0ZUBleGVtcGxvLmNvbSIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTYzMDAwMDAwMCwiZXhwIjoxOTMwMDAwMDAwfQ.fake_signature_here'

async function testManagePortalAPI() {
  console.log('🧪 Testando API do Portal do Cliente Kirvano...\n')

  // Teste 1: GET - Status da API
  console.log('=== TESTE 1: GET - Status da API ===')
  try {
    const response = await fetch(`${API_BASE}/api/subscriptions/manage-portal`, {
      method: 'GET'
    })
    
    console.log(`Status: ${response.status}`)
    const result = await response.json()
    console.log(`Resposta:`, JSON.stringify(result, null, 2))
    console.log('')
  } catch (error) {
    console.error('Erro no teste 1:', error.message)
  }

  // Teste 2: POST - Sem token (deve retornar 401)
  console.log('=== TESTE 2: POST - Sem Token (401) ===')
  try {
    const response = await fetch(`${API_BASE}/api/subscriptions/manage-portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`Status: ${response.status}`)
    const result = await response.json()
    console.log(`Resposta:`, JSON.stringify(result, null, 2))
    console.log('')
  } catch (error) {
    console.error('Erro no teste 2:', error.message)
  }

  // Teste 3: POST - Com token inválido (deve retornar 401)
  console.log('=== TESTE 3: POST - Token Inválido (401) ===')
  try {
    const response = await fetch(`${API_BASE}/api/subscriptions/manage-portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token_invalido_aqui'
      }
    })
    
    console.log(`Status: ${response.status}`)
    const result = await response.json()
    console.log(`Resposta:`, JSON.stringify(result, null, 2))
    console.log('')
  } catch (error) {
    console.error('Erro no teste 3:', error.message)
  }

  // Teste 4: POST - Com token válido mas sem KIRVANO_API_SECRET
  console.log('=== TESTE 4: POST - Token Válido (Configuração) ===')
  try {
    const response = await fetch(`${API_BASE}/api/subscriptions/manage-portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FAKE_JWT_TOKEN}`
      }
    })
    
    console.log(`Status: ${response.status}`)
    const result = await response.json()
    console.log(`Resposta:`, JSON.stringify(result, null, 2))
    console.log('')
  } catch (error) {
    console.error('Erro no teste 4:', error.message)
  }

  console.log('✅ Testes concluídos!')
  console.log('')
  console.log('📋 Próximos passos para produção:')
  console.log('1. Configure KIRVANO_API_SECRET no .env')
  console.log('2. Configure KIRVANO_API_URL se necessário')
  console.log('3. Teste com um tenant real que tenha kirvanoCustomerId')
  console.log('4. Verifique se a API da Kirvano está acessível')
}

// Executar testes
if (require.main === module) {
  testManagePortalAPI().catch(console.error)
}

module.exports = { testManagePortalAPI }
