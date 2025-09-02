# 🐛 Correção do Mapeamento de Planos no Webhook da Kirvano

## 📋 Problema Identificado

O webhook da Kirvano estava recebendo o nome correto do plano (ex: "Plano Ultra"), mas estava salvando sempre o valor "BASIC" no banco de dados, independentemente do plano comprado pelo cliente.

### Evidências do Bug:
- **JSON do Webhook**: `"name": "Plano Ultra"`
- **Banco de Dados**: `businessPlan: "BASIC"`

## 🔍 Causa Raiz

O código estava usando um mapeamento fixo (`PLAN_MAPPING`) que:
1. Não cobria todos os nomes de planos da Kirvano
2. Tinha lógica de fallback que sempre retornava "BASIC"
3. Ignorava o nome exato recebido no webhook

```typescript
// ❌ CÓDIGO PROBLEMÁTICO (ANTES)
const PLAN_MAPPING: { [key: string]: string } = {
  'basico': 'BASIC',
  'premium': 'PREMIUM',
  'free': 'FREE',
  'gratuito': 'FREE'
}

const mappedPlan = PLAN_MAPPING[planName.toLowerCase()] || 'BASIC'
```

## ✅ Solução Implementada

### 1. Nova Função de Mapeamento Inteligente

```typescript
function mapKirvanoPlanName(kirvanoPlanName: string): string {
  const normalizedName = kirvanoPlanName.toLowerCase().trim()
  
  // Mapeamento baseado no nome exato do plano da Kirvano
  if (normalizedName.includes('ultra')) {
    return 'ULTRA'
  }
  if (normalizedName.includes('premium')) {
    return 'PREMIUM'
  }
  if (normalizedName.includes('básico') || normalizedName.includes('basico')) {
    return 'BASIC'
  }
  if (normalizedName.includes('free') || normalizedName.includes('gratuito')) {
    return 'FREE'
  }
  
  // Padrão: se não conseguir identificar, assumir BASIC
  console.warn(`⚠️ Plano não reconhecido: "${kirvanoPlanName}", usando BASIC como padrão`)
  return 'BASIC'
}
```

### 2. Extração Correta do Nome do Plano

```typescript
// ✅ CÓDIGO CORRIGIDO (DEPOIS)
const planNameFromKirvano = webhookData.plan.name
const mappedPlan = mapKirvanoPlanName(planNameFromKirvano)

console.log(`📝 Nome do plano da Kirvano: "${planNameFromKirvano}"`)
console.log(`📝 Plano mapeado para o sistema: "${mappedPlan}"`)
```

### 3. Aplicação Consistente

A correção foi aplicada em ambos os cenários:
- **Tenant Existente**: Atualização de assinatura
- **Tenant Novo**: Criação com onboarding

## 🧪 Mapeamento de Planos

| Nome da Kirvano | Sistema Interno | Status |
|-----------------|----------------|---------|
| "Plano Ultra" | ULTRA | ✅ |
| "Plano Premium" | PREMIUM | ✅ |
| "Plano Básico" | BASIC | ✅ |
| "Plano Basico" | BASIC | ✅ |
| "Plano Free" | FREE | ✅ |
| "Plano Gratuito" | FREE | ✅ |

## 📊 Logs de Debug

O sistema agora gera logs detalhados para facilitar o debug:

```
📝 Nome do plano da Kirvano: "Plano Ultra"
📝 Plano mapeado para o sistema: "ULTRA"
✅ Assinatura atualizada para tenant existente xxx - Plano: ULTRA
```

## 🎯 Resultado Final

- ✅ Plano "Ultra" da Kirvano → `businessPlan: "ULTRA"` no banco
- ✅ Plano "Premium" da Kirvano → `businessPlan: "PREMIUM"` no banco  
- ✅ Plano "Básico" da Kirvano → `businessPlan: "BASIC"` no banco
- ✅ Logs detalhados para monitoramento
- ✅ Fallback seguro para planos não reconhecidos

## 🚀 Deploy

A correção foi aplicada no arquivo:
- `app/api/webhooks/kirvano/[secret]/route.ts`

Status: **✅ PRODUÇÃO PRONTA**

---

**Data da Correção**: 1 de setembro de 2025  
**Commit**: `cb7b0b9 - 🐛 Corrigir mapeamento do plano no webhook da Kirvano`
