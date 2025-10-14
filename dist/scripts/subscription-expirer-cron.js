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
const email_1 = require("../lib/email");
const prisma = new client_1.PrismaClient();
function runExpireCron() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const now = (0, timezone_1.getBrazilNow)();
        const log = (event, data = {}) => {
            if (process.env.NODE_ENV === 'development') {
                console.log(JSON.stringify(Object.assign({ ts: new Date().toISOString(), service: 'subscription-expirer-cron', event }, data)));
            }
        };
        log('start', { now: now.toISOString() });
        // Limite: assinaturas com subscriptionEnd < (now - 1 dia)
        // Agora subscriptionEnd é salvo no FIM DO DIA (23:59:59.999) para garantir acesso completo.
        // Mantemos 1 dia de graça após essa data.
        const graceLimit = new Date(now);
        graceLimit.setDate(graceLimit.getDate() - 1);
        // Buscar tenants ainda ativos cuja data de término já passou
        const tenantsToExpire = yield prisma.tenant.findMany({
            where: {
                isActive: true,
                subscriptionEnd: { lt: graceLimit }
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
                // Log detalhado em dev
                const lastType = t.lastSubscriptionEmailType;
                const webhookProcessed = t.webhookExpiredProcessed;
                log('tenant_evaluated', { tenantId: t.id, email: t.email, subscriptionEnd: (_a = t.subscriptionEnd) === null || _a === void 0 ? void 0 : _a.toISOString(), lastType, webhookProcessed });
                // Se já houve processamento de expiração via webhook e email correspondente, pular
                if (webhookProcessed && (lastType === 'EXPIRED_WEBHOOK' || lastType === 'CANCELED')) {
                    log('skip_webhook_processed', { tenantId: t.id, email: t.email, lastType });
                    continue;
                }
                yield prisma.tenant.update({
                    where: { id: t.id },
                    data: { isActive: false, updatedAt: new Date(), lastSubscriptionEmailType: 'EXPIRED_GRACE', webhookExpiredProcessed: true }
                });
                log('expired_deactivated', { tenantId: t.id, email: t.email, subscriptionEnd: (_b = t.subscriptionEnd) === null || _b === void 0 ? void 0 : _b.toISOString(), lastType });
                // Evitar reenviar email se já foi enviado por webhook como expiração
                if (lastType !== 'EXPIRED_WEBHOOK') {
                    try {
                        yield (0, email_1.sendSubscriptionExpiredEmail)(t.name || t.email, t.email, t.businessPlan, t.subscriptionEnd || undefined);
                    }
                    catch (emailErr) {
                        log('email_error_expired', { tenantId: t.id, email: t.email, error: emailErr.message });
                    }
                }
            }
            catch (e) {
                log('error_deactivating', { tenantId: t.id, email: t.email, error: e.message });
            }
        }
    });
}
if (require.main === module) {
    runExpireCron()
        .then(() => { console.log('🏁 Finalizado.'); process.exit(0); })
        .catch(err => { console.error('Erro geral:', err); process.exit(1); });
}
