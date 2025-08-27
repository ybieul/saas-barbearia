# Implementação Multi-Tenant WhatsApp com Evolution API

## Resumo da Implementação

Esta implementação permite que cada cliente (tenant) do sistema SaaS conecte seu próprio número de WhatsApp através da Evolution API, garantindo isolamento completo entre os clientes.

## Alterações Realizadas

### 1. Schema do Banco de Dados (Prisma)

**Arquivo:** `prisma/schema.prisma`

Adicionada nova coluna no modelo `Tenant`:

```prisma
// WhatsApp Evolution API
whatsapp_instance_name String? @unique // Nome da instância da Evolution API
```

**Comando para executar no servidor:**
```bash
npx prisma migrate dev --name add_whatsapp_instance_to_tenants
npx prisma generate
```

### 2. Rotas de API Implementadas

#### 2.1 Conectar WhatsApp - `POST /api/tenants/[tenantId]/whatsapp/connect`

**Funcionalidade:**
- Cria uma nova instância na Evolution API
- Gera nome único da instância: `tenant_{tenantId}`
- Retorna QR Code em base64 para conectar o WhatsApp
- Salva o nome da instância no banco de dados

**Payload de Resposta:**
```json
{
  "success": true,
  "instanceName": "tenant_cm0r8...",
  "qrcode": "data:image/png;base64,iVBORw0KG...",
  "message": "Instância WhatsApp criada com sucesso. Escaneie o QR Code para conectar.",
  "data": {
    "tenantId": "cm0r8...",
    "instanceName": "tenant_cm0r8...",
    "createdAt": "2025-08-27T..."
  }
}
```

#### 2.2 Verificar Status - `GET /api/tenants/[tenantId]/whatsapp/status`

**Funcionalidade:**
- Verifica se a instância WhatsApp está conectada
- Retorna status atual da conexão
- Atualiza o banco quando a conexão é confirmada

**Payload de Resposta:**
```json
{
  "connected": true,
  "instanceName": "tenant_cm0r8...",
  "status": "open",
  "data": {
    "tenantId": "cm0r8...",
    "instanceName": "tenant_cm0r8...",
    "lastCheck": "2025-08-27T..."
  }
}
```

#### 2.3 Desconectar WhatsApp - `DELETE /api/tenants/[tenantId]/whatsapp/disconnect`

**Funcionalidade:**
- Deleta a instância da Evolution API
- Remove o nome da instância do banco de dados
- Permite reconectar um novo número posteriormente

## Variáveis de Ambiente Necessárias

Certifique-se de que estas variáveis estão configuradas no servidor:

```env
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-chave-da-evolution-api
```

## Padrão de Nomenclatura

- **Nome da Instância:** `tenant_{tenantId}`
- **Exemplo:** `tenant_cm0r8x9y1000lm0p8q2r3s4t`

## Segurança Implementada

1. **Autenticação JWT:** Todas as rotas verificam token de autenticação
2. **Autorização por Tenant:** Usuário só pode gerenciar seu próprio tenant
3. **Instâncias Únicas:** Campo `whatsapp_instance_name` é único no banco
4. **Timeout de Requisições:** Proteção contra travamento da API
5. **Logs Detalhados:** Rastreamento completo das operações

## Fluxo de Uso

1. **Cliente clica "Conectar WhatsApp"**
   - Frontend chama `POST /api/tenants/{tenantId}/whatsapp/connect`
   - Sistema cria instância e retorna QR Code

2. **Cliente escaneia QR Code no WhatsApp**
   - WhatsApp conecta com a instância da Evolution API

3. **Sistema verifica conexão**
   - Frontend chama `GET /api/tenants/{tenantId}/whatsapp/status`
   - Sistema confirma conexão e salva no banco

4. **Cliente pode desconectar (opcional)**
   - Frontend chama `DELETE /api/tenants/{tenantId}/whatsapp/disconnect`
   - Sistema remove instância e limpa banco

## Status das Operações

### ✅ Implementado
- [x] Schema Prisma com nova coluna
- [x] Rota de conexão com QR Code
- [x] Rota de verificação de status
- [x] Rota de desconexão/reset
- [x] Autenticação e autorização
- [x] Tratamento de erros
- [x] Logs detalhados

### ⚠️ Pendente (Executar no Servidor)
- [ ] Migração do banco de dados
- [ ] Geração do cliente Prisma
- [ ] Descomentário das operações de banco nas rotas
- [ ] Teste das rotas em produção

## Próximos Passos

1. **Execute no servidor:**
   ```bash
   npx prisma migrate dev --name add_whatsapp_instance_to_tenants
   npx prisma generate
   ```

2. **Descomente as operações de banco** nas rotas após a migração

3. **Teste as rotas** com um cliente frontend

4. **Configure as variáveis de ambiente** da Evolution API

## Arquivos Criados/Modificados

```
prisma/schema.prisma (modificado)
app/api/tenants/[tenantId]/whatsapp/connect/route.ts (novo)
app/api/tenants/[tenantId]/whatsapp/status/route.ts (novo)
app/api/tenants/[tenantId]/whatsapp/disconnect/route.ts (novo)
```

## Considerações Técnicas

- **Isolamento Completo:** Cada tenant tem sua própria instância WhatsApp
- **Escalabilidade:** Suporta múltiplos clientes simultaneamente
- **Recuperação de Falhas:** Sistema de limpeza em caso de erro
- **Flexibilidade:** Cliente pode reconectar diferentes números
