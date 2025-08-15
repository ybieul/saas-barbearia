-- Migração para adicionar tabelas de gerenciamento de horários dos profissionais
-- Data: 15/08/2025
-- Descrição: Adiciona tabelas professional_schedules e schedule_exceptions

-- Criar tabela para horários padrão semanais dos profissionais
CREATE TABLE `professional_schedules` (
    `id` VARCHAR(191) NOT NULL,
    `professional_id` VARCHAR(191) NOT NULL,
    `day_of_week` INT NOT NULL COMMENT '0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado',
    `start_time` TIME NOT NULL COMMENT 'Hora de início do trabalho',
    `end_time` TIME NOT NULL COMMENT 'Hora de fim do trabalho',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    INDEX `idx_professional_schedules_professional_id` (`professional_id`),
    UNIQUE INDEX `professional_schedules_professional_id_day_of_week_key` (`professional_id`, `day_of_week`),
    CONSTRAINT `professional_schedules_professional_id_fkey` FOREIGN KEY (`professional_id`) REFERENCES `professionals` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Criar tabela para bloqueios e exceções pontuais
CREATE TABLE `schedule_exceptions` (
    `id` VARCHAR(191) NOT NULL,
    `professional_id` VARCHAR(191) NOT NULL,
    `start_datetime` DATETIME(3) NOT NULL COMMENT 'Data e hora de início do bloqueio',
    `end_datetime` DATETIME(3) NOT NULL COMMENT 'Data e hora de fim do bloqueio',
    `reason` VARCHAR(500) NULL COMMENT 'Motivo do bloqueio (ex: Almoço, Consulta médica)',
    `type` ENUM('BLOCK', 'DAY_OFF') NOT NULL DEFAULT 'BLOCK' COMMENT 'Tipo do bloqueio',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    INDEX `idx_schedule_exceptions_professional_id` (`professional_id`),
    INDEX `idx_schedule_exceptions_datetime` (`start_datetime`, `end_datetime`),
    CONSTRAINT `schedule_exceptions_professional_id_fkey` FOREIGN KEY (`professional_id`) REFERENCES `professionals` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
