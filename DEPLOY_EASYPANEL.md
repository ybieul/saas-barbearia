# 🚀 Deploy SaaS Barbearia no EasyPanel

Este guia explica como fazer deploy do sistema SaaS para Barbearias no EasyPanel com Ubuntu 24.04.

## 📋 Pré-requisitos

- EasyPanel instalado no Ubuntu 24.04
- Banco MySQL configurado
- Domínio configurado (opcional)

## 🛠️ Configuração no EasyPanel

### 1. Criar Nova Aplicação

1. Acesse o painel do EasyPanel
2. Clique em "New Application"
3. Selecione "From Git Repository"
4. Cole a URL do repositório: `https://github.com/ybieul/saas-barbearia`
5. Configure o branch: `main`

### 2. Configurações da Aplicação

**Configuração Recomendada (Simples):**
```json
{
  "name": "saas-barbearia",
  "port": 3000,
  "buildCommand": "npm ci --legacy-peer-deps && npx prisma generate && npm run build",
  "startCommand": "npm start",
  "healthCheck": "/api/health"
}
```

**⚠️ Importante:** O projeto usa `--legacy-peer-deps` para resolver conflitos entre `date-fns` v4 e `react-day-picker`. O arquivo `.npmrc` já está configurado para isso.

**Se der erro no build, tente estas opções:**

**Opção 1 - Dockerfile Simples:**
- Renomeie `Dockerfile.simple` para `Dockerfile`
- Use: `buildCommand: "npm install --legacy-peer-deps && npm run build"`

**Opção 2 - Dockerfile de Teste:**
- Renomeie `Dockerfile.test` para `Dockerfile`
- Mais simples, sem otimizações

**Opção 3 - Sem Dockerfile:**
- Delete o Dockerfile
- Use apenas: `buildCommand: "npm ci --legacy-peer-deps && npx prisma generate && npm run build"`

### 3. Variáveis de Ambiente Obrigatórias

Configure estas variáveis no painel do EasyPanel:

```bash
# Banco de Dados
DATABASE_URL="mysql://usuario:senha@localhost:3306/barbershop_saas"

# Autenticação
NEXTAUTH_SECRET="seu-secret-super-seguro-aqui"
NEXTAUTH_URL="https://seudominio.com"

# Produção
NODE_ENV="production"
NEXT_TELEMETRY_DISABLED="1"
```

### 4. Variáveis Opcionais (WhatsApp, Email, etc.)

```bash
# WhatsApp (Evolution API)
WHATSAPP_API_URL="https://sua-evolution-api.com"
WHATSAPP_API_KEY="sua-chave-aqui"

# Email SMTP (opcional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="seu-email@gmail.com"
SMTP_PASS="sua-senha-de-app"
```

## 📦 Deploy Automático

O EasyPanel executará automaticamente:

1. ✅ Build da aplicação Next.js
2. ✅ Instalação de dependências
3. ✅ Configuração do Prisma
4. ✅ Execução de migrations
5. ✅ Configuração do cron job para lembretes

## 🔄 Cron Job para Lembretes

O sistema configurará automaticamente um cron job que roda a cada 5 minutos:

```bash
*/5 * * * * cd /app && npx ts-node scripts/whatsapp-reminders-cron.ts
```

### Logs do Cron Job

Para monitorar os lembretes:

```bash
tail -f /var/log/whatsapp-reminders.log
```

## 🏥 Monitoramento

### Health Check

O sistema inclui um endpoint de saúde:
- **URL**: `https://seudominio.com/api/health`
- **Método**: GET
- **Resposta**: Status do sistema e banco de dados

### Logs da Aplicação

Via EasyPanel:
1. Acesse "Applications" → "saas-barbearia"
2. Clique na aba "Logs"
3. Monitore em tempo real

## 🚀 Pós-Deploy

Após o deploy bem-sucedido:

### 1. Configuração Inicial

1. Acesse `https://seudominio.com/register`
2. Crie sua conta de administrador
3. Configure sua barbearia

### 2. Configurações Básicas

1. **Horários de Funcionamento**
   - Vá em Dashboard → Configurações → Horários
   - Configure os dias e horários de atendimento

2. **Serviços e Preços**
   - Dashboard → Serviços
   - Cadastre seus serviços e preços

3. **Profissionais**
   - Dashboard → Profissionais  
   - Adicione os barbeiros/cabeleireiros

4. **WhatsApp Automações**
   - Dashboard → WhatsApp
   - Configure as automações desejadas

### 3. Testar o Sistema

1. **Fazer um agendamento teste**
   - Use o link público de agendamento
   - Verifique se tudo funciona

2. **Testar automações WhatsApp**
   - Configure uma automação
   - Faça um agendamento
   - Verifique se a mensagem foi enviada

## 🔧 Comandos Úteis

### Acessar o container
```bash
docker exec -it saas-barbearia /bin/bash
```

### Verificar logs do Prisma
```bash
npx prisma studio --port 5555
```

### Executar migrations manualmente
```bash
npx prisma db push
```

### Executar cron job manualmente
```bash
npx ts-node scripts/whatsapp-reminders-cron.ts
```

## 🆘 Solução de Problemas

### Problema: Erro de dependências (ERESOLVE)
```bash
# Conflito entre date-fns v4 e react-day-picker
# SOLUÇÃO: Use --legacy-peer-deps em todos os comandos npm

npm ci --legacy-peer-deps
# ou 
npm install --legacy-peer-deps
```

### Problema: Banco de dados não conecta
```bash
# Verifique a variável DATABASE_URL
echo $DATABASE_URL

# Teste a conexão
npx prisma db pull
```

### Problema: Cron job não funciona
```bash
# Verificar se o cron está rodando
service cron status

# Ver logs do cron
cat /var/log/whatsapp-reminders.log
```

### Problema: Build falha
```bash
# Limpar cache e reinstalar
rm -rf node_modules .next
pnpm install
pnpm run build
```

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs no EasyPanel
2. Consulte a documentação do projeto
3. Abra uma issue no GitHub

---

🎉 **Sistema pronto para uso!** Seu SaaS de barbearia está rodando no EasyPanel.
