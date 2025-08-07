# 🛠️ INSTRUÇÕES PARA CORREÇÃO DO ERRO DE UPLOAD DE IMAGENS

## ❌ Problema Identificado:
O erro ocorre porque os campos `avatar` (profissionais) e `image` (serviços) no banco de dados estão limitados a `TEXT` (máx. ~65KB), mas imagens 1024x1024px em base64 podem ter ~1.4MB.

## ✅ Solução Implementada:

### 1. Schema Prisma Corrigido:
- ✅ **Professional.avatar**: `@db.Text` → `@db.LongText`
- ✅ **Service.image**: `String?` → `@db.LongText`
- ✅ **Tenant.businessLogo**: já estava `@db.LongText` (por isso funcionava)

### 2. API Business Atualizada:
- ✅ Removido código de truncamento desnecessário

### 3. Migração SQL Criada:
- ✅ Arquivo: `prisma/migrations/20250807_update_image_fields.sql`

## 🚨 AÇÃO NECESSÁRIA - Execute no seu banco MySQL:

```sql
-- Conecte-se ao seu banco MySQL e execute:
USE barbershop_saas;

-- Atualizar campo avatar dos profissionais
ALTER TABLE professionals MODIFY COLUMN avatar LONGTEXT;

-- Atualizar campo image dos serviços  
ALTER TABLE services MODIFY COLUMN image LONGTEXT;

-- Verificar se as alterações foram aplicadas
DESCRIBE professionals;
DESCRIBE services;
```

## ✅ Após executar a migração:
1. As imagens 1024x1024px funcionarão perfeitamente
2. Não haverá mais erro "valor muito longo para a coluna"
3. Upload funcionará igual à aba estabelecimento

## 🔍 Como Verificar se Funcionou:
1. Execute a migração SQL acima
2. Teste upload de imagem 1024x1024px nos profissionais
3. Teste upload de imagem 1024x1024px nos serviços
4. Ambos devem funcionar sem erro

## 📱 Teste Recomendado:
- Use uma imagem 1024x1024px real
- Teste nos profissionais e serviços
- Verifique se salva e carrega corretamente
