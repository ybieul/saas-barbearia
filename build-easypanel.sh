#!/bin/bash

echo "🚀 Iniciando build para EasyPanel..."

# Limpar cache
echo "🧹 Limpando cache..."
rm -rf node_modules .next

# Instalar dependências
echo "📦 Instalando dependências..."
if [ -f "pnpm-lock.yaml" ]; then
    npm install -g pnpm
    pnpm install
else
    npm ci
fi

# Gerar cliente Prisma
echo "🗄️ Gerando cliente Prisma..."
npx prisma generate

# Build do Next.js
echo "🏗️ Fazendo build do Next.js..."
export NEXT_TELEMETRY_DISABLED=1
if [ -f "pnpm-lock.yaml" ]; then
    pnpm run build
else
    npm run build
fi

echo "✅ Build concluído com sucesso!"
