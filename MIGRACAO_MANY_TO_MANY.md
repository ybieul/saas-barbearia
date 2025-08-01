# MIGRAÇÃO MANY-TO-MANY PARA UPSELLS
# =====================================

## ⚠️ IMPORTANTE: BACKUP ANTES DE EXECUTAR
```bash
# Fazer backup do banco de dados ANTES da migração
mysqldump -u u102726947_agenda -p u102726947_agenda > backup_antes_many_to_many.sql
```

# MIGRAÇÃO MANY-TO-MANY PARA UPSELLS
# =====================================

## ⚠️ IMPORTANTE: BACKUP ANTES DE EXECUTAR
```bash
# Fazer backup do banco de dados ANTES da migração
mysqldump -u u102726947_agenda -p u102726947_agenda > backup_antes_many_to_many.sql
```

## 📋 COMANDOS PARA EXECUTAR NO VPS (ORDEM CORRETA):

### 1. Parar a aplicação
```bash
pm2 stop all
```

### 2. Atualizar código
```bash
git pull origin main
```

### 3. ⚠️ PRESERVAR DADOS EXISTENTES (EXECUTAR PRIMEIRO)
```bash
# Conectar ao MySQL e executar script de backup dos relacionamentos
mysql -u u102726947_agenda -p u102726947_agenda < migracao_dados_many_to_many.sql
```

### 4. Executar migração Prisma
```bash
# Gerar cliente Prisma com novo schema
npx prisma generate

# Executar migração (remove serviceId e cria _AppointmentToService)
npx prisma migrate deploy
```

### 5. ⚠️ RESTAURAR RELACIONAMENTOS
```bash
# Conectar ao MySQL e executar os comandos de restauração:
mysql -u u102726947_agenda -p u102726947_agenda -e "
INSERT INTO _AppointmentToService (A, B)
SELECT appointmentId, serviceId 
FROM _temp_appointment_service_backup
WHERE appointmentId IN (SELECT id FROM appointments)
  AND serviceId IN (SELECT id FROM services);
"
```

### 6. Verificar migração
```bash
# Executar verificações
mysql -u u102726947_agenda -p u102726947_agenda < verificacao_migracao.sql
```

### 7. Limpar dados temporários (se tudo estiver OK)
```bash
mysql -u u102726947_agenda -p u102726947_agenda -e "DROP TABLE _temp_appointment_service_backup;"
```

### 8. Reiniciar aplicação
```bash
pm2 restart all
```

## 🔍 MUDANÇAS IMPLEMENTADAS:

### Schema (prisma/schema.prisma):
- ❌ Removido: `serviceId` do model Appointment
- ✅ Adicionado: `services Service[]` no model Appointment (many-to-many)
- ✅ Mantido: `appointments Appointment[]` no model Service

### API (app/api/public/appointments/route.ts):
- ✅ Calcula duração e preço total de todos os serviços
- ✅ Conecta múltiplos serviços via `services.connect`
- ✅ Suporte completo para upsells

### Frontend (app/agendamento/[slug]/page.tsx):
- ✅ Modal de upsells funcionando
- ✅ Envia array de serviços para API
- ✅ Calcula totais corretamente

## 🎯 RESULTADO ESPERADO:
- Agendamentos podem ter múltiplos serviços
- Duração total = soma de todos os serviços
- Preço total = soma de todos os serviços
- Interface mostra todos os serviços selecionados
- Dados salvos corretamente no banco

## 🚨 ROLLBACK (se necessário):
```bash
# Restaurar backup
mysql -u u102726947_agenda -p u102726947_agenda < backup_antes_many_to_many.sql

# Reverter código
git reset --hard HEAD~1

# Regenerar cliente
npx prisma generate

# Reiniciar
pm2 restart all
```

## 📞 TESTE APÓS MIGRAÇÃO:
1. Acessar página de agendamento público
2. Selecionar serviço principal
3. Adicionar upsells no modal
4. Confirmar que duração e preço somam corretamente
5. Verificar no banco se os serviços foram salvos na tabela de relacionamento
