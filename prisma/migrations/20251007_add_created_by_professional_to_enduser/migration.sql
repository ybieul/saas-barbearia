-- Migration: add createdByProfessionalId to end_users
ALTER TABLE `end_users` ADD COLUMN `createdByProfessionalId` VARCHAR(191) NULL;

-- Add index for tenant + createdByProfessionalId to support collaborator queries
CREATE INDEX `end_users_tenantId_createdByProfessionalId_idx` ON `end_users`(`tenantId`, `createdByProfessionalId`);

-- Add foreign key (ON DELETE SET NULL)
ALTER TABLE `end_users` ADD CONSTRAINT `end_users_createdByProfessionalId_fkey` FOREIGN KEY (`createdByProfessionalId`) REFERENCES `professionals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
