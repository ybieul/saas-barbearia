-- Script para adicionar campo businessInstagram na tabela Tenant
-- Execute este comando no seu banco MySQL em produção

ALTER TABLE `Tenant` ADD COLUMN `businessInstagram` VARCHAR(191) NULL AFTER `businessCnpj`;

-- Script para migrar dados existentes do businessConfig.instagram para businessInstagram
-- Opcional: se você quiser migrar dados existentes automaticamente
UPDATE `Tenant` 
SET `businessInstagram` = JSON_UNQUOTE(JSON_EXTRACT(`businessConfig`, '$.instagram'))
WHERE JSON_EXTRACT(`businessConfig`, '$.instagram') IS NOT NULL 
  AND JSON_EXTRACT(`businessConfig`, '$.instagram') != 'null';
