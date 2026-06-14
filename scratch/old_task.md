# Task List

- [x] Fix middleware syntax error & support impersonation cookies in [middleware.ts](file:///J:/virtue_fb/virtue-v2/src/middleware.ts)
- [x] Support context cookie resolution fallbacks in [backbone.ts](file:///J:/virtue_fb/virtue-v2/src/lib/auth/backbone.ts)
- [x] Update `createBranchAction` to support phone number credentials in [actions.ts](file:///J:/virtue_fb/virtue-v2/src/app/developer/actions.ts)
- [x] Add `switchSchoolContextAction` in [actions.ts](file:///J:/virtue_fb/virtue-v2/src/app/developer/actions.ts)
- [x] Update the branch creation form and add impersonation buttons in [page.tsx](file:///J:/virtue_fb/virtue-v2/src/app/developer/page.tsx)
- [x] Display impersonation status and "Exit Impersonation" in [header.tsx](file:///J:/virtue_fb/virtue-v2/src/components/layout/header.tsx)
- [x] Correct staff code generation in branch principal & owner creation to enforce sequential ID rules (`VIVES-SNB-PRIN-0001`)
- [x] Migrate existing database records for `Swetha Jangampet` and `Vibhushree Sambayagari` to sequential IDs
- [x] Mandate phone number input fields for owner/staff forms and enforce validation checks
- [x] Map default usernames & passwords to phone numbers in the database
- [x] Expand native sign-in routine in [auth-native.ts](file:///J:/virtue_fb/virtue-v2/src/lib/actions/auth-native.ts) to accept Phone Numbers and Staff IDs
- [x] Fix silent validation blocker on staff profile edit screen by handling `null` database states and `'PASSWORD_CHANGE_REQUIRED'` onboarding status in [staff.ts](file:///J:/virtue_fb/virtue-v2/src/types/staff.ts)
- [x] Preprocess date objects (dob, dateOfJoining) to standard `YYYY-MM-DD` strings for HTML date inputs in [staff.ts](file:///J:/virtue_fb/virtue-v2/src/types/staff.ts)
- [x] Enforce real-time space removal on phone fields during typing or pasting in [staff-onboarding-elite.tsx](file:///J:/virtue_fb/virtue-v2/src/components/staff/staff-onboarding-elite.tsx) and [page.tsx](file:///J:/virtue_fb/virtue-v2/src/app/developer/page.tsx)
- [x] Implement database-backed [globalPhoneSchema](file:///J:/virtue_fb/virtue-v2/src/lib/utils/validations.ts#L81) verification for staff phone numbers in [staff.ts](file:///J:/virtue_fb/virtue-v2/src/types/staff.ts)
- [x] Verify everything compiles and test the functionality
