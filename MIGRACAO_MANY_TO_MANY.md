# MIGRAÇÃO MANY-TO-MANY PARA UPSELLS
# =====================================

## ⚠️ IMPORTANTE: BACKUP ANTES DE EXECUTAR
```bash
# Fazer backup do banco de dados ANTES da migração
mysqldump -u u102726947_agenda -p u102726947_agenda > backup_antes_many_to_many.sql
```

## 📋 COMANDOS PARA EXECUTAR NO VPS:

### 1. Parar a aplicação
```bash
pm2 stop all
```

### 2. Atualizar código
```bash
git pull origin main
```

### 3. Executar migração Prisma
```bash
# Gerar cliente Prisma com novo schema
npx prisma generate

# Executar migração (vai criar tabela de relacionamento)
npx prisma migrate deploy

# OU se preferir push direto:
# npx prisma db push
```

### 4. Verificar migração
```bash
# Verificar se tabela de relacionamento foi criada
mysql -u u102726947_agenda -p u102726947_agenda -e "SHOW TABLES LIKE '%Service%';"
```

### 5. Reiniciar aplicação
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
