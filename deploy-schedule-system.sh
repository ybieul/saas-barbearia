#!/bin/bash

# ============================================
# SCRIPT PARA APLICAR SISTEMA DE HORÁRIOS NO SERVIDOR
# Execute este script no seu servidor VPS após o deploy
# ============================================

echo "🚀 Iniciando aplicação do sistema de horários dos profissionais..."

# 1. Navegar para o diretório do projeto
cd /caminho/para/seu/projeto  # SUBSTITUA pelo caminho real

# 2. Instalar dependências (caso necessário)
echo "📦 Instalando dependências..."
npm install --production --legacy-peer-deps

# 3. Gerar cliente Prisma com novos modelos
echo "🔄 Gerando cliente Prisma..."
npx prisma generate

# 4. Aplicar mudanças no banco de dados
echo "💾 Aplicando mudanças no banco de dados..."
npx prisma db push

# 5. Verificar se as tabelas foram criadas
echo "✅ Verificando tabelas criadas..."
npx prisma db execute --stdin <<EOF
DESCRIBE professional_schedules;
DESCRIBE schedule_exceptions;
EOF

# 6. Reiniciar aplicação
echo "🔄 Reiniciando aplicação..."
pm2 restart all

echo "✅ Sistema de horários aplicado com sucesso!"
echo ""
echo "📋 Tabelas criadas:"
echo "   - professional_schedules (horários padrão semanais)"
echo "   - schedule_exceptions (bloqueios e folgas)"
echo ""
echo "🔗 Novos endpoints disponíveis:"
echo "   GET/PUT /api/professionals/{id}/schedules"
echo "   GET/POST /api/professionals/{id}/exceptions" 
echo "   DELETE /api/exceptions/{id}"
echo "   GET /api/public/business/{slug}/availability-v2"
echo ""
echo "🎉 Pronto para usar!"
