import cron from 'node-cron';
import { sendWhatsappReminders } from './whatsapp-reminders-cron';

console.log('✅ Agendador (Scheduler) de tarefas foi iniciado com sucesso.');
console.log('🕐 Executando a cada 5 minutos para verificação de lembretes...');
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

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Recebido sinal de interrupção. Encerrando agendador...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Recebido sinal de terminação. Encerrando agendador...');
  process.exit(0);
});
