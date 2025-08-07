// Script para testar a API de relatórios diretamente
async function testReportAPI() {
  console.log('🧪 TESTANDO API DE RELATÓRIOS...\n')
  
  try {
    // Simular um token JWT básico (só para teste local)
    // Em produção isso vem do login real
    const testToken = 'test-token-for-local-development'
    
    const response = await fetch('http://localhost:3000/api/reports/financial?period=today', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('📡 Status da resposta:', response.status)
    console.log('📋 Headers:', Object.fromEntries(response.headers.entries()))
    
    const data = await response.text()
    console.log('📄 Resposta completa:', data)
    
    if (response.ok) {
      try {
        const jsonData = JSON.parse(data)
        console.log('\n✅ DADOS DO RELATÓRIO:')
        console.log('💰 Receita Total:', jsonData.summary?.totalRevenue || 'N/A')
        console.log('📊 Total de Agendamentos:', jsonData.summary?.totalAppointments || 'N/A')
        console.log('🎯 Ticket Médio:', jsonData.summary?.averageTicket || 'N/A')
        console.log('📈 Taxa de Conversão:', jsonData.summary?.conversionRate || 'N/A')
      } catch (parseError) {
        console.log('❌ Erro ao parsear JSON:', parseError.message)
      }
    } else {
      console.log('❌ Erro na API:', data)
    }
    
  } catch (error) {
    console.error('❌ ERRO:', error.message)
  }
}

testReportAPI()
