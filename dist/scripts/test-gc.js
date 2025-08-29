#!/usr/bin/env node

// Teste manual do coletor de lixo de instâncias WhatsApp
require('dotenv').config();

const { testCleanup } = require('./whatsapp-instance-gc.js');

console.log('🧪 TESTE MANUAL: Coletor de Lixo de Instâncias WhatsApp');
console.log('=' .repeat(60));

async function runTest() {
  try {
    console.log('⏰ Iniciando teste às:', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
    
    await testCleanup();
    
    console.log('⏰ Teste finalizado às:', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
    console.log('✅ Teste executado com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

runTest();
