# Task List: Staff Identity Architecture Refactor

- [x] Update Prisma schema to add enums and new fields
  - [x] Add `EmployeeCategory` enum to [schema.prisma](file:///j:/virtue_fb/virtue-v2/prisma/schema.prisma)
  - [x] Add `EmploymentType` enum to [schema.prisma](file:///j:/virtue_fb/virtue-v2/prisma/schema.prisma)
  - [x] Add `employeeCategory`, `employmentType`, and `identityVersion` fields to the `Staff` model
  - [x] Run `npx prisma db push` to sync the database schema
- [x] Refactor ID Generator and Counter Service
  - [x] Update `generateStaffCode` in [counter-service.ts](file:///j:/virtue_fb/virtue-v2/src/lib/services/counter-service.ts) to ignore the role prefix, use the `STAFF_UNIFIED` counter, and format as `${schoolCode}-${branchCode}-STF-${seq_6}` (with `identityVersion` defaults/attributes if applicable)
  - [x] Make function signatures in [id-generator.ts](file:///j:/virtue_fb/virtue-v2/src/lib/id-generator.ts) backwards-compatible by keeping `role` optional/ignored
- [x] Refactor Zod Schemas and Type Definitions
  - [x] Add `employeeCategory`, `employmentType`, and `identityVersion` validation rules in [staff.ts](file:///j:/virtue_fb/virtue-v2/src/types/staff.ts)
- [x] Update Server Actions
  - [x] In `createStaffAction` and `updateStaffAction` in [staff-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/staff-actions.ts), process and save `employeeCategory`, `employmentType`, and `identityVersion = 'V2'` (default) to database
  - [x] In `provisionInstance` in [dev-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/dev-actions.ts), set Genesis Owner fields: `employeeCategory: 'OWNER'`, `role: 'Owner'`, `identityVersion: 'V2'`
  - [x] In `createBranchAction` and `createOwnerAction` in [actions.ts](file:///j:/virtue_fb/virtue-v2/src/app/developer/actions.ts), populate category and type enums correctly for new branches/owners, setting `identityVersion: 'V2'`
- [x] Verify
  - [x] Run TypeScript typecheck: `npx tsc --noEmit`
  - [x] Run backend verification scripts to test provisioning flow
