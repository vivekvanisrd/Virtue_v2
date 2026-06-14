# Mission Control Activity & Audit Log Explorer Implementation Plan

This plan outlines the changes required to build a visual, filterable, and real-time Activity & Audit Log Explorer within the Developer Mission Control Dashboard.

## Proposed Changes

### 1. Database Operations (Server Action)
Create `getActivityLogsAction` in [dev-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/dev-actions.ts):
- Fetch logs from the `ActivityLog` table.
- Support filters: `schoolId`, `actionType` (e.g., `STAFF_PASSWORD_RESET_BY_DEV`), and generic text search querying `details`, `userId`, `entityType`, or `entityId`.
- Return sorted records (latest first) with a safety cap (e.g., 200 logs).

### 2. UI Development in [page.tsx](file:///j:/virtue_fb/virtue-v2/src/app/developer/dashboard/page.tsx)
- **New Tab:** Add a "Logs" navigation tab using the `Terminal` or `Activity` icon.
- **Controls & Filters:** 
  - Dynamic filters for School and Action Type.
  - Text search bar.
  - Quick date filters (Today, Last 7 Days, All Time).
- **Log Table/List:**
  - Standard action type badges (rose for overrides/resets, blue for creations, emerald for database status, slate for other events).
  - Clean column grid displaying: Time, Actor, Action, Context, and Details.
  - Click-to-expand details showing full raw stringified metadata.

## Verification Plan
- **Type Checking:** Run `npx tsc --noEmit` to verify type safety.
- **Diagnostics:** Ensure new tabs and layouts preserve existing states on context switching.
