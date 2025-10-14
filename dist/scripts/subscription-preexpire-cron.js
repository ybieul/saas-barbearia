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
exports.runPreExpireCron = runPreExpireCron;
const client_1 = require("@prisma/client");
const timezone_1 = require("../lib/timezone");
const email_1 = require("../lib/email");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const prisma = new client_1.PrismaClient();
function runPreExpireCron() {
    return __awaiter(this, void 0, void 0, function* () {
        const now = (0, timezone_1.getBrazilNow)();
        if (process.env.NODE_ENV === 'development') {
            console.log('🕒 [PRE-EXPIRE] Iniciando execução em', now.toISOString());
        }
        const log = (event, data = {}) => {
            if (process.env.NODE_ENV === 'development') {
                console.log(JSON.stringify(Object.assign({ ts: new Date().toISOString(), service: 'subscription-preexpire-cron', event }, data)));
            }
        };
        // Normalizar para meia-noite Brasil (comparação por dia)
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        if (process.env.NODE_ENV === 'development') {
            console.log('📅 [PRE-EXPIRE] Hoje (midnight BR):', today.toISOString());
        }
        const in3 = new Date(today);
        in3.setDate(in3.getDate() + 3);
        const in1 = new Date(today);
        in1.setDate(in1.getDate() + 1);
        // Buscar assinaturas ativas com subscriptionEnd nessas datas (dia exato)
        const targets = yield prisma.tenant.findMany({
            where: {
                isActive: true,
                subscriptionEnd: { not: null }
            },
            select: { id: true, name: true, email: true, subscriptionEnd: true, businessPlan: true, lastSubscriptionEmailType: true }
        });
        log('candidates_fetched', { count: targets.length });
        for (const t of targets) {
            if (!t.subscriptionEnd)
                continue;
            const end = new Date(t.subscriptionEnd);
            const endDay = new Date(end);
            endDay.setHours(0, 0, 0, 0);
            const diffDays = Math.round((endDay.getTime() - today.getTime()) / 86400000);
            const lastType = t.lastSubscriptionEmailType;
            log('tenant_evaluated', { tenantId: t.id, email: t.email, end: end.toISOString(), diffDays, lastType });
            if (diffDays === 3) {
                if (lastType !== 'PRE_EXPIRE_3D') {
                    try {
                        yield (0, email_1.sendSubscriptionPreExpireEmail)(t.name || t.email, t.email, t.businessPlan, diffDays);
                        yield prisma.tenant.update({ where: { id: t.id }, data: { lastSubscriptionEmailType: 'PRE_EXPIRE_3D' } });
                        log('email_sent_preexpire_3d', { tenantId: t.id, email: t.email });
                    }
                    catch (e) {
                        log('email_error_preexpire_3d', { tenantId: t.id, email: t.email, error: e.message });
                    }
                }
                else if (process.env.NODE_ENV === 'development') {
                    log('skip_already_sent_3d', { tenantId: t.id, email: t.email });
                }
            }
            else if (diffDays === 1) {
                if (lastType !== 'PRE_EXPIRE_1D') {
                    try {
                        yield (0, email_1.sendSubscriptionPreExpireEmail)(t.name || t.email, t.email, t.businessPlan, diffDays);
                        yield prisma.tenant.update({ where: { id: t.id }, data: { lastSubscriptionEmailType: 'PRE_EXPIRE_1D' } });
                        log('email_sent_preexpire_1d', { tenantId: t.id, email: t.email });
                    }
                    catch (e) {
                        log('email_error_preexpire_1d', { tenantId: t.id, email: t.email, error: e.message });
                    }
                }
                else if (process.env.NODE_ENV === 'development') {
                    log('skip_already_sent_1d', { tenantId: t.id, email: t.email });
                }
            }
            else if (process.env.NODE_ENV === 'development') {
                log('no_action', { tenantId: t.id, email: t.email, diffDays });
            }
        }
    });
}
// Execução direta somente quando chamado via CLI (não quando importado pelo scheduler)
if (require.main === module) {
    runPreExpireCron()
        .then(() => { console.log('✅ preexpire finalizado'); process.exit(0); })
        .catch(e => { console.error(e); process.exit(1); });
}
