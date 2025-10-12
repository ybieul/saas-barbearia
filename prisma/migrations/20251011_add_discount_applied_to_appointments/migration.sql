-- Add discountApplied column to appointments table
ALTER TABLE `appointments`
  ADD COLUMN `discountApplied` DECIMAL(10,2) NULL AFTER `paymentSource`;

-- Optional: backfill existing completed pre-paid appointments as full discount when subscription/package markers exist in notes
-- We will not run destructive updates here; reporting will treat NULL as 0.