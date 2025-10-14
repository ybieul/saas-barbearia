"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const whatsapp_reminders_cron_1 = require("./whatsapp-reminders-cron");
const whatsapp_instance_gc_1 = require("./whatsapp-instance-gc");
const subscription_preexpire_cron_1 = require("./subscription-preexpire-cron");
const subscription_expirer_cron_1 = require("./subscription-expirer-cron");
const check_trial_expirations_1 = require("./check-trial-expirations");
const send_trial_reminders_1 = require("./send-trial-reminders");
console.log('✅ Agendador (Scheduler) de tarefas foi iniciado com sucesso.');
console.log('🕐 Executando a cada 5 minutos para verificação de lembretes...');
console.log('🧹 Executando às 03:00 diariamente para limpeza de instâncias órfãs...');
console.log('⏰ Executando pré-expiração às 00:05 (emails 3d / 1d).');
console.log('⏰ Executando expiração (grace) às 00:10.');
console.log('⏰ Executando verificação de trials às 00:02 (desativa trials vencidos).');
console.log('🔔 Executando lembretes de trial às 09:00 (dia 13, dia 15, dia 17).');
console.log('🌍 Timezone: America/Sao_Paulo');
// Validar se a expressão cron está correta
if (!node_cron_1.default.validate('*/5 * * * *')) {
    console.error('❌ Expressão cron inválida!');
    process.exit(1);
}
// Agenda a tarefa para ser executada a cada 5 minutos
node_cron_1.default.schedule('*/5 * * * *', () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    console.log(`\n[${now}] === 🚀 INICIANDO TAREFA AGENDADA: Verificação de Lembretes ===`);
    try {
        yield (0, whatsapp_reminders_cron_1.sendWhatsappReminders)();
        console.log(`[${now}] === ✅ TAREFA AGENDADA CONCLUÍDA COM SUCESSO ===\n`);
    }
    catch (error) {
        console.error(`[${now}] === ❌ ERRO NA EXECUÇÃO DA TAREFA AGENDADA ===`);
        console.error('Stack trace:', error);
        console.log(`[${now}] === 🔄 CONTINUANDO AGENDAMENTO (próxima execução em 5 minutos) ===\n`);
    }
}), {
    timezone: 'America/Sao_Paulo'
});
// NOVA TAREFA DIÁRIA: Limpeza de Instâncias Órfãs (às 3h da manhã)
node_cron_1.default.schedule('0 3 * * *', () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    console.log(`\n[${now}] === 🧹 INICIANDO TAREFA DIÁRIA: Limpeza de Instâncias Órfãs ===`);
    try {
        yield (0, whatsapp_instance_gc_1.cleanupOrphanedInstances)();
        console.log(`[${now}] === ✅ TAREFA DE LIMPEZA DIÁRIA CONCLUÍDA COM SUCESSO ===\n`);
    }
    catch (error) {
        console.error(`[${now}] === ❌ ERRO NA TAREFA DE LIMPEZA DIÁRIA ===`);
        console.error('Stack trace:', error);
        console.log(`[${now}] === 🔄 CONTINUANDO AGENDAMENTO (próxima execução amanhã às 03:00) ===\n`);
    }
}), {
    timezone: 'America/Sao_Paulo'
});
// PRÉ-EXPIRAÇÃO (00:05 BR)
node_cron_1.default.schedule('5 0 * * *', () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    console.log(`\n[${now}] === 🔔 INICIANDO PRÉ-EXPIRAÇÃO (3d/1d) ===`);
    try {
        yield (0, subscription_preexpire_cron_1.runPreExpireCron)();
        console.log(`[${now}] === ✅ PRÉ-EXPIRAÇÃO CONCLUÍDA ===\n`);
    }
    catch (e) {
        console.error(`[${now}] === ❌ ERRO NA PRÉ-EXPIRAÇÃO ===`, e);
    }
}), { timezone: 'America/Sao_Paulo' });
// EXPIRAÇÃO (GRACE CHECK) (00:10 BR)
node_cron_1.default.schedule('10 0 * * *', () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    console.log(`\n[${now}] === ⏱️ INICIANDO EXPIRAÇÃO (GRACE) ===`);
    try {
        yield (0, subscription_expirer_cron_1.runExpireCron)();
        console.log(`[${now}] === ✅ EXPIRAÇÃO CONCLUÍDA ===\n`);
    }
    catch (e) {
        console.error(`[${now}] === ❌ ERRO NA EXPIRAÇÃO ===`, e);
    }
}), { timezone: 'America/Sao_Paulo' });
// EXPIRAÇÃO DE TRIALS (00:02 BR)
node_cron_1.default.schedule('2 0 * * *', () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    console.log(`\n[${now}] === ⏱️ INICIANDO VERIFICAÇÃO DE TRIALS EXPIRADOS ===`);
    try {
        yield (0, check_trial_expirations_1.runCheckTrialExpirations)();
        console.log(`[${now}] === ✅ VERIFICAÇÃO DE TRIALS CONCLUÍDA ===\n`);
    }
    catch (e) {
        console.error(`[${now}] === ❌ ERRO NA VERIFICAÇÃO DE TRIALS ===`, e);
    }
}), { timezone: 'America/Sao_Paulo' });
// LEMBRETES DE TRIAL (09:00 BR) - dia 13, dia 15 e dia 17
node_cron_1.default.schedule('0 9 * * *', () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    console.log(`\n[${now}] === 🔔 INICIANDO ENVIO DE LEMBRETES DE TRIAL ===`);
    try {
        yield (0, send_trial_reminders_1.runSendTrialReminders)();
        console.log(`[${now}] === ✅ LEMBRETES DE TRIAL ENVIADOS ===\n`);
    }
    catch (e) {
        console.error(`[${now}] === ❌ ERRO NO ENVIO DE LEMBRETES DE TRIAL ===`, e);
    }
}), { timezone: 'America/Sao_Paulo' });
// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n⏹️  Recebido sinal de interrupção. Encerrando agendador...');
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log('\n⏹️  Recebido sinal de terminação. Encerrando agendador...');
    process.exit(0);
});
