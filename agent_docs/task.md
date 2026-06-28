# Task Checklist: Transport Management UI Integration

- [x] Create Database Seed Script `scratch/seed-transport.ts` with demo data
- [x] Integrate Transport menu items in `src/components/layout/sidebar.tsx`
- [x] Update `src/components/layout/dashboard-shell.tsx` with dynamic imports and WorkspaceRenderer tabs
- [x] Build the main `src/components/dashboard/transport.tsx` tab container
- [x] Build `TransportDashboard` (Overview & Vehicle Health Panel)
- [x] Build `TransportSetup` (Routes, Stops, Vehicles, Drivers, Assignments CRUD panels)
- [x] Build `TransportLive` (Leaflet map tracking active vehicles)
- [x] Build `TransportReplay` (Trip historical playback, GPS timeline slider, stop milestones, incident log overlay)
- [x] Build `TransportParent` (Feature flag disabled, kept separate)
- [x] Verify everything compiles with `npx tsc --noEmit`
