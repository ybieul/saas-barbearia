-- Migration: add subscriptionStatus column to tenants
-- Adds a new nullable column with default 'TRIAL'

ALTER TABLE `tenants`
  ADD COLUMN `subscriptionStatus` VARCHAR(20) NULL DEFAULT 'TRIAL' AFTER `subscriptionEnd`;

-- Optionally backfill existing rows: if isActive=true and subscriptionEnd in future, set ACTIVE; if past -> INACTIVE
UPDATE `tenants`
SET `subscriptionStatus` = CASE
  WHEN `isActive` = 1 AND (`subscriptionEnd` IS NULL OR `subscriptionEnd` > NOW()) THEN 'ACTIVE'
  WHEN `isActive` = 1 AND `subscriptionEnd` <= NOW() THEN 'INACTIVE'
  ELSE 'INACTIVE'
END
WHERE `subscriptionStatus` IS NULL;