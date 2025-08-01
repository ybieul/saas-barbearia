-- VERIFICAÇÃO DA MIGRAÇÃO MANY-TO-MANY
-- ======================================

-- 1. Verificar se a tabela de relacionamento foi criada
SHOW TABLES LIKE '%AppointmentToService%';

-- 2. Verificar estrutura da nova tabela de relacionamento
DESCRIBE _AppointmentToService;

-- 3. Verificar se campo serviceId foi removido da tabela appointments
DESCRIBE appointments;

-- 4. Contar agendamentos existentes
SELECT COUNT(*) as total_appointments FROM appointments;

-- 5. Verificar se há agendamentos órfãos (sem serviços conectados)
SELECT a.id, a.dateTime, a.totalPrice 
FROM appointments a 
LEFT JOIN _AppointmentToService ats ON a.id = ats.A 
WHERE ats.A IS NULL 
LIMIT 5;

-- 6. Verificar agendamentos com múltiplos serviços
SELECT 
    a.id,
    a.dateTime,
    a.totalPrice,
    COUNT(ats.B) as service_count
FROM appointments a 
LEFT JOIN _AppointmentToService ats ON a.id = ats.A 
GROUP BY a.id 
HAVING service_count > 1 
LIMIT 5;

-- 7. Verificar integridade dos dados
SELECT 
    DATE(a.dateTime) as data_agendamento,
    COUNT(*) as total_agendamentos,
    AVG(a.totalPrice) as preco_medio,
    AVG(a.duration) as duracao_media
FROM appointments a 
WHERE a.createdAt >= CURDATE() - INTERVAL 7 DAY
GROUP BY DATE(a.dateTime)
ORDER BY data_agendamento DESC;
