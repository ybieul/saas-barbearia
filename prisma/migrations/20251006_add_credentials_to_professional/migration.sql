-- Migration: Add email/password/role to professionals
-- Date: 2025-10-06

ALTER TABLE `professionals`
  ADD COLUMN `password` VARCHAR(191) NULL,
  ADD COLUMN `role` VARCHAR(32) NOT NULL DEFAULT 'COLLABORATOR';

-- Torna email único (já era nullable). Em MySQL, índice único aceita múltiplos NULLs por padrão.
ALTER TABLE `professionals`
  ADD UNIQUE INDEX `professionals_email_key`(`email`);
