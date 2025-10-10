-- Migration: add client packages and credits tables
-- Date: 2025-10-10

-- CreateTable client_packages
CREATE TABLE `client_packages` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `packageId` VARCHAR(191) NOT NULL,
    `purchasedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,

    INDEX `client_packages_clientId_idx`(`clientId`),
    INDEX `client_packages_packageId_idx`(`packageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey for client_packages
ALTER TABLE `client_packages`
  ADD CONSTRAINT `client_packages_clientId_fkey`
    FOREIGN KEY (`clientId`) REFERENCES `end_users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `client_packages_packageId_fkey`
    FOREIGN KEY (`packageId`) REFERENCES `service_packages`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable client_package_credits
CREATE TABLE `client_package_credits` (
    `id` VARCHAR(191) NOT NULL,
    `clientPackageId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `totalCredits` INTEGER NOT NULL,
    `usedCredits` INTEGER NOT NULL DEFAULT 0,

    INDEX `client_package_credits_clientPackageId_idx`(`clientPackageId`),
    INDEX `client_package_credits_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey for client_package_credits
ALTER TABLE `client_package_credits`
  ADD CONSTRAINT `client_package_credits_clientPackageId_fkey`
    FOREIGN KEY (`clientPackageId`) REFERENCES `client_packages`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `client_package_credits_serviceId_fkey`
    FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
