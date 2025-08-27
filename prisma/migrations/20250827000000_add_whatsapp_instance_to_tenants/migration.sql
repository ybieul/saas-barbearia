-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `whatsapp_instance_name` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `tenants_whatsapp_instance_name_key` ON `tenants`(`whatsapp_instance_name`);
