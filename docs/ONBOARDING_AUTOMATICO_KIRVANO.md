# Sistema de Onboarding Automático via Webhook Kirvano

## 📋 Visão Geral

O sistema implementa um fluxo de **"pagamento primeiro"** onde novos usuários são criados automaticamente após a confirmação do pagamento via webhooks da Kirvano.

## 🔄 Fluxo de Funcionamento

### 1. Cliente Realiza Pagamento na Kirvano
- Cliente compra uma assinatura na plataforma Kirvano
- Kirvano processa o pagamento
- Sistema é notificado via webhook

### 2. Webhook Recebido (`POST /api/webhooks/kirvano`)
- Valida token de segurança do webhook
- Processa evento `assinatura.ativa` ou `compra.aprovada`
- Extrai dados do cliente do payload

### 3. Verificação de Usuário Existente
```typescript
const existingTenant = await prisma.tenant.findUnique({
  where: { email: customerEmailFromWebhook },
});
```

### 4A. **Usuário EXISTENTE** - Atualização
Se encontrar um tenant existente:
- ✅ Atualiza `businessPlan`, `subscriptionEnd`, `isActive = true`
- ✅ Atualiza `kirvanoCustomerId` e `kirvanoSubscriptionId`
- ✅ Log: "Assinatura reativada/atualizada para tenant existente"

### 4B. **Usuário NOVO** - Criação Automática
Se NÃO encontrar tenant:

#### 4B.1. Gerar Credenciais Seguras
```typescript
const temporaryPassword = generateSecurePassword(12); // Ex: "K9mP@x4N!qR7"
const hashedPassword = await bcrypt.hash(temporaryPassword, 12);
```

#### 4B.2. Criar Novo Tenant
```typescript
const newTenant = await prisma.tenant.create({
  data: {
    name: data.customer_name || data.customer_email.split('@')[0],
    email: data.customer_email,
    password: hashedPassword,
    isActive: true,
    businessPlan: mappedPlan, // BASIC, PREMIUM, etc.
    subscriptionEnd: calculatedDate,
    kirvanoCustomerId: data.customer_id,
    kirvanoSubscriptionId: data.subscription_id,
    businessName: data.customer_name || 'Meu Negócio',
    businessPhone: '',
    businessAddress: '',
  }
});
```

#### 4B.3. Enviar Email de Boas-Vindas
Email automático contendo:
- 🎉 Mensagem de boas-vindas personalizada
- 📧 Email de login (o próprio email do cliente)
- 🔑 Senha temporária gerada
- 🔗 Link direto para login
- ⚠️ Instruções para alterar senha
- 📋 Próximos passos para configurar o negócio

## 🛡️ Segurança Implementada

### Validação de Webhook
```typescript
const kirvanoToken = request.headers.get('Kirvano-Token')
const webhookSecret = process.env.KIRVANO_WEBHOOK_SECRET

if (!kirvanoToken || kirvanoToken !== webhookSecret) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Geração de Senha Segura
- ✅ 12 caracteres mínimo
- ✅ Pelo menos 1 minúscula, 1 maiúscula, 1 número, 1 símbolo
- ✅ Caracteres embaralhados aleatoriamente
- ✅ Hash bcrypt com salt 12

### Validação de Dados
- ✅ Verificação de campos obrigatórios
- ✅ Sanitização de email
- ✅ Fallbacks para dados ausentes

## 📧 Configuração de Email

### Variáveis de Ambiente Necessárias
```bash
# SMTP Configuration (Hostinger)
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="noreply@seudominio.com"
SMTP_PASS="sua-senha-email"
SMTP_FROM_EMAIL="noreply@seudominio.com"

# Webhook Security
KIRVANO_WEBHOOK_SECRET="sua-chave-secreta-webhook-kirvano"

# App URLs
NEXTAUTH_URL="https://app.tymerbook.com"
```

### Template de Email
- 📱 Design responsivo
- 🎨 Branding TymerBook
- 📋 Credenciais destacadas
- 🔗 CTA para login
- ⚠️ Avisos de segurança
- 📞 Informações de suporte

## 🎯 Eventos Suportados

| Evento | Ação | Descrição |
|--------|------|-----------|
| `assinatura.ativa` | Criar/Ativar | Nova assinatura ou reativação |
| `compra.aprovada` | Criar/Ativar | Compra única aprovada |
| `assinatura.cancelada` | Desativar | Cancelamento pelo cliente |
| `assinatura.expirada` | Desativar | Expiração automática |
| `assinatura.atrasada` | Carência | 5 dias de carência |

## 🗂️ Mapeamento de Planos

```typescript
const PLAN_MAPPING = {
  'basico': 'BASIC',
  'premium': 'PREMIUM', 
  'free': 'FREE',
  'gratuito': 'FREE'
}
```

## 🔄 Fluxo Pós-Criação

### Para o Usuário:
1. 📧 Recebe email de boas-vindas
2. 🔗 Clica no link de login
3. 🔑 Faz login com email + senha temporária
4. ⚙️ Vai em Configurações → Alterar Senha
5. 🏪 Configura dados do negócio
6. 👥 Adiciona profissionais e serviços
7. 📅 Começa a receber agendamentos

### Para o Sistema:
1. ✅ Tenant ativo no banco
2. 🔄 Webhook confirma sucesso (200 OK)
3. 📊 Métricas de conversão
4. 🔍 Logs detalhados para debug

## 🐛 Debug e Logs

### Logs de Sucesso
```
🔔 Webhook recebido da Kirvano - Evento: assinatura.ativa
🆕 Criando novo tenant para email: cliente@exemplo.com
✅ Novo tenant criado com ID: abc123
✅ Email de boas-vindas enviado para: cliente@exemplo.com
🎉 Onboarding automático concluído para tenant: cliente@exemplo.com
```

### Logs de Erro
```
❌ Token inválido no webhook da Kirvano
❌ Tenant não encontrado para o email
❌ Erro no onboarding automático
❌ Falha ao enviar email de boas-vindas
```

## 🚀 Deploy e Configuração

### 1. Configurar Webhook na Kirvano
- URL: `https://seudominio.com/api/webhooks/kirvano`
- Método: `POST`
- Header: `Kirvano-Token: sua-chave-secreta`
- Eventos: `assinatura.ativa`, `compra.aprovada`, etc.

### 2. Configurar Variáveis de Ambiente
- ✅ `KIRVANO_WEBHOOK_SECRET`
- ✅ `SMTP_*` (configurações de email)
- ✅ `NEXTAUTH_URL`

### 3. Testar Webhook
```bash
# Verificar se endpoint está ativo
curl https://seudominio.com/api/webhooks/kirvano
```

## 📞 Suporte e Contato

Para dúvidas sobre a implementação:
- 📧 Email: suporte@tymerbook.com
- 📋 Documentação: [Link da documentação]
- 🐛 Issues: [Link do repositório]

---

**✅ Status**: Implementado e testado
**🚀 Versão**: 1.0.0
**📅 Última atualização**: 30 de agosto de 2025
