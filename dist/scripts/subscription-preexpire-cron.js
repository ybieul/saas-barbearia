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
function log(event, data = {}) {
    console.log(JSON.stringify(Object.assign({ ts: new Date().toISOString(), service: 'subscription-preexpire-cron', event }, data)));
}
const email_1 = require("../lib/email");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const prisma = new client_1.PrismaClient();
function runPreExpireCron() {
    return __awaiter(this, void 0, void 0, function* () {
        const now = (0, timezone_1.getBrazilNow)();
        log('start', { now: now.toISOString() });
        // Normalizar para meia-noite Brasil (comparação por dia)
        const today = (0, timezone_1.startOfBrazilDay)(now);
        log('today_ref', { today: today.toISOString() });
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
            const diffDays = (0, timezone_1.diffBrazilDays)(today, end);
            const lastType = t.lastSubscriptionEmailType;
            log('tenant_eval', { email: t.email, subscriptionEnd: end.toISOString(), diffDays, lastType });
            if (diffDays === 3) {
                if (lastType !== 'PRE_EXPIRE_3D') {
                    try {
                        yield (0, email_1.sendSubscriptionPreExpireEmail)(t.name || t.email, t.email, t.businessPlan, diffDays);
                        yield prisma.tenant.update({ where: { id: t.id }, data: { lastSubscriptionEmailType: 'PRE_EXPIRE_3D' } });
                        log('email_sent_3d', { email: t.email });
                    }
                    catch (e) {
                        log('email_error_3d', { email: t.email, error: e instanceof Error ? e.message : String(e) });
                    }
                }
                else if (process.env.NODE_ENV === 'development') {
                    log('skip_already_sent_3d', { email: t.email });
                }
            }
            else if (diffDays === 1) {
                if (lastType !== 'PRE_EXPIRE_1D') {
                    try {
                        yield (0, email_1.sendSubscriptionPreExpireEmail)(t.name || t.email, t.email, t.businessPlan, diffDays);
                        yield prisma.tenant.update({ where: { id: t.id }, data: { lastSubscriptionEmailType: 'PRE_EXPIRE_1D' } });
                        log('email_sent_1d', { email: t.email });
                    }
                    catch (e) {
                        log('email_error_1d', { email: t.email, error: e instanceof Error ? e.message : String(e) });
                    }
                }
                else if (process.env.NODE_ENV === 'development') {
                    log('skip_already_sent_1d', { email: t.email });
                }
            }
            else {
                log('no_action', { email: t.email, diffDays });
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
