#!/bin/bash

# Script para executar o cron job de lembretes WhatsApp
# Adicione ao crontab: */5 * * * * /path/to/whatsapp-reminders.sh

cd /path/to/your/saas/project
export NODE_ENV=production
export DATABASE_URL="your_database_url_here"

# Log file
LOG_FILE="/var/log/whatsapp-reminders.log"

echo "$(date): Iniciando cron job de lembretes WhatsApp" >> $LOG_FILE

# Executar o script TypeScript
npx ts-node scripts/whatsapp-reminders-cron.ts >> $LOG_FILE 2>&1

echo "$(date): Cron job de lembretes WhatsApp finalizado" >> $LOG_FILE
