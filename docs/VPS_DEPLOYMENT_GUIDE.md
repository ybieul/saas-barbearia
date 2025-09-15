# Deployment e Teste do Cron Job Multi-Tenant

## 🚀 Script Pronto para Produção

O script `scripts/whatsapp-reminders-cron.ts` foi completamente refatorado e está pronto para deploy no VPS.

## 🔧 Configurações Necessárias no VPS

### 1. **Variáveis de Ambiente**
Certifique-se de que estas variáveis estão configuradas no VPS:

```bash
# Evolution API
EVOLUTION_API_URL=http://evolution_api_evolution-api:8080/
EVOLUTION_API_KEY=ef4d238b2ba14ed5853e41801d624727

# Database
DATABASE_URL=mysql://usuario:senha@localhost:3306/saas_barbearia
```

### 2. **Verificar Configuração do Docker**
```bash
# Verificar se a Evolution API está rodando
docker ps | grep evolution

# Verificar conectividade interna do Docker
docker exec -it saas-container curl http://evolution_api_evolution-api:8080/instance/fetchInstances \
  -H "apikey: ef4d238b2ba14ed5853e41801d624727"
```

## 🧪 Como Testar no VPS

### 1. **Teste Manual do Script**
```bash
# Navegar para o diretório do projeto
cd /path/to/saas-barbearia

# Executar teste único
npx ts-node scripts/whatsapp-reminders-cron.ts

# Ou compilar e executar
npx tsc scripts/whatsapp-reminders-cron.ts --outDir dist --target es2020 --module commonjs
node dist/scripts/whatsapp-reminders-cron.js
```

### 2. **Logs Esperados (Sucesso)**
```bash
🚀 [CRON-MULTI-TENANT] Iniciando a lógica de verificação e envio de lembretes multi-tenant...
🇧🇷 [CRON-START] Horário brasileiro atual: 27/08/2025, 20:30:00
🔄 [MULTI-TENANT] Processando reminder_12h...
📅 Buscando agendamentos entre 2025-08-27T22:25:00.000Z e 2025-08-27T22:35:00.000Z
📊 [MULTI-TENANT] Encontrados 1 agendamentos candidatos para reminder_12h
✅ [VALID] Processando lembrete para tenant: Gabriel Barboza da Silva (instância: tenant_omega7e890000o90jjkma8pnv)
📤 [REMINDER] Preparando envio via Evolution API
🏢 Instância: tenant_omega7e890000o90jjkma8pnv
📤 [MULTI-TENANT] Enviando mensagem WhatsApp...
🌐 [MULTI-TENANT] Enviando para Evolution API: http://evolution_api_evolution-api:8080/message/sendText/tenant_omega7e890000o90jjkma8pnv
📡 [MULTI-TENANT] Evolution API response status: 200
✅ [MULTI-TENANT] Mensagem enviada via Evolution API
📊 [REMINDER] Resultado do envio: SUCESSO
✅ [SENT] Lembrete reminder_12h enviado para Gabriel Barboza da Silva via instância tenant_omega7e890000o90jjkma8pnv
🎉 MULTI-TENANT: Processamento concluído. Total de lembretes enviados: 1
```

### 3. **Logs Esperados (Problemas de Conectividade)**
```bash
❌ [MULTI-TENANT] Configuração Evolution API incompleta
🔍 [MULTI-TENANT] Debug Environment Variables:
  EVOLUTION_API_URL: ❌ Não definida
  EVOLUTION_API_KEY: ❌ Não definida

# OU

❌ [MULTI-TENANT] Evolution API error: 404 - Instance not found
❌ [REMINDER-FAIL] Erro específico no envio de lembrete: Error: Falha ao enviar mensagem via WhatsApp para instância tenant_omega7e890000o90jjkma8pnv
```

## 🔍 Diagnóstico de Problemas

### **Problema 1: Evolution API não responde**
```bash
# Testar conectividade direta
curl -X GET "http://evolution_api_evolution-api:8080/instance/fetchInstances" \
  -H "apikey: ef4d238b2ba14ed5853e41801d624727" \
  -H "Content-Type: application/json"
```

### **Problema 2: Instância não encontrada**
```bash
# Verificar se a instância existe
curl -X GET "http://evolution_api_evolution-api:8080/instance/connectionState/tenant_omega7e890000o90jjkma8pnv" \
  -H "apikey: ef4d238b2ba14ed5853e41801d624727"
```

### **Problema 3: Agendamentos não encontrados**
```bash
# Verificar dados no banco
mysql -u usuario -p -e "
USE saas_barbearia;
SELECT 
  a.id,
  a.dateTime,
  a.status,
  t.businessName,
  t.whatsapp_instance_name,
  u.name as cliente,
  u.phone
FROM appointments a 
JOIN tenants t ON a.tenantId = t.id 
JOIN end_users u ON a.endUserId = u.id 
WHERE t.whatsapp_instance_name IS NOT NULL 
AND a.dateTime BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 25 HOUR)
ORDER BY a.dateTime;
"
```

## ⏰ Configurar Cron Job

### **Cron Tab Entry**
```bash
# Editar crontab
crontab -e

# Adicionar entrada (executar a cada 5 minutos)
*/5 * * * * cd /path/to/saas-barbearia && /usr/bin/npx ts-node scripts/whatsapp-reminders-cron.ts >> /var/log/whatsapp-reminders.log 2>&1

# OU usando PM2 para melhor controle
# pm2 start ecosystem.config.js --only whatsapp-reminders-cron
```

## 📊 Monitoramento

### **Logs do Cron Job**
```bash
# Ver logs em tempo real
tail -f /var/log/whatsapp-reminders.log

# Buscar erros
grep "ERROR" /var/log/whatsapp-reminders.log

# Verificar sucessos
grep "SENT" /var/log/whatsapp-reminders.log
```

### **Verificar Lembretes Enviados**
```bash
mysql -u usuario -p -e "
USE saas_barbearia;
SELECT 
  ar.reminderType,
  ar.sentAt,
  a.dateTime as agendamento,
  u.name as cliente,
  t.businessName as barbearia
FROM appointment_reminders ar
JOIN appointments a ON ar.appointmentId = a.id
JOIN tenants t ON a.tenantId = t.id
JOIN end_users u ON a.endUserId = u.id
WHERE DATE(ar.sentAt) = CURDATE()
ORDER BY ar.sentAt DESC;
"
```

## 🎯 Teste Específico para o Problema Atual

Baseado no print fornecido, teste especificamente:

```bash
# 1. Verificar se a instância tenant_omega7e890000o90jjkma8pnv está conectada
curl -X GET "http://evolution_api_evolution-api:8080/instance/connectionState/tenant_omega7e890000o90jjkma8pnv" \
  -H "apikey: ef4d238b2ba14ed5853e41801d624727"

# 2. Testar envio de mensagem para esta instância
curl -X POST "http://evolution_api_evolution-api:8080/message/sendText/tenant_omega7e890000o90jjkma8pnv" \
  -H "apikey: ef4d238b2ba14ed5853e41801d624727" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511999999999",
    "text": "Teste de mensagem do cron job"
  }'
```

---

**Status**: ✅ **SCRIPT PRONTO PARA PRODUÇÃO COM LOGS DETALHADOS**
