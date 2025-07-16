# ============================================
# GUIA DE MIGRAÇÃO PARA MYSQL (HOSTINGER)
# ============================================

## 📋 PASSOS PARA MIGRAÇÃO COMPLETA

### 1. CONFIGURAR BANCO DE DADOS NA HOSTINGER

1. **Acesse o phpMyAdmin da Hostinger**
2. **Crie um novo banco de dados:**
   - Nome: `u123456789_barbershop` (substitua pelo seu)
   - Encoding: `utf8mb4_unicode_ci`

3. **Configure as variáveis de ambiente:**
   ```bash
   # No arquivo .env (produção)
   DATABASE_URL="mysql://u123456789_saas:SuaSenhaSegura@srv1001.hstgr.io:3306/u123456789_barbershop"
   ```

### 2. INSTALAR DEPENDÊNCIAS

```bash
# Instalar dependências do MySQL
npm install mysql2
npm install @prisma/client prisma

# Gerar cliente Prisma
npx prisma generate

# Executar migração
npx prisma db push
```

### 3. ESTRUTURA DO BANCO (MULTI-TENANT)

#### Tabelas Principais:
- **tenants**: Nossos clientes (donos de barbearias)
- **end_users**: Clientes finais (clientes das barbearias)
- **appointments**: Agendamentos
- **services**: Serviços
- **professionals**: Profissionais
- **financial_records**: Registros financeiros
- **whatsapp_logs**: Logs do WhatsApp
- **promotion_templates**: Templates de promoção

#### Relacionamentos:
```
Tenant (1) ──── (N) EndUser
Tenant (1) ──── (N) Appointment
Tenant (1) ──── (N) Service
Tenant (1) ──── (N) Professional
```

### 4. COMANDOS DE MIGRAÇÃO

```bash
# 1. Reset completo (CUIDADO - apaga tudo)
npx prisma migrate reset

# 2. Migração inicial
npx prisma migrate dev --name init

# 3. Deploy em produção
npx prisma migrate deploy

# 4. Seed com dados iniciais
npx prisma db seed
```

### 5. CONFIGURAÇÃO DE PRODUÇÃO

#### Hostinger - Variáveis de Ambiente:
```env
DATABASE_URL="mysql://usuario:senha@servidor:3306/banco"
NEXTAUTH_SECRET="chave-super-secreta-producao"
NEXTAUTH_URL="https://seudominio.com"
ENVIRONMENT="production"
```

#### Scripts package.json:
```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "start": "next start",
    "db:migrate": "prisma migrate deploy",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

### 6. BACKUP E SEGURANÇA

#### Backup diário (phpMyAdmin):
```sql
-- Exportar todas as tabelas
-- Formato: SQL
-- Opções: Estrutura e dados
```

#### Índices importantes:
```sql
-- Performance para queries multi-tenant
CREATE INDEX idx_tenant_appointments ON appointments(tenantId, dateTime);
CREATE INDEX idx_tenant_endusers ON end_users(tenantId, phone);
CREATE INDEX idx_tenant_services ON services(tenantId, category);
```

### 7. MONITORAMENTO

#### Queries de monitoramento:
```sql
-- Verificar espaço das tabelas
SELECT 
    table_name,
    round(((data_length + index_length) / 1024 / 1024), 2) AS "DB Size in MB"
FROM information_schema.tables 
WHERE table_schema = "nome_do_banco";

-- Verificar performance
SHOW PROCESSLIST;
```

## 🚀 DEPLOY NA HOSTINGER

### 1. Upload dos arquivos
### 2. Configurar variáveis de ambiente
### 3. Executar migrações
### 4. Testar conexão
### 5. Monitorar logs

## 📊 ESTRUTURA FINAL

```
Sistema SaaS Barbearia
├── Tenant (Barbearia A)
│   ├── EndUsers (Clientes da Barbearia A)
│   ├── Appointments (Agendamentos da Barbearia A)
│   └── Services (Serviços da Barbearia A)
├── Tenant (Barbearia B)
│   ├── EndUsers (Clientes da Barbearia B)
│   ├── Appointments (Agendamentos da Barbearia B)
│   └── Services (Serviços da Barbearia B)
└── ...
```

Cada barbearia (Tenant) tem seus dados completamente isolados!
