-- Migration: Inventory Module (Products, Product Sales, Commissions)
-- Date: 2025-10-24
-- NOTE: Review before applying in production. Tested for MySQL 8.x

-- 1) Create products table
CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `costPrice` DECIMAL(10,2) NOT NULL,
  `salePrice` DECIMAL(10,2) NOT NULL,
  `stockQuantity` INT NOT NULL DEFAULT 0,
  `minStockAlert` INT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `tenantId` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `products_tenantId_idx` (`tenantId`),
  CONSTRAINT `products_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Professionals: add product commission percentage
ALTER TABLE `professionals`
  ADD COLUMN `productCommissionPercentage` DECIMAL(5,2) NULL AFTER `subscriptionCommissionValue`;

-- 3) Appointments: add soldProducts JSON snapshot
-- Some MySQL versions restrict JSON defaults; we keep it nullable and app-level default []
ALTER TABLE `appointments`
  ADD COLUMN `soldProducts` JSON NULL AFTER `commissionEarned`;

-- 4) Financial Records: add product sale fields and source descriptor
ALTER TABLE `financial_records`
  ADD COLUMN `recordSource` VARCHAR(191) NULL DEFAULT 'SERVICE_INCOME' AFTER `reference`,
  ADD COLUMN `productId` VARCHAR(191) NULL AFTER `recordSource`,
  ADD COLUMN `quantity` INT NULL AFTER `productId`,
  ADD COLUMN `costPrice` DECIMAL(10,2) NULL AFTER `quantity`,
  ADD COLUMN `commissionEarned` DECIMAL(10,2) NULL AFTER `costPrice`,
  ADD COLUMN `professionalId` VARCHAR(191) NULL AFTER `commissionEarned`,
  ADD COLUMN `endUserId` VARCHAR(191) NULL AFTER `professionalId`;

-- Indexes for new fields
CREATE INDEX `financial_records_productId_idx` ON `financial_records`(`productId`);
CREATE INDEX `financial_records_professionalId_idx` ON `financial_records`(`professionalId`);
CREATE INDEX `financial_records_endUserId_idx` ON `financial_records`(`endUserId`);
CREATE INDEX `financial_records_tenantId_recordSource_idx` ON `financial_records`(`tenantId`, `recordSource`);

-- Foreign keys
ALTER TABLE `financial_records`
  ADD CONSTRAINT `financial_records_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `financial_records_professionalId_fkey` FOREIGN KEY (`professionalId`) REFERENCES `professionals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `financial_records_endUserId_fkey` FOREIGN KEY (`endUserId`) REFERENCES `end_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
