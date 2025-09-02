# Sistema de Debug para Variáveis de Ambiente NEXT_PUBLIC

## Problema Diagnosticado

A variável de ambiente `NEXT_PUBLIC_NUMERO_PARA_SUPORTE` não estava sendo exposta ao frontend, mesmo estando configurada no EasyPanel. Este é um problema comum com variáveis `NEXT_PUBLIC_*` em aplicações Next.js.

## Soluções Implementadas

### 1. Endpoint de Debug no Servidor (`/api/debug-env`)

**Arquivo:** `app/api/debug-env/route.ts`

**Funcionalidade:**
- Lista todas as variáveis de ambiente `NEXT_PUBLIC_*` disponíveis no servidor
- Mostra o `NODE_ENV` atual
- Fornece timestamp da consulta
- Conta total de variáveis encontradas

**Como usar:**
```bash
curl https://seudominio.com/api/debug-env
```

**Resposta esperada:**
```json
{
  "message": "Variáveis de ambiente NEXT_PUBLIC_ encontradas no servidor",
  "variables": {
    "NEXT_PUBLIC_NUMERO_PARA_SUPORTE": "24981757110"
  },
  "totalFound": 1,
  "timestamp": "2025-09-02T...",
  "nodeEnv": "production"
}
```

### 2. Sistema Robusto de Leitura no Frontend

**Arquivo:** `app/dashboard/assinatura/page.tsx`

**Melhorias implementadas:**

#### A) Configuração Robusta
```typescript
const SUPPORT_VARIABLE_NAME = 'NEXT_PUBLIC_NUMERO_PARA_SUPORTE';
const supportNumberFromEnv = process.env[SUPPORT_VARIABLE_NAME];
const fallbackNumber = '24981757110';
const finalSupportNumber = supportNumberFromEnv || fallbackNumber;
```

#### B) Debug Avançado
```typescript
onClick={async () => {
  // Logs detalhados
  console.log('--- DEBUG VARIÁVEL DE SUPORTE ---');
  console.log(`Procurando por variável: "${SUPPORT_VARIABLE_NAME}"`);
  console.log(`Valor encontrado no process.env:`, supportNumberFromEnv);
  console.log(`Número final que será usado:`, finalSupportNumber);
  
  // Comparação com servidor
  const debugResponse = await fetch('/api/debug-env');
  const debugData = await debugResponse.json();
  console.log('🔍 DEBUG DO SERVIDOR:', debugData);
}}
```

## Como Diagnosticar em Produção

### Passo 1: Verificar Servidor
Acesse: `https://seudominio.com/api/debug-env`

**Se retornar variável:**
- ✅ Variável configurada no servidor
- ⚠️ Problema na injeção no frontend

**Se não retornar variável:**
- ❌ Variável não está configurada no EasyPanel
- 🔧 Configurar no painel e reiniciar aplicação

### Passo 2: Verificar Frontend
Abra o console do navegador na página de assinatura e clique em "Contatar Suporte".

**Logs esperados:**
```
--- DEBUG VARIÁVEL DE SUPORTE ---
Procurando por variável: "NEXT_PUBLIC_NUMERO_PARA_SUPORTE"
Valor encontrado no process.env: "24981757110"
Número final que será usado: "24981757110"
🔍 DEBUG DO SERVIDOR: {...}
✅ Redirecionando para WhatsApp: 24981757110
```

### Passo 3: Diagnóstico por Logs

#### ✅ **Funcionamento Correto**
- Servidor retorna a variável
- Frontend lê a variável corretamente
- Usa número configurado

#### ⚠️ **Servidor OK, Frontend com Fallback**
- Servidor retorna a variável
- Frontend mostra `undefined` 
- Usa número de fallback
- **Solução**: Rebuild da aplicação com variável configurada

#### ❌ **Servidor sem Variável**
- Servidor retorna array vazio
- Frontend usa fallback
- **Solução**: Configurar variável no EasyPanel e reiniciar

## Instruções para Deploy

### No EasyPanel:
1. **Definir variável de ambiente:**
   ```
   NEXT_PUBLIC_NUMERO_PARA_SUPORTE=24981757110
   ```

2. **Rebuild da aplicação** (importante!)
   - As variáveis `NEXT_PUBLIC_*` são injetadas durante a build
   - Apenas reiniciar não é suficiente

3. **Verificar após deploy:**
   - Acessar `/api/debug-env`
   - Testar botão na página de assinatura
   - Verificar logs do console

## Arquivos Criados/Modificados

- ✅ `app/api/debug-env/route.ts` - Endpoint de diagnóstico
- ✅ `app/dashboard/assinatura/page.tsx` - Sistema robusto de leitura
- ✅ `docs/DEBUG_VARIAVEIS_AMBIENTE.md` - Esta documentação

## Benefícios do Sistema

1. **Diagnóstico Rápido**: API endpoint mostra status do servidor
2. **Logs Detalhados**: Console frontend com informações completas
3. **Fallback Robusto**: Sistema funciona mesmo com problemas
4. **Prevenção de Erros**: Evita erros de digitação com constantes
5. **Comparação Servidor/Cliente**: Identifica onde está o problema

## Data de Implementação

02/09/2025 - Sistema de debug completo implementado
