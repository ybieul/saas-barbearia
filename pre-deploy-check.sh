#!/bin/bash

# 🚀 Script de verificação pré-deploy
# Execute antes do primeiro deploy para verificar se tudo está OK

echo "🔍 Verificando configuração pré-deploy..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: package.json não encontrado"
    echo "Execute este script na pasta raiz do projeto"
    exit 1
fi

# Verificar dependências
echo "📦 Verificando dependências..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não instalado"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm não instalado"
    exit 1
fi

# Verificar arquivos essenciais
echo "📁 Verificando arquivos essenciais..."
required_files=(".env.production" "deploy.sh" "update.sh" "ecosystem.config.js")

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Arquivo $file não encontrado"
        exit 1
    fi
done

# Verificar build
echo "🔨 Testando build..."
pnpm install
pnpm build

if [ $? -ne 0 ]; then
    echo "❌ Erro no build do projeto"
    exit 1
fi

# Verificar Prisma
echo "🗃️ Verificando Prisma..."
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Schema Prisma não encontrado"
    exit 1
fi

echo "✅ Todas as verificações passaram!"
echo "🚀 Projeto pronto para deploy!"
echo ""
echo "📝 Próximos passos:"
echo "1. Configure seu .env.production com dados reais"
echo "2. Faça commit e push para o GitHub"
echo "3. Execute o deploy no VPS"
