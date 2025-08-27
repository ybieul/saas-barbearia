// Script de teste para verificar se a API de WhatsApp logs está funcionando
const fetch = require('node-fetch');

const baseUrl = 'http://localhost:3000';

async function testWhatsAppAPI() {
  try {
    console.log('🧪 Testando API WhatsApp Logs...');
    
    // Simular um token de teste (você pode precisar de um token real)
    const response = await fetch(`${baseUrl}/api/whatsapp/logs?hours=24&limit=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Token de teste
      }
    });

    const data = await response.json();
    
    console.log('📊 Status da resposta:', response.status);
    console.log('📋 Dados retornados:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data) {
      console.log(`✅ API funcionando! Total de logs: ${data.data.stats.total}`);
      console.log(`📊 Breakdown: ${data.data.breakdown.whatsapp_logs} whatsapp_logs + ${data.data.breakdown.appointment_reminders} appointment_reminders`);
    } else {
      console.log('❌ API retornou erro:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar API:', error.message);
  }
}

testWhatsAppAPI();
