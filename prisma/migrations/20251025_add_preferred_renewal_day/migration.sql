-- Add preferredRenewalDay to client_subscriptions and client_packages
ALTER TABLE `client_subscriptions` ADD COLUMN `preferredRenewalDay` INT NULL;
ALTER TABLE `client_packages` ADD COLUMN `preferredRenewalDay` INT NULL;
