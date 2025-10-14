# Migration: Add PREPAID to PaymentMethod Enum

**Date:** 2025-10-14  
**Purpose:** Add PREPAID value to PaymentMethod enum to properly track appointments paid with subscription/package credits

## Problem
When appointments were completed using credits (subscription or package), the `paymentMethod` field was being set to `null`, causing the reports to show "Não informado" (Not informed) in the Recent Transactions section.

## Solution
Added `PREPAID` as a valid value in the `PaymentMethod` enum, which now includes:
- CASH
- CARD
- PIX
- TRANSFER
- DEBIT
- CREDIT
- **PREPAID** ← NEW

## Tables Affected
- `appointments.paymentMethod`
- `financial_records.paymentMethod`

## How It Works
1. When user completes an appointment with credits, frontend sends `paymentMethod: 'PREPAID'`
2. Backend saves `paymentMethod: 'PREPAID'` in appointment
3. Backend also sets `paymentSource: 'SUBSCRIPTION'` or `'PACKAGE'` to distinguish the credit type
4. Reports now show "Pré-pago" instead of "Não informado"

## Running the Migration

### On Local Development
```bash
npx prisma migrate dev
```

### On VPS Server
```bash
# Option 1: Using Prisma CLI (requires prisma installed)
npx prisma migrate deploy

# Option 2: Manual SQL execution
mysql -u your_user -p your_database < prisma/migrations/20251014_add_prepaid_to_payment_method/migration.sql
```

## Safety Features
The migration includes safety checks:
- Checks if PREPAID already exists before modifying
- Uses conditional ALTER TABLE to prevent errors on re-runs
- Non-destructive - only adds new enum value

## Related Files
- `/prisma/schema.prisma` - Enum definition
- `/app/api/appointments/[id]/complete/route.ts` - Uses PREPAID when completing with credits
- `/components/ui/payment-method-modal.tsx` - Sends PREPAID from frontend

## Testing
After running migration:
1. Complete an appointment with subscription credits
2. Check Reports → Recent Transactions
3. Should show "Pré-pago" instead of "Não informado"
4. Check database: `paymentMethod` should be 'PREPAID' and `paymentSource` should be 'SUBSCRIPTION'
