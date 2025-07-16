#!/bin/bash

# 🚀 Script de Deploy Automático para VPS
# Execute este script no seu VPS após o setup inicial

echo "🚀 Iniciando deploy do SaaS Barbearia..."
echo "========================================"

# Verificar se está na pasta correta
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script na pasta do projeto!"
    exit 1
fi

echo "📦 Instalando dependências..."
# Limpar cache e instalações anteriores
rm -rf node_modules
rm -f package-lock.json

# Instalar com flags para resolver conflitos
npm install --production --legacy-peer-deps

if [ $? -ne 0 ]; then
    echo "❌ Erro na instalação das dependências!"
    exit 1
fi

echo "🗄️ Configurando banco de dados..."
npx prisma generate
npx prisma db push

if [ $? -ne 0 ]; then
    echo "❌ Erro na configuração do banco!"
    exit 1
fi

echo "🔨 Fazendo build da aplicação..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erro no build!"
    exit 1
fi

echo "🚀 Iniciando aplicação com PM2..."
pm2 stop saas-barbearia 2>/dev/null || true
pm2 delete saas-barbearia 2>/dev/null || true
pm2 start ecosystem.config.js

echo "💾 Salvando configuração PM2..."
pm2 save

echo "✅ Deploy concluído com sucesso!"
echo ""
echo "📋 Status dos serviços:"
pm2 status

echo ""
echo "🌐 Sua aplicação está rodando em:"
echo "   http://localhost:3000"
echo "   https://rifadosvianna.com.br"
echo ""
echo "📊 Para ver logs: pm2 logs saas-barbearia"
echo "🔄 Para reiniciar: pm2 restart saas-barbearia"
