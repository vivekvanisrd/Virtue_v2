# Fee Collection & Accounts Flow Audit Tasks

- [x] Verify database state and execute compile tests (`npx tsc --noEmit`)
- [x] Fix Expected Revenue and Outstanding calculation path in [dashboard-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/dashboard-actions.ts)
- [x] Correct Fallback prioritization in `recordBulkFeeCollection` inside [finance-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/finance-actions.ts) (Decommissioned bulk endpoint, aligned standard fallback order)
- [x] Standardize Receipt Void casing to uppercase `"VOIDED"` and exclude `"VoidRequested"` from outstanding counts
- [x] Verify `applyDiscountAction` updates `StudentFeeComponent.discountAmount`
- [x] Implement ancillary payment tracking within collection allocations
- [x] Clean up syntax: remove invalid `collectionDate` write and restore template backticks
- [x] Run typescript type safety check and build verification (`npm run build`)
