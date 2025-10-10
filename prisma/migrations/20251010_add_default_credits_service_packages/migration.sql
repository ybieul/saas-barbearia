-- Add defaultCredits to service_packages, pacotes com créditos padrão para novos clientes
ALTER TABLE `service_packages`
  ADD COLUMN `defaultCredits` INT NOT NULL DEFAULT 1 AFTER `updatedAt`;
