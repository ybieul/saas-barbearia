#!/usr/bin/env node

/**
 * Teste da API de disponibilidade
 * Simula o cenário real do agendamento público
 */

const BASE_URL = 'http://localhost:3000'

async function testAvailabilityAPI() {
  console.log('🧪 Testando API de disponibilidade...\n')

  try {
    // 1. Testar sem parâmetros (deve retornar erro 400)
    console.log('1️⃣ Teste sem parâmetros:')
    const response1 = await fetch(`${BASE_URL}/api/public/business/demo/availability`)
    console.log(`Status: ${response1.status}`)
    const data1 = await response1.json()
    console.log(`Resposta:`, data1)
    console.log('')

    // 2. Testar com parâmetros válidos
    console.log('2️⃣ Teste com parâmetros válidos:')
    const params = new URLSearchParams({
      date: '2025-07-30',
      serviceDuration: '30'
    })
    
    const response2 = await fetch(`${BASE_URL}/api/public/business/demo/availability?${params}`)
    console.log(`Status: ${response2.status}`)
    const data2 = await response2.json()
    console.log(`Resposta:`, data2)
    console.log('')

    // 3. Testar com slug inválido
    console.log('3️⃣ Teste com slug inválido:')
    const response3 = await fetch(`${BASE_URL}/api/public/business/inexistente/availability?${params}`)
    console.log(`Status: ${response3.status}`)
    const data3 = await response3.json()
    console.log(`Resposta:`, data3)
    console.log('')

    // 4. Testar com profissional específico
    console.log('4️⃣ Teste com profissional específico:')
    const paramsWithProfessional = new URLSearchParams({
      date: '2025-07-30',
      serviceDuration: '40',
      professionalId: 'prof-123'
    })
    
    const response4 = await fetch(`${BASE_URL}/api/public/business/demo/availability?${paramsWithProfessional}`)
    console.log(`Status: ${response4.status}`)
    const data4 = await response4.json()
    console.log(`Resposta:`, data4)
    console.log('')

    console.log('✅ Testes concluídos!')

  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
  }
}

// Executar teste
testAvailabilityAPI()
