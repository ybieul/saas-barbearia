import cron from 'node-cron';
import { sendWhatsappReminders } from './whatsapp-reminders-cron';
import { cleanupOrphanedInstances } from './whatsapp-instance-gc';
import { runPreExpireCron } from './subscription-preexpire-cron';
import { runExpireCron } from './subscription-expirer-cron';

console.log('✅ Agendador (Scheduler) de tarefas foi iniciado com sucesso.');
console.log('🕐 Executando a cada 5 minutos para verificação de lembretes...');
console.log('🧹 Executando às 03:00 diariamente para limpeza de instâncias órfãs...');
console.log('⏰ Executando pré-expiração às 00:05 (emails 3d / 1d).');
console.log('⏰ Executando expiração (grace) às 00:10.');
console.log('🌍 Timezone: America/Sao_Paulo');

// Validar se a expressão cron está correta
if (!cron.validate('*/5 * * * *')) {
  console.error('❌ Expressão cron inválida!');
  process.exit(1);
}

// Agenda a tarefa para ser executada a cada 5 minutos
cron.schedule('*/5 * * * *', async () => {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  console.log(`\n[${now}] === 🚀 INICIANDO TAREFA AGENDADA: Verificação de Lembretes ===`);

  try {
    await sendWhatsappReminders(); 
    console.log(`[${now}] === ✅ TAREFA AGENDADA CONCLUÍDA COM SUCESSO ===\n`);
  } catch (error) {
    console.error(`[${now}] === ❌ ERRO NA EXECUÇÃO DA TAREFA AGENDADA ===`);
    console.error('Stack trace:', error);
    console.log(`[${now}] === 🔄 CONTINUANDO AGENDAMENTO (próxima execução em 5 minutos) ===\n`);
  }
}, {
  timezone: 'America/Sao_Paulo'
});

// NOVA TAREFA DIÁRIA: Limpeza de Instâncias Órfãs (às 3h da manhã)
cron.schedule('0 3 * * *', async () => {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  console.log(`\n[${now}] === 🧹 INICIANDO TAREFA DIÁRIA: Limpeza de Instâncias Órfãs ===`);
  
  try {
    await cleanupOrphanedInstances();
    console.log(`[${now}] === ✅ TAREFA DE LIMPEZA DIÁRIA CONCLUÍDA COM SUCESSO ===\n`);
  } catch (error) {
    console.error(`[${now}] === ❌ ERRO NA TAREFA DE LIMPEZA DIÁRIA ===`);
    console.error('Stack trace:', error);
    console.log(`[${now}] === 🔄 CONTINUANDO AGENDAMENTO (próxima execução amanhã às 03:00) ===\n`);
  }
}, {
  timezone: 'America/Sao_Paulo'
});

// PRÉ-EXPIRAÇÃO (00:05 BR)
cron.schedule('5 0 * * *', async () => {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  console.log(`\n[${now}] === 🔔 INICIANDO PRÉ-EXPIRAÇÃO (3d/1d) ===`);
  try {
    await runPreExpireCron();
    console.log(`[${now}] === ✅ PRÉ-EXPIRAÇÃO CONCLUÍDA ===\n`);
  } catch (e) {
    console.error(`[${now}] === ❌ ERRO NA PRÉ-EXPIRAÇÃO ===`, e);
  }
}, { timezone: 'America/Sao_Paulo' });

// EXPIRAÇÃO (GRACE CHECK) (00:10 BR)
cron.schedule('10 0 * * *', async () => {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  console.log(`\n[${now}] === ⏱️ INICIANDO EXPIRAÇÃO (GRACE) ===`);
  try {
    await runExpireCron();
    console.log(`[${now}] === ✅ EXPIRAÇÃO CONCLUÍDA ===\n`);
  } catch (e) {
    console.error(`[${now}] === ❌ ERRO NA EXPIRAÇÃO ===`, e);
  }
}, { timezone: 'America/Sao_Paulo' });

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Recebido sinal de interrupção. Encerrando agendador...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Recebido sinal de terminação. Encerrando agendador...');
  process.exit(0);
});
