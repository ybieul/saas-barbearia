-- Migration: add slotInterval column to tenants
ALTER TABLE `tenants` ADD COLUMN `slotInterval` INT NULL DEFAULT 5;