# 🚀 Deploy do Sistema de Horários - Produção

## Instruções para aplicar no servidor VPS

### 1. **Fazer upload dos arquivos**
Certifique-se de que todos os novos arquivos foram enviados para o servidor:
- `prisma/migrations/20250815_add_professional_schedules_tables/`
- `app/api/professionals/[id]/schedules/`
- `app/api/professionals/[id]/exceptions/`
- `app/api/exceptions/[exceptionId]/`
- `app/api/public/business/[slug]/availability-v2/`
- `lib/schedule-utils.ts`
- `lib/types/schedule.ts`
- `hooks/use-schedule.ts`
- Schema Prisma atualizado

### 2. **Executar no servidor**
```bash
# Conectar ao servidor
ssh seu-usuario@seu-servidor.com

# Navegar para o diretório do projeto
cd /caminho/para/seu/projeto

# Instalar/atualizar dependências
npm install --production --legacy-peer-deps

# Gerar cliente Prisma com novos modelos
npx prisma generate

# Aplicar mudanças no banco (CUIDADO: backup antes!)
npx prisma db push

# Verificar se as tabelas foram criadas
npx prisma db execute --stdin <<EOF
SHOW TABLES LIKE '%schedule%';
DESCRIBE professional_schedules;  
DESCRIBE schedule_exceptions;
EOF

# Reiniciar aplicação
pm2 restart all
```

### 3. **Testar os endpoints**

#### Configurar horário de um profissional:
```bash
curl -X PUT "https://seudominio.com/api/professionals/ID_DO_PROFISSIONAL/schedules" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {"dayOfWeek": 1, "startTime": "08:00", "endTime": "17:00"},
    {"dayOfWeek": 2, "startTime": "08:00", "endTime": "17:00"},
    {"dayOfWeek": 3, "startTime": "08:00", "endTime": "17:00"},
    {"dayOfWeek": 4, "startTime": "08:00", "endTime": "17:00"},
    {"dayOfWeek": 5, "startTime": "08:00", "endTime": "18:00"}
  ]'
```

#### Criar um bloqueio:
```bash
curl -X POST "https://seudominio.com/api/professionals/ID_DO_PROFISSIONAL/exceptions" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDatetime": "2025-08-20T12:00:00",
    "endDatetime": "2025-08-20T13:00:00", 
    "reason": "Almoço",
    "type": "BLOCK"
  }'
```

#### Testar disponibilidade:
```bash
curl "https://seudominio.com/api/public/business/SEU_SLUG/availability-v2?professionalId=ID_DO_PROFISSIONAL&date=2025-08-20&serviceDuration=30"
```

### 4. **Validações importantes**

#### Verificar se as tabelas foram criadas:
```sql
-- No MySQL/phpMyAdmin
SHOW TABLES LIKE '%schedule%';

-- Deve retornar:
-- professional_schedules
-- schedule_exceptions
```

#### Verificar estrutura das tabelas:
```sql
DESCRIBE professional_schedules;
-- Campos: id, professional_id, day_of_week, start_time, end_time, created_at, updated_at

DESCRIBE schedule_exceptions;  
-- Campos: id, professional_id, start_datetime, end_datetime, reason, type, created_at, updated_at
```

### 5. **Troubleshooting**

#### Se der erro no `prisma generate`:
```bash
# Limpar cache e regenerar
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client
npm install @prisma/client
npx prisma generate
```

#### Se der erro no `prisma db push`:
```bash
# Verificar conexão com o banco
npx prisma db execute --stdin <<EOF
SELECT 1;
EOF

# Verificar se o schema está correto
npx prisma validate
```

#### Se a aplicação não reiniciar:
```bash
# Verificar status do PM2
pm2 status

# Ver logs de erro
pm2 logs

# Reiniciar processo específico
pm2 restart nome-da-aplicacao
```

### 6. **Backup recomendado**
Antes de executar `db push`, faça backup do banco:
```bash
mysqldump -u usuario -p banco_de_dados > backup_antes_horarios.sql
```

### 7. **Monitoramento**
Após o deploy, monitore os logs por alguns minutos:
```bash
pm2 logs --lines 50
tail -f /var/log/nginx/access.log  # se usar Nginx
```

---

## ✅ Checklist final

- [ ] Arquivos enviados para o servidor
- [ ] `npm install` executado
- [ ] `npx prisma generate` executado  
- [ ] `npx prisma db push` executado
- [ ] Tabelas `professional_schedules` e `schedule_exceptions` criadas
- [ ] Aplicação reiniciada com `pm2 restart all`
- [ ] Endpoints testados e funcionando
- [ ] Logs verificados sem erros

**🎉 Sistema de horários dos profissionais ativo em produção!**
