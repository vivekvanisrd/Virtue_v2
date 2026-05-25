# Implementation Plan - Mobile-First PWA QR & GPS Attendance Scanner

This plan outlines the steps to build a mobile-first, responsive Progressive Web App (PWA) page inside the Next.js application at `/mobile/attendance`. This will replicate the native mobile app functionality directly in the web browser, allowing teachers to scan gate kiosk QR codes and submit GPS-verified attendance.

---

## User Review Required

> [!IMPORTANT]
> - **Dependency Installation**: We will install the lightweight `html5-qrcode` library for fast, cross-device QR scanning.
> - **Local Testing Tunnel**: To test camera and GPS permissions on a physical mobile phone, standard HTTP is blocked by browsers. We recommend using a local tunnel (like `ngrok` or similar) to serve `localhost:3001` over `https://` during testing.

---

## Proposed Changes

### Dependencies
- Install `html5-qrcode` to handle camera media stream decoding.

### Next.js Routing & Layouts
#### [NEW] [page.tsx](file:///J:/virtue_fb/virtue-v2/src/app/mobile/attendance/page.tsx)
- Create a mobile-first page featuring two core screens:
  1. **Login Screen**: Enter `staffCode` and validate via `/api/auth/mobile-login`. Save credentials locally in `localStorage` for automatic login.
  2. **Dashboard Screen**: Displays user statistics (Presents, Lates, Attendance Ratio) and a large **Scan Gate QR** button.
  3. **QR Scanner Overlay**: Integrates `html5-qrcode` to sample frames from the camera, decode the token, fetch device coordinates via `navigator.geolocation`, and call `/api/attendance/scan`.

### PWA Configurations
#### [MODIFY] [manifest.json](file:///J:/virtue_fb/virtue-v2/public/manifest.json)
- Add shortcuts and update setup targets to direct users to the `/mobile/attendance` scanner route when installed as a standalone app.

---

## Verification Plan

### Automated Verification
- Verify compilation of the new route using `npx tsc --noEmit` and `npm run build`.

### Manual Verification
- Test in a secure context (HTTPS) on mobile to confirm camera viewfinder initialization.
- Scan the kiosk screen QR code, verify GPS permission prompt, and check that the database records the punch-in correctly.
