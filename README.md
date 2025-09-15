# TymerBook — SaaS de Agendamento e Gestão para Barbearias e Salões

TymerBook é uma plataforma completa para agendar, lembrar e gerenciar o dia a dia do seu salão/barbearia. Feito com Next.js (App Router), React 19, Prisma e MySQL, integra WhatsApp via Evolution API e assinaturas via Kirvano.

## ✨ Visão Geral

- Agendamento online 24/7 com link próprio
- Lembretes automáticos via WhatsApp (confirmação e lembrete) para reduzir faltas em até 90%
- CRM de clientes com histórico, preferências e gastos
- Controle financeiro por período, serviço e profissional
- Agenda por profissional, com bloqueios e intervalos
- Upsell inteligente (sugestões de serviços)
- Assinaturas com planos (Básico, Premium, Ultra) e limites por plano

## 🧱 Arquitetura e Tecnologias

- Frontend: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Radix UI, shadcn/ui, Lucide
- Backend: Next.js Route Handlers (API), Node 18+/20+ suportado
- ORM: Prisma 6 + MySQL (produção); Prisma Studio para inspeção
- Autenticação/Autorização:
	- JWT centralizado em `lib/auth` (extração multi-fonte, erros tipados, requireTenantAccess)
	- NextAuth Secret para criptografia/assinatura de tokens/cookies
- Integrações:
	- WhatsApp (Evolution API): conectar/consultar status/desconectar instância por tenant
	- Kirvano (assinaturas): webhook para eventos (compra/renovação/cancelamento), portal do cliente
- Agendamento & Agenda: lógica de geração de slots, conflitos, exceções e edição com regras de “janela original” do agendamento
- Emails: SMTP (Hostinger) para boas-vindas, pré-expiração e expiração
- Tarefas/Cron: scripts para lembretes WhatsApp, GC de instâncias e rotinas de assinatura
- Testes: Jest (unit/integration), scripts `test:*`

## � Estrutura do Projeto (resumo)

```
app/
	api/                      # Route Handlers (Next.js)
		webhooks/kirvano/[secret]/route.ts  # Webhook de assinaturas Kirvano
		tenants/[tenantId]/whatsapp/...     # Conectar/Status/Desconectar Evolution API
	dashboard/                # Área administrativa
		agenda/                 # Calendário, slots, edição e regras
	page.tsx                  # Landing page TymerBook
components/ui/              # UI (shadcn)
hooks/                      # Hooks (ex.: use-subscription, use-notification)
lib/                        # auth, subscription, timezone, email, etc.
scripts/                    # crons e jobs (assinaturas, whatsapp)
prisma/                     # schema.prisma, migrations, seed
```

## � Segurança e Autorização

- Autenticação centralizada em `lib/auth` (JWT):
	- Extração por Authorization, cookie e query
	- `authenticate()`, `verifyToken()`, `requireTenantAccess()` e `AuthError` padronizado
- Middleware de assinatura (`middleware.ts`):
	- Verifica `isActive` e `subscriptionEnd` (fuso do Brasil) para bloquear acesso quando expirado
	- Redirecionamentos e UX consistentes

## 💳 Assinaturas (Kirvano)

- Webhook: `POST /api/webhooks/kirvano/[secret]`
	- Secret vem de `KIRVANO_WEBHOOK_SECRET_PATH` e header `KIRVANO_WEBHOOK_SECRET`
	- Atualiza `businessPlan`, `subscriptionEnd`, IDs Kirvano e envia emails conforme evento
- Planos mapeados (com normalização):
	- BASIC, PREMIUM, ULTRA
- Limites atuais por plano:
	- Básico: até 1 profissional
	- Premium: até 3 profissionais
	- Ultra: ilimitado
- Portal do cliente Kirvano: usado para gestão de pagamento, faturas e cancelamentos

## 📲 WhatsApp (Evolution API)

