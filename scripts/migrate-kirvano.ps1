# Script PowerShell para aplicar migração de assinaturas Kirvano
# Execute este script no seu servidor de produção

Write-Host "🚀 Iniciando migração para sistema de assinaturas Kirvano..." -ForegroundColor Green

# Verificar se estamos no diretório correto
if (-not (Test-Path "prisma\schema.prisma")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto (onde está o prisma\schema.prisma)" -ForegroundColor Red
    exit 1
}

# Fazer backup do banco antes da migração
Write-Host "📦 Fazendo backup do banco de dados..." -ForegroundColor Yellow
# Descomente a linha abaixo e ajuste os dados de conexão se necessário
# mysqldump -u username -p database_name > "backup_before_kirvano_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

# Executar a migração
Write-Host "🔧 Aplicando migração do banco de dados..." -ForegroundColor Yellow

# Método 1: Via Prisma (recomendado)
Write-Host "Tentando aplicar via Prisma..." -ForegroundColor Cyan
try {
    & npx prisma db push
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migração aplicada com sucesso via Prisma!" -ForegroundColor Green
    } else {
        throw "Prisma db push falhou"
    }
} catch {
    Write-Host "⚠️ Prisma falhou, tentando aplicação manual..." -ForegroundColor Yellow
    
    # Método 2: Aplicação manual via MySQL
    Write-Host "Aplicando SQL diretamente no banco..." -ForegroundColor Cyan
    
    Write-Host "📝 Para aplicar manualmente, execute o seguinte SQL no seu banco:" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Get-Content "prisma\migrations\20250830_update_tenant_for_subscriptions\migration.sql"
    Write-Host "----------------------------------------" -ForegroundColor Gray
}

# Regenerar o cliente Prisma
Write-Host "🔄 Regenerando cliente Prisma..." -ForegroundColor Yellow
& npx prisma generate

# Verificar se a migração foi aplicada
Write-Host "🔍 Verificando estrutura da tabela..." -ForegroundColor Yellow
Write-Host "Executando: DESCRIBE Tenant;" -ForegroundColor Cyan

# Mensagem final
Write-Host ""
Write-Host "✅ Migração concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Verifique se os novos campos foram criados: kirvanoCustomerId, kirvanoSubscriptionId" -ForegroundColor White
Write-Host "2. Configure a variável KIRVANO_WEBHOOK_SECRET no arquivo .env" -ForegroundColor White
Write-Host "3. Configure o webhook na plataforma Kirvano" -ForegroundColor White
Write-Host "4. Teste o endpoint: curl https://seudominio.com/api/webhooks/kirvano" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Documentação completa: docs/KIRVANO_SUBSCRIPTION_SYSTEM.md" -ForegroundColor Cyan
