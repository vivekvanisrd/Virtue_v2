# Implementation Plan: ZKTeco/BioMax ADMS Push Biometric Integration

We will implement a seamless, hardware-agnostic integration for ZKTeco and BioMax biometric attendance devices. These devices operate on the **ADMS (Automatic Data Management System) HTTP Push Protocol**, where the device acts as a client that automatically pushes raw tab-separated punch logs directly to a web server endpoint.

---

## ZKTeco/BioMax ADMS Push Protocol Overview

When configured with our server IP/URL, the biometric device initiates HTTP requests to standard paths:
1. **`GET /api/iclock/getrequest`**: Device pings the server to report its online status and fetch pending commands.
2. **`GET /api/iclock/cdata`**: Initial handshake configuration check.
3. **`POST /api/iclock/cdata`**: Device pushes a batch of raw punch logs.

### Payload Format (`table=ATTLOG`)
The raw request body contains tab-separated (`\t`) values for each scan record, separated by newlines (`\n`).
```text
PIN\tTime\tStatus\tVerifyCode\tWorkcode\tReserved1\tReserved2
102\t2026-06-22 12:45:00\t0\t1\t0\t0\t0
```
* **PIN**: The employee's `biometricId` in our database.
* **Time**: The date/time string of the punch.
* **Status**: Punch type (`0` for Check In, `1` for Check Out, or ambiguous).

---

## Proposed Changes

### 1. API Push Protocol Routes

#### [NEW] [route.ts](file:///j:/virtue_fb/virtue-v2/src/app/api/iclock/cdata/route.ts)
* Handles `GET` requests: Verifies the `SN` query parameter and responds with `OK` to establish connection.
* Handles `POST` requests:
  * Reads the device serial number (`SN` query param) and verifies it exists in `BiometricDevice`.
  * Parses the raw tab-delimited text body from the device.
  * For each punch record, looks up the active `Staff` member by matching `biometricId === PIN`.
  * Computes check-in/check-out action (supporting device-driven status `0`/`1` or fallback to chronological sequence).
  * Creates or updates a `StaffAttendance` record in the database, setting the remark to `Biometric IN/OUT via device [SN]`.
  * Prevents double-punches within a 1-minute window to avoid duplicates on device retry.
  * Updates the device's `lastPingAt` field to keep status active.
  * Responds with plain text `OK` (or `OK: [count]`) to acknowledge receipt of data.

#### [NEW] [route.ts](file:///j:/virtue_fb/virtue-v2/src/app/api/iclock/getrequest/route.ts)
* Handles `GET` pings: Extracts `SN` and updates `BiometricDevice.lastPingAt` to mark it online.
* Responds with plain text `OK` to signal no pending commands.

---

### 2. Server Actions

#### [MODIFY] [attendance-v2-actions.ts](file:///j:/virtue_fb/virtue-v2/src/lib/actions/attendance-v2-actions.ts)
Add the following server actions for managing devices:
* `getBiometricDevicesAction()`: Fetches registered devices in the caller's school/branch.
* `registerBiometricDeviceAction(data)`: Creates a new device record with unique `deviceCode` (serial number).
* `toggleBiometricDeviceAction(id, isActive)`: Activates/deactivates the device.
* `deleteBiometricDeviceAction(id)`: Deletes the device.
* `getRecentBiometricPunchesAction()`: Fetches the last 20 punches across the branch where remarks indicate biometric source.

---

### 3. Frontend Components & Dashboard Integration

#### [NEW] [BiometricDevicesManager.tsx](file:///j:/virtue_fb/virtue-v2/src/components/attendance/v2-1/BiometricDevicesManager.tsx)
Create a new dashboard panel containing:
* **Device Grid**: Lists serial number, name, location, and a live status indicator (Green pulse if `lastPingAt` is < 5 mins, else Red offline).
* **Add Device Form**: Dialog to register device by entering Serial Number (`deviceCode`), Name, and Location.
* **Control Toggle**: Turn device active/inactive, or delete it.
* **Live Punch Feed**: A table displaying recent real-time logs processed by the push server.

#### [MODIFY] [AttendanceCommandCenter.tsx](file:///j:/virtue_fb/virtue-v2/src/components/attendance/v2-1/AttendanceCommandCenter.tsx)
* Add a new tab header `Biometric Devices` (`activeTab === "DEVICES"`).
* Render `<BiometricDevicesManager />` when this tab is selected.

---

## Open Questions

> [!NOTE]
> **Device Punch Mode Fallback**: ZKTeco/BioMax devices allow users to select "Check-In" or "Check-Out" on the physical screen before scanning, which sends `Status = 0` (IN) or `1` (OUT). However, employees frequently scan without pressing the button. We will implement a dynamic sequence fallback: if the device reports status `0`/`1`, we follow it; otherwise, the first punch of the day records checkIn (IN) and subsequent punches record checkOut (OUT).

---

## Verification Plan

### Automated Verification
* Write a mock device emulator script at `scratch/simulate-biomax.js` to send HTTP POSTs representing handshakes, status queries, and tab-separated punch logs.
* Verify proper schema insertion, tenancy checking, and duplicate prevention.
* Run `npx tsc --noEmit` to ensure TypeScript compilation passes.

### Manual Verification
* Access the ERP dashboard.
* Go to the **Attendance Ledger** page, click the **Biometric Devices** tab.
* Add a mock device with code `BMAX-TEST-123`.
* Run the emulator script using that code and check if the device status turns green and punches appear in the live feed.