- Variáveis: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME`
- Endpoints por tenant:
	- `POST /api/tenants/[tenantId]/whatsapp/connect`: cria/conecta instância
	- `GET  /api/tenants/[tenantId]/whatsapp/status`: status e sincronização de instanceName
	- `POST /api/tenants/[tenantId]/whatsapp/disconnect`: encerra e limpa instância
- Robô de lembretes: script agendável que envia confirmações e lembretes

## � Agendamentos e Agenda

- Geração de slots por data/profissional com respeito a intervalos/bloqueios e duração do serviço
- Edição inteligente: ao editar, o sistema permite selecionar horários imediatamente antes/depois do horário original dentro da “janela original” (não conflita consigo mesmo)
- Exceções de agenda (folgas, bloqueios pontuais)
- Validações de conflito e ocupação multi-serviço

## 📧 Emails Transacionais

- SMTP (Hostinger ou compatível): boas-vindas, pré-expiração (3 e 1 dia) e expiração/grace
- Templates em `lib/email.ts`

## 🧰 Scripts e Tarefas (Cron/Jobs)

- Assinaturas:
	- `cron:preexpire-subscriptions` → avisa 3 e 1 dia antes
	- `cron:expire-subscriptions` → desativa após período de graça
- WhatsApp:
	- `reminders:run` → dispara lembretes/confirm.
	- `gc:run` → garbage-collect de instâncias inativas
- Scheduler:
	- `scheduler:start` / `scheduler:dev` → orquestrador local dos jobs

Veja `package.json` para a lista completa de scripts.

## ⚙️ Configuração (.env)

Configure variáveis conforme `./.env.example` e `./.env.local`. Principais:

- Banco de dados:
	- `DATABASE_URL="mysql://usuario:senha@host:porta/banco"`
- NextAuth:
	- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- WhatsApp (Evolution):
	- `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME`
- Email (SMTP):
	- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`
- Kirvano (assinaturas):
	- `KIRVANO_WEBHOOK_SECRET` (header) e `KIRVANO_WEBHOOK_SECRET_PATH` (segmento de rota)
	- `KIRVANO_API_URL`, `KIRVANO_API_SECRET` (se aplicável ao portal)
- Landing (checkout):
	- `NEXT_PUBLIC_KIRVANO_CHECKOUT_BASIC_MONTHLY|ANNUAL`
	- `NEXT_PUBLIC_KIRVANO_CHECKOUT_PREMIUM_MONTHLY|ANNUAL`
	- `NEXT_PUBLIC_KIRVANO_CHECKOUT_ULTRA_MONTHLY|ANNUAL`
- Flags públicas úteis:
	- `NEXT_PUBLIC_ENABLE_PROFESSIONAL_SCHEDULES`, `NEXT_PUBLIC_DEBUG_AVAILABILITY_COMPARISON`

## � Como Rodar (Dev)

1) Instale dependências (npm ou pnpm)
2) Configure `.env` com `DATABASE_URL` (MySQL) e demais variáveis
3) Migre o schema e gere o client do Prisma
4) Suba o app em dev

Com npm:

```bash
npm install
npm run db:migrate
npm run db:generate
npm run dev
```

Com pnpm:

```bash
pnpm install
pnpm db:migrate
pnpm db:generate
pnpm dev
```

Opcional: `npm run db:seed` para dados de exemplo.

## 🧪 Testes

```bash
npm test
# ou
pnpm test
```

Cobertura: `npm run test:coverage`

## 📡 Endpoints Principais (exemplos)

- Webhook Kirvano: `POST /api/webhooks/kirvano/[secret]`
- WhatsApp Evolution: `/api/tenants/[tenantId]/whatsapp/{connect|status|disconnect}`
- Assinatura (app): `/dashboard/assinatura`
- Agenda (app): `/dashboard/agenda`

## 🧭 Convenções de Plano e Limites

- BASIC: 1 profissional
- PREMIUM: 3 profissionais
- ULTRA: ilimitado

A lógica de limites e recursos por plano está centralizada em `lib/subscription.ts`.

## 🧩 Design e UI

- Tema escuro com acentos em verde (TymerBook)
- Componentes shadcn/ui + Radix
- Ícones Lucide
- Animações com tailwind-animate

## 📦 Deploy (resumo)

- Suporte a Docker/Docker Compose (arquivos na raiz)
- Variáveis de ambiente via `.env`
- Build Next.js: `npm run build` e `npm start`

## 📘 Documentação Complementar

- `docs/KIRVANO_SUBSCRIPTION_SYSTEM.md` — Integração de assinaturas
- `docs/CORRECAO_MAPEAMENTO_PLANOS_WEBHOOK.md` — Mapeamento de planos
- `docs/DEBUG_WHATSAPP_AUTH.md` — Guia de debugging WhatsApp
- `docs/AJUSTE_LIMITE_PREMIUM_PROFISSIONAIS.md` — Limites do plano Premium

---

Feito para donos de barbearias e salões que querem operação simples, clientes fiéis e faturamento previsível.
