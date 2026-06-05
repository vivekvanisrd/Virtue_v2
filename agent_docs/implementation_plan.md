# Developer Impersonation, Branch Principal Credentials, and Staff Onboarding Correction Implementation Plan

This plan outlines the technical changes needed to:
1. Fix the syntax/compilation error in `src/middleware.ts` by wrapping header injection in `if (user)`.
2. Implement Developer context-switching (school/branch impersonation) using `v-active-school` and `v-active-branch` cookies.
3. Update `src/lib/auth/backbone.ts` to support fallback cookie context resolution for the Developer role.
4. Add "Impersonate" / "Switch Context" buttons in `/developer` and an "Exit Impersonation" option in the dashboard header.
5. Add an "Admin Phone" field to the Add Branch form in `/developer` and set the Principal's login credentials to default to their phone number.
6. Correct ID generation inside [createBranchAction](file:///J:/virtue_fb/virtue-v2/src/app/developer/actions.ts#L137) and [createOwnerAction](file:///J:/virtue_fb/virtue-v2/src/app/developer/actions.ts#L277) using transaction-safe [IdGenerator.generateStaffCode](file:///J:/virtue_fb/virtue-v2/src/lib/id-generator.ts#L58) to enforce sequential nomenclature rules.
7. Mandate phone number validation on all admin and staff onboarding forms, stripping out spaces, symbols, and letters in real-time.
8. Integrate Indian Standard Time (`Asia/Kolkata` timezone) globally into date utility formatting and schema preprocessing to eliminate client-browser timezone date drifts.

---

## Proposed Changes

### Core Security & Authentication

#### [MODIFY] [middleware.ts](file:///J:/virtue_fb/virtue-v2/src/middleware.ts)
- Wrap the Sovereign Backbone header injection in `if (user)` to fix the compilation/syntax error and prevent guest request crashes.
- Read `v-active-school` and `v-active-branch` cookies to override the active context for `DEVELOPER` and `OWNER` users.

#### [MODIFY] [backbone.ts](file:///J:/virtue_fb/virtue-v2/src/lib/auth/backbone.ts)
- Update Mode B (cookie recovery) fallback so that if `user.role === 'DEVELOPER'`, it reads `v-active-school` and `v-active-branch` cookies to set the target context.
- Update `user.role === 'OWNER'` to also read the `v-active-branch` cookie fallback if present.

#### [MODIFY] [auth-native.ts](file:///J:/virtue_fb/virtue-v2/src/lib/actions/auth-native.ts)
- Expand database sign-in queries to match login identifiers on email, username, phone, or staff code.

### Date & Timezone Utilities

#### [MODIFY] [validations.ts](file:///J:/virtue_fb/virtue-v2/src/lib/utils/validations.ts)
- Export global helpers `formatToISODateString` and `formatToDDMMYYYY` bound strictly to `Asia/Kolkata` timezone.

#### [MODIFY] [staff.ts](file:///J:/virtue_fb/virtue-v2/src/types/staff.ts)
- Refactor schemas to use global timezone date formatting and handle DB `null` values.

---

## Verification Plan

### Automated Verification
- Run TypeScript check: `npx tsc --noEmit` to ensure there are no syntax or type errors.
