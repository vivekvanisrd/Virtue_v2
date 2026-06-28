# Deep Security Audit Report: Principal Role Controls & Cross-Branch Isolation

This audit report documents the security mechanisms controlling user role modifications, branch boundaries, and the results of our deep security audit in the `Staff` module.

---

## 1. Role Capabilities & Constraints

In PaVa-EDUX Enterprise, roles are structured to enforce division of authority:
* **`DEVELOPER` / `OWNER`**: Global administrative capabilities spanning all schools (Developers) or all branches within their school (Owners).
* **`PRINCIPAL`**: Campus-scoped leadership. They are authorized to manage day-to-day operations and staff but are **spatially jailed to their specific branch**.
* **`STAFF` / `TEACHER`**: Standard institutional users jailed strictly to their own branch.

---

## 2. Security Audit Findings & Vulnerabilities

During our deep audit of the Server Actions in [staff-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/staff-actions.ts) and [role-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/role-actions.ts), we investigated where a Principal could change user roles and identified several **critical cross-branch write vulnerabilities**:

### Finding A: Role Modifications & Redundancy
* **In UI Portal**: The UI uses `updateStaffRole` from [role-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/role-actions.ts), which correctly enforces a branch boundary guard preventing Principals from modifying roles outside their own branch.
* **Direct Server Action Exposure**: In [staff-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/staff-actions.ts), a separate function `updateStaffRoleAction` was exported in a `"use server"` file. 
  * *Vulnerability*: It lacked a branch guard check. Because it is a Next.js Server Action, it was exposed directly as an HTTP POST endpoint. A malicious Principal could invoke it via browser console or scripts to change roles of users in other branches.
  * *Fix Applied*: Added target record jailing check. Principals attempting to invoke `updateStaffRoleAction` on staff from other branches will receive a `SECURITY_VIOLATION` error.

### Finding B: Cross-Branch Personal Detail Modifications
* **Vulnerability in `updateStaffAction`**: 
  * While the action had an override to force-line new data to the Principal's `branchId`, it did **not** verify that the target staff member being updated currently belonged to the Principal's branch.
  * A Principal from Branch A could modify the name, email, phone, or gender of a teacher in Branch B.
  * *Fix Applied*: Added check to verify that `currentStaff.branchId === identity.branchId` for non-Owner/non-Dev callers, throwing `ACCESS_DENIED` on mismatch.

### Finding C: Cross-Branch Salary & Designation Updates
* **Vulnerability in `updateStaffProfessionalAction`**:
  * In the Prisma Tenancy Extension ([prisma-tenancy.ts](file:///j:/virtue_fb/virtue-v2/src/lib/prisma-tenancy.ts)), queries by Principals are scoped to `schoolId` but are **not** forced to a specific `branchId`.
  * Consequently, the raw `update` call on `StaffProfessional` could update staff records across any branch in the school.
  * A Principal could maliciously adjust basic salary, designation, or department of staff members on other campuses.
  * *Fix Applied*: Added a validation check to fetch the target staff member and confirm they are in the same branch as the Principal before executing the Professional database update.

### Finding D: Cross-Branch Financial Advances
* **Vulnerability in `disburseStaffAdvanceAction`**:
  * Allowed the creation of a `StaffAdvance` record linking to any `staffId` in the school without checking if they belong to the Principal's branch.
  * *Fix Applied*: Added validation fetching the target staff member and ensuring branch alignment for non-Owner callers before creating the advance.

---

## 3. Mitigation Verification

All modifications have been successfully written and verified:
* **TypeScript Compilation**: Compiled with zero errors using `npx tsc --noEmit`.
* **Prisma Tenancy Extension Integrity**: Checked that all standard database reads and queries are fully tenant-isolated by the global client wrapper.
