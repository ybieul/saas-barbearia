# Migration: Inventory Module

Date: 2025-10-24

This migration introduces the advanced inventory module:

1. Creates `products` table for stock management
2. Adds `productCommissionPercentage` to `professionals`
3. Adds `soldProducts` JSON snapshot to `appointments`
4. Extends `financial_records` with:
   - `recordSource` string discriminator (e.g. `SERVICE_INCOME`, `PRODUCT_SALE_INCOME`, `PACKAGE_SALE_INCOME`, `SUBSCRIPTION_SALE_INCOME`)
   - product sale details: `productId`, `quantity`, `costPrice`, `commissionEarned`
   - reporting links: `professionalId`, `endUserId`

Notes:
- `soldProducts` has no DB-level default to keep MySQL 8 compatibility with JSON. App should treat null as `[]`.
- Existing data remains intact. New fields are nullable and indexed for reporting.

Apply with your usual Prisma migration flow on the server.
