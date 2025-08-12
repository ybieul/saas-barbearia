#!/bin/bash

# 🇧🇷 SCRIPT DE CORREÇÃO COMPLETA DO TIMEZONE
# ==========================================
# Este script aplica todas as correções necessárias após a migração do Ubuntu

echo "🇧🇷 ===== APLICANDO CORREÇÃO COMPLETA DO TIMEZONE ====="
echo

# 1. Configurar MySQL timezone (se ainda não feito)
echo "1️⃣ Configurando MySQL timezone..."
mysql -u root -p -e "
SET GLOBAL time_zone = '-03:00';
SET SESSION time_zone = '-03:00';
SELECT @@global.time_zone, @@session.time_zone;
SHOW VARIABLES LIKE '%time_zone%';
"

echo "✅ MySQL configurado"
echo

# 2. Testar Node.js timezone
echo "2️⃣ Testando Node.js timezone..."
node test-timezone-fix.js

echo "✅ Teste Node.js concluído"
echo

# 3. Reiniciar aplicação para aplicar mudanças no código
echo "3️⃣ Reiniciando aplicação..."

# Parar PM2
pm2 stop all

# Instalar dependências (se necessário)
pnpm install

# Gerar Prisma client com novas configurações
pnpm prisma generate

# Iniciar aplicação
pm2 start ecosystem.config.js

echo "✅ Aplicação reiniciada"
echo

# 4. Verificar status
echo "4️⃣ Verificando status..."
pm2 status
pm2 logs --lines 20

echo
echo "🎯 CORREÇÃO COMPLETA APLICADA!"
echo "📋 PRÓXIMOS PASSOS:"
echo "   1. Teste criando um agendamento no sistema"
echo "   2. Verifique se 09:00 aparece como 09:00 (não 12:00)"
echo "   3. Confirme que não há mais tremulação na agenda"
echo "   4. Execute: mysql -e 'SELECT id, dateTime FROM appointments ORDER BY id DESC LIMIT 1;'"
echo
