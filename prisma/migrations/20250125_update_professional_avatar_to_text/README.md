# Migração: Update Avatar Fields to TEXT

## Descrição
Esta migração atualiza os campos `avatar` nas tabelas `professionals` e `tenants` de `VARCHAR(191)` para `TEXT`, permitindo armazenar imagens em Base64 de qualquer tamanho.

## Motivo
O campo `avatar` precisa suportar strings Base64 longas para armazenar imagens de perfil. O tipo `VARCHAR(191)` do MySQL tem limitação de tamanho que causa erros ao salvar imagens.

## Tabelas Afetadas
- `professionals.avatar` → `TEXT`
- `tenants.avatar` → `TEXT`

## Como aplicar no servidor VPS

### 1. Fazer backup do banco (IMPORTANTE)
```bash
# Conectar ao VPS
ssh root@SEU_IP_VPS

# Fazer backup completo
mysqldump -u saas_user -p barbershop_saas > backup_before_avatar_migration_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Navegar até o projeto
```bash
cd /var/www/saas-barbearia
```

### 3. Atualizar código do GitHub
```bash
git pull origin main
```

### 4. Aplicar a migração
```bash
# Gerar Prisma Client
npx prisma generate

# Aplicar migração ao banco
npx prisma db push

# OU, se preferir usar migrate (recomendado em produção):
npx prisma migrate deploy
```

### 5. Reiniciar aplicação
```bash
pm2 restart saas-barbearia
```

### 6. Verificar se funcionou
```bash
# Ver logs da aplicação
pm2 logs saas-barbearia --lines 20

# Testar upload de avatar no sistema
# Acesse: https://rifadosvianna.com.br/dashboard/configuracoes
```

## Rollback (se necessário)
Se algo der errado, você pode reverter:

```bash
# Restaurar backup
mysql -u saas_user -p barbershop_saas < backup_before_avatar_migration_YYYYMMDD_HHMMSS.sql

# Reverter código
git reset --hard HEAD~1

# Reinstalar dependências
npm install --production --legacy-peer-deps
npm run build
pm2 restart saas-barbearia
```

## Verificação Manual (Opcional)
```sql
-- Conectar ao MySQL
mysql -u saas_user -p barbershop_saas

-- Verificar estrutura da tabela
DESCRIBE professionals;
DESCRIBE tenants;

-- O campo avatar deve aparecer como 'text' no Type
```

## Status
- ✅ Migração criada
- ⏳ Aguardando deploy no servidor
- ⏳ Teste em produção

**Data de criação**: 25/01/2025  
**Versão**: 1.0  
**Ambiente**: Produção (VPS)
