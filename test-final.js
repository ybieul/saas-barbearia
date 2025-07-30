#!/usr/bin/env node

/**
 * 🚀 TESTE FINAL - Sistema de Agendamento
 * 
 * Para testar no seu servidor VPS:
 * node test-final.js SEU-TENANT-ID-OU-EMAIL https://seu-dominio.com
 * 
 * Para testar local (sem dados):
 * node test-final.js teste-local
 */

const https = require('https');
const http = require('http');

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
    
    req.setTimeout(15000, () => {
      req.abort();
      reject(new Error('Timeout - verifique se o servidor está rodando'));
    });
  });
}

async function testSystem() {
  const tenantId = process.argv[2];
  const serverUrl = process.argv[3] || 'http://localhost:3001';
  
  if (!tenantId) {
    console.log('❌ USO:');
    console.log('   Local:     node test-final.js teste-local');
    console.log('   Produção:  node test-final.js SEU-TENANT-ID https://seu-dominio.com');
    console.log('');
    console.log('💡 DICAS:');
    console.log('   - Use ID do tenant, email ou slug do negócio');
    console.log('   - Para produção, sempre inclua https://');
    process.exit(1);
  }
  
  console.log('🎯 TESTE FINAL - Sistema de Agendamento');
  console.log('=' .repeat(50));
  console.log(`🏪 Tenant: ${tenantId}`);
  console.log(`🌐 Servidor: ${serverUrl}`);
  console.log('=' .repeat(50));
  
  const tests = [
    {
      name: '📋 1. Dados do Negócio',
      url: `${serverUrl}/api/public/business/${tenantId}`,
      critical: true
    },
    {
      name: '⚙️ 2. Serviços Disponíveis', 
      url: `${serverUrl}/api/public/business/${tenantId}/services`,
      critical: true
    },
    {
      name: '👨‍💼 3. Profissionais',
      url: `${serverUrl}/api/public/business/${tenantId}/professionals`,
      critical: true
    },
    {
      name: '🕐 4. Horários de Funcionamento',
      url: `${serverUrl}/api/public/business/${tenantId}/working-hours`,
      critical: true
    },
    {
      name: '📅 5. Disponibilidade (Hoje)',
      url: `${serverUrl}/api/public/business/${tenantId}/availability?date=2025-07-30&serviceDuration=30`,
      critical: true
    },
    {
      name: '🔍 6. Busca de Cliente',
      url: `${serverUrl}/api/public/clients/search?phone=11999999999&businessSlug=${tenantId}`,
      critical: false
    }
  ];

  let criticalErrors = 0;
  let totalTests = 0;
  let passedTests = 0;
  
  for (const test of tests) {
    totalTests++;
    console.log(`\n${test.name}`);
    console.log(`🔗 ${test.url}`);
    
    try {
      const result = await makeRequest(test.url);
      
      if (result.success) {
        console.log(`✅ Status: ${result.status} - OK`);
        
        if (result.data && typeof result.data === 'object') {
          if (Array.isArray(result.data)) {
            console.log(`📊 Retornou: ${result.data.length} item(s)`);
          } else {
            console.log(`📊 Dados: ${Object.keys(result.data).join(', ')}`);
          }
        }
        
        passedTests++;
      } else {
        console.log(`❌ Status: ${result.status} - FALHA`);
        if (result.error) {
          console.log(`🚨 Erro: ${result.error.substring(0, 200)}...`);
        }
        
        if (test.critical) {
          criticalErrors++;
        }
      }
      
    } catch (error) {
      console.log(`💥 Erro de conexão: ${error.message}`);
      if (test.critical) {
        criticalErrors++;
      }
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 RESULTADO FINAL');
  console.log('=' .repeat(50));
  console.log(`✅ Testes passaram: ${passedTests}/${totalTests}`);
  console.log(`❌ Erros críticos: ${criticalErrors}`);
  
  if (criticalErrors === 0 && passedTests >= 4) {
    console.log('\n🎉 SISTEMA FUNCIONANDO!');
    console.log('✅ APIs críticas respondendo corretamente');
    console.log('✅ Pronto para agendamentos');
    console.log(`\n🌐 Acesse: ${serverUrl}/agendamento/${tenantId}`);
  } else if (criticalErrors > 0) {
    console.log('\n⚠️ PROBLEMAS CRÍTICOS ENCONTRADOS');
    console.log('❌ Verifique se:');
    console.log('  - Servidor está rodando');
    console.log('  - Banco de dados conectado');
    console.log('  - Tenant ID está correto');
    console.log('  - Tenant está ativo');
  } else {
    console.log('\n⚠️ SISTEMA PARCIALMENTE FUNCIONAL');
    console.log('✅ APIs básicas funcionando');
    console.log('⚠️ Algumas funcionalidades podem ter problemas');
  }
  
  console.log('\n📝 Próximos passos:');
  console.log('1. Testar interface web de agendamento');
  console.log('2. Verificar se horários ocupados aparecem');
  console.log('3. Realizar agendamento completo');
  console.log('4. Confirmar formatação de preços em R$');
}

testSystem().catch(console.error);
