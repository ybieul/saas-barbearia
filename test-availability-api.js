// Teste da API de disponibilidade de horários
// Para testar: node test-availability-api.js

const baseUrl = 'http://localhost:3000' // ou a URL do seu servidor

async function testAvailabilityAPI() {
  try {
    // Teste 1: Buscar disponibilidade sem profissional específico
    console.log('🧪 Teste 1: Disponibilidade geral para hoje')
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const response1 = await fetch(
      `${baseUrl}/api/public/business/demo/availability?date=${today}`
    )
    
    if (response1.ok) {
      const data1 = await response1.json()
      console.log('✅ Sucesso:', data1)
      console.log(`📊 Total de horários ocupados: ${data1.occupiedSlots.length}`)
    } else {
      console.log('❌ Erro:', response1.status, await response1.text())
    }

    // Teste 2: Buscar disponibilidade para um profissional específico
    console.log('\n🧪 Teste 2: Disponibilidade para profissional específico')
    const response2 = await fetch(
      `${baseUrl}/api/public/business/demo/availability?date=${today}&professionalId=prof-123`
    )
    
    if (response2.ok) {
      const data2 = await response2.json()
      console.log('✅ Sucesso:', data2)
    } else {
      console.log('❌ Erro:', response2.status, await response2.text())
    }

    // Teste 3: Teste com data inválida
    console.log('\n🧪 Teste 3: Data inválida')
    const response3 = await fetch(
      `${baseUrl}/api/public/business/demo/availability`
    )
    
    if (!response3.ok) {
      console.log('✅ Erro esperado:', response3.status, await response3.text())
    } else {
      console.log('❌ Deveria ter falhado:', await response3.json())
    }

  } catch (error) {
    console.error('❌ Erro na execução:', error)
  }
}

testAvailabilityAPI()
