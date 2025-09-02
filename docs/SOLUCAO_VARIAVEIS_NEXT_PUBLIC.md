# Solução: Exposição de Variáveis NEXT_PUBLIC para o Frontend

## 🎯 Problema Identificado

A depuração revelou que as variáveis de ambiente `NEXT_PUBLIC_*` estavam sendo lidas corretamente pelo backend (servidor), mas não estavam sendo **injetadas** no código do frontend (browser).

**Evidências do problema:**
- ✅ Debug endpoint `/api/debug-env` mostrava: `NEXT_PUBLIC_NUMERO_PARA_SUPORTE: "24981757110"`
- ❌ Console do browser mostrava: `process.env.NEXT_PUBLIC_NUMERO_PARA_SUPORTE: undefined`

## 🔧 Solução Implementada

### Modificação do `next.config.mjs`

Adicionamos a configuração `env` ao arquivo de configuração do Next.js para **forçar** a injeção das variáveis NEXT_PUBLIC no build:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... outras configurações ...

  // Garantir que variáveis NEXT_PUBLIC sejam injetadas corretamente no frontend
  env: {
    // Variável para número de suporte via WhatsApp
    NEXT_PUBLIC_NUMERO_PARA_SUPORTE: process.env.NEXT_PUBLIC_NUMERO_PARA_SUPORTE,
    
    // Outras variáveis NEXT_PUBLIC encontradas no projeto
    NEXT_PUBLIC_ENABLE_PROFESSIONAL_SCHEDULES: process.env.NEXT_PUBLIC_ENABLE_PROFESSIONAL_SCHEDULES,
    NEXT_PUBLIC_DEBUG_AVAILABILITY_COMPARISON: process.env.NEXT_PUBLIC_DEBUG_AVAILABILITY_COMPARISON,
    
    // Adicione aqui qualquer nova variável NEXT_PUBLIC_ que criar no futuro
    // NEXT_PUBLIC_NOVA_VARIAVEL: process.env.NEXT_PUBLIC_NOVA_VARIAVEL,
  },
  
  // ... resto das configurações ...
}
```

## 📋 Como Funciona

### 1. **Build Time Injection**
- Durante `npm run build`, o Next.js lê as variáveis do `process.env` do servidor
- As variáveis listadas na seção `env` são **injetadas** no bundle do JavaScript
- Ficam disponíveis como `process.env.VARIAVEL_NAME` no código do frontend

### 2. **Diferença Entre Métodos**
```javascript
// ❌ MÉTODO AUTOMÁTICO (nem sempre funciona)
// Só funciona se Next.js detectar automaticamente o uso da variável
const numero = process.env.NEXT_PUBLIC_NUMERO_PARA_SUPORTE;

// ✅ MÉTODO EXPLÍCITO (sempre funciona)
// Forçamos a injeção via next.config.mjs > env
const numero = process.env.NEXT_PUBLIC_NUMERO_PARA_SUPORTE;
```

## 🚀 Próximos Passos

### 1. Deploy da Solução
```bash
# Commit das alterações
git add next.config.mjs
git commit -m "fix: Force NEXT_PUBLIC variables injection via next.config.mjs"
git push

# No EasyPanel, faça um novo build/deploy
```

### 2. Teste da Solução

#### A) Teste do Debug Endpoint (deve continuar funcionando)
```bash
curl https://seudominio.com/api/debug-env
```

#### B) Teste do Frontend (agora deve funcionar)
1. Acesse a página `/dashboard/assinatura`
2. Clique no botão "Contatar Suporte"
3. Verifique os logs no console do browser:
   ```
   --- DEBUG VARIÁVEL DE SUPORTE ---
   Procurando por variável: "NEXT_PUBLIC_NUMERO_PARA_SUPORTE"
   Valor encontrado no process.env: 24981757110  ← DEVE APARECER O NÚMERO
   ```

#### C) Teste do WhatsApp
- O botão deve redirecionar para: `https://wa.me/24981757110`
- NÃO deve usar o fallback `24981757110`

## ⚠️ Pontos Importantes

### 1. **Variáveis Futuras**
Sempre que criar uma nova variável `NEXT_PUBLIC_*`, adicione-a na seção `env` do `next.config.mjs`:

```javascript
env: {
  // ... variáveis existentes ...
  NEXT_PUBLIC_NOVA_VARIAVEL: process.env.NEXT_PUBLIC_NOVA_VARIAVEL,
},
```

### 2. **Build é Obrigatório**
- As variáveis são injetadas apenas durante o **build**
- Mudanças nas variáveis de ambiente exigem um novo build
- Em produção (EasyPanel), isso significa um novo deploy

### 3. **Validação**
- Sempre use o debug endpoint para confirmar que as variáveis existem no servidor
- Use console.log no frontend para confirmar que as variáveis foram injetadas
- Teste a funcionalidade real (WhatsApp, etc.)

## 📊 Status da Implementação

- ✅ **Configuração**: `next.config.mjs` atualizado
- ✅ **Build Local**: Compilação bem-sucedida
- ✅ **Documentação**: Atualizada
- 🔄 **Próximo**: Deploy e teste em produção

## 🔍 Troubleshooting Futuro

Se o problema persistir após essa implementação:

1. **Verifique se a variável existe no servidor** (debug endpoint)
2. **Verifique se a variável está listada no next.config.mjs**
3. **Confirme que foi feito um novo build/deploy**
4. **Teste localmente com `npm run build && npm start`**

---

**Data da implementação**: 2 de setembro de 2025  
**Status**: ✅ Pronto para deploy
