// Teste direto da API de timezone
const testTimezone = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/test-timezone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        testDatetime: '2025-08-18 12:00:00'
      })
    })
    
    const result = await response.json()
    console.log('Resultado do teste:', result)
  } catch (error) {
    console.error('Erro:', error)
  }
}

testTimezone()
