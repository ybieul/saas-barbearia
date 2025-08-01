# 🚀 Deploy - Migração Instagram

## ⚠️ **IMPORTANTE: Verificar Nome da Tabela**

Baseado no erro que você recebeu, seu banco de produção pode ter uma estrutura diferente do desenvolvimento.

**ANTES DE EXECUTAR:** Verifique qual tabela principal seu banco usa:

```sql
SHOW TABLES;
```

- Se você tem uma tabela chamada `Tenant` → Use o arquivo `migration.sql`
- Se você tem uma tabela chamada `users` → Use o arquivo `migration_for_users_table.sql`

## 📋 **Checklist de Deploy**

### 1. **Backup do Banco** ⚠️
```bash
# Faça backup antes de aplicar
mysqldump -u usuario -p nome_banco > backup_antes_instagram.sql
```

### 2. **Verificar Estrutura**
```sql
-- Verificar quais tabelas existem
SHOW TABLES;

-- Verificar estrutura da tabela principal
DESCRIBE Tenant;  -- ou DESCRIBE users;
```

### 3. **Aplicar Migração**

**Se sua tabela principal é `Tenant`:**
```bash
mysql -u usuario -p nome_banco < migration.sql
```

**Se sua tabela principal é `users`:**
```bash
mysql -u usuario -p nome_banco < migration_for_users_table.sql
```

### 4. **Verificar Migração**
```sql
-- Para tabela Tenant:
DESCRIBE Tenant;
SELECT businessName, businessInstagram FROM Tenant WHERE businessInstagram IS NOT NULL;

-- Para tabela users:
DESCRIBE users;
SELECT businessName, businessInstagram FROM users WHERE businessInstagram IS NOT NULL;
```

### 4. **Deploy do Código**
- ✅ Código já está pronto para usar `businessInstagram`
- ✅ APIs já fazem query SQL direta
- ✅ Modal já funciona com campo correto

### 5. **Testar em Produção**
- [ ] Salvar Instagram no painel de configurações
- [ ] Verificar modal na página pública  
- [ ] Confirmar links do Instagram funcionando

## 🔄 **Rollback (se necessário)**
```sql
ALTER TABLE `Tenant` DROP COLUMN `businessInstagram`;
```

## 📝 **Notas**
- Campo é opcional (`NULL` permitido)
- Migração automática dos dados existentes
- Compatível com sistema atual
