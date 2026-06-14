# PWA Feasibility Analysis: Mobile QR & GPS Attendance

This document evaluates the feasibility of replacing or augmenting the React Native APK client with a Progressive Web App (PWA) for the Sovereign V2 Teacher Attendance System.

---

## 📋 Capability Checklist

| Feature Required | Web API / PWA Standard | Android Support | iOS Support | Feasible? |
| :--- | :--- | :---: | :---: | :---: |
| **Camera Access (QR Scanning)** | `navigator.mediaDevices.getUserMedia()` | ✅ | ✅ | **Yes** |
| **GPS Geolocation** | `navigator.geolocation.getCurrentPosition()` | ✅ | ✅ | **Yes** |
| **Standalone UI Mode** | `display: "standalone"` in `manifest.json` | ✅ | ✅ | **Yes** |
| **Offline Caching / App Shell** | Service Worker (`CacheStorage` API) | ✅ | ✅ | **Yes** |
| **Home Screen Installation** | App Manifest (`manifest.json`) | ✅ (Native Prompt) | ✅ (Add to Home) | **Yes** |

---

## 🛡️ Critical Technical Constraints & Safeguards

### 1. Secure Context Requirements (HTTPS)
To protect user privacy, modern mobile browsers enforce a **strict secure origin rule** for high-privilege APIs:
*   `getUserMedia()` (Camera stream) and `getCurrentPosition()` (GPS) **will be blocked** on non-secure origins (HTTP).
*   **Testing Constraint**: You can test on `http://localhost:3000` directly on the host machine. However, to test on a physical mobile phone connected to your local development machine, you must use a secure HTTPS tunnel (e.g., `ngrok` or Expo tunnels) or compile it behind an HTTPS proxy.
*   **Production Safety**: When deployed to Vercel (which runs natively over HTTPS), the features will work instantly and prompt for standard permissions.

### 2. QR Code Decoding Performance
Unlike native Expo packages (`expo-camera` / `CameraView`) which decode barcodes on CPU/GPU threads, web-based QR scanning uses a video element and canvas sampling:
*   **Solution**: Integration of lightweight libraries such as `html5-qrcode` or `jsqr`.
*   **Performance**: Extremely fast on modern mobile browsers, decoding frames in less than 30ms.

---

## 📊 Comparison: PWA vs. Native APK

| Metric | Progressive Web App (PWA) | Native React Native APK | Winner |
| :--- | :--- | :--- | :---: |
| **Codebase Redundancy** | Single codebase (Next.js responsive routes) | Separate repository (`sovereign-mobile`) | **PWA** |
| **Deployment & Updates** | Instant updates (on page reload) | App Store review / Manual APK downloads | **PWA** |
| **User Onboarding** | Zero download friction; simple URL bookmark | Warned APK installation or store search | **PWA** |
| **Camera & GPS Performance** | High-performance (Web APIs are optimized) | Native-performance (negligible difference) | **Tie** |
| **Hardware Hooks** | Restricted to Web APIs (Camera, GPS, Motion) | Access to low-level Bluetooth, NFC, OS | **APK** |

---

## 🎯 Feasibility Conclusion

**Yes, a PWA is perfectly suited for this kiosk scanning system.** 

Since the attendance flow only requires **scanning a QR code** (containing the timestamped token) and **fetching GPS coordinates** (to prevent punching in from home), standard web APIs are more than sufficient. Choosing a PWA eliminates Android APK security warnings, iOS distribution complexity, and code duplication.
