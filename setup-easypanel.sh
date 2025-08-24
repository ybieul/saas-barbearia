#!/bin/bash

# Script de configuração para EasyPanel
# Execute este script após fazer deploy no EasyPanel

echo "🚀 Configurando SaaS Barbearia no EasyPanel..."

# 1. Executar migrations do Prisma
echo "📊 Executando migrations do banco de dados..."
npx prisma db push --force-reset
npx prisma generate

# 2. Popular banco com dados iniciais (se necessário)
echo "🌱 Populando banco com dados iniciais..."
npx prisma db seed || echo "⚠️  Seed não encontrado ou já executado"

# 3. Configurar cron job para lembretes WhatsApp
echo "⏰ Configurando cron job para lembretes WhatsApp..."
(crontab -l 2>/dev/null; echo "*/5 * * * * cd /app && npx ts-node scripts/whatsapp-reminders-cron.ts >> /var/log/whatsapp-reminders.log 2>&1") | crontab -

# 4. Criar diretórios necessários
echo "📁 Criando diretórios necessários..."
mkdir -p /app/uploads
mkdir -p /var/log

# 5. Definir permissões
echo "🔐 Configurando permissões..."
chmod +x /app/scripts/*.sh 2>/dev/null || echo "⚠️  Scripts não encontrados"
touch /var/log/whatsapp-reminders.log

echo "✅ Configuração do EasyPanel concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure as variáveis de ambiente no EasyPanel:"
echo "   - DATABASE_URL"
echo "   - NEXTAUTH_SECRET" 
echo "   - NEXTAUTH_URL"
echo "   - Outras variáveis específicas do projeto"
echo ""
echo "2. Acesse o painel e configure:"
echo "   - Horários de funcionamento"
echo "   - Serviços e profissionais"
echo "   - Configurações de WhatsApp"
echo ""
echo "3. Teste o sistema:"
echo "   - Faça um agendamento de teste"
echo "   - Verifique os logs de automação"
echo ""
echo "🎉 Sistema pronto para uso!"
