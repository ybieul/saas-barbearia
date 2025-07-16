#!/bin/bash

# 🔄 Script de Atualização Automática - SaaS Barbearia
# Execute este script no VPS para atualizar a aplicação

echo "🔄 Iniciando atualização do SaaS Barbearia..."
echo "============================================="

# Verificar se está na pasta correta
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script na pasta do projeto!"
    exit 1
fi

echo "📥 Baixando atualizações do GitHub..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Erro ao baixar atualizações!"
    exit 1
fi

echo "📦 Instalando/atualizando dependências..."
npm install --production

echo "🗄️ Atualizando banco de dados..."
npx prisma generate
npx prisma db push

echo "🔨 Rebuilding aplicação..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erro no build!"
    exit 1
fi

echo "🔄 Reiniciando aplicação..."
pm2 restart saas-barbearia

echo "✅ Atualização concluída com sucesso!"
echo ""
echo "📋 Status atual:"
pm2 status

echo ""
echo "📊 Para ver logs: pm2 logs saas-barbearia"
echo "🌐 Site: https://rifadosvianna.com.br"
