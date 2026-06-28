# Implementation Plan: Enterprise-Grade School ERP Transport Management System

We will implement a complete, robust, and tenant-isolated Transport Management module for the Next.js ERP. Since the system uses a dynamic tab-based navigation shell, this module will be integrated as a set of dashboard workspace tabs, complete with server actions, real-time simulated telemetry, and Leaflet-based map rendering.

## User Review Required

> [!IMPORTANT]
> **Dynamic Tab-based Rendering**: Instead of rendering standalone pages under `/dashboard/transport`, we will integrate the Transport views directly into the workspace's tab system (`WorkspaceRenderer` in `dashboard-shell.tsx`). This aligns with the unified client-side tab state of Virtue v2.
>
> **Interactive Map Engine**: For the live tracker and parent tracking views, we will load **Leaflet (OpenStreetMap)** dynamically from a CDN on the client side. This operates natively without server-side rendering (SSR) errors and doesn't require upfront credit card billing setups for Google Maps.
>
> **Race Condition & Concurrency Safeguards**: Setup and driver assignment forms will enforce optimistic concurrency control (`updatedAt`) and prevent double-allocations (e.g., assigning a driver to two active vehicles) directly in the UI and server action validation.

---

## Proposed Changes

### 1. Navigation & Shell Layout

#### [MODIFY] [sidebar.tsx](file:///j:/virtue_fb/virtue-v2/src/components/layout/sidebar.tsx)
* Add a new "Transport" navigation group with sub-items:
  * `transport-dashboard` -> "Transport Hub" (Overview & feed)
  * `transport-setup` -> "Fleet Setup" (Routes, Stops, Vehicles, Drivers, Assignments)
  * `transport-live` -> "Live Tracking" (Real-time admin map)
  * `transport-parent` -> "Parent Tracking" (Parent child tracker)

#### [MODIFY] [dashboard-shell.tsx](file:///j:/virtue_fb/virtue-v2/src/components/layout/dashboard-shell.tsx)
* Dynamically import `TransportContent` from `@/components/dashboard/transport` to maintain code splitting.
* Add mappings in `WorkspaceRenderer` for the new `transport` tab IDs: `transport`, `transport-dashboard`, `transport-setup`, `transport-live`, and `transport-parent`.

---

### 2. Frontend Components

#### [NEW] [transport.tsx](file:///j:/virtue_fb/virtue-v2/src/components/dashboard/transport.tsx)
Create the core container component that switches between sub-views:
1. **TransportDashboard**:
   * Summary tiles: Active Trips, Speeding Alerts, Maintenance Due, Incidents.
   * Incident Feed: List of recent breakdowns, delays, route deviations with severity levels.
   * Active Trips Table: Shows live trips, route details, driver info, and student boarding counts.
2. **TransportSetup**:
   * Sub-tabs for **Routes**, **Stops**, **Vehicles**, **Drivers**, and **Assignments**.
   * Forms and lists with validation using standard Tailwind forms and modals.
   * Enforces rules like unique registration numbers, active assignments, and optimistic concurrency locks.
3. **TransportLive**:
   * Sidebar showing active trips and statuses (on-route, delayed, speeding, deviated).
   * Map panel container that dynamically loads Leaflet from OpenStreetMap CDN.
   * Draws routes, stops, and shows live-moving vehicles with custom markers.
4. **TransportParent**:
   * Personalized dashboard showing child's route info, active bus registration, driver contact.
   * Mini tracking map showing current bus position, ETA, and progress along stops.
   * Timeline log of boarding confirmations (BOARDED, DROPPED, MISSED).

---

### 3. Database Seeding

#### [NEW] [seed-transport.ts](file:///j:/virtue_fb/virtue-v2/scratch/seed-transport.ts)
* Create a script to populate standard transport data for `VIVES-RCB`:
  * 4 major school bus routes with coordinates and stops.
  * 4 driver records (hashed passwords) and 4 vehicles.
  * Driver assignments and student transport allocations.
  * Real-time GPS caches and mock incident logs.

---

## Verification Plan

### Automated Tests
- Run `npx tsx scratch/seed-transport.ts` to seed mock transport data.
- Run `npx tsc --noEmit` to verify TypeScript compile success.

### Manual Verification
- Test all fleet setup forms (adding route, stop, vehicle, driver, assignment).
- Verify validation warnings on duplicate assignments.
- Inspect the interactive live map rendering and parent tracking views.
