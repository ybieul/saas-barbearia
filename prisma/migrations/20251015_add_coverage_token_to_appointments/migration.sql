-- Add coverageToken to appointments for persistent coverage badge fallback
ALTER TABLE `appointments`
  ADD COLUMN `coverageToken` TEXT NULL AFTER `paymentSource`;
