-- Migration: add FEEDBACK value to WhatsAppType enum if missing (MySQL)
-- Estratégia: ler definição atual e recriar enum adicionando FEEDBACK no final caso ausente.
-- Observação: MySQL requer recriar a coluna (ou tabela) para expandir ENUM.

-- Detectar se a tabela whatsapp_logs existe e coluna `type` é ENUM sem FEEDBACK
SET @needs_alter := (
  SELECT IF(
    (SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'whatsapp_logs' AND COLUMN_NAME = 'type') = 'enum'
    AND (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'whatsapp_logs' AND COLUMN_NAME = 'type') NOT LIKE '%FEEDBACK%'
  , 1, 0));

-- Construir nova lista de valores extraindo existentes e concatenando 'FEEDBACK'
-- MySQL não tem função nativa fácil para parse do ENUM; solução prática: hardcode valores conhecidos.
-- Valores atuais esperados: 'CONFIRMATION','REMINDER_24H','REMINDER_2H','REACTIVATION','PROMOTION','CUSTOM'

SET @sql := IF(@needs_alter = 1,
  'ALTER TABLE `whatsapp_logs` MODIFY `type` ENUM(\'CONFIRMATION\',\'REMINDER_24H\',\'REMINDER_2H\',\'REACTIVATION\',\'PROMOTION\',\'CUSTOM\',\'FEEDBACK\') NOT NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Repetir para qualquer outra tabela que use WhatsAppType (ex: promoções futuras) - procurar em schema. Aqui somente whatsapp_logs.

-- LOG
SELECT IF(@needs_alter = 1, 'WhatsAppType enum altered to include FEEDBACK', 'WhatsAppType enum already includes FEEDBACK') AS info;