-- SCRIPT DE MIGRAÇÃO DE DADOS PARA MANY-TO-MANY
-- ===============================================
-- ⚠️ EXECUTAR ANTES DA MIGRAÇÃO PRINCIPAL
-- Este script preserva os relacionamentos existentes

-- 1. Criar tabela temporária para backup dos relacionamentos atuais
CREATE TABLE IF NOT EXISTS _temp_appointment_service_backup AS
SELECT id as appointmentId, serviceId 
FROM appointments 
WHERE serviceId IS NOT NULL;

-- 2. Verificar quantos registros foram copiados
SELECT COUNT(*) as registros_copiados FROM _temp_appointment_service_backup;

-- 3. Após executar a migração principal (que cria _AppointmentToService), 
--    executar este comando para restaurar os relacionamentos:
/*
INSERT INTO _AppointmentToService (A, B)
SELECT appointmentId, serviceId 
FROM _temp_appointment_service_backup
WHERE appointmentId IN (SELECT id FROM appointments)
  AND serviceId IN (SELECT id FROM services);
*/

-- 4. Verificar se os dados foram migrados corretamente
/*
SELECT 
    COUNT(*) as relacionamentos_migrados
FROM _AppointmentToService;
*/

-- 5. Limpar tabela temporária (após confirmar que tudo funcionou)
/*
DROP TABLE _temp_appointment_service_backup;
*/
