# Walkthrough: ZKTeco/BioMax ADMS Biometric Push Integration

We have successfully implemented and integrated a hardware-agnostic ZKTeco/BioMax biometric ADMS push-protocol attendance module.

---

## 🛠️ Key Features Implemented

### 1. HTTP ADMS Push API Receiver Endpoints
* **GetRequest Endpoint** ([route.ts](file:///j:/virtue_fb/virtue-v2/src/app/api/iclock/getrequest/route.ts)):
  * Receives periodic pings (heartbeats) from devices.
  * Dynamically parses device serial numbers (`SN`) and marks devices online.
  * Responds with plain text `OK`.
* **CData Endpoint** ([route.ts](file:///j:/virtue_fb/virtue-v2/src/app/api/iclock/cdata/route.ts)):
  * Receives raw tab-separated and newline-separated biometric logs pushed by the device.
  * Resolves personnel records by matching `biometricId` against employee codes.
  * Records chronological punch-in / punch-out events in `StaffAttendance` using `AttendanceServiceV21`.
  * Protects against duplicate submissions within a 60-second window.
  * Automatically isolates records using the device's registered `schoolId` and `branchId` to maintain strict multi-tenancy.
  * Responds with plain text `OK` to signify correct data ingest.

### 2. Server Actions Integration
* Added 5 secure server actions to [attendance-v2-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/attendance-v2-actions.ts):
  * `getBiometricDevicesAction`: List all registered biometric devices in the branch.
  * `registerBiometricDeviceAction`: Register a new device by serial code.
  * `toggleBiometricDeviceAction`: Activate/deactivate a device.
  * `deleteBiometricDeviceAction`: De-register a device.
  * `getRecentBiometricPunchesAction`: Fetch recent logs recorded through push API.

### 3. Biometric Devices Management Dashboard
* **BiometricDevicesManager** ([BiometricDevicesManager.tsx](file:///j:/virtue_fb/virtue-v2/src/components/attendance/v2-1/BiometricDevicesManager.tsx)):
  * Displays a gorgeous grid of all registered biometric terminals.
  * Visual green/red indicator showing whether a device is Online (pinged within last 5 minutes) or Offline.
  * Direct CRUD controls (Register new devices, toggle active status, delete).
  * Real-time ledger list showing recent biometric attendance events.
* **AttendanceCommandCenter Integration** ([AttendanceCommandCenter.tsx](file:///j:/virtue_fb/virtue-v2/src/components/attendance/v2-1/AttendanceCommandCenter.tsx)):
  * Integrated a new "Biometric Devices" tab to host the management UI directly inside the Attendance ledger view.

### 4. Developer Emulator Simulation Script
* Created [simulate-biomax.ts](file:///j:/virtue_fb/virtue-v2/scratch/simulate-biomax.ts):
  * Automatically maps emulator client SN to a valid database branch/school.
  * Temporarily maps a staff member to biometric PIN `"999"`.
  * Simulates realistic ADMS HTTP requests representing device registration, pings, punch-ins (8:15 AM), and punch-outs (5:30 PM).

---

## 🧪 Verification & Type Safety

* **Type Safety Check**: Ran `npx tsc --noEmit`.
  * **Result**: Compilation successful with `0 errors`.
* **Database & Tenancy Verification**:
  * Emulated punches strictly enforce safety boundary checks and resolve to the correct branch/school of the registering device.
* **Simulator Run Verification**:
  * Executed `npx tsx scratch/simulate-biomax.ts` and successfully verified:
    * Automatic mapping to first branch with staff.
    * Robust case-insensitive status matching (handling both `Active` and `ACTIVE` database entries).
    * Heartbeat registration (`GET /api/iclock/getrequest` returning `OK`).
    * Handshake initialization (`GET /api/iclock/cdata` returning `OK`).
    * Punch IN ingest (`POST /api/iclock/cdata` resulting in creation of a new `StaffAttendance` record).
    * Punch OUT ingest (`POST /api/iclock/cdata` resulting in successful checkout update and matching Remarks).
