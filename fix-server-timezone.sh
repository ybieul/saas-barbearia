#!/bin/bash

# 🚨 CORREÇÃO COMPLETA SERVIDOR/MYSQL - TIMEZONE
# ===============================================
# Script para corrigir todos os problemas de timezone no servidor

echo "🚨 ===== CORREÇÃO COMPLETA SERVIDOR/MYSQL ====="
echo

# 1. Verificar estado atual
echo "1️⃣ VERIFICANDO ESTADO ATUAL:"
echo "   Sistema:"
timedatectl | grep "Time zone"
echo "   Data atual:" $(date)
echo

# 2. Configurar timezone do sistema
echo "2️⃣ CONFIGURANDO TIMEZONE DO SISTEMA:"
sudo timedatectl set-timezone America/Sao_Paulo
echo "✅ Timezone do sistema configurado para America/Sao_Paulo"
echo

# 3. Configurar MySQL
echo "3️⃣ CONFIGURANDO MYSQL:"

# Backup da configuração atual
sudo cp /etc/mysql/mysql.conf.d/mysqld.cnf /etc/mysql/mysql.conf.d/mysqld.cnf.backup

# Adicionar configuração de timezone
echo "
# Timezone Configuration - Added $(date)
default-time-zone = '-03:00'
log_timestamps = SYSTEM
" | sudo tee -a /etc/mysql/mysql.conf.d/mysqld.cnf

echo "✅ Configuração MySQL atualizada"

# Reiniciar MySQL
echo "   Reiniciando MySQL..."
sudo systemctl restart mysql
sleep 5

# Verificar se MySQL iniciou
if sudo systemctl is-active --quiet mysql; then
    echo "✅ MySQL reiniciado com sucesso"
else
    echo "❌ Erro ao reiniciar MySQL"
    sudo systemctl status mysql
    exit 1
fi

# 4. Configurar MySQL via SQL
echo "4️⃣ CONFIGURANDO TIMEZONE VIA SQL:"
mysql -u root -p -e "
SET GLOBAL time_zone = '-03:00';
SET SESSION time_zone = '-03:00';
SELECT 'Timezone configurado:' as status, @@global.time_zone as global_tz, @@session.time_zone as session_tz;
FLUSH PRIVILEGES;
"

echo "✅ Timezone MySQL configurado via SQL"
echo

# 5. Configurar Node.js/PM2
echo "5️⃣ CONFIGURANDO NODE.JS/PM2:"

cd /var/www/saas-barbearia

# Backup ecosystem.config.js
cp ecosystem.config.js ecosystem.config.js.backup

# Verificar se já tem TZ configurado
if grep -q "TZ:" ecosystem.config.js; then
    echo "   TZ já configurado no ecosystem.config.js"
else
    # Adicionar TZ ao env
    sed -i '/env: {/a\      TZ: "America/Sao_Paulo",' ecosystem.config.js
    echo "✅ TZ adicionado ao ecosystem.config.js"
fi

# 6. Atualizar código
echo "6️⃣ ATUALIZANDO CÓDIGO:"
git pull
npm install --legacy-peer-deps
npx prisma generate
npm run build

echo "✅ Código atualizado"
echo

# 7. Reiniciar aplicação
echo "7️⃣ REINICIANDO APLICAÇÃO:"
pm2 restart all
sleep 5
pm2 save

echo "✅ Aplicação reiniciada"
echo

# 8. Verificações finais
echo "8️⃣ VERIFICAÇÕES FINAIS:"
echo "   Sistema timezone:" $(timedatectl | grep "Time zone")
echo "   MySQL timezone:"
mysql -u root -p -e "SELECT @@global.time_zone, @@session.time_zone, NOW(), UTC_TIMESTAMP();"
echo "   Node.js timezone:"
node -e "console.log('Node.js timezone:', new Date().toString())"
echo "   PM2 status:"
pm2 status
echo

# 9. Teste final
echo "9️⃣ TESTE DE TIMEZONE:"
node -e "
console.log('=== TESTE FINAL ===');
console.log('Date atual:', new Date().toString());
console.log('Timezone offset:', new Date().getTimezoneOffset());
console.log('ISO:', new Date().toISOString());
console.log('Locale BR:', new Date().toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'}));
"

echo
echo "🎯 CORREÇÃO COMPLETA APLICADA!"
echo "📋 PRÓXIMOS PASSOS:"
echo "   1. Testar criação de agendamento"
echo "   2. Verificar se horário 09:00 permanece 09:00"
echo "   3. Verificar se agendamentos não desaparecem"
echo "   4. Monitorar logs: pm2 logs --lines 50"
