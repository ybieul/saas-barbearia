-- Migration: unify package credits to pool per package + allowed services snapshot
-- Date: 2025-10-10

-- 1) Add columns to client_packages
ALTER TABLE `client_packages`
  ADD COLUMN `creditsTotal` INT NOT NULL DEFAULT 0 AFTER `expiresAt`,
  ADD COLUMN `usedCredits` INT NOT NULL DEFAULT 0 AFTER `creditsTotal`;

-- 2) Create table client_package_allowed_services
CREATE TABLE `client_package_allowed_services` (
  `id` VARCHAR(191) NOT NULL,
  `clientPackageId` VARCHAR(191) NOT NULL,
  `serviceId` VARCHAR(191) NOT NULL,
  UNIQUE KEY `client_package_allowed_services_unique` (`clientPackageId`, `serviceId`),
  INDEX `client_package_allowed_services_clientPackageId_idx`(`clientPackageId`),
  INDEX `client_package_allowed_services_serviceId_idx`(`serviceId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `client_package_allowed_services`
  ADD CONSTRAINT `client_package_allowed_services_clientPackageId_fkey`
    FOREIGN KEY (`clientPackageId`) REFERENCES `client_packages`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `client_package_allowed_services_serviceId_fkey`
    FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) Backfill creditsTotal/usedCredits from client_package_credits
-- Sum totals per clientPackageId
UPDATE `client_packages` cp
JOIN (
  SELECT cpc.clientPackageId AS id,
         COALESCE(SUM(cpc.totalCredits), 0) AS totalCredits,
         COALESCE(SUM(cpc.usedCredits), 0) AS totalUsed
  FROM `client_package_credits` cpc
  GROUP BY cpc.clientPackageId
) agg ON agg.id = cp.id
SET cp.creditsTotal = agg.totalCredits,
    cp.usedCredits = agg.totalUsed;

-- 4) Backfill allowed services from client_package_credits distinct services
INSERT INTO `client_package_allowed_services` (`id`, `clientPackageId`, `serviceId`)
SELECT DISTINCT
  REPLACE(UUID(), '-', '') as id,
  cpc.clientPackageId,
  cpc.serviceId
FROM `client_package_credits` cpc
LEFT JOIN `client_package_allowed_services` existed
  ON existed.clientPackageId = cpc.clientPackageId AND existed.serviceId = cpc.serviceId
WHERE existed.id IS NULL;

-- Note: legacy table `client_package_credits` is kept for compatibility; new logic should use pool + allowed services
