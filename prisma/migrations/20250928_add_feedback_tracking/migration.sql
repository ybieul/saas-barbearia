-- Migration ajustada: remover tracking (token/cliques) e manter apenas delay.
-- Objetivo agora: garantir somente a coluna tenants.feedbackDelayMinutes (idempotente).

SET @col_exists := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND COLUMN_NAME = 'feedbackDelayMinutes'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE `tenants` ADD COLUMN `feedbackDelayMinutes` INT NOT NULL DEFAULT 45 AFTER `googleReviewLink`',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'feedback delay only migration applied' AS info;