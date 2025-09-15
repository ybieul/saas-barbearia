-- Migration: add planCycle enum and column to tenants
-- Executar após garantir backup.

-- 1. Criar enum se necessário (MySQL não tem ENUM reutilizável global no Prisma; aqui assumimos nova coluna ENUM)
ALTER TABLE `tenants`
  ADD COLUMN `planCycle` ENUM('MONTHLY','ANNUAL') NOT NULL DEFAULT 'MONTHLY' AFTER `businessPlan`;

-- 2. (Opcional) Atualizar linhas existentes se quiser marcar planos anuais já salvos no nome
UPDATE `tenants`
SET `planCycle` = 'ANNUAL'
WHERE LOWER(`businessPlan`) LIKE '%anual%';
