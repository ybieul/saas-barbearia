-- Migration: add_subscription_commission_fields to Professional
-- Note: This migration is created but not executed, per instruction.

-- Add columns to professionals table
ALTER TABLE `professionals`
  ADD COLUMN `subscriptionCommissionType` VARCHAR(191) NULL DEFAULT 'PERCENTAGE',
  ADD COLUMN `subscriptionCommissionValue` DECIMAL(10,2) NULL;

-- Optional: backfill defaults or set existing NULLs explicitly (no-op for now)
-- UPDATE `professionals` SET `subscriptionCommissionType` = 'PERCENTAGE' WHERE `subscriptionCommissionType` IS NULL;
