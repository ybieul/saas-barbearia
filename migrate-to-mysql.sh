#!/bin/bash

# ============================================
# SCRIPT DE MIGRAÇÃO PARA MYSQL (HOSTINGER)
# ============================================

echo "🚀 Iniciando migração para MySQL..."

# 1. Verificar se o arquivo .env está configurado
if [ ! -f .env ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo "📝 Crie o arquivo .env com as configurações do MySQL da Hostinger"
    echo "💡 Exemplo: DATABASE_URL=\"mysql://user:password@host:3306/database\""
    exit 1
fi

# 2. Verificar se a string de conexão MySQL está presente
if ! grep -q "mysql://" .env; then
    echo "❌ DATABASE_URL não configurada para MySQL!"
    echo "📝 Configure DATABASE_URL no arquivo .env"
    echo "💡 Exemplo: DATABASE_URL=\"mysql://user:password@host:3306/database\""
    exit 1
fi

echo "✅ Configurações verificadas"

# 3. Instalar dependências
echo "📦 Instalando dependências do MySQL..."
npm install mysql2 --legacy-peer-deps

# 4. Gerar cliente Prisma
echo "🔧 Gerando cliente Prisma..."
npx prisma generate

# 5. Fazer push do schema para o banco
echo "📊 Enviando schema para o banco MySQL..."
npx prisma db push

# 6. Verificar se tudo funcionou
if [ $? -eq 0 ]; then
    echo "✅ Migração concluída com sucesso!"
    echo ""
    echo "🎯 Próximos passos:"
    echo "1. Execute 'npm run db:seed' para popular o banco"
    echo "2. Execute 'npm run dev' para iniciar o desenvolvimento"
    echo "3. Acesse 'npm run db:studio' para visualizar o banco"
    echo ""
    echo "📋 Comandos úteis:"
    echo "- npm run db:push     # Atualizar schema"
    echo "- npm run db:seed     # Popular com dados"
    echo "- npm run db:studio   # Abrir Prisma Studio"
    echo "- npm run db:reset    # Reset completo (CUIDADO!)"
else
    echo "❌ Erro na migração!"
    echo "🔍 Verifique:"
    echo "1. Conexão com o banco MySQL"
    echo "2. Credenciais no arquivo .env"
    echo "3. Permissões do usuário no banco"
fi
