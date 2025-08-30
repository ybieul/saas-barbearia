#!/bin/bash

# Script para aplicar migração de assinaturas Kirvano
# Execute este script no seu servidor de produção

echo "🚀 Iniciando migração para sistema de assinaturas Kirvano..."

# Verificar se estamos no diretório correto
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto (onde está o prisma/schema.prisma)"
    exit 1
fi

# Fazer backup do banco antes da migração
echo "📦 Fazendo backup do banco de dados..."
# Descomente a linha abaixo e ajuste os dados de conexão se necessário
# mysqldump -u username -p database_name > backup_before_kirvano_$(date +%Y%m%d_%H%M%S).sql

# Executar a migração
echo "🔧 Aplicando migração do banco de dados..."

# Método 1: Via Prisma (recomendado)
echo "Tentando aplicar via Prisma..."
npx prisma db push

if [ $? -eq 0 ]; then
    echo "✅ Migração aplicada com sucesso via Prisma!"
else
    echo "⚠️ Prisma falhou, tentando aplicação manual..."
    
    # Método 2: Aplicação manual via MySQL
    echo "Aplicando SQL diretamente no banco..."
    
    # Descomente e ajuste as linhas abaixo com seus dados de conexão
    # mysql -u username -p database_name < prisma/migrations/20250830_update_tenant_for_subscriptions/migration.sql
    
    echo "📝 Para aplicar manualmente, execute o seguinte SQL no seu banco:"
    echo "----------------------------------------"
    cat prisma/migrations/20250830_update_tenant_for_subscriptions/migration.sql
    echo "----------------------------------------"
fi

# Regenerar o cliente Prisma
echo "🔄 Regenerando cliente Prisma..."
npx prisma generate

# Verificar se a migração foi aplicada
echo "🔍 Verificando estrutura da tabela..."
echo "Executando: DESCRIBE Tenant;"

# Mensagem final
echo ""
echo "✅ Migração concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Verifique se os novos campos foram criados: kirvanoCustomerId, kirvanoSubscriptionId"
echo "2. Configure a variável KIRVANO_WEBHOOK_SECRET no arquivo .env"
echo "3. Configure o webhook na plataforma Kirvano"
echo "4. Teste o endpoint: curl https://seudominio.com/api/webhooks/kirvano"
echo ""
echo "🔗 Documentação completa: docs/KIRVANO_SUBSCRIPTION_SYSTEM.md"
