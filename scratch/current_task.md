# Fee Collection & Accounts Flow Audit Tasks

- [ ] Verify database state and execute compile tests (`npx tsc --noEmit`)
- [ ] Fix Expected Revenue and Outstanding calculation path in [dashboard-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/dashboard-actions.ts)
- [ ] Correct Fallback prioritization in `recordBulkFeeCollection` inside [finance-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/finance-actions.ts)
- [ ] Standardize Receipt Void casing to uppercase `"VOIDED"` and exclude `"VoidRequested"` from outstanding counts
- [ ] Verify `applyDiscountAction` updates `StudentFeeComponent.discountAmount`
- [ ] Implement ancillary payment tracking within collection allocations
- [ ] Clean up syntax: remove invalid `collectionDate` write and restore template backticks
- [ ] Run typescript type safety check and build verification (`npm run build`)
