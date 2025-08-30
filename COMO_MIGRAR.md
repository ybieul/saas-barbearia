# 🚀 Guia Rápido - Executar Migração Kirvano

## ✅ Arquivos de Migração Criados

1. **`migration-kirvano.sql`** - SQL puro para phpMyAdmin/MySQL
2. **`scripts/migrate-kirvano.sh`** - Script Linux/Mac
3. **`scripts/migrate-kirvano.ps1`** - Script Windows PowerShell
4. **`prisma/migrations/20250830_update_tenant_for_subscriptions/migration.sql`** - Migração Prisma

## 🎯 Opções de Execução

### **Opção 1: SQL Direto (Mais Simples)**
```bash
# No seu servidor, execute:
mysql -u seu_usuario -p seu_banco < migration-kirvano.sql
```

### **Opção 2: Via phpMyAdmin**
1. Abra o phpMyAdmin
2. Selecione seu banco de dados
3. Vá em "SQL"
4. Cole o conteúdo do arquivo `migration-kirvano.sql`
5. Execute

### **Opção 3: Via Prisma (Recomendado)**
```bash
# No diretório do projeto:
npx prisma db push
npx prisma generate
```

### **Opção 4: Script Automatizado**
```bash
# Linux/Mac:
./scripts/migrate-kirvano.sh

# Windows:
PowerShell -ExecutionPolicy Bypass -File scripts/migrate-kirvano.ps1
```

## 🔍 Verificação Após Migração

Execute no MySQL para confirmar:
```sql
-- Verificar se os campos foram adicionados
DESCRIBE Tenant;

-- Deve mostrar os novos campos:
-- kirvanoCustomerId (varchar(191), NULL, UNI)
-- kirvanoSubscriptionId (varchar(191), NULL, UNI)
-- businessPlan (varchar(191), NOT NULL, DEFAULT 'FREE')  
-- isActive (tinyint(1), NOT NULL, DEFAULT 0)
```

## ⚙️ Configuração Pós-Migração

### 1. Configurar Webhook Secret
```bash
# No arquivo .env do servidor:
KIRVANO_WEBHOOK_SECRET="sua-chave-secreta-aqui"
```

### 2. Testar Endpoint
```bash
# Teste se o webhook está ativo:
curl https://seudominio.com/api/webhooks/kirvano

# Resposta esperada:
{
  "message": "Kirvano Webhook Endpoint - Ready",
  "timestamp": "2025-08-30T...",
  "environment": "production"
}
```

## 🎯 Qual Opção Usar?

- **phpMyAdmin**: Se você prefere interface visual
- **SQL direto**: Se tem acesso SSH ao servidor
- **Prisma**: Se quer usar as ferramentas do framework
- **Script**: Se quer automação com verificações

Recomendo a **Opção 2 (phpMyAdmin)** por ser mais visual e segura para verificar cada passo.

## 📞 Pronto!

Após executar qualquer uma das opções, o sistema estará pronto para receber webhooks da Kirvano! 🎉
