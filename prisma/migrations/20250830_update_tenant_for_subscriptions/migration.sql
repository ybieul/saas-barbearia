-- CreateMigration
-- Migration name: 20250830_update_tenant_for_subscriptions

-- Atualizar campos existentes e adicionar novos campos para integração com Kirvano
ALTER TABLE `Tenant` 
-- Alterar businessPlan para ter valor padrão FREE em vez de BASIC
MODIFY COLUMN `businessPlan` VARCHAR(191) NOT NULL DEFAULT 'FREE',

-- Alterar isActive para ter valor padrão false em vez de true  
MODIFY COLUMN `isActive` BOOLEAN NOT NULL DEFAULT false,

-- Adicionar novos campos para integração com Kirvano
ADD COLUMN `kirvanoCustomerId` VARCHAR(191) NULL UNIQUE,
ADD COLUMN `kirvanoSubscriptionId` VARCHAR(191) NULL UNIQUE;

-- Criar índices únicos para os novos campos
CREATE UNIQUE INDEX `Tenant_kirvanoCustomerId_key` ON `Tenant`(`kirvanoCustomerId`);
CREATE UNIQUE INDEX `Tenant_kirvanoSubscriptionId_key` ON `Tenant`(`kirvanoSubscriptionId`);
