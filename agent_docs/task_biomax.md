# Task Checklist: ZKTeco/BioMax ADMS Biometric Integration

- [x] Create API Route for getrequest: `src/app/api/iclock/getrequest/route.ts`
- [x] Create API Route for cdata: `src/app/api/iclock/cdata/route.ts`
- [x] Add Biometric Device server actions in `src/lib/actions/attendance-v2-actions.ts`
- [x] Create Biometric Devices UI manager: `src/components/attendance/v2-1/BiometricDevicesManager.tsx`
- [x] Integrate Biometric Devices tab in `src/components/attendance/v2-1/AttendanceCommandCenter.tsx`
- [x] Build emulator script `scratch/simulate-biomax.ts` to verify the push API
- [x] Run type-checking `npx tsc --noEmit` to ensure type safety
