# Staff Identity Architecture Refactor Implementation Plan

Refactor the existing staff identity system to use a unified, permanent employee numbering scheme instead of role-specific staff codes. This ensures staff codes remain permanent across designation changes, promotions, transfers, and categories.

## User Review Required

> [!IMPORTANT]
> **Database Schema Update**: This refactor introduces a new `employeeCategory` field on the `Staff` table. We will perform a `npx prisma db push` to add this column to the database without dropping existing records.
> 
> **Sequence Reset/Migration**: For existing counters, any new staff created after the push will generate codes under the new `STAFF_UNIFIED` sequence. Previous staff records will retain their existing codes to preserve historical login/reference stability, or we can run a backfill migration if you want to rewrite all past codes.

## Open Questions

> [!WARNING]
> Do you want us to write a backfill script to migrate all existing staff records to the new `-STF-` format? Or should we leave historical records as-is and only apply the new format to future hires? (Both options are supported).

---

## Proposed Changes

### 1. Database Schema

#### [MODIFY] [schema.prisma](file:///j:/virtue_fb/virtue-v2/prisma/schema.prisma)
* Add `employeeCategory String?` to the `Staff` model.

---

### 2. Core ID Generation Layer

#### [MODIFY] [counter-service.ts](file:///j:/virtue_fb/virtue-v2/src/lib/services/counter-service.ts)
* Refactor `generateStaffCode` to ignore the role prefix and generate:
  `${schoolCode}-${branchCode}-STF-${seq_6}`
* Use the single counter type `"STAFF_UNIFIED"` (global scope per branch) to drive sequences.
* Keep the `role` parameter optional in the function signature for backwards compatibility with existing actions.

#### [MODIFY] [id-generator.ts](file:///j:/virtue_fb/virtue-v2/src/lib/id-generator.ts)
* Update `generateStaffCode` to match the updated counter-service signature.

---

### 3. Staff Schemas and Types

#### [MODIFY] [staff.ts](file:///j:/virtue_fb/virtue-v2/src/types/staff.ts)
* Add `employeeCategory` to `staffOnboardingSchema` (Zod string validator).
* Add `employeeCategory` to `flexibleStaffBulkSchema` (Zod string validator).

---

### 4. Server Actions

#### [MODIFY] [staff-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/staff-actions.ts)
* Persist `employeeCategory` inside `createStaffAction` and `updateStaffAction` database queries.
* Update filtering/search inside directory actions to support querying on `employeeCategory`.

#### [MODIFY] [dev-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/dev-actions.ts)
* Update `provisionInstance` to create the Genesis Owner with `employeeCategory: "OWNER"` and `role: "Owner"`.

#### [MODIFY] [actions.ts](file:///j:/virtue_fb/virtue-v2/src/app/developer/actions.ts)
* Update `createBranchAction` to create the principal with `employeeCategory: "MANAGEMENT"` and `role: "Principal"`.
* Update `createOwnerAction` to set `employeeCategory` based on selected role (e.g. `"OWNER"`, `"MANAGEMENT"`).

---

## Verification Plan

### Automated Tests
* Run `npx tsc --noEmit` to verify type safety.
* Run a custom test script to verify that provisioning a new school and adding staff creates the unified `-STF-` code structure.

### Manual Verification
* Deploy the dev server and test creating a teacher/principal on the onboarding UI to verify the code is assigned correctly.
