#!/bin/bash
# 🔍 Script de Verificação para Deploy na Hostinger

echo "🚀 Verificando configuração para deploy na Hostinger..."
echo "=================================================="

# Verificar se o .env existe
if [ -f ".env" ]; then
    echo "✅ Arquivo .env encontrado"
else
    echo "❌ Arquivo .env não encontrado! Copie o .env.example"
    exit 1
fi

# Verificar se as variáveis principais estão configuradas
if grep -q "mysql://u.*@srv.*\.hstgr\.io" .env; then
    echo "✅ DATABASE_URL configurada para Hostinger"
else
    echo "⚠️  DATABASE_URL ainda não configurada para Hostinger"
fi

if grep -q "https://" .env; then
    echo "✅ URLs configuradas para HTTPS"
else
    echo "⚠️  URLs ainda em HTTP (localhost)"
fi

if grep -q "ENVIRONMENT=\"production\"" .env; then
    echo "✅ Ambiente configurado para produção"
else
    echo "⚠️  Ambiente ainda em desenvolvimento"
fi

# Verificar se o Prisma está configurado
echo ""
echo "🗄️ Verificando configuração do banco..."
if npx prisma validate; then
    echo "✅ Schema do Prisma válido"
else
    echo "❌ Erro no schema do Prisma"
fi

# Verificar se o build funciona
echo ""
echo "🔨 Testando build..."
if npm run build; then
    echo "✅ Build executado com sucesso"
else
    echo "❌ Erro no build"
    exit 1
fi

echo ""
echo "🎉 Verificação concluída!"
echo "📋 Próximos passos:"
echo "   1. Configure as variáveis do .env com dados reais da Hostinger"
echo "   2. Faça upload dos arquivos para o servidor"
echo "   3. Execute: npm install --production"
echo "   4. Execute: npx prisma db push"
echo "   5. Execute: npm start"
