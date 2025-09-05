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
exports.runExpireCron = runExpireCron;
const client_1 = require("@prisma/client");
const timezone_1 = require("../lib/timezone");
function log(event, data = {}) {
    console.log(JSON.stringify(Object.assign({ ts: new Date().toISOString(), service: 'subscription-expirer-cron', event }, data)));
}
const email_1 = require("../lib/email");
const prisma = new client_1.PrismaClient();
function runExpireCron() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const now = (0, timezone_1.getBrazilNow)();
        log('start', { now: now.toISOString() });
        // subscriptionEnd supõe-se ser salvo como fim de dia Brasil.
        // Expira quando diffBrazilDays(subscriptionEnd, now) >= 1 (ou seja, passou pelo menos 1 dia completo após fim do dia).
        const todayStart = (0, timezone_1.startOfBrazilDay)(now);
        // Buscar tenants ainda ativos cuja data de término já passou
        const tenantsToExpire = yield prisma.tenant.findMany({
            where: {
                isActive: true,
                subscriptionEnd: { not: null }
            },
            select: { id: true, email: true, subscriptionEnd: true, businessPlan: true, name: true, webhookExpiredProcessed: true, lastSubscriptionEmailType: true }
        });
        if (tenantsToExpire.length === 0) {
            log('no_candidates');
            return;
        }
        log('candidates_fetched', { count: tenantsToExpire.length });
        for (const t of tenantsToExpire) {
            try {
                if (!t.subscriptionEnd)
                    continue;
                const end = new Date(t.subscriptionEnd);
                // Se ainda não passou 1 dia completo após o fim do dia de expiração Brasil, pular
                const daysAfter = (0, timezone_1.diffBrazilDays)(end, now);
                // Manter 1 dia completo de graça após o dia de término => expira somente quando diff >= 2
                if (daysAfter < 2) {
                    log('grace_active', { email: t.email, daysAfter });
                    continue;
                }
                // Log detalhado em dev
                const lastType = t.lastSubscriptionEmailType;
                const webhookProcessed = t.webhookExpiredProcessed;
                log('tenant_eval', { email: t.email, subscriptionEnd: (_a = t.subscriptionEnd) === null || _a === void 0 ? void 0 : _a.toISOString(), lastEmailType: lastType, webhookProcessed });
                // Se já houve processamento de expiração via webhook e email correspondente, pular
                if (webhookProcessed && (lastType === 'EXPIRED_WEBHOOK' || lastType === 'CANCELED')) {
                    log('skip_webhook_processed', { email: t.email });
                    continue;
                }
                yield prisma.tenant.update({
                    where: { id: t.id },
                    data: { isActive: false, updatedAt: new Date(), lastSubscriptionEmailType: 'EXPIRED_GRACE', webhookExpiredProcessed: true }
                });
                log('expired', { tenantId: t.id, email: t.email, subscriptionEnd: (_b = t.subscriptionEnd) === null || _b === void 0 ? void 0 : _b.toISOString(), daysAfter });
                // Evitar reenviar email se já foi enviado por webhook como expiração
                if (lastType !== 'EXPIRED_WEBHOOK') {
                    try {
                        yield (0, email_1.sendSubscriptionExpiredEmail)(t.name || t.email, t.email, t.businessPlan, t.subscriptionEnd || undefined);
                    }
                    catch (emailErr) {
                        log('email_error_expire', { email: t.email, error: emailErr instanceof Error ? emailErr.message : String(emailErr) });
                    }
                }
            }
            catch (e) {
                log('error_expiring', { tenantId: t.id, email: t.email, error: e instanceof Error ? e.message : String(e) });
            }
        }
    });
}
if (require.main === module) {
    runExpireCron()
        .then(() => { console.log('🏁 Finalizado.'); process.exit(0); })
        .catch(err => { console.error('Erro geral:', err); process.exit(1); });
}
