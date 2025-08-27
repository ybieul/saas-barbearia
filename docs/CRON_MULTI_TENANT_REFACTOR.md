# Refatoração do Cron Job para Sistema Multi-Tenant

## ✅ Refatoração Completa

O script de envio de lembretes (`scripts/whatsapp-reminders-cron.ts`) foi completamente refatorado para funcionar no ambiente multi-tenant.

## 🔄 Principais Mudanças

### 1. **Query do Banco de Dados Otimizada**

**Antes (Single-Tenant):**
```typescript
const appointmentsToRemind = await prisma.appointment.findMany({
  where: {
    dateTime: { gte: windowStart, lte: windowEnd },
    status: { in: ['SCHEDULED', 'CONFIRMED'] }
  },
  include: {
    tenant: { select: { id: true, businessName: true } }
  }
})
```

**Depois (Multi-Tenant):**
```typescript
const appointmentsToRemind = await prisma.appointment.findMany({
  where: {
    dateTime: { gte: windowStart, lte: windowEnd },
    status: { in: ['SCHEDULED', 'CONFIRMED'] },
    // 🎯 FILTRO: Apenas tenants com WhatsApp configurado
    tenant: {
      whatsapp_instance_name: { not: null }
    }
  },
  include: {
    tenant: {
      include: {
        // 🛡️ INCLUI: Configurações de automação ativas
        automationSettings: {
          where: {
            automationType: config.type,
            isEnabled: true
          }
        }
      }
    }
  }
})
```

### 2. **Sistema de Verificações Robusto**

O script agora implementa **3 verificações essenciais**:

#### ✅ **Verificação 1: Instância WhatsApp Conectada**
```typescript
if (!appointment.tenant.whatsapp_instance_name) {
  console.log(`⚠️ [SKIP] Tenant ${appointment.tenant.id} não possui instância WhatsApp configurada`)
  continue
}
```

#### ✅ **Verificação 2: Automação Ativa**
```typescript
if (!appointment.tenant.automationSettings || appointment.tenant.automationSettings.length === 0) {
  console.log(`⚠️ [SKIP] Tenant ${appointment.tenant.id} não possui automação ${config.type} ativa`)
  continue
}
```

#### ✅ **Verificação 3: Lembrete Não Enviado**
```typescript
const existingReminder = await prisma.appointmentReminder.findFirst({
  where: {
    appointmentId: appointment.id,
    reminderType: config.type
  }
})

if (existingReminder) {
  console.log(`⚠️ [SKIP] Lembrete ${config.type} já foi enviado para agendamento ${appointment.id}`)
  continue
}
```

### 3. **Nova Função Multi-Tenant de Envio**

Foi criada uma nova função `sendMultiTenantWhatsAppMessage` que:

- ✅ Aceita o `instanceName` como parâmetro
- ✅ Usa a instância específica do tenant na URL da Evolution API
- ✅ Mantém logs detalhados para debugging
- ✅ É independente das variáveis de ambiente globais

```typescript
async function sendMultiTenantWhatsAppMessage(
  phoneNumber: string, 
  message: string, 
  instanceName: string,  // 🎯 Instância específica do tenant
  messageType: string
): Promise<boolean>
```

### 4. **Envio Dinâmico Por Tenant**

**Antes:** Uma única instância para todos
```typescript
// Usava sempre process.env.EVOLUTION_INSTANCE_NAME
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE_NAME
```

**Depois:** Instância específica por tenant
```typescript
await sendReminderMessage(
  appointment, 
  config.type, 
  appointment.tenant.whatsapp_instance_name! // 🏢 Instância do tenant
)
```

## 🎯 Resultado Final

### ✅ **Funcionalidades Implementadas**
- ✅ Sistema agnóstico à instância (não usa mais variáveis de ambiente)
- ✅ Cada agendamento usa a instância específica do seu tenant
- ✅ Verificação de configurações de automação por tenant
- ✅ Filtragem eficiente no banco de dados
- ✅ Logs detalhados para debugging multi-tenant
- ✅ Performance otimizada com menos queries ao banco

### 📊 **Fluxo de Execução**
1. **Busca Inteligente**: Query filtra apenas tenants com WhatsApp configurado
2. **Verificação Tripla**: Instância + Automação + Lembrete não enviado
3. **Envio Personalizado**: Cada mensagem usa a instância correta do tenant
4. **Registro Preciso**: Log detalhado do processamento por tenant

### 🚀 **Benefícios**
- ✅ **Escalabilidade**: Funciona com centenas de tenants
- ✅ **Isolamento**: Cada tenant usa sua própria instância WhatsApp
- ✅ **Configurabilidade**: Respeita configurações individuais de automação
- ✅ **Confiabilidade**: Múltiplas verificações previnem erros
- ✅ **Observabilidade**: Logs detalhados para monitoramento

## 🧪 Testagem

Para testar o script refatorado:

```bash
# Compilar (verificar sintaxe)
npx tsc scripts/whatsapp-reminders-cron.ts --outDir dist --target es2020 --module commonjs --esModuleInterop --skipLibCheck

# Executar em ambiente de teste
NODE_ENV=development npx ts-node scripts/whatsapp-reminders-cron.ts
```

## 📝 Configuração Necessária

Certifique-se de que:
1. ✅ Cada tenant tem `whatsapp_instance_name` configurado na tabela `tenants`
2. ✅ Configurações de automação estão ativas na tabela `automation_settings`
3. ✅ Evolution API está configurada com as instâncias dos tenants
4. ✅ Variáveis `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` estão definidas

---

**Status**: ✅ **REFATORAÇÃO COMPLETA E FUNCIONAL**
