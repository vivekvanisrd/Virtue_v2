# Task: Staff Elite Form — Full Field Fidelity Hardening

## Rules Applied
- Required DB fields (String): `|| undefined` → Prisma skips if empty (never overwrites with empty)
- Nullable DB fields (String?): `|| null` → Prisma saves null if empty (per user's rule)
- Dates: `data.dob ? new Date(data.dob) : null` — null if empty
- branchId: Universal fallback to identity.branchId if still missing after role checks
- DO NOT touch: prisma-tenancy.ts, backbone.ts, staff-form.tsx

## Files to Change
- [ ] `staff-actions.ts` — 6 targeted patches (branchId fallback, null rules for create + update)
- [ ] `staff.tsx` — 1 line fix (handleEdit routing)
- [ ] `staff-onboarding-elite.tsx` — Add missing UI fields + useTenant + ref data

## staff-actions.ts Patches
- [ ] P1: branchId universal fallback in createStaffAction
- [ ] P2: Fix createStaffAction base record (address/email/middleName → null not "")
- [ ] P3: Fix updateStaffAction staff.update data (null rules)
- [ ] P4: Fix updateStaffAction professional upsert update (null rules)
- [ ] P5: Fix updateStaffAction statutory upsert update (null rules)
- [ ] P6: Fix updateStaffAction bank upsert condition + data (skip if empty)

## staff.tsx Patches
- [ ] P1: handleEdit routing fix (line 88)

## staff-onboarding-elite.tsx Patches
- [ ] P1: Add useEffect + useTenant imports
- [ ] P2: Add useTenant hook + refData state
- [ ] P3: Add pfNumber/uanNumber/esiNumber to initial formData
- [ ] P4: Add useEffects (branchId sync + ref loader)
- [ ] P5: Step 1 — role selector (3-col) + address textarea + branchId for admin
- [ ] P6: Step 2 — qualification field (3-col)
- [ ] P7: Step 3 — accountName + pfNumber/uanNumber/esiNumber fields
