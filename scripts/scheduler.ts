import cron from 'node-cron';
import { sendWhatsappReminders } from './whatsapp-reminders-cron';

console.log('✅ Agendador (Scheduler) de tarefas foi iniciado com sucesso.');
console.log('Aguardando o próximo intervalo de 5 minutos para executar a tarefa de lembretes...');

// Agenda a tarefa para ser executada a cada 5 minutos
cron.schedule('*/5 * * * *', async () => {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  console.log(`\n[${now}] === INICIANDO TAREFA AGENDADA: Verificação de Lembretes ===`);

  try {
    await sendWhatsappReminders(); 
    console.log(`[${now}] === TAREFA AGENDADA CONCLUÍDA COM SUCESSO ===`);
  } catch (error) {
    console.error(`[${now}] === ERRO NA EXECUÇÃO DA TAREFA AGENDADA ===`);
    console.error(error);
  }
});
