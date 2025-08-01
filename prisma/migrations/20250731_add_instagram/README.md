# 🚀 Deploy - Migração Instagram

## 📋 **Checklist de Deploy**

### 1. **Backup do Banco** ⚠️
```bash
# Faça backup antes de aplicar
mysqldump -u usuario -p nome_banco > backup_antes_instagram.sql
```

### 2. **Aplicar Migração**
```bash
# Conecte no MySQL e execute:
mysql -u usuario -p nome_banco < migration.sql
```

### 3. **Verificar Migração**
```sql
-- Verificar se o campo foi criado
DESCRIBE Tenant;

-- Verificar dados migrados
SELECT businessName, businessInstagram 
FROM Tenant 
WHERE businessInstagram IS NOT NULL;
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
