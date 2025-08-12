#!/bin/bash

# 🚨 CORREÇÃO CRÍTICA DO TIMEZONE - DEPLOY IMEDIATO
# ==================================================
# Corrige o problema de interpretação UTC no backend

echo "🚨 ===== APLICANDO CORREÇÃO CRÍTICA DO TIMEZONE ====="
echo

# 1. Commit das alterações
echo "1️⃣ Fazendo commit das correções..."
git add .
git commit -m "fix(timezone): correção crítica do parse de dateTime no backend

- Substitui new Date(dateTime) por parseISOStringAsLocal()
- Evita interpretação UTC da string ISO no servidor
- Corrige horários salvos com +3h de diferença
- Aplica correção em CREATE e UPDATE de agendamentos"

echo "✅ Commit realizado"
echo

# 2. Push para o repositório
echo "2️⃣ Enviando para repositório..."
git push

echo "✅ Push realizado"
echo

# 3. Instruções para o servidor
echo "3️⃣ EXECUTAR NO SERVIDOR:"
echo "cd /caminho/do/projeto"
echo "git pull"
echo "pnpm install"
echo "pnpm prisma generate"
echo "pm2 restart all"
echo "pm2 logs --lines 50"
echo

# 4. Teste pós-deploy
echo "4️⃣ COMO TESTAR A CORREÇÃO:"
echo "   ✅ Criar agendamento para 09:00"
echo "   ✅ Verificar se salva como 09:00 (não 12:00)"
echo "   ✅ Verificar logs: '🔧 Backend recebeu dateTime'"
echo "   ✅ Verificar que agendamentos não desaparecem"
echo

echo "🎯 CORREÇÃO CRÍTICA APLICADA - DEPLOY NECESSÁRIO!"
