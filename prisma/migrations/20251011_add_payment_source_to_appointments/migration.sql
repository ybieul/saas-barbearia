-- Add paymentSource column to appointments to track pre-paid source (PACKAGE or SUBSCRIPTION)
ALTER TABLE `appointments`
ADD COLUMN `paymentSource` VARCHAR(32) NULL AFTER `paymentStatus`;

-- Optional index if needed for reporting
-- CREATE INDEX `idx_appointments_paymentSource` ON `appointments` (`paymentSource`);
