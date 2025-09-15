// Script para testar o webhook da Kirvano com logs detalhados
const fetch = require('node-fetch');

async function testWebhook() {
  console.log("🧪 Testando webhook da Kirvano...\n");

  // Teste 1: Requisição com token correto
  console.log("=== TESTE 1: Token Correto ===");
  try {
    const response = await fetch('http://localhost:3000/api/webhooks/kirvano', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Kirvano-Token': 'seu-token-secreto-aqui', // Ajuste conforme seu .env
      },
      body: JSON.stringify({
        event: 'assinatura.ativa',
        data: {
          customer_id: 'test-123',
          customer_email: 'teste@exemplo.com',
          customer_name: 'Usuário Teste',
          subscription_id: 'sub-123',
          plan_name: 'basico',
          expires_at: '2025-12-31T23:59:59Z'
        }
      })
    });

    console.log(`Status: ${response.status}`);
    const result = await response.text();
    console.log(`Resposta: ${result}\n`);
  } catch (error) {
    console.error('Erro no teste 1:', error.message);
  }

  // Teste 2: Requisição com token incorreto (para testar logs de debug)
  console.log("=== TESTE 2: Token Incorreto ===");
  try {
    const response = await fetch('http://localhost:3000/api/webhooks/kirvano', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Kirvano-Token': 'token-incorreto',
      },
      body: JSON.stringify({
        event: 'assinatura.ativa',
        data: {
          customer_id: 'test-456',
          customer_email: 'teste2@exemplo.com'
        }
      })
    });

    console.log(`Status: ${response.status}`);
    const result = await response.text();
    console.log(`Resposta: ${result}\n`);
  } catch (error) {
    console.error('Erro no teste 2:', error.message);
  }

  // Teste 3: Verificar endpoint GET
  console.log("=== TESTE 3: Endpoint GET (Status) ===");
  try {
    const response = await fetch('http://localhost:3000/api/webhooks/kirvano', {
      method: 'GET'
    });

    console.log(`Status: ${response.status}`);
    const result = await response.text();
    console.log(`Resposta: ${result}\n`);
  } catch (error) {
    console.error('Erro no teste 3:', error.message);
  }

  // Teste 4: Token com diferentes header names
  console.log("=== TESTE 4: Diferentes Header Names ===");
  const headerVariations = [
    'kirvano-token',
    'Kirvano-Token', 
    'X-Kirvano-Token',
    'x-kirvano-token'
  ];

  for (const headerName of headerVariations) {
    console.log(`Testando header: ${headerName}`);
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      headers[headerName] = 'seu-token-secreto-aqui';

      const response = await fetch('http://localhost:3000/api/webhooks/kirvano', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event: 'assinatura.ativa',
          data: {
            customer_id: 'test-header-' + Math.random().toString(36).substr(2, 9),
            customer_email: 'teste-header@exemplo.com'
          }
        })
      });

      console.log(`  Status: ${response.status}`);
      if (response.status !== 401) {
        console.log(`  ✅ Funcionou com header: ${headerName}`);
      }
    } catch (error) {
      console.error(`  Erro com header ${headerName}:`, error.message);
    }
  }
}

testWebhook().catch(console.error);
