-- Add audit fields for subscription emails and webhook processing
ALTER TABLE `tenants`
  ADD COLUMN `lastSubscriptionEmailType` ENUM('WELCOME','PRE_EXPIRE_3D','PRE_EXPIRE_1D','CANCELED','EXPIRED_WEBHOOK','EXPIRED_GRACE') NULL AFTER `kirvanoSubscriptionId`,
  ADD COLUMN `webhookExpiredProcessed` BOOLEAN NOT NULL DEFAULT FALSE AFTER `lastSubscriptionEmailType`;
