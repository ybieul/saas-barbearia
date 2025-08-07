-- Migration to update image fields to LONGTEXT
-- Run this SQL manually in your database

-- Update professional avatar field
ALTER TABLE professionals MODIFY COLUMN avatar LONGTEXT;

-- Update service image field  
ALTER TABLE services MODIFY COLUMN image LONGTEXT;

-- Verify changes
DESCRIBE professionals;
DESCRIBE services;
