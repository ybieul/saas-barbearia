#!/usr/bin/env node

/**
 * Script de teste manual para o Sistema Híbrido de Limpeza de Instâncias WhatsApp
 * 
 * Este script permite testar o coletor de lixo de forma independente
 * sem esperar o scheduler automático.
 * 
 * Uso: node scripts/test-whatsapp-gc.js
 */

import { testGarbageCollector } from './whatsapp-instance-gc';

async function main() {
  console.log('🧪 ===== TESTE MANUAL DO COLETOR DE LIXO WHATSAPP =====');
  console.log('📅 Iniciado em:', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
  console.log('');

  try {
    // Verificar variáveis de ambiente
    if (!process.env.EVOLUTION_API_URL) {
      console.error('❌ EVOLUTION_API_URL não configurada no .env');
      process.exit(1);
    }

    if (!process.env.EVOLUTION_API_KEY) {
      console.error('❌ EVOLUTION_API_KEY não configurada no .env');
      process.exit(1);
    }

    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL não configurada no .env');
      process.exit(1);
    }

    console.log('✅ Variáveis de ambiente verificadas');
    console.log('🔗 Evolution API URL:', process.env.EVOLUTION_API_URL);
    console.log('');

    // Executar teste
    await testGarbageCollector();

  } catch (error: any) {
    console.error('💥 Erro durante teste:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }

  console.log('');
  console.log('✅ ===== TESTE CONCLUÍDO =====');
  console.log('📅 Finalizado em:', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
}

// Executar apenas se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
