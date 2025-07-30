#!/usr/bin/env node

/**
 * 🧪 Script de Teste Node.js - APIs Públicas
 * 
 * Execute com: node test-apis-node.js [tenant-slug]
 */

const https = require('https');
const http = require('http');

// Função para fazer requisição HTTP/HTTPS
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            success: res.statusCode >= 200 && res.statusCode < 300,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            success: false,
            error: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.abort();
      reject(new Error('Request timeout'));
    });
  });
}

// Função para testar uma API
async function testAPI(url, description) {
  try {
    console.log(`🔍 Testando: ${description}`);
    console.log(`📡 URL: ${url}`);
    
    const result = await makeRequest(url);
    
    if (result.success) {
      console.log(`✅ Status: ${result.status}`);
      console.log(`📊 Dados:`, JSON.stringify(result.data, null, 2));
      return { success: true, status: result.status, data: result.data };
    } else {
      console.log(`❌ Status: ${result.status}`);
      console.log(`🚨 Erro:`, result.error);
      return { success: false, status: result.status, error: result.error };
    }
  } catch (error) {
    console.log(`💥 Erro de rede:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  const tenantSlug = process.argv[2];
  const serverUrl = process.argv[3] || 'http://localhost:3001';
  
  if (!tenantSlug) {
    console.log('❌ Uso: node test-apis-node.js [tenant-slug] [server-url]');
    console.log('📝 Exemplos:');
    console.log('   Local:     node test-apis-node.js meu-negocio');
    console.log('   Produção:  node test-apis-node.js meu-negocio https://seu-dominio.com');
    process.exit(1);
  }
  
  console.log('🚀 Iniciando testes das APIs públicas...\n');
  console.log(`🏪 Tenant: ${tenantSlug}`);
  console.log(`🌐 Servidor: ${serverUrl}\n`);
  
  const BASE_URL = serverUrl;
  
  const tests = [
    {
      url: `${BASE_URL}/api/public/business/${tenantSlug}`,
      description: 'Buscar dados do negócio'
    },
    {
      url: `${BASE_URL}/api/public/business/${tenantSlug}/services`,
      description: 'Buscar serviços'
    },
    {
      url: `${BASE_URL}/api/public/business/${tenantSlug}/professionals`,
      description: 'Buscar profissionais'
    },
    {
      url: `${BASE_URL}/api/public/business/${tenantSlug}/working-hours`,
      description: 'Buscar horários de funcionamento'
    },
    {
      url: `${BASE_URL}/api/public/business/${tenantSlug}/availability?date=2025-07-30&serviceDuration=30`,
      description: 'Verificar disponibilidade (30 min)'
    },
    {
      url: `${BASE_URL}/api/public/clients/search?phone=11999999999&businessSlug=${tenantSlug}`,
      description: 'Buscar cliente por telefone'
    }
  ];

  const results = [];
  
  for (const test of tests) {
    const result = await testAPI(test.url, test.description);
    results.push({ ...test, result });
    console.log('\n' + '='.repeat(80) + '\n');
  }

  // Resumo dos testes
  const successCount = results.filter(r => r.result.success).length;
  const totalCount = results.length;
  
  console.log('📋 RESUMO DOS TESTES:');
  console.log(`✅ Sucessos: ${successCount}/${totalCount}`);
  console.log(`❌ Falhas: ${totalCount - successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log('\n🎉 Todos os testes passaram! APIs funcionando corretamente.');
  } else {
    console.log('\n⚠️ Alguns testes falharam. Verifique os logs acima.');
    
    // Mostrar apenas as falhas
    console.log('\n🔍 DETALHES DAS FALHAS:');
    results.filter(r => !r.result.success).forEach(test => {
      console.log(`❌ ${test.description}: Status ${test.result.status || 'Network Error'}`);
    });
  }
}

// Executar os testes
runTests().catch(console.error);
