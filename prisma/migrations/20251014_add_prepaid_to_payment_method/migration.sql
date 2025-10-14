-- Add PREPAID to PaymentMethod enum for subscription/package payments
-- This allows appointments paid with credits to show 'Pré-pago' instead of 'Não informado' in reports

-- First, check if PREPAID already exists to avoid errors
SET @prepaid_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'appointments' 
    AND COLUMN_NAME = 'paymentMethod' 
    AND COLUMN_TYPE LIKE '%PREPAID%');

-- Only modify if PREPAID doesn't exist yet
SET @alter_query = IF(@prepaid_exists = 0,
    "ALTER TABLE `appointments` MODIFY COLUMN `paymentMethod` ENUM('CASH', 'CARD', 'PIX', 'TRANSFER', 'DEBIT', 'CREDIT', 'PREPAID') NULL",
    "SELECT 'PREPAID already exists in enum' AS message");

PREPARE stmt FROM @alter_query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Also update FinancialRecord table if it uses PaymentMethod enum
SET @prepaid_exists_fr = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'financial_records' 
    AND COLUMN_NAME = 'paymentMethod' 
    AND COLUMN_TYPE LIKE '%PREPAID%');

SET @alter_query_fr = IF(@prepaid_exists_fr = 0,
    "ALTER TABLE `financial_records` MODIFY COLUMN `paymentMethod` ENUM('CASH', 'CARD', 'PIX', 'TRANSFER', 'DEBIT', 'CREDIT', 'PREPAID') NULL",
    "SELECT 'PREPAID already exists in financial_records enum' AS message");

PREPARE stmt_fr FROM @alter_query_fr;
EXECUTE stmt_fr;
DEALLOCATE PREPARE stmt_fr;
