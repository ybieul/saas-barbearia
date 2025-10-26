-- Add displayOrder column to services table for custom ordering
-- This matches Prisma field: displayOrder Int? @default(0)

ALTER TABLE `services`
  ADD COLUMN `displayOrder` INT NULL DEFAULT 0 AFTER `isVisibleOnPublicPage`;
