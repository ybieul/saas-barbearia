#!/bin/bash

echo "🚀 Iniciando build simples para EasyPanel..."

# Instalar dependências
echo "📦 Instalando dependências..."
npm install --legacy-peer-deps

# Gerar cliente Prisma
echo "🗄️ Gerando cliente Prisma..."
npx prisma generate

# Build do Next.js
echo "🏗️ Fazendo build do Next.js..."
npm run build

echo "✅ Build concluído!"
