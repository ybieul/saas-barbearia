"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const whatsapp_reminders_cron_1 = require("./whatsapp-reminders-cron");
const whatsapp_instance_gc_1 = require("./whatsapp-instance-gc");
console.log('✅ Agendador (Scheduler) de tarefas foi iniciado com sucesso.');
console.log('🕐 Executando a cada 5 minutos para verificação de lembretes...');
console.log('🧹 Executando às 03:00 diariamente para limpeza de instâncias órfãs...');
console.log('🌍 Timezone: America/Sao_Paulo');
// Validar se a expressão cron está correta
if (!node_cron_1.default.validate('*/5 * * * *')) {
    console.error('❌ Expressão cron inválida!');
    process.exit(1);
}
// Agenda a tarefa para ser executada a cada 5 minutos
node_cron_1.default.schedule('*/5 * * * *', async () => {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    console.log(`\n[${now}] === 🚀 INICIANDO TAREFA AGENDADA: Verificação de Lembretes ===`);
    try {
        await (0, whatsapp_reminders_cron_1.sendWhatsappReminders)();
        console.log(`[${now}] === ✅ TAREFA AGENDADA CONCLUÍDA COM SUCESSO ===\n`);
    }
    catch (error) {
        console.error(`[${now}] === ❌ ERRO NA EXECUÇÃO DA TAREFA AGENDADA ===`);
        console.error('Stack trace:', error);
        console.log(`[${now}] === 🔄 CONTINUANDO AGENDAMENTO (próxima execução em 5 minutos) ===\n`);
    }
}, {
    timezone: 'America/Sao_Paulo'
});
// NOVA TAREFA DIÁRIA: Limpeza de Instâncias Órfãs (às 3h da manhã)
node_cron_1.default.schedule('0 3 * * *', async () => {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    console.log(`\n[${now}] === 🧹 INICIANDO TAREFA DIÁRIA: Limpeza de Instâncias Órfãs ===`);
    try {
        await (0, whatsapp_instance_gc_1.cleanupOrphanedInstances)();
        console.log(`[${now}] === ✅ TAREFA DE LIMPEZA DIÁRIA CONCLUÍDA COM SUCESSO ===\n`);
    }
    catch (error) {
        console.error(`[${now}] === ❌ ERRO NA TAREFA DE LIMPEZA DIÁRIA ===`);
        console.error('Stack trace:', error);
        console.log(`[${now}] === 🔄 CONTINUANDO AGENDAMENTO (próxima execução amanhã às 03:00) ===\n`);
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
