-- Adiciona a coluna isWalkIn para identificar clientes de balcão (walk-in)
ALTER TABLE `end_users` 
  ADD COLUMN `isWalkIn` BOOLEAN NOT NULL DEFAULT false AFTER `isActive`;

-- Índice opcional se precisar filtrar muito por isWalkIn + tenant
-- CREATE INDEX `idx_end_users_tenant_iswalkin` ON `end_users`(`tenantId`, `isWalkIn`);
