-- ================================================
-- MIGRAÇÃO: Adicionar campo businessInstagram
-- Data: 31/07/2025
-- Descrição: Adiciona campo para armazenar Instagram do estabelecimento
-- ================================================

-- 1. Adicionar campo businessInstagram na tabela Tenant
ALTER TABLE `Tenant` 
ADD COLUMN `businessInstagram` VARCHAR(191) NULL 
AFTER `businessCnpj`;

-- 3. Verificar resultados da migração
SELECT 
    id,
    businessName,
    businessInstagram,
    JSON_EXTRACT(businessConfig, '$.instagram') as instagram_old
FROM `Tenant` 
WHERE businessInstagram IS NOT NULL 
   OR JSON_EXTRACT(businessConfig, '$.instagram') IS NOT NULL;

-- ================================================
-- ROLLBACK (se necessário)
-- ================================================
-- Para reverter a migração, execute:
-- ALTER TABLE `Tenant` DROP COLUMN `businessInstagram`;
-- ================================================
