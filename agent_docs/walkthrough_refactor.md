# Walkthrough: Staff Identity Architecture Refactor

Refactored the staff identity system to employ a unified, permanent employee numbering scheme instead of role-based designations. This ensures staff codes remain permanent across promotions, transfers, and designation changes.

## 🛠️ Changes Implemented

### 1. Database Schema
* Introduced `EmployeeCategory` and `EmploymentType` enums.
* Added `employeeCategory`, `employmentType`, and `identityVersion` columns to the `Staff` table in [schema.prisma](file:///j:/virtue_fb/virtue-v2/prisma/schema.prisma).

### 2. Core ID Generation
* Updated `generateStaffCode` in [counter-service.ts](file:///j:/virtue_fb/virtue-v2/src/lib/services/counter-service.ts) to utilize the `STAFF_UNIFIED` sequence and ignore the role prefix, standardizing code formats to `${schoolCode}-${branchCode}-STF-${seq_6}`.
* Kept the `role` parameter optional in [id-generator.ts](file:///j:/virtue_fb/virtue-v2/src/lib/id-generator.ts) to preserve backward compatibility.

### 3. Zod Schemas and Type Definitions
* Refactored Zod validation models in [staff.ts](file:///j:/virtue_fb/virtue-v2/src/types/staff.ts) (`staffProfessionalSchema`, `flexibleStaffBulkSchema`) to include type constraints for `employeeCategory`, `employmentType`, and `identityVersion`.

### 4. Server Actions
* Persisted `employeeCategory`, `employmentType`, and `identityVersion` in database records inside `createStaffAction` and `updateStaffAction` in [staff-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/staff-actions.ts).
* Set genesis fields correctly on new institutional instances in [dev-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/dev-actions.ts) (`provisionInstance`).
* Set correct category and version fields during branch creation (`createBranchAction`) and admin creation (`createOwnerAction`) in [actions.ts](file:///j:/virtue_fb/virtue-v2/src/app/developer/actions.ts).

---

## 🧪 Verification Results

### 1. TypeScript Compilation Check
* Executed `npx tsc --noEmit`.
* **Result:** Compilation succeeded with 0 errors across the codebase.

### 2. Integration Test Verification
* Executed `scripts/verify-refactor-integration.ts` with test environments.
* **Results:**
  * **School Provisioning Flow:** Successfully created school, HQ branch, and Genesis Owner with code `VS9355-HQ-STF-000001`, category `OWNER`, and identity version `V2`.
  * **Campus Branch & Principal Creation:** Successfully created branch and Principal with code `VS9355-RCB-STF-000001`, category `MANAGEMENT`, and identity version `V2`.
  * **Manual Staff Onboarding:** Successfully onboarded teacher Doe with code `VS9355-RCB-STF-000002` (sequence auto-incremented from Principal), category `TEACHING`, and type `PERMANENT`.
  * **Staff Update Flow:** Promoted teacher Doe to category `MANAGEMENT` and type `CONTRACT`. Verified that the staff code and identity version stayed permanent (immutable).
  * **Directory Filtering Architecture:** Successfully filtered directory queries on categories, returning all corresponding management members.
