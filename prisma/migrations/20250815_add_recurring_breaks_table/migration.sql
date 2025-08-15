-- CreateTable
CREATE TABLE `recurring_breaks` (
  `id` VARCHAR(191) NOT NULL,
  `schedule_id` VARCHAR(191) NOT NULL,
  `start_time` VARCHAR(5) NOT NULL,
  `end_time` VARCHAR(5) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `recurring_breaks_schedule_id_idx` (`schedule_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `recurring_breaks` ADD CONSTRAINT `recurring_breaks_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `professional_schedules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
