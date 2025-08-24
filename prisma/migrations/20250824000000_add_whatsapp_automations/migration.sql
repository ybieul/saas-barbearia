-- CreateTable
CREATE TABLE `automation_settings` (
    `id` VARCHAR(191) NOT NULL,
    `establishment_id` VARCHAR(191) NOT NULL,
    `automation_type` VARCHAR(50) NOT NULL,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `message_template` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `automation_settings_establishment_id_idx`(`establishment_id`),
    UNIQUE INDEX `automation_settings_establishment_id_automation_type_key`(`establishment_id`, `automation_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointment_reminders` (
    `id` VARCHAR(191) NOT NULL,
    `appointment_id` VARCHAR(191) NOT NULL,
    `reminder_type` VARCHAR(50) NOT NULL,
    `sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `appointment_reminders_appointment_id_idx`(`appointment_id`),
    INDEX `appointment_reminders_reminder_type_idx`(`reminder_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `automation_settings` ADD CONSTRAINT `automation_settings_establishment_id_fkey` FOREIGN KEY (`establishment_id`) REFERENCES `business_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointment_reminders` ADD CONSTRAINT `appointment_reminders_appointment_id_fkey` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
