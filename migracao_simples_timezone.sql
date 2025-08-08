-- 📋 MIGRAÇÃO SIMPLES DO BANCO DE DADOS
-- Baseado no script oficial do repositório

-- 1. BACKUP ANTES DA MIGRAÇÃO (criar tabela de backup)
CREATE TABLE Appointment_backup AS SELECT * FROM Appointment;

-- 2. CONVERTER HORÁRIOS DE UTC PARA BRASILEIRO
-- Adicionar 3 horas aos horários (UTC -> UTC-3 = +3 horas na prática)
UPDATE Appointment 
SET dateTime = CONVERT_TZ(dateTime, '+00:00', '+03:00')
WHERE dateTime IS NOT NULL;

-- 3. VERIFICAR A CONVERSÃO (deve mostrar horários brasileiros)
SELECT 
    id,
    dateTime as novo_horario_brasil,
    DATE(dateTime) as data,
    TIME(dateTime) as hora
FROM Appointment 
ORDER BY dateTime 
LIMIT 10;
