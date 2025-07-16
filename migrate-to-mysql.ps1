# ============================================
# SCRIPT DE MIGRAÇÃO PARA MYSQL (HOSTINGER) - PowerShell
# ============================================

Write-Host "🚀 Iniciando migração para MySQL..." -ForegroundColor Green

# 1. Verificar se o arquivo .env está configurado
if (!(Test-Path ".env")) {
    Write-Host "❌ Arquivo .env não encontrado!" -ForegroundColor Red
    Write-Host "📝 Crie o arquivo .env com as configurações do MySQL da Hostinger" -ForegroundColor Yellow
    Write-Host "💡 Exemplo: DATABASE_URL=`"mysql://user:password@host:3306/database`"" -ForegroundColor Cyan
    exit 1
}

# 2. Verificar se a string de conexão MySQL está presente
$envContent = Get-Content .env -Raw
if ($envContent -notmatch "mysql://") {
    Write-Host "❌ DATABASE_URL não configurada para MySQL!" -ForegroundColor Red
    Write-Host "📝 Configure DATABASE_URL no arquivo .env" -ForegroundColor Yellow
    Write-Host "💡 Exemplo: DATABASE_URL=`"mysql://user:password@host:3306/database`"" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ Configurações verificadas" -ForegroundColor Green

# 3. Instalar dependências
Write-Host "📦 Instalando dependências do MySQL..." -ForegroundColor Cyan
npm install mysql2 --legacy-peer-deps

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao instalar dependências!" -ForegroundColor Red
    exit 1
}

# 4. Gerar cliente Prisma
Write-Host "🔧 Gerando cliente Prisma..." -ForegroundColor Cyan
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao gerar cliente Prisma!" -ForegroundColor Red
    exit 1
}

# 5. Fazer push do schema para o banco
Write-Host "📊 Enviando schema para o banco MySQL..." -ForegroundColor Cyan
npx prisma db push

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migração concluída com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎯 Próximos passos:" -ForegroundColor Yellow
    Write-Host "1. Execute 'npm run db:seed' para popular o banco" -ForegroundColor White
    Write-Host "2. Execute 'npm run dev' para iniciar o desenvolvimento" -ForegroundColor White
    Write-Host "3. Acesse 'npm run db:studio' para visualizar o banco" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 Comandos úteis:" -ForegroundColor Yellow
    Write-Host "- npm run db:push     # Atualizar schema" -ForegroundColor White
    Write-Host "- npm run db:seed     # Popular com dados" -ForegroundColor White
    Write-Host "- npm run db:studio   # Abrir Prisma Studio" -ForegroundColor White
    Write-Host "- npm run db:reset    # Reset completo (CUIDADO!)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🌐 Para testar a conexão, execute:" -ForegroundColor Cyan
    Write-Host "npx prisma db push" -ForegroundColor White
} else {
    Write-Host "❌ Erro na migração!" -ForegroundColor Red
    Write-Host "🔍 Verifique:" -ForegroundColor Yellow
    Write-Host "1. Conexão com o banco MySQL" -ForegroundColor White
    Write-Host "2. Credenciais no arquivo .env" -ForegroundColor White
    Write-Host "3. Permissões do usuário no banco" -ForegroundColor White
    Write-Host "4. Se o banco de dados existe no servidor MySQL" -ForegroundColor White
}
}
