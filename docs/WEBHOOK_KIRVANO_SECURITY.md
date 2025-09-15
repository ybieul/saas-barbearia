# 🔒 Webhook Kirvano com Segurança por URL

## 📋 Configuração Atualizada

O webhook da Kirvano agora usa **segurança por chave secreta na URL** ao invés de headers ou tokens no body.

### 🔑 URL do Webhook Segura

```
https://seudominio.com/api/webhooks/kirvano/[SUA_CHAVE_SECRETA]
```

**Exemplo:**
```
https://minhabarbearia.com/api/webhooks/kirvano/minha-chave-secreta-url-123
```

### ⚙️ Variável de Ambiente Necessária

Adicione no seu `.env` de produção:

```bash
KIRVANO_WEBHOOK_SECRET_PATH=minha-chave-secreta-url-123
```

> ⚠️ **Importante:** A chave secreta na URL deve ser **exatamente igual** à variável de ambiente.

### 🛡️ Como Funciona a Segurança

1. **URL Dinâmica:** `/api/webhooks/kirvano/[secret]`
2. **Validação:** Compara `params.secret` da URL com `process.env.KIRVANO_WEBHOOK_SECRET_PATH`
3. **Falha:** Retorna `401 Unauthorized` se as chaves não coincidirem
4. **Sucesso:** Processa o webhook normalmente

### 📝 Configuração na Kirvano

1. **Acesse** o painel da Kirvano
2. **Configure o webhook** com a URL completa:
   ```
   https://seudominio.com/api/webhooks/kirvano/sua-chave-secreta-aqui
   ```
3. **Eventos** a configurar:
   - `assinatura.ativa`
   - `compra.aprovada` 
   - `assinatura.cancelada`
   - `assinatura.expirada`
   - `assinatura.atrasada`

### 🧪 Teste de Segurança

**URL Correta:**
```bash
POST https://seudominio.com/api/webhooks/kirvano/minha-chave-secreta-url-123
# ✅ Status: 200 - Webhook processado
```

**URL Incorreta:**
```bash
POST https://seudominio.com/api/webhooks/kirvano/chave-errada
# ❌ Status: 401 - Unauthorized
```

### 📊 Logs de Segurança

O sistema registra tentativas de acesso inválidas:

```
🚨 Tentativa de acesso ao webhook com chave secreta inválida: [chave-errada]
🔑 Chave esperada: [minha-chave-secreta-url-123]
```

### ✅ Vantagens desta Abordagem

- 🔒 **Security through obscurity**
- 🚫 **Sem headers especiais** necessários
- 🎯 **URL única** e privada 
- 📝 **Logs detalhados** de tentativas
- 🛡️ **Fácil de renovar** (mudança na variável de ambiente)
