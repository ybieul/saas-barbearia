-- Migration: add subscriptions (plans and client subscriptions)
-- Date: 2025-10-11

-- CreateTable subscription_plans
CREATE TABLE `subscription_plans` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `cycleInDays` INTEGER NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `tenantId` VARCHAR(191) NOT NULL,

  INDEX `subscription_plans_tenantId_idx`(`tenantId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey for subscription_plans.tenantId
ALTER TABLE `subscription_plans`
  ADD CONSTRAINT `subscription_plans_tenantId_fkey`
    FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Join table for many-to-many: subscription_plans <-> services
CREATE TABLE `_ServiceToSubscriptionPlan` (
  `A` VARCHAR(191) NOT NULL,
  `B` VARCHAR(191) NOT NULL,

  UNIQUE INDEX `_ServiceToSubscriptionPlan_AB_unique`(`A`, `B`),
  INDEX `_ServiceToSubscriptionPlan_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `_ServiceToSubscriptionPlan`
  ADD CONSTRAINT `_ServiceToSubscriptionPlan_A_fkey`
    FOREIGN KEY (`A`) REFERENCES `services`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `_ServiceToSubscriptionPlan_B_fkey`
    FOREIGN KEY (`B`) REFERENCES `subscription_plans`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable client_subscriptions
CREATE TABLE `client_subscriptions` (
  `id` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `planId` VARCHAR(191) NOT NULL,
  `startDate` DATETIME(3) NOT NULL,
  `endDate` DATETIME(3) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX `client_subscriptions_clientId_idx`(`clientId`),
  INDEX `client_subscriptions_planId_idx`(`planId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKeys for client_subscriptions
ALTER TABLE `client_subscriptions`
  ADD CONSTRAINT `client_subscriptions_clientId_fkey`
    FOREIGN KEY (`clientId`) REFERENCES `end_users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `client_subscriptions_planId_fkey`
    FOREIGN KEY (`planId`) REFERENCES `subscription_plans`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
