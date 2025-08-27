// Teste da Evolution API

async function testEvolutionAPI() {
  try {
    console.log('🔍 Testando Evolution API...')
    
    let EVOLUTION_API_URL = 'http://evolution_api_evolution-api:8080'
    const EVOLUTION_API_KEY = 'ef4d238b2ba14ed5853e41801d624727'
    
    // Aplicar a mesma correção do script
    if (EVOLUTION_API_URL.includes('evolution_api_evolution-api')) {
      console.log('🔧 URL Docker detectada, tentando localhost...')
      EVOLUTION_API_URL = EVOLUTION_API_URL.replace('evolution_api_evolution-api', 'localhost')
      console.log(`🔄 Nova URL: ${EVOLUTION_API_URL}`)
    }
    
    console.log('URL:', EVOLUTION_API_URL)
    console.log('Key:', EVOLUTION_API_KEY ? 'Definida' : 'Não definida')
    
    // Testar se a API está viva
    const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
    })
    
    console.log('Status:', response.status)
    console.log('OK:', response.ok)
    
    if (response.ok) {
      const instances = await response.json()
      console.log('Instâncias:', JSON.stringify(instances, null, 2))
      
      // Testar instância específica
      const instanceName = 'tenant_omega7e890000o90jjkma8pnv'
      console.log(`\n🔍 Testando instância específica: ${instanceName}`)
      
      const instanceResponse = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
      })
      
      console.log('Status da instância:', instanceResponse.status)
      if (instanceResponse.ok) {
        const instanceData = await instanceResponse.json()
        console.log('Estado da conexão:', JSON.stringify(instanceData, null, 2))
      }
    } else {
      const error = await response.text()
      console.error('Erro:', error)
    }
    
  } catch (error) {
    console.error('Erro na requisição:', error)
  }
}

testEvolutionAPI()
