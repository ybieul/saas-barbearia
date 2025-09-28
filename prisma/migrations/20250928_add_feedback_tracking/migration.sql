-- Migration: add feedback tracking & delay fields + enum FEEDBACK (idempotente)

-- Adicionar colunas no Tenant se não existirem
ALTER TABLE `tenants` ADD COLUMN IF NOT EXISTS `feedbackDelayMinutes` INT NOT NULL DEFAULT 45;

-- Adicionar colunas no Appointment se não existirem
ALTER TABLE `appointments`
  ADD COLUMN IF NOT EXISTS `feedbackToken` VARCHAR(191) NULL UNIQUE,
  ADD COLUMN IF NOT EXISTS `feedbackLinkClicked` BOOLEAN NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `feedbackLinkClickedAt` DATETIME NULL;

-- Enum FEEDBACK já foi adicionado manualmente no schema Prisma; no MySQL enum usado? Se type é string simples, ignorar.
-- Caso exista tabela whatsapp_logs com constraint, garantir consistência; aqui assumimos type é VARCHAR e não ENUM no MySQL.

-- Ajuste googleReviewLink se necessário (já criado em migração anterior)
-- ALTER TABLE `tenants` ADD COLUMN IF NOT EXISTS `googleReviewLink` LONGTEXT NULL;

-- Marcar migração concluída
SELECT 'feedback tracking migration applied' as info;