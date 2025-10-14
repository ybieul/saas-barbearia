# ✅ Trial Marketing - Checklist de Deploy

## 📦 Arquivos Criados/Modificados

### Scripts TypeScript (Source)
- ✅ `scripts/check-trial-expirations.ts` - Expira trials e desconecta WhatsApp
- ✅ `scripts/send-trial-reminders.ts` - Envia emails dia 13, 15 e 17
- ✅ `scripts/scheduler.ts` - Integrado com novo cron 09:00

### Scripts JavaScript Compilados (Produção)
- ✅ `dist/scripts/check-trial-expirations.js` - Versão compilada
- ✅ `dist/scripts/send-trial-reminders.js` - Versão compilada (corrigida: getBrazilNow)
- ✅ `dist/scripts/scheduler.js` - Importa e agenda os novos scripts

### Biblioteca de Email
- ✅ `lib/email.ts` - 3 novas funções:
  - `sendTrialWelcomeEmail()` - Boas-vindas trial
  - `sendTrialReminderEmail(daysLeft)` - Lembretes (2 dias, último dia)
  - `sendTrialExpiredMissYouEmail()` - Sentimos sua falta
- ✅ `dist/lib/email.js` - Funções compiladas e exportadas

### Rotas API
- ✅ `app/api/auth/register/route.ts` - Envia email de boas-vindas trial

### Interface
- ✅ `app/dashboard/assinatura/page.tsx` - Mostra "Trial (15 dias grátis)" ao invés de "Ultra"

### Configuração
- ✅ `package.json` - Adicionado script `cron:trial-reminders`

---

## 🕐 Cronograma de Execução

| Hora (BR) | Script | Função | Descrição |
|-----------|--------|--------|-----------|
| **00:02** | check-trial-expirations | Expirar trials | Desativa trials vencidos + desconecta WhatsApp |
| **09:00** | send-trial-reminders | Email marketing | Envia lembretes dia 13, 15 e 17 |

---

## 📧 Fluxo de Emails

1. **Dia 0** (Registro): `sendTrialWelcomeEmail`
   - Assunto: "🎉 Bem-vindo ao TymerBook - 15 dias GRÁTIS de teste!"
   - Conteúdo: Credenciais + recursos disponíveis

2. **Dia 13** (09:00): `sendTrialReminderEmail(2)`
   - Assunto: "⚠️ Faltam apenas 2 dias para seu teste grátis acabar!"
   - CTA: Ver planos e assinar

3. **Dia 15** (09:00): `sendTrialReminderEmail(0)`
   - Assunto: "⏰ ÚLTIMO DIA do seu teste grátis no TymerBook!"
   - Urgência máxima

4. **Dia 16** (00:02): Trial expira automaticamente
   - WhatsApp desconectado
   - Tenant marcado como INACTIVE

5. **Dia 17** (09:00): `sendTrialExpiredMissYouEmail`
   - Assunto: "💔 Sentimos sua falta no TymerBook..."
   - Tom de reconquista + dados salvos

---

## 🔧 Comandos na VPS

```bash
# 1. Pull das alterações
cd /var/www/tymerbook
git pull origin main

# 2. Instalar dependências (se houver)
npm install

# 3. CRÍTICO: Regenerar Prisma Client
npx prisma generate

# 4. Recompilar scripts (opcional, já estão em dist/)
npm run build:scripts

# 5. Reiniciar o scheduler
pm2 restart scheduler

# 6. Verificar logs
pm2 logs scheduler --lines 50
```

---

## ✅ Validações na VPS

### 1. Verificar imports Prisma
```bash
# Deve retornar 0 erros após prisma generate
cd /var/www/tymerbook
node -c dist/scripts/check-trial-expirations.js
node -c dist/scripts/send-trial-reminders.js
```

### 2. Testar script manualmente
```bash
# Testar envio de lembretes
npm run cron:trial-reminders

# Testar expiração de trials
npm run cron:check-trials
```

### 3. Verificar scheduler está rodando
```bash
pm2 list
# scheduler deve estar "online"

pm2 logs scheduler --lines 20
# Deve mostrar:
# ✅ Agendador (Scheduler) de tarefas foi iniciado
# 🔔 Executando lembretes de trial às 09:00
```

### 4. Verificar variáveis de ambiente (SMTP)
```bash
# Certificar que existem:
cat .env | grep SMTP
# SMTP_HOST=
# SMTP_PORT=
# SMTP_USER=
# SMTP_PASS=
# SMTP_FROM_EMAIL=
```

---

## 🐛 Troubleshooting

### Erro: "subscriptionStatus does not exist"
**Causa**: Prisma Client não regenerado  
**Solução**: `npx prisma generate`

### Erro: "toSaoPauloTime is not a function"
**Causa**: Arquivo compilado estava desatualizado  
**Solução**: JÁ CORRIGIDO no `dist/scripts/send-trial-reminders.js` (usa `getBrazilNow`)

### Emails não estão sendo enviados
**Verificar**:
1. SMTP configurado no `.env`
2. Logs do scheduler: `pm2 logs scheduler`
3. Testar manualmente: `npm run cron:trial-reminders`

### WhatsApp não está sendo desconectado
**Verificar**:
1. `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` no `.env`
2. Logs do script: procurar por `[WhatsApp]` nos logs
3. Instância existe na Evolution API

---

## 📊 Monitoramento

### Verificar emails enviados hoje
```bash
pm2 logs scheduler | grep "Email.*trial.*enviado"
```

### Verificar trials expirados hoje
```bash
pm2 logs scheduler | grep "check-trial-expirations"
```

### Verificar próxima execução dos crons
```bash
# Scheduler mostra os horários no startup:
pm2 logs scheduler --lines 100 | grep "Executando"
```

---

## 🎯 Resultado Esperado

Após deploy correto:
- ✅ Novos registros recebem email de boas-vindas instantaneamente
- ✅ Às 09:00 diariamente: emails de lembrete enviados
- ✅ Às 00:02 diariamente: trials expirados desativados + WhatsApp desconectado
- ✅ Interface mostra "Trial (15 dias grátis)" durante período de teste
- ✅ Conversão de trials para assinaturas pagas através do funil de emails

---

**Status**: ✅ Pronto para deploy  
**Última atualização**: 14 de outubro de 2025  
**Versão**: 1.0.0
