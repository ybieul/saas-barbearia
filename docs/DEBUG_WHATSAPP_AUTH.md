# Debug das Rotas WhatsApp Multi-Tenant

## ✅ CORREÇÃO APLICADA - Tratamento de Erro 404

### 🔧 **Problema Identificado e Corrigido:**

**❌ Comportamento Anterior (Incorreto):**
- Evolution API retorna 404 (instância não existe)
- Backend trata 404 como erro fatal 
- Retorna 500 Internal Server Error
- Frontend exibe "Erro na Evolution API: 404"

**✅ Comportamento Atual (Correto):**
- Evolution API retorna 404 (instância não existe) 
- Backend interpreta 404 como "desconectado" (estado válido)
- Retorna 200 OK com `{ "connected": false, "status": "close" }`
- Frontend exibe "WhatsApp não conectado" (estado normal)

### 🎯 **Lógica Implementada:**

```typescript
// Rota: GET /api/tenants/[tenantId]/whatsapp/status

if (!response.ok) {
  // 404 = Instância não existe = Estado VÁLIDO de "desconectado"
  if (response.status === 404) {
    return NextResponse.json({
      connected: false,
      status: 'close',
      // ... outros campos
    }) // Status 200 OK
  }
  
  // Outros erros (500, 401, etc.) = Erros REAIS
  return NextResponse.json({ error: ... }, { status: 500 })
}
```

## Logs Implementados

### ✅ Logs Adicionados nas Rotas de API

**Rota Status (`GET /api/tenants/[tenantId]/whatsapp/status`):**
- ✅ Verificação detalhada de token (Authorization header, cookie, x-auth-token)
- ✅ Logs de decodificação JWT
- ✅ Verificação de permissão tenant
- ✅ **NOVO:** Tratamento específico para erro 404 (desconectado)
- ✅ **NOVO:** Tratamento para timeout/erro de rede
- ✅ Tratamento específico de erros 401/403

**Rota Connect (`POST /api/tenants/[tenantId]/whatsapp/connect`):**
- ✅ Mesmos logs da rota Status
- ✅ Logs melhorados para criação de instância
- ✅ Tratamento de erros com limpeza de banco

### ✅ Logs Adicionados no Frontend

**Componente WhatsAppConnection:**
- ✅ Logs de chamadas à API
- ✅ Verificação de token e tenantId
- ✅ Logs de resposta da API
- ✅ Correção do nome do token: `auth_token` (era `token`)

## Como Testar a Correção

### 1. **Teste de Estado Desconectado**

1. Acesse `/dashboard/whatsapp` sem ter WhatsApp conectado
2. **Resultado Esperado:** 
   - ✅ Não deve mostrar erro vermelho
   - ✅ Deve mostrar "WhatsApp não conectado" 
   - ✅ Botão "Conectar WhatsApp" deve estar visível

### 2. **Verificar Logs do Servidor**

```bash
# Console do servidor deve mostrar:
⚠️ [API] Evolution API retornou status: 404
📴 [API] Instância não encontrada (404) - interpretando como desconectada

# E NÃO deve mostrar:
❌ [API] Erro ao verificar status: 404
```

### 3. **Verificar Network Tab do Navegador**

- **GET `/api/tenants/.../whatsapp/status`**
- **Status:** `200 OK` (não mais `500`)
- **Response Body:** 
```json
{
  "connected": false,
  "status": "close", 
  "error": "Instância não encontrada - WhatsApp desconectado"
}
```

## Estados Tratados pela API

### ✅ **Estados Válidos (Status 200)**
- ✅ `connected: true, status: "open"` - WhatsApp conectado
- ✅ `connected: false, status: "close"` - WhatsApp desconectado (404)
- ✅ `connected: false, status: "close"` - Timeout/erro de rede

### ❌ **Estados de Erro (Status 500)**  
- ❌ Erro 401/403 na Evolution API (problemas de auth)
- ❌ Erro 500 na Evolution API (problema interno)
- ❌ Erros inesperados de código

## Variáveis de Ambiente Críticas

```env
# Deve ser idêntica em frontend e backend
NEXTAUTH_SECRET=sua-chave-secreta-super-segura

# Para as rotas WhatsApp funcionarem
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-chave-da-evolution-api
```

## Status da Correção

