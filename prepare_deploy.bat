@echo off
echo 🚀 Preparando arquivos para deploy na Hostinger...
echo ================================================

echo ✅ Criando build de produção...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erro no build! Corrija os erros antes de continuar.
    pause
    exit /b 1
)

echo ✅ Build concluído com sucesso!
echo.

echo 📦 Compactando arquivos para upload...

:: Criar pasta temporária
if exist deploy_temp rmdir /s /q deploy_temp
mkdir deploy_temp

:: Copiar arquivos necessários (exceto node_modules e .git)
echo Copiando arquivos...
xcopy /E /I /Q app deploy_temp\app\
xcopy /E /I /Q components deploy_temp\components\
xcopy /E /I /Q hooks deploy_temp\hooks\
xcopy /E /I /Q lib deploy_temp\lib\
xcopy /E /I /Q prisma deploy_temp\prisma\
xcopy /E /I /Q public deploy_temp\public\
xcopy /E /I /Q styles deploy_temp\styles\
xcopy /E /I /Q .next deploy_temp\.next\

:: Copiar arquivos de configuração
copy .env deploy_temp\
copy .env.example deploy_temp\
copy package.json deploy_temp\
copy package-lock.json deploy_temp\ 2>nul
copy next.config.mjs deploy_temp\
copy tsconfig.json deploy_temp\
copy tailwind.config.ts deploy_temp\
copy components.json deploy_temp\
copy postcss.config.mjs deploy_temp\
copy *.md deploy_temp\ 2>nul

echo.
echo ✅ Arquivos preparados na pasta 'deploy_temp'
echo.
echo 📋 PRÓXIMOS PASSOS:
echo 1. Compacte a pasta 'deploy_temp' em um arquivo ZIP
echo 2. Faça upload do ZIP para a Hostinger via File Manager
echo 3. Extraia o ZIP na pasta do seu domínio (fora da public_html)
echo 4. Execute os comandos no terminal da Hostinger:
echo    cd /path/to/your/project
echo    npm install --production
echo    npx prisma generate
echo    npx prisma db push
echo    npm start
echo.
echo 🎉 Deploy preparado! Boa sorte!
pause
