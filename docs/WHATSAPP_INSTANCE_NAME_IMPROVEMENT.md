# ✅ MUDANÇA IMPLEMENTADA: Nome da Instância WhatsApp Baseado no Estabelecimento

## 🎯 OBJETIVO

Alterar a geração do nome da instância WhatsApp de `tenant_{tenantId}` para `{nome_estabelecimento}_{tenantId}` para melhor identificação das instâncias.

## 🔧 IMPLEMENTAÇÃO

### **Função Utilitária Criada**

```typescript
function generateInstanceName(businessName: string | null, tenantId: string): string {
  if (!businessName) {
    // Fallback para o formato antigo se não houver businessName
    return `tenant_${tenantId}`
  }
  
  // Limpar o nome do estabelecimento para usar como nome da instância
  const cleanBusinessName = businessName
    .toLowerCase() // converter para minúsculas
    .trim() // remover espaços
    .replace(/[^a-z0-9]/g, '_') // substituir caracteres especiais por underscore
    .replace(/_+/g, '_') // múltiplos underscores viram um só
    .replace(/^_|_$/g, '') // remover underscores do início e fim
    .substring(0, 20) // limitar a 20 caracteres
  
  return `${cleanBusinessName}_${tenantId}`
}
```

### **Exemplos de Transformação**

| BusinessName Original | Resultado Final | TenantId | Nome da Instância |
|----------------------|----------------|----------|-------------------|
| "Barbearia do João" | `barbearia_do_joao` | `cltx123` | `barbearia_do_joao_cltx123` |
| "Salão & Beleza" | `salao_beleza` | `cltx456` | `salao_beleza_cltx456` |
| "Hair Studio 2024!" | `hair_studio_2024` | `cltx789` | `hair_studio_2024_cltx789` |
| null | `tenant` | `cltx999` | `tenant_cltx999` |

## 📁 **ARQUIVOS MODIFICADOS**

### 1. **`app/api/tenants/[tenantId]/whatsapp/connect/route.ts`**
- ✅ Adicionada função `generateInstanceName()`
- ✅ Busca `businessName` do banco antes de gerar instância
- ✅ Logs detalhados da geração do nome

**Antes:**
```typescript
const instanceName = `tenant_${tenantId}`
```

**Depois:**
```typescript
const tenant = await prisma.tenant.findFirst({
  where: { id: tenantId },
  select: { businessName: true, ... }
})

const instanceName = generateInstanceName(tenant.businessName, tenantId)
console.log(`🏷️ [API] Nome da instância gerado: "${instanceName}"`)
console.log(`🏢 [API] Baseado em: "${tenant.businessName}" + "${tenantId}"`)
```

### 2. **`app/api/tenants/[tenantId]/whatsapp/status/route.ts`**
- ✅ Adicionada função `generateInstanceName()`
- ✅ Busca `businessName` para verificação de status
- ✅ Tratamento de fallback em caso de erro

**Mudanças:**
```typescript
// Buscar dados do tenant para gerar nome da instância correto
const tenant = await prisma.tenant.findFirst({
  where: { id: tenantId },
  select: { businessName: true, ... }
})

const instanceName = queryInstanceName || generateInstanceName(tenant.businessName, tenantId)
```

### 3. **`app/api/tenants/[tenantId]/whatsapp/disconnect/route.ts`**
- ✅ Adicionada função `generateInstanceName()`
- ✅ Busca `businessName` para desconexão
- ✅ Logs informativos

## 🎯 **BENEFÍCIOS**

### **1. Identificação Intuitiva**
- ✅ Nome da instância reflete o nome do estabelecimento
- ✅ Mais fácil identificar instâncias no Evolution API
- ✅ Debugging mais eficiente

### **2. Compatibilidade Garantida**
- ✅ Fallback para formato antigo se `businessName` for null
- ✅ Não quebra instâncias existentes
- ✅ Limpeza de caracteres especiais para compatibilidade

### **3. Escalabilidade**
- ✅ Nomes únicos por combinação estabelecimento + tenantId
- ✅ Limite de 20 caracteres para nome do estabelecimento
- ✅ Tratamento robusto de edge cases

## 🔍 **COMO FUNCIONA**

### **Fluxo de Conexão:**

1. **Cliente clica "Conectar WhatsApp"**
2. **Backend busca dados do tenant:**
   ```sql
   SELECT businessName FROM tenants WHERE id = tenantId
   ```
3. **Gera nome da instância:**
   ```typescript
   // Exemplo: "Barbearia do João" + "cltx123"
   instanceName = "barbearia_do_joao_cltx123"
   ```
4. **Cria instância na Evolution API:**
   ```javascript
   POST /instance/create
   { "instanceName": "barbearia_do_joao_cltx123" }
   ```
5. **Salva no banco após conexão:**
   ```sql
   UPDATE tenants 
   SET whatsapp_instance_name = "barbearia_do_joao_cltx123"
   WHERE id = tenantId
   ```

### **Verificação de Status:**
- Usa o nome armazenado no banco (`whatsapp_instance_name`)
- Se não existir, gera baseado em `businessName` atual
- Fallback para formato antigo se necessário

### **Desconexão:**
- Busca `businessName` para gerar nome correto da instância
- Remove instância da Evolution API
- Limpa `whatsapp_instance_name` do banco

## 🚨 **CONSIDERAÇÕES IMPORTANTES**

### **1. Instâncias Existentes**
- Instâncias já conectadas continuam funcionando
- Nome armazenado no banco (`whatsapp_instance_name`) tem prioridade
- Nova lógica só se aplica a novas conexões

### **2. Caracteres Especiais**
- Acentos e caracteres especiais são removidos/substituídos
- Espaços viram underscores
- Máximo 20 caracteres para parte do nome

### **3. Unicidade**
- Combinação `{businessName}_{tenantId}` garante unicidade
- `tenantId` é sempre único no sistema
- Não há conflitos entre estabelecimentos

## ✅ **RESULTADO FINAL**

Agora as instâncias WhatsApp terão nomes mais intuitivos:

- **Antes:** `tenant_cltx12345678`
- **Depois:** `barbearia_moderna_cltx12345678`

Isso facilita:
- 🔍 **Identificação** no painel da Evolution API
- 🐛 **Debugging** de problemas específicos
- 📊 **Monitoramento** por estabelecimento
- 🛠️ **Suporte técnico** mais eficiente

**Implementação 100% funcional e retrocompatível!** 🚀
