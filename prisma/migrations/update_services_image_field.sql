-- Migração para atualizar campo de imagem na tabela services
-- Execute esta migração no servidor VPS de produção

-- Alterar campo image para TEXT (caso ainda não seja)
ALTER TABLE services 
MODIFY COLUMN image TEXT;
