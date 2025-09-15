@echo off
echo ============================================
echo   INICIANDO MYSQL - EXECUTE COMO ADMIN
echo ============================================
echo.

echo 🚀 Iniciando serviço MySQL...
net start mysql

echo.
echo ✅ MySQL iniciado! Agora execute:
echo    cd e:\SaasV0
echo    npx prisma db push
echo    npx prisma db seed
echo.
pause
