-- ================================================
-- MIGRAÇÃO: Adicionar campo businessInstagram - VERSÃO PARA TABELA TENANT
-- Data: 31/07/2025
-- Descrição: Adiciona campo para armazenar Instagram do estabelecimento
-- IMPORTANTE: Use este arquivo se sua tabela principal se chama "Tenant"
-- ================================================

-- Verificar se a tabela Tenant existe
-- SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'Tenant';

-- 1. Adicionar campo businessInstagram na tabela Tenant (se não existir)
-- Verificar se a coluna já existe antes de adicionar
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns 
                   WHERE table_name = 'Tenant' AND column_name = 'businessInstagram');

SET @sql = IF(@col_exists = 0, 
              'ALTER TABLE `Tenant` ADD COLUMN `businessInstagram` VARCHAR(191) NULL AFTER `businessCnpj`',
              'SELECT "Campo businessInstagram já existe" as status');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Migrar dados existentes do businessConfig.instagram para businessInstagram
-- (apenas se existirem dados em businessConfig.instagram)
UPDATE `Tenant` 
SET `businessInstagram` = JSON_UNQUOTE(JSON_EXTRACT(`businessConfig`, '$.instagram'))
WHERE `businessConfig` IS NOT NULL
  AND JSON_EXTRACT(`businessConfig`, '$.instagram') IS NOT NULL 
  AND JSON_EXTRACT(`businessConfig`, '$.instagram') != 'null'
  AND JSON_EXTRACT(`businessConfig`, '$.instagram') != '';

-- 3. Verificar resultados da migração
SELECT 
    id,
    businessName,
    businessInstagram,
    JSON_EXTRACT(businessConfig, '$.instagram') as instagram_old
FROM `Tenant` 
WHERE businessInstagram IS NOT NULL 
   OR (businessConfig IS NOT NULL AND JSON_EXTRACT(businessConfig, '$.instagram') IS NOT NULL);

-- ================================================
-- ROLLBACK (se necessário)
-- ================================================
-- Para reverter a migração, execute:
-- ALTER TABLE `Tenant` DROP COLUMN `businessInstagram`;
-- ================================================
-- ================================================
