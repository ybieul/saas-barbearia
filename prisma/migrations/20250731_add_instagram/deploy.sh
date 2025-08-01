#!/bin/bash

# ================================================
# SCRIPT DE DEPLOY - Instagram Field Migration
# Data: 31/07/2025
# ================================================

echo "🚀 Iniciando deploy da migração Instagram..."

# Configurações (ajuste conforme necessário)
DB_USER="seu_usuario"
DB_NAME="seu_banco"
BACKUP_DIR="/home/backup"
DATE=$(date +%Y%m%d_%H%M%S)

echo "📦 Fazendo backup do banco de dados..."
mysqldump -u $DB_USER -p $DB_NAME > $BACKUP_DIR/backup_before_instagram_$DATE.sql
if [ $? -eq 0 ]; then
    echo "✅ Backup criado: backup_before_instagram_$DATE.sql"
else
    echo "❌ Erro ao fazer backup. Abortando deploy."
    exit 1
fi

echo "🗃️ Aplicando migração..."
mysql -u $DB_USER -p $DB_NAME < migration.sql
if [ $? -eq 0 ]; then
    echo "✅ Migração aplicada com sucesso!"
else
    echo "❌ Erro ao aplicar migração."
    exit 1
fi

echo "🔍 Verificando resultados..."
mysql -u $DB_USER -p $DB_NAME -e "SELECT COUNT(*) as total_instagrams FROM Tenant WHERE businessInstagram IS NOT NULL;"

echo "🎉 Deploy concluído com sucesso!"
echo "📋 Próximos passos:"
echo "   1. Testar painel de configurações"
echo "   2. Testar modal na página pública"
echo "   3. Verificar links do Instagram"
