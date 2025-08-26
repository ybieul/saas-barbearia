#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client';
import { sendWhatsAppMessage, whatsappTemplates } from '../lib/whatsapp-server';
import { getBrazilNow, formatBrazilDate, formatBrazilTime, addTimeToBrazilDate } from '../lib/timezone';
import { randomBytes } from 'crypto';
const prisma = new PrismaClient();
// Função para gerar ID único (similar ao cuid do Prisma)
function generateId() {
    return randomBytes(12).toString('base64url');
}
// Configurações dos lembretes
const REMINDER_CONFIGS = [
    { type: 'reminder_24h', hoursBefore: 24, minutesBefore: 0 },
    { type: 'reminder_12h', hoursBefore: 12, minutesBefore: 0 },
    { type: 'reminder_2h', hoursBefore: 2, minutesBefore: 0 },
];
export async function sendWhatsappReminders() {
    console.log('Iniciando a lógica de verificação e envio de lembretes...');
    console.log(`[${new Date().toISOString()}] Iniciando processamento de lembretes...`);
    const now = getBrazilNow();
    console.log(`🇧🇷 [CRON-START] Horário brasileiro atual: ${now.toLocaleString('pt-BR')} (${now.toISOString()})`);
    let totalSent = 0;
    for (const config of REMINDER_CONFIGS) {
        try {
            console.log(`Processando ${config.type}...`);
            // ✅ CORREÇÃO: Usar função segura para adicionar tempo
            const exactTime = addTimeToBrazilDate(now, config.hoursBefore, config.minutesBefore);
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
            console.log(`Buscando agendamentos entre ${windowStart.toISOString()} e ${windowEnd.toISOString()}`);
            console.log(`🇧🇷 Horário brasileiro: ${windowStart.toLocaleString('pt-BR')} até ${windowEnd.toLocaleString('pt-BR')}`);
            // Query para encontrar agendamentos que precisam de lembrete
            const appointmentsToRemind = await prisma.appointment.findMany({
                where: {
                    dateTime: {
                        gte: windowStart,
                        lte: windowEnd,
                    },
                    status: {
                        in: ['SCHEDULED', 'CONFIRMED'] // Apenas agendamentos ativos
                    }
                },
                include: {
                    tenant: {
                        select: {
                            id: true,
                            businessName: true,
                            businessPhone: true,
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
            // Filtrar apenas os que têm automação ativa e não receberam lembrete ainda
            const filteredAppointments = [];
            for (const appointment of appointmentsToRemind) {
                // Verificar se a automação está ativa
                const automationSetting = await prisma.$queryRaw `
          SELECT * FROM automation_settings 
          WHERE establishmentId = ${appointment.tenantId} 
          AND automationType = ${config.type} 
          AND isEnabled = true
          LIMIT 1
        `;
                if (automationSetting.length === 0)
                    continue;
                // Verificar se não foi enviado ainda
                const existingReminder = await prisma.$queryRaw `
          SELECT * FROM appointment_reminders 
          WHERE appointmentId = ${appointment.id} 
          AND reminderType = ${config.type}
          LIMIT 1
        `;
                if (existingReminder.length === 0) {
                    filteredAppointments.push(appointment);
                }
            }
            console.log(`Encontrados ${filteredAppointments.length} agendamentos para ${config.type}`);
            // Processar cada agendamento
            for (const appointment of filteredAppointments) {
                try {
                    await sendReminderMessage(appointment, config.type);
                    // Registrar o envio usando query raw
                    await prisma.$executeRaw `
            INSERT INTO appointment_reminders (id, appointmentId, reminderType, sentAt, createdAt)
            VALUES (${generateId()}, ${appointment.id}, ${config.type}, ${now}, ${now})
          `;
                    totalSent++;
                    console.log(`✅ Lembrete ${config.type} enviado para ${appointment.endUser.name}`);
                    // Pequeno delay entre envios para não sobrecarregar a API
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                catch (error) {
                    console.error(`❌ Erro ao enviar lembrete para agendamento ${appointment.id}:`, error);
                }
            }
        }
        catch (error) {
            console.error(`❌ Erro ao processar ${config.type}:`, error);
        }
    }
    console.log(`[${new Date().toISOString()}] Processamento concluído. Total de lembretes enviados: ${totalSent}`);
    console.log('Lógica de lembretes finalizada.');
    return totalSent;
}
async function sendReminderMessage(appointment, reminderType) {
    if (!appointment.endUser.phone) {
        throw new Error('Cliente não possui telefone cadastrado');
    }
    // Preparar dados para o template
    const appointmentDate = new Date(appointment.dateTime);
    const templateData = {
        clientName: appointment.endUser.name,
        businessName: appointment.tenant.businessName || 'Nossa Barbearia',
        service: appointment.services.map((s) => s.name).join(', ') || 'Serviço',
        professional: appointment.professional?.name || 'Profissional',
        date: formatBrazilDate(appointmentDate),
        time: formatBrazilTime(appointmentDate),
        totalTime: appointment.services.reduce((total, s) => total + s.duration, 0),
        price: appointment.totalPrice,
        businessPhone: appointment.tenant.businessPhone || '',
    };
    // Gerar mensagem baseada no tipo
    let message = '';
    switch (reminderType) {
        case 'reminder_24h':
            message = whatsappTemplates.reminder24h(templateData);
            break;
        case 'reminder_12h':
            message = whatsappTemplates.reminder24h(templateData); // Usar template de 24h como fallback
            break;
        case 'reminder_2h':
            message = whatsappTemplates.reminder2h(templateData);
            break;
        default:
            throw new Error(`Tipo de lembrete desconhecido: ${reminderType}`);
    }
    // Enviar mensagem
    const success = await sendWhatsAppMessage({
        to: appointment.endUser.phone,
        message,
        type: reminderType,
    });
    if (!success) {
        throw new Error('Falha ao enviar mensagem via WhatsApp');
    }
    return success;
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
        .finally(async () => {
        await prisma.$disconnect();
    });
}
