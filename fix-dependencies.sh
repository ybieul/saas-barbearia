#!/bin/bash

# 🔧 Script para corrigir dependências antes do deploy
echo "🔧 Corrigindo conflitos de dependências..."

# Limpar cache e node_modules
echo "🧹 Limpando cache..."
rm -rf node_modules
rm -f package-lock.json
rm -f pnpm-lock.yaml

# Instalar dependências compatíveis
echo "📦 Instalando dependências compatíveis..."
npm install

# Verificar se não há conflitos
echo "🔍 Verificando conflitos..."
npm ls --depth=0

# Fazer build de teste
echo "🔨 Testando build..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build executado com sucesso!"
    echo "🚀 Pronto para deploy!"
else
    echo "❌ Erro no build. Verifique as dependências."
    exit 1
fi
