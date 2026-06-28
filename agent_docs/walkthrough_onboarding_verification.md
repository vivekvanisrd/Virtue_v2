# Onboarding & Password Reset Flow Verification Walkthrough

This walkthrough documents the successful integration and verification of the onboarding and password reset flow for teachers, focusing on the user Nagamani.

---

## What Was Done

1. **Database State Reset**: 
   * Ran the [reset-nagamani.ts](file:///j:/virtue_fb/virtue-v2/scratch/reset-nagamani.ts) script, resetting Nagamani's user credentials to:
     * `onboardingStatus` = `"PASSWORD_CHANGE_REQUIRED"`
     * `username` = `null`
     * `mobilePasswordUsed` = `false`
     * Password hash matched to her phone number: `"9100000011"`.

2. **Middleware Routing Bug Fix**:
   * Identified and fixed a deadlock routing bug in [middleware.ts](file:///j:/virtue_fb/virtue-v2/src/middleware.ts):
     * Previously, any user with the `Teacher` role was unconditionally redirected to `/mobile/attendance`. This blocked teachers from reaching `/change-password` to complete their onboarding/password-reset.
     * Updated the teacher redirect rule to bypass when accessing the `/change-password` page.
     * Added a global gating check in middleware: If a user has `onboardingStatus = 'PASSWORD_CHANGE_REQUIRED'`, they are forced to redirect to `/change-password` from any protected path.

3. **Session Payload Alignment**:
   * Updated `signInAction` and `refreshSessionAction` in [auth-native.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/auth-native.ts) to populate `onboardingStatus` inside the JWT session token payload. This makes the onboarding state accessible to both the middleware and client-side page checks.

---

## Verification Results

* **TypeScript Compilation**: Compiled successfully with `npx tsc --noEmit` (zero errors).
* **Onboarding Testing via Browser Subagent**:
   1. Navigated to `/login` and authenticated as Nagamani using `9100000011` / `9100000011`.
   2. Confirmed automatic redirect to `/change-password`.
   3. Completed **Step 1 (Account Details)**: Entered custom username `naga_mani_v2` and new password `Nagamani@123`.
   4. Completed **Step 2 (Personal Profile)**: Set Last Name to `Devi`.
   5. Completed **Step 3 (Statutory & Bank)**: Cleared the invalid/optional prefilled PAN number and clicked "Complete Onboarding".
   6. Verified successful profile updates and final redirection to the Daily Attendance Dashboard (`/mobile/attendance`), confirming onboarding status changed to `"JOINED"`.

---

## Current Database Status

Verified that Nagamani's database record is successfully updated:
* `onboardingStatus`: `"JOINED"`
* `lastName`: `"Devi"`
* `username`: `"naga_mani_v2"`
* `employeeCategory`: `"TEACHING"`
