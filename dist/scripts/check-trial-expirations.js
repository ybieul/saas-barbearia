"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCheckTrialExpirations = void 0;
const client_1 = require("@prisma/client");
const timezone_1 = require("../lib/timezone");
const prisma = new client_1.PrismaClient();
async function runCheckTrialExpirations() {
  const now = (0, timezone_1.getBrazilNow)();
  console.log(`[check-trial-expirations] Iniciando às ${now.toISOString()}`);
  const expiredTrials = await prisma.tenant.findMany({
    where: { subscriptionStatus: 'TRIAL', subscriptionEnd: { not: null, lt: now } },
    select: { id: true, email: true, subscriptionEnd: true }
  });
  console.log(`[check-trial-expirations] Encontrados ${expiredTrials.length} trials expirados`);
  for (const t of expiredTrials) {
    await prisma.tenant.update({ where: { id: t.id }, data: { isActive: false, subscriptionStatus: 'INACTIVE' } });
    console.log(`↳ Tenant ${t.id} (${t.email}) marcado como INACTIVE (trial expirado)`);
  }
  console.log('[check-trial-expirations] Concluído');
}
exports.runCheckTrialExpirations = runCheckTrialExpirations;
if (require.main === module) {
  runCheckTrialExpirations()
    .then(() => { console.log('🏁 Finalizado.'); process.exit(0); })
    .catch(err => { console.error('Erro geral:', err); process.exit(1); });
}
