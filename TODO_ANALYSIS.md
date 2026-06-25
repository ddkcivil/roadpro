# Analysis and Cleanup TODO

## Phase 1: Money Formatting Consistency

### 1. PurchaseOrdersModule.tsx
- [x] Uses hardcoded `NPR {value.toLocaleString()}` 
- [ ] Import and use `formatCurrency` from utils
- [ ] Replace all instances

### 2. BOQModule.tsx
- [x] Uses manual `{currencySymbol}${value.toLocaleString()}`
- [ ] Import and use proper formatting utility
- [ ] Replace all instances

### 3. FleetModule.tsx
- [x] Uses Indian Rupee symbol `₹` instead of NPR
- [ ] Import proper currency handler
- [ ] Fix maintenance cost display

### 4. SubcontractorBillingModule.tsx
- [x] Already using `formatCurrency` correctly ✓
- [ ] Verify all usages are correct

## Phase 2: Other Modules to Check

- [ ] MaterialManagementModule
- [ ] BillingModule
- [ ] FinancialManagementHub
- [ ] AgencyModule

## Phase 3: General Cleanup

- [ ] Check for duplicate helper functions
- [ ] Clean up any unnecessary code
- [ ] Verify TypeScript types

## Notes

- `currencyUtils.ts` has `formatCurrency(amount, currencyCode?)` available
- `exportUtils.ts` has `formatCurrency(amount, settings?)` available  
- Use settings.currency to get proper symbol
