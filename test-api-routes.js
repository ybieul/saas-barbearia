// Teste direto das rotas API do Next.js
const TENANT_ID = 'clk0123456789';
const BASE_URL = 'http://localhost:3000';

async function testAPIRoutes() {
  try {
    console.log('🔍 Testando rotas API do WhatsApp...');
    
    // Simular chamada de status sem auth para ver erro
    const statusUrl = `${BASE_URL}/api/tenants/${TENANT_ID}/whatsapp/status`;
    console.log(`Testando: ${statusUrl}`);
    
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Sem authorization para ver que erro aparece
      },
    });
    
    console.log('Status Code:', response.status);
    console.log('Status OK:', response.ok);
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    // Se a resposta contém erro sobre Evolution API, isso indica que chegou até lá
    if (data.error && data.error.includes('Evolution API')) {
      console.log('✅ O Next.js consegue acessar a Evolution API');
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar API routes:', error);
  }
}

testAPIRoutes();