### ✅ **Implementado e Corrigido**
- [x] ✅ **Tratamento de erro 404 como "desconectado"**
- [x] ✅ **Tratamento de timeout como "desconectado"**  
- [x] ✅ **Logs detalhados de autenticação**
- [x] ✅ **Logs de verificação de permissão**
- [x] ✅ **Correção do nome do token no frontend**
- [x] ✅ **Diferenciação entre erros reais e estados válidos**

### 📋 **Resultado Final**

**Antes:** Interface quebrada com "Erro na Evolution API: 404"
**Depois:** Interface limpa com "WhatsApp não conectado" + botão para conectar

🎉 **A correção elimina o erro 500 e permite que o frontend funcione normalmente quando o WhatsApp está desconectado!**

## Como Debugar

### 1. **Verificar Console do Navegador**

Abra `/dashboard/whatsapp` e verifique o console:

```
🔐 [Frontend] Fazendo chamada API: status
🔐 [Frontend] Token encontrado: ✅ Sim
🔐 [Frontend] TenantId: cm0r8x9y1000...
📡 [Frontend] Response status: 401
📡 [Frontend] Response ok: false
❌ [Frontend] Erro na API: {...}
```

### 2. **Verificar Console do Servidor**

No terminal do servidor, procure por:

```
--- INICIANDO VERIFICAÇÃO DE PERMISSÃO (STATUS) ---
1. Token do Authorization header: ✅ Encontrado
2. Token final obtido: ✅ eyJhbGciOiJIUzI1NiIs...
3. Tentando decodificar token...
3.1. NEXTAUTH_SECRET existe: ✅ Sim
4. ✅ Token decodificado com sucesso:
4.1. userId: cm0r8x9y1000...
4.2. tenantId: cm0r8x9y1000...
```

### 3. **Script de Debug Manual**

Execute o arquivo `debug-jwt-token.js` no console do navegador:

```javascript
// Cole o conteúdo do arquivo debug-jwt-token.js no console
```

### 4. **Possíveis Problemas e Soluções**

#### ❌ **Erro 401: "Token não fornecido"**
**Causa:** Frontend não está enviando token corretamente
**Solução:** 
- Verificar se `auth_token` existe no localStorage
- Confirmar se header `Authorization: Bearer {token}` está sendo enviado

#### ❌ **Erro 401: "Token inválido"** 
**Causa:** JWT não pode ser decodificado
**Soluções:**
- Verificar se `NEXTAUTH_SECRET` é a mesma no backend e frontend
- Token pode estar expirado
- Token pode estar corrompido

#### ❌ **Erro 403: "Sem permissão"**
**Causa:** tenantId da URL não corresponde ao tenantId do token
**Solução:**
- Verificar se `user.tenantId` corresponde ao parâmetro `[tenantId]` da rota
- Confirmar que o usuário está logado no tenant correto

## Estrutura Esperada do Token JWT

```json
{
  "userId": "cm0r8x9y1000...",
  "tenantId": "cm0r8x9y1000...", // ← Deve ser igual ao userId
  "email": "usuario@exemplo.com",
  "role": "OWNER",
  "iat": 1693123200,
  "exp": 1693728000
}
```

## Variáveis de Ambiente Críticas

```env
# Deve ser idêntica em frontend e backend
NEXTAUTH_SECRET=sua-chave-secreta-super-segura

# Para as rotas WhatsApp funcionarem
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-chave-da-evolution-api
```

## Status dos Logs

### ✅ Implementado
- [x] Logs detalhados de autenticação
- [x] Logs de verificação de permissão
- [x] Logs de resposta da API
- [x] Tratamento específico de erros 401/403
- [x] Script de debug manual
- [x] Correção do nome do token no frontend

### 📋 Próximos Passos

1. **Testar as rotas** com logs ativos
2. **Analisar saída dos logs** no console
3. **Identificar ponto exato da falha**
4. **Aplicar correção específica** baseada nos logs
5. **Remover logs de debug** após correção

## Como Testar

1. Faça login no sistema
2. Acesse `/dashboard/whatsapp`
3. Abra DevTools (F12)
4. Verifique logs no Console e Network
5. Cole o script `debug-jwt-token.js` no console
6. Clique em "Conectar WhatsApp" e observe os logs
7. Reporte os logs encontrados para análise
