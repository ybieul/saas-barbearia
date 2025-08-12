# 🚨 DIAGNÓSTICO E CORREÇÃO - SERVIDOR/MYSQL TIMEZONE

## 🔍 **PROBLEMAS IDENTIFICADOS PÓS-MIGRAÇÃO UBUNTU:**

### **1. DIFERENÇAS ENTRE SERVIDOR ANTIGO VS NOVO:**
- **Servidor antigo**: Timezone configurado corretamente
- **Servidor novo**: Configurações de timezone não migradas
- **MySQL**: Interpretando dados como UTC em vez de BRT
- **Sistema**: Timezone pode estar em UTC

### **2. SINAIS DO PROBLEMA NO SERVIDOR/MYSQL:**
```
❌ Input: 09:00 → Banco salva: 12:00 (+3h)
❌ Agendamentos "desaparecem" na agenda
❌ Inconsistência entre componentes
❌ Filtros de data não encontram dados
```

---

## 🛠️ **CORREÇÕES NECESSÁRIAS NO SERVIDOR:**

### **PRIORIDADE 1 - MYSQL:**
```sql
-- Configurar timezone globalmente
SET GLOBAL time_zone = '-03:00';
SET SESSION time_zone = '-03:00';
FLUSH PRIVILEGES;
```

### **PRIORIDADE 2 - SISTEMA:**
```bash
# Configurar timezone do Ubuntu
sudo timedatectl set-timezone America/Sao_Paulo
```

### **PRIORIDADE 3 - MYSQL CONFIG:**
```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
default-time-zone = '-03:00'
log_timestamps = SYSTEM
```

### **PRIORIDADE 4 - NODE.JS/PM2:**
```javascript
// ecosystem.config.js
env: {
  NODE_ENV: 'production',
  TZ: 'America/Sao_Paulo'  // ← Adicionar esta linha
}
```

---

## 🚨 **SCRIPT DE CORREÇÃO AUTOMÁTICA:**

Execute no servidor: `./fix-server-timezone.sh`

**Ou execute manualmente:**

```bash
# 1. Configurar sistema
sudo timedatectl set-timezone America/Sao_Paulo

# 2. Configurar MySQL
echo "default-time-zone = '-03:00'" | sudo tee -a /etc/mysql/mysql.conf.d/mysqld.cnf
sudo systemctl restart mysql

# 3. Configurar timezone via SQL
mysql -u root -p -e "SET GLOBAL time_zone = '-03:00'; SET SESSION time_zone = '-03:00';"

# 4. Atualizar código
cd /var/www/saas-barbearia
git pull
npm install --legacy-peer-deps
pm2 restart all
```

---

## 🧪 **TESTES DE VALIDAÇÃO:**

### **1. Verificar timezone do sistema:**
```bash
timedatectl
date
```

### **2. Verificar timezone do MySQL:**
```sql
SELECT @@global.time_zone, @@session.time_zone, NOW(), UTC_TIMESTAMP();
```

### **3. Verificar Node.js:**
```bash
node -e "console.log(new Date().toString())"
```

### **4. Teste funcional:**
- Criar agendamento para 09:00
- Verificar se salva como 09:00 (não 12:00)
- Verificar se aparece na agenda
- Verificar logs: `pm2 logs --lines 50`

---

## 🎯 **EXPECTATIVA PÓS-CORREÇÃO:**

| Antes | Depois |
|-------|--------|
| ❌ 09:00 → 12:00 | ✅ 09:00 → 09:00 |
| ❌ Agendamentos desaparecem | ✅ Sempre visíveis |
| ❌ Inconsistência componentes | ✅ Consistência total |
| ❌ Filtros não funcionam | ✅ Filtros funcionando |

**A correção no servidor/MySQL deve resolver 100% do problema!**
