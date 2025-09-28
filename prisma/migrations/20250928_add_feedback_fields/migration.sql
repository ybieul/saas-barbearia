-- Add googleReviewLink to tenants
ALTER TABLE `tenants` ADD COLUMN `googleReviewLink` TEXT NULL;

-- Add feedbackSent to appointments
ALTER TABLE `appointments` ADD COLUMN `feedbackSent` BOOLEAN NOT NULL DEFAULT 0;

-- Optional: backfill existing completed appointments as already sent if desired
-- UPDATE `appointments` SET feedbackSent = 1 WHERE status = 'COMPLETED';
