@echo off
echo ============================================
echo   MIGRAÇÃO MYSQL - SAAS BARBEARIA
echo ============================================
echo.

echo 🔧 Verificando dependências...
call npm install mysql2 @prisma/client prisma --force

echo.
echo 🗑️ Limpando cache do Prisma...
rmdir /s /q node_modules\.prisma 2>nul
rmdir /s /q node_modules\@prisma 2>nul

echo.
echo 🔄 Reinstalando Prisma...
call npm install @prisma/client prisma --force

echo.
echo 📝 Gerando cliente Prisma...
call npx prisma generate

echo.
echo 🏗️ Aplicando schema ao banco...
call npx prisma db push

echo.
echo 🌱 Executando seed...
call npx prisma db seed

echo.
echo ✅ MIGRAÇÃO CONCLUÍDA!
echo 📧 Login: admin@barbershop.com  
echo 🔑 Senha: password
echo.
pause
