#!/bin/bash

echo "🚀 Iniciando build para EasyPanel (npm only)..."

# Limpar cache
echo "🧹 Limpando cache..."
rm -rf node_modules .next

# Instalar dependências
echo "📦 Instalando dependências com npm..."
npm ci --legacy-peer-deps

# Gerar cliente Prisma
echo "🗄️ Gerando cliente Prisma..."
npx prisma generate

# Build do Next.js
echo "🏗️ Fazendo build do Next.js..."
export NEXT_TELEMETRY_DISABLED=1
npm run build

echo "✅ Build concluído com sucesso!"
