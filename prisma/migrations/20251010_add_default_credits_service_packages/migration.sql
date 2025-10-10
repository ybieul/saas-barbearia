-- Add defaultCredits to service_packages
ALTER TABLE `service_packages`
  ADD COLUMN `defaultCredits` INT NOT NULL DEFAULT 1 AFTER `updatedAt`;
