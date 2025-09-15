-- =====================================================
-- MIGRAÇÃO KIRVANO - SISTEMA DE ASSINATURAS
-- =====================================================
-- Execute este SQL no seu banco de dados de produção
-- Data: 30/08/2025

-- Fazer backup antes de executar (recomendado):
-- CREATE TABLE Tenant_backup_20250830 AS SELECT * FROM Tenant;

-- =====================================================
-- 1. ADICIONAR NOVOS CAMPOS PARA INTEGRAÇÃO KIRVANO
-- =====================================================

-- Adicionar campo para ID do cliente na Kirvano
ALTER TABLE `Tenant` 
ADD COLUMN `kirvanoCustomerId` VARCHAR(191) NULL;

-- Adicionar campo para ID da assinatura na Kirvano  
ALTER TABLE `Tenant`
ADD COLUMN `kirvanoSubscriptionId` VARCHAR(191) NULL;

-- =====================================================
-- 2. ATUALIZAR CAMPOS EXISTENTES
-- =====================================================

-- Alterar businessPlan para ter valor padrão FREE
ALTER TABLE `Tenant` 
MODIFY COLUMN `businessPlan` VARCHAR(191) NOT NULL DEFAULT 'FREE';

-- Alterar isActive para ter valor padrão false
ALTER TABLE `Tenant`
MODIFY COLUMN `isActive` BOOLEAN NOT NULL DEFAULT false;

-- =====================================================
-- 3. CRIAR ÍNDICES ÚNICOS
-- =====================================================

-- Criar índice único para kirvanoCustomerId
ALTER TABLE `Tenant`
ADD UNIQUE KEY `Tenant_kirvanoCustomerId_key` (`kirvanoCustomerId`);

-- Criar índice único para kirvanoSubscriptionId
ALTER TABLE `Tenant`
ADD UNIQUE KEY `Tenant_kirvanoSubscriptionId_key` (`kirvanoSubscriptionId`);

-- =====================================================
-- 4. VERIFICAÇÃO DOS RESULTADOS
-- =====================================================

-- Verificar estrutura da tabela após migração
DESCRIBE `Tenant`;

-- Verificar se os índices foram criados
SHOW INDEX FROM `Tenant` WHERE Key_name IN ('Tenant_kirvanoCustomerId_key', 'Tenant_kirvanoSubscriptionId_key');

-- =====================================================
-- MIGRAÇÃO CONCLUÍDA
-- =====================================================
-- ✅ Campos adicionados: kirvanoCustomerId, kirvanoSubscriptionId  
-- ✅ Campos atualizados: businessPlan (DEFAULT 'FREE'), isActive (DEFAULT false)
-- ✅ Índices únicos criados para os campos da Kirvano
-- ✅ Sistema pronto para receber webhooks da Kirvano

-- Próximos passos:
-- 1. Configure KIRVANO_WEBHOOK_SECRET no .env
-- 2. Configure webhook na Kirvano: https://seudominio.com/api/webhooks/kirvano
-- 3. Teste o endpoint de webhook
-- 4. Verifique logs do sistema
