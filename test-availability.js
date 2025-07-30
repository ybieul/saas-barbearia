#!/usr/bin/env node

/**
 * 🧪 TESTE ESPECÍFICO - API de Disponibilidade
 * 
 * Testa especificamente a API de disponibilidade com diferentes cenários
 * 
 * Execute: node test-availability.js [tenant-slug] [server-url]
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
      reject(new Error('Timeout'));
    });
  });
}

async function testAvailability() {
  const tenantId = process.argv[2];
  const serverUrl = process.argv[3] || 'http://localhost:3001';
  
  if (!tenantId) {
    console.log('❌ USO: node test-availability.js [tenant-slug] [server-url]');
    console.log('📝 Exemplo: node test-availability.js meu-negocio https://meudominio.com');
    process.exit(1);
  }
  
  console.log('🧪 TESTE ESPECÍFICO - API de Disponibilidade');
  console.log('=' .repeat(60));
  console.log(`🏪 Tenant: ${tenantId}`);
  console.log(`🌐 Servidor: ${serverUrl}`);
  console.log('=' .repeat(60));
  
  // Obter data de hoje e amanhã
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  const tests = [
    {
      name: '🔍 1. Disponibilidade Hoje (sem profissional)',
      url: `${serverUrl}/api/public/business/${tenantId}/availability?date=${todayStr}&serviceDuration=30`
    },
    {
      name: '🔍 2. Disponibilidade Amanhã (sem profissional)',
      url: `${serverUrl}/api/public/business/${tenantId}/availability?date=${tomorrowStr}&serviceDuration=30`
    },
    {
      name: '🔍 3. Serviço Rápido (15 min)',
      url: `${serverUrl}/api/public/business/${tenantId}/availability?date=${tomorrowStr}&serviceDuration=15`
    },
    {
      name: '🔍 4. Serviço Longo (60 min)',
      url: `${serverUrl}/api/public/business/${tenantId}/availability?date=${tomorrowStr}&serviceDuration=60`
    }
  ];

  console.log(`📅 Testando com datas: Hoje (${todayStr}) e Amanhã (${tomorrowStr})\n`);

  for (const test of tests) {
    console.log(`${test.name}`);
    console.log(`🔗 ${test.url}`);
    
    try {
      const result = await makeRequest(test.url);
      
      if (result.success) {
        console.log(`✅ Status: ${result.status} - OK`);
        
        const data = result.data;
        
        if (data.message && data.message.includes('fechado')) {
          console.log(`🏢 ${data.message}`);
        } else if (data.horarios) {
          const totalSlots = data.horarios.length;
          const availableSlots = data.horarios.filter(h => !h.ocupado).length;
          const occupiedSlots = data.horarios.filter(h => h.ocupado).length;
          
          console.log(`📊 Resultados:`);
          if (data.workingHours) {
            console.log(`   🕐 Horário funcionamento: ${data.workingHours.start} - ${data.workingHours.end}`);
          }
          console.log(`   📈 Total de horários: ${totalSlots}`);
          console.log(`   ✅ Disponíveis: ${availableSlots}`);
          console.log(`   🚫 Ocupados: ${occupiedSlots}`);
          console.log(`   📋 Total agendamentos: ${data.totalAppointments || 0}`);
          
          if (occupiedSlots > 0) {
            const occupiedTimes = data.horarios.filter(h => h.ocupado).map(h => h.hora).slice(0, 5);
            console.log(`   🕰️ Primeiros ocupados: ${occupiedTimes.join(', ')}${occupiedSlots > 5 ? '...' : ''}`);
          }
          
          if (availableSlots > 0) {
            const availableTimes = data.horarios.filter(h => !h.ocupado).map(h => h.hora).slice(0, 5);
            console.log(`   🆓 Primeiros disponíveis: ${availableTimes.join(', ')}${availableSlots > 5 ? '...' : ''}`);
          }
        }
        
      } else {
        console.log(`❌ Status: ${result.status} - FALHA`);
        if (result.error) {
          const errorText = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
          console.log(`🚨 Erro: ${errorText.substring(0, 200)}...`);
        }
      }
      
    } catch (error) {
      console.log(`💥 Erro de conexão: ${error.message}`);
    }
    
    console.log('\n' + '-'.repeat(60) + '\n');
  }
  
  console.log('🎯 TESTE CONCLUÍDO!');
  console.log('');
  console.log('📝 Se tudo funcionou:');
  console.log('1. ✅ API retorna horários estruturados');
  console.log('2. ✅ Horários ocupados são identificados');
  console.log('3. ✅ Duração do serviço é considerada');
  console.log('4. ✅ Horários de funcionamento são respeitados');
  console.log('');
  console.log('🌐 Próximo: Testar interface web');
  console.log(`   ${serverUrl}/agendamento/${tenantId}`);
}

testAvailability().catch(console.error);
