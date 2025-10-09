-- Migration: add commission fields to Professional and Appointment
-- Date: 2025-10-09

ALTER TABLE `professionals`
  ADD COLUMN `commissionPercentage` DECIMAL(5,2) NULL AFTER `commission`;

ALTER TABLE `appointments`
  ADD COLUMN `commissionEarned` DECIMAL(10,2) NULL AFTER `completedAt`;
