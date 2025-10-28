#!/usr/bin/env ts-node
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsappReminders = sendWhatsappReminders;
exports.sendFeedbackRequests = sendFeedbackRequests;
const client_1 = require("@prisma/client");
const whatsapp_server_1 = require("../lib/whatsapp-server");
const timezone_1 = require("../lib/timezone");
const crypto_1 = require("crypto");
const whatsapp_server_2 = require("../lib/whatsapp-server");
const prisma = new client_1.PrismaClient();
// Função para gerar ID único (similar ao cuid do Prisma)
function generateId() {
    return (0, crypto_1.randomBytes)(12).toString('base64url');
}
// Configurações dos lembretes
const REMINDER_CONFIGS = [
    { type: 'reminder_24h', hoursBefore: 24, minutesBefore: 0 },
    { type: 'reminder_12h', hoursBefore: 12, minutesBefore: 0 },
    { type: 'reminder_2h', hoursBefore: 2, minutesBefore: 0 },
    { type: 'reminder_1h', hoursBefore: 1, minutesBefore: 0 },
    { type: 'reminder_30min', hoursBefore: 0, minutesBefore: 30 },
];
function sendWhatsappReminders() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🚀 [CRON-MULTI-TENANT] Iniciando a lógica de verificação e envio de lembretes multi-tenant...');
        console.log(`[${new Date().toISOString()}] Iniciando processamento de lembretes...`);
        const now = (0, timezone_1.getBrazilNow)();
        console.log(`🇧🇷 [CRON-START] Horário brasileiro atual: ${now.toLocaleString('pt-BR')} (${now.toISOString()})`);
        let totalSent = 0;
        for (const config of REMINDER_CONFIGS) {
            try {
                console.log(`🔄 [MULTI-TENANT] Processando ${config.type}...`);
                // ✅ CORREÇÃO: Usar função segura para adicionar tempo
                const exactTime = (0, timezone_1.addTimeToBrazilDate)(now, config.hoursBefore, config.minutesBefore);
                // Debug para verificar cálculo correto
                console.log(`🔍 [CRON-${config.type}] Cálculo de tempo:`, {
                    nowBRT: now.toISOString(),
                    nowLocal: now.toLocaleString('pt-BR'),
                    exactTimeBRT: exactTime.toISOString(),
                    exactTimeLocal: exactTime.toLocaleString('pt-BR'),
                    hoursAdded: config.hoursBefore,
                    minutesAdded: config.minutesBefore,
                    expectedTime: `${config.hoursBefore}h${config.minutesBefore}m depois de ${now.toLocaleString('pt-BR')}`
                });
                // Janela de 10 minutos para capturar agendamentos (5 min antes e depois do tempo exato)
                const windowStart = new Date(exactTime);
                windowStart.setMinutes(windowStart.getMinutes() - 5);
                const windowEnd = new Date(exactTime);
                windowEnd.setMinutes(windowEnd.getMinutes() + 5);
                console.log(`📅 Buscando agendamentos entre ${windowStart.toISOString()} e ${windowEnd.toISOString()}`);
                console.log(`🇧🇷 Horário brasileiro: ${windowStart.toLocaleString('pt-BR')} até ${windowEnd.toLocaleString('pt-BR')}`);
                // 🎯 NOVA QUERY MULTI-TENANT: Buscar agendamentos com dados do tenant e configurações de automação
                const appointmentsToRemind = yield prisma.appointment.findMany({
                    where: {
                        dateTime: {
                            gte: windowStart,
                            lte: windowEnd,
                        },
                        status: {
                            in: ['SCHEDULED', 'CONFIRMED'] // Apenas agendamentos ativos
                        },
                        // 📡 VERIFICAÇÃO 1: Tenant deve ter instância WhatsApp configurada
                        tenant: {
                            whatsapp_instance_name: {
                                not: null
                            }
                        }
                    },
                    include: {
                        // 🏢 INCLUIR DADOS DO TENANT (com instância WhatsApp e configurações de automação)
                        tenant: {
                            include: {
                                automationSettings: {
                                    where: {
                                        automationType: config.type,
                                        isEnabled: true
                                    }
                                }
                            }
                        },
                        endUser: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                            }
                        },
                        professional: {
                            select: {
                                id: true,
                                name: true,
                            }
                        },
                        services: {
                            select: {
                                id: true,
                                name: true,
                                price: true,
                                duration: true,
                            }
                        }
                    }
                });
                console.log(`📊 [MULTI-TENANT] Encontrados ${appointmentsToRemind.length} agendamentos candidatos para ${config.type}`);
                // 🔍 FILTRAR: Apenas agendamentos que passaram em todas as verificações
                let validAppointments = 0;
                for (const appointment of appointmentsToRemind) {
                    try {
                        // ✅ VERIFICAÇÃO 1: Instância WhatsApp conectada
                        if (!appointment.tenant.whatsapp_instance_name) {
                            console.log(`⚠️ [SKIP] Tenant ${appointment.tenant.id} não possui instância WhatsApp configurada`);
                            continue;
                        }
                        // ✅ VERIFICAÇÃO 2: Automação ativa para este tipo de lembrete
                        if (!appointment.tenant.automationSettings || appointment.tenant.automationSettings.length === 0) {
                            console.log(`⚠️ [SKIP] Tenant ${appointment.tenant.id} não possui automação ${config.type} ativa`);
                            continue;
                        }
                        // ✅ VERIFICAÇÃO 3: Lembrete ainda não foi enviado
                        const existingReminder = yield prisma.appointmentReminder.findFirst({
                            where: {
                                appointmentId: appointment.id,
                                reminderType: config.type
                            }
                        });
                        if (existingReminder) {
                            console.log(`⚠️ [SKIP] Lembrete ${config.type} já foi enviado para agendamento ${appointment.id}`);
                            continue;
                        }
                        // 🎯 TODAS AS VERIFICAÇÕES PASSARAM: Enviar lembrete
                        console.log(`✅ [VALID] Processando lembrete para tenant: ${appointment.tenant.businessName} (instância: ${appointment.tenant.whatsapp_instance_name})`);
                        try {
                            yield sendReminderMessage(appointment, config.type, appointment.tenant.whatsapp_instance_name);
                            // 📝 REGISTRAR: Criar registro na tabela appointment_reminders
                            yield prisma.appointmentReminder.create({
                                data: {
                                    id: generateId(),
                                    appointmentId: appointment.id,
                                    reminderType: config.type,
                                    sentAt: now,
                                }
                            });
                            validAppointments++;
                            totalSent++;
                            console.log(`✅ [SENT] Lembrete ${config.type} enviado para ${appointment.endUser.name} via instância ${appointment.tenant.whatsapp_instance_name}`);
                        }
                        catch (reminderError) {
                            console.error(`❌ [REMINDER-FAIL] Erro específico no envio de lembrete:`, reminderError);
                            console.error(`❌ [REMINDER-FAIL] Agendamento: ${appointment.id}, Cliente: ${appointment.endUser.name}`);
                            console.error(`❌ [REMINDER-FAIL] Instância: ${appointment.tenant.whatsapp_instance_name}`);
                        }
                        // Pequeno delay entre envios para não sobrecarregar a API
                        yield new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    catch (error) {
                        console.error(`❌ [ERROR] Erro ao enviar lembrete para agendamento ${appointment.id}:`, error);
                    }
                }
                console.log(`📈 [${config.type}] Processados: ${validAppointments} lembretes enviados de ${appointmentsToRemind.length} candidatos`);
            }
            catch (error) {
                console.error(`❌ [ERROR] Erro ao processar ${config.type}:`, error);
            }
        }
        console.log(`[${new Date().toISOString()}] 🎉 MULTI-TENANT: Processamento concluído. Total de lembretes enviados: ${totalSent}`);
        console.log('✅ Lógica de lembretes multi-tenant finalizada.');
        // Após lembretes, processar pedidos de feedback
        try {
            const feedbackSent = yield sendFeedbackRequests();
            console.log(`📝 [FEEDBACK] Total de mensagens de avaliação enviadas: ${feedbackSent}`);
        }
        catch (e) {
            console.error('❌ [FEEDBACK] Erro ao processar feedback requests:', e);
        }
        return totalSent;
    });
}
// ===================== FEEDBACK REQUESTS =====================
function sendFeedbackRequests() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        console.log('🔄 [FEEDBACK] Iniciando verificação de agendamentos concluídos para envio de avaliação...');
        const now = (0, timezone_1.getBrazilNow)();
        // Buscar agendamentos COMPLETED nas últimas 6 horas (janela ampla) e filtrar dinamicamente
        const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        // Como o client local pode não reconhecer a coluna feedbackSent (caso não regenerado), buscamos sem ela e filtramos manualmente via SQL depois
        const appointmentsBase = yield prisma.appointment.findMany({
            where: {
                status: 'COMPLETED',
                completedAt: { gte: sixHoursAgo, lte: now },
                tenant: {
                    whatsapp_instance_name: { not: null },
                    automationSettings: { some: { automationType: 'feedback_request', isEnabled: true } },
                }
            },
            include: {
                tenant: { include: { automationSettings: true } },
                endUser: true,
                services: true
            }
        });
        // Obter ids que já têm feedbackSent = 1
        const sentRows = yield prisma.$queryRawUnsafe(`SELECT id FROM appointments WHERE feedbackSent = 1 AND completedAt >= ? AND completedAt <= ?`, sixHoursAgo, now);
        const sentSet = new Set(sentRows.map(r => r.id));
        const appointments = appointmentsBase.filter((a) => !sentSet.has(a.id));
        console.log(`🔍 [FEEDBACK] Candidatos (janela ampla 6h): ${appointments.length}`);
        let sentCount = 0;
        for (const appt of appointments) {
            try {
                if (!appt.completedAt)
                    continue;
                const automation = (_b = (_a = appt.tenant) === null || _a === void 0 ? void 0 : _a.automationSettings) === null || _b === void 0 ? void 0 : _b.find((a) => a.automationType === 'feedback_request' && a.isEnabled);
                if (!automation)
                    continue;
                if (!((_c = appt.endUser) === null || _c === void 0 ? void 0 : _c.phone))
                    continue;
                // Respeitar 0 (imediato): usar nullish coalescing para não cair no fallback quando delay=0
                const delay = (appt.tenant && appt.tenant.feedbackDelayMinutes !== undefined && appt.tenant.feedbackDelayMinutes !== null)
                    ? appt.tenant.feedbackDelayMinutes
                    : 45;
                if (delay < 15) {
                    continue;
                }
                const tolerance = 5; // minutos de tolerância para janela
                const targetTime = new Date(new Date(appt.completedAt).getTime() + delay * 60 * 1000);
                const windowStart = new Date(targetTime.getTime() - tolerance * 60 * 1000);
                const windowEnd = new Date(targetTime.getTime() + tolerance * 60 * 1000);
                if (now < windowStart || now > windowEnd) {
                    continue; // ainda não está no intervalo para este agendamento
                }
                // Evitar duplicado: checar se já existe log FEEDBACK para este telefone nas últimas 3h
                const existingLog = yield prisma.whatsAppLog.findFirst({
                    where: {
                        to: appt.endUser.phone,
                        type: 'FEEDBACK',
                        createdAt: { gte: new Date(now.getTime() - 3 * 60 * 60 * 1000) }
                    }
                });
                if (existingLog) {
                    console.log(`⚠️ [FEEDBACK] Já existe log FEEDBACK recente para telefone ${appt.endUser.phone}`);
                    // Não marcar feedbackSent aqui para permitir reenvio se nunca marcou (mas já há log). Mantemos skip.
                    continue;
                }
                // Montar mensagem (apenas placeholders básicos e link de avaliação se existir)
                const template = automation.messageTemplate || 'Olá {nomeCliente}! Obrigado por escolher a {nomeBarbearia}. Deixe sua avaliação: {linkAvaliacao}';
                if (!appt.tenant.googleReviewLink && /\{linkAvaliacao\}/.test(template)) {
                    console.warn(`⚠️ [FEEDBACK] Template contém {linkAvaliacao} mas tenant não tem googleReviewLink (tenantId=${appt.tenantId})`);
                }
                const message = template
                    .replace(/\{nomeCliente\}/g, appt.endUser.name)
                    .replace(/\{nomeBarbearia\}/g, appt.tenant.businessName || 'nossa barbearia')
                    .replace(/\{linkAvaliacao\}/g, appt.tenant.googleReviewLink || '')
                    .replace(/\{linkTracking\}/g, ''); // placeholder removido do sistema
                const success = yield sendMultiTenantWhatsAppMessage(appt.endUser.phone, message, appt.tenant.whatsapp_instance_name, 'feedback_request');
                if (success) {
                    // Marcar enviado
                    yield prisma.$executeRawUnsafe(`UPDATE appointments SET feedbackSent = 1 WHERE id = ?`, appt.id);
                    // Criar log FEEDBACK
                    try {
                        yield prisma.whatsAppLog.create({
                            data: {
                                to: appt.endUser.phone,
                                message,
                                type: 'FEEDBACK',
                                status: 'SENT',
                                sentAt: new Date(),
                                tenantId: appt.tenantId
                            }
                        });
                    }
                    catch (logErr) {
                        console.error('⚠️ [FEEDBACK] Falha ao criar WhatsAppLog (FEEDBACK). Tentando fallback CUSTOM:', logErr);
                        try {
                            yield prisma.whatsAppLog.create({
                                data: {
                                    to: appt.endUser.phone,
                                    message,
                                    type: 'CUSTOM',
                                    status: 'SENT',
                                    sentAt: new Date(),
                                    tenantId: appt.tenantId
                                }
                            });
                        }
                        catch (fallbackErr) {
                            console.error('❌ [FEEDBACK] Falha no fallback CUSTOM WhatsAppLog:', fallbackErr);
                        }
                    }
                    sentCount++;
                    console.log(`✅ [FEEDBACK] (${delay}m) Enviada avaliação para agendamento ${appt.id}`);
                }
                else {
                    console.warn(`⚠️ [FEEDBACK] Falha no envio (não marcado como enviado) appt=${appt.id}`);
                }
                yield new Promise(r => setTimeout(r, 750));
            }
            catch (e) {
                console.error('❌ [FEEDBACK] Erro ao enviar feedback para', appt.id, e);
                // Não marcar feedbackSent em erro para permitir nova tentativa na janela
            }
        }
        console.log(`🎉 [FEEDBACK] Processamento concluído. Enviados: ${sentCount}`);
        return sentCount;
    });
}
// 🚀 FUNÇÃO MULTI-TENANT: Enviar mensagem WhatsApp usando instância específica do tenant
function sendMultiTenantWhatsAppMessage(phoneNumber, message, instanceName, messageType) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`📤 [MULTI-TENANT] Enviando mensagem WhatsApp...`);
            console.log(`📱 Para: ${phoneNumber}`);
            console.log(`🏢 Instância: ${instanceName}`);
            console.log(`📝 Tipo: ${messageType}`);
            // Evolution API configuration from environment
            const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
            const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
            console.log(`� [MULTI-TENANT] URLs configuradas:`);
            console.log(`📡 EVOLUTION_API_URL: ${EVOLUTION_API_URL}`);
            console.log(`� EVOLUTION_API_KEY: ${EVOLUTION_API_KEY ? 'Definida' : 'Não definida'}`);
            if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
                console.error('❌ [MULTI-TENANT] Configuração Evolution API incompleta');
                console.error('🔍 [MULTI-TENANT] Debug Environment Variables:', {
                    EVOLUTION_API_URL: EVOLUTION_API_URL ? '✅ Definida' : '❌ Não definida',
                    EVOLUTION_API_KEY: EVOLUTION_API_KEY ? '✅ Definida' : '❌ Não definida',
                });
                return false;
            }
            // Format phone number
            const formattedPhone = (0, whatsapp_server_2.formatPhoneNumber)(phoneNumber);
            console.log(`📱 [MULTI-TENANT] Telefone formatado: ${phoneNumber} -> ${formattedPhone}`);
            const payload = {
                number: formattedPhone,
                text: message,
                delay: 1000
            };
            console.log(`🌐 [MULTI-TENANT] Tentando conectar à Evolution API:`, {
                url: `${EVOLUTION_API_URL}/message/sendText/${instanceName}`,
                instanceName,
                method: 'POST',
                headers: { 'apikey': EVOLUTION_API_KEY ? 'PRESENTE' : 'AUSENTE' }
            });
            const response = yield fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': EVOLUTION_API_KEY,
                },
                body: JSON.stringify(payload),
            });
            console.log(`📡 [MULTI-TENANT] Evolution API response status: ${response.status}`);
            if (!response.ok) {
                const errorText = yield response.text();
                console.error(`❌ [MULTI-TENANT] Evolution API error:`, errorText);
                return false;
            }
            const result = yield response.json();
            console.log(`✅ [MULTI-TENANT] Mensagem enviada via Evolution API:`, result);
            return true;
        }
        catch (error) {
            console.error('❌ [MULTI-TENANT] Erro ao enviar mensagem WhatsApp:', error);
            return false;
        }
    });
}
function sendReminderMessage(appointment, reminderType, instanceName) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log(`📧 [REMINDER] Iniciando envio de lembrete ${reminderType} para ${appointment.endUser.name}`);
        if (!appointment.endUser.phone) {
            throw new Error('Cliente não possui telefone cadastrado');
        }
        // Preparar dados para o template
        const appointmentDate = new Date(appointment.dateTime);
        const templateData = {
            clientName: appointment.endUser.name,
            businessName: appointment.tenant.businessName || 'Nossa Barbearia',
            service: appointment.services.map((s) => s.name).join(', ') || 'Serviço',
            professional: ((_a = appointment.professional) === null || _a === void 0 ? void 0 : _a.name) || 'Profissional',
            date: (0, timezone_1.formatBrazilDate)(appointmentDate),
            time: (0, timezone_1.formatBrazilTime)(appointmentDate, 'HH:mm'),
            totalTime: appointment.services.reduce((total, s) => total + s.duration, 0),
            price: appointment.totalPrice,
            businessPhone: appointment.tenant.businessPhone || '',
        };
        // Gerar mensagem baseada no tipo
        let message = '';
        switch (reminderType) {
            case 'reminder_24h':
                message = whatsapp_server_1.whatsappTemplates.reminder24h(templateData);
                break;
            case 'reminder_12h':
                message = whatsapp_server_1.whatsappTemplates.reminder12h(templateData); // ✅ CORRIGIDO: usar template correto
                break;
            case 'reminder_2h':
                message = whatsapp_server_1.whatsappTemplates.reminder2h(templateData);
                break;
            case 'reminder_1h':
                message = whatsapp_server_1.whatsappTemplates.reminder1h(templateData);
                break;
            case 'reminder_30min':
                message = whatsapp_server_1.whatsappTemplates.reminder30min(templateData);
                break;
            default:
                throw new Error(`Tipo de lembrete desconhecido: ${reminderType}`);
        }
        // 🎯 ENVIAR MENSAGEM USANDO INSTÂNCIA ESPECÍFICA DO TENANT
        console.log(`📤 [REMINDER] Preparando envio via Evolution API`);
        console.log(`📱 Telefone: ${appointment.endUser.phone}`);
        console.log(`🏢 Instância: ${instanceName}`);
        console.log(`📝 Mensagem: ${message.substring(0, 100)}...`);
        const success = yield sendMultiTenantWhatsAppMessage(appointment.endUser.phone, message, instanceName, // 🏢 Instância específica do tenant
        reminderType);
        console.log(`📊 [REMINDER] Resultado do envio: ${success ? 'SUCESSO' : 'FALHOU'}`);
        if (!success) {
            throw new Error('Falha ao enviar mensagem via WhatsApp');
        }
        return success;
    });
}
// Este bloco permite que o script seja executado diretamente com "node" ou "ts-node"
if (require.main === module) {
    sendWhatsappReminders()
        .then((totalSent) => {
        console.log(`✅ Cron job concluído. ${totalSent} lembretes enviados.`);
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Erro fatal no cron job:', error);
        process.exit(1);
    })
        .finally(() => __awaiter(void 0, void 0, void 0, function* () {
        yield prisma.$disconnect();
    }));
}
