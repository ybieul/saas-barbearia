// Teste de múltiplas portas para encontrar a Evolution API
async function testMultiplePorts() {
  const ports = [8080, 8081, 3001, 3002, 5000, 8000, 9000];
  const EVOLUTION_API_KEY = 'ef4d238b2ba14ed5853e41801d624727';
  
  for (const port of ports) {
    try {
      const EVOLUTION_API_URL = `http://localhost:${port}`;
      console.log(`\n🔍 Testando porta ${port}...`);
      
      const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        signal: AbortSignal.timeout(3000) // Timeout de 3 segundos
      });
      
      console.log(`✅ Porta ${port}: Status ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`🎉 EVOLUTION API ENCONTRADA NA PORTA ${port}!`);
        console.log('Dados:', JSON.stringify(data, null, 2));
        break;
      }
      
    } catch (error) {
      console.log(`❌ Porta ${port}: ${error.message}`);
    }
  }
}

testMultiplePorts();
