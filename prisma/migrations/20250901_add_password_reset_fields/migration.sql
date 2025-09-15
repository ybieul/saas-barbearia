-- Migração: Adicionar campos de redefinição de senha
-- Data: 2025-09-01
-- Descrição: Adiciona campos passwordResetToken e passwordResetExpires à tabela tenants

ALTER TABLE tenants 
ADD COLUMN passwordResetToken VARCHAR(255) NULL,
ADD COLUMN passwordResetExpires DATETIME NULL;

-- Criar índice para melhor performance nas consultas de reset
CREATE INDEX idx_password_reset_token ON tenants(passwordResetToken);
CREATE INDEX idx_password_reset_expires ON tenants(passwordResetExpires);

-- Comentários para documentação
ALTER TABLE tenants 
MODIFY COLUMN passwordResetToken VARCHAR(255) NULL COMMENT 'Token para redefinição de senha',
MODIFY COLUMN passwordResetExpires DATETIME NULL COMMENT 'Data de expiração do token de redefinição';
