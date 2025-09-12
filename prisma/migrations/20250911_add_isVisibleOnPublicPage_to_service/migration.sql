-- Add isVisibleOnPublicPage to services table
ALTER TABLE `services` ADD COLUMN `isVisibleOnPublicPage` BOOLEAN NOT NULL DEFAULT true;
