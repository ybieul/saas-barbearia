-- Add fixedCosts JSON column to tenants table
-- Safe for MySQL 8.0+
ALTER TABLE `tenants`
  ADD COLUMN `fixedCosts` JSON NULL AFTER `businessConfig`;

-- Optional: initialize existing rows with empty array to avoid nulls in code (can be skipped if you prefer null)
-- UPDATE `tenants` SET `fixedCosts` = JSON_ARRAY() WHERE `fixedCosts` IS NULL;
