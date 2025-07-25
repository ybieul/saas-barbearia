-- AlterTable: Update avatar field in professionals table to TEXT type
-- This allows storing Base64 encoded images for professional avatars
ALTER TABLE `professionals` MODIFY `avatar` TEXT;

-- AlterTable: Update avatar field in tenants table to TEXT type  
-- This allows storing Base64 encoded images for tenant/owner avatars
ALTER TABLE `tenants` MODIFY `avatar` TEXT;
