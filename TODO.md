# Console Cleanup – TODO

## Plan
- [ ] Remove `console.log`, `console.warn`, `console.error` statements from:
  - [ ] components/modules/StaffManagementModule.tsx
  - [ ] components/modules/PreConstructionModule.tsx
  - [ ] components/modules/DocumentsModule.tsx
  - [ ] components/modules/BOQModule.tsx
  - [ ] components/modules/GISRoadModule.tsx
  - [ ] components/modules/App.tsx (root `App.tsx`)
  - [ ] components/core/Login.tsx
  - [ ] components/core/Homepage.tsx
  - [ ] components/hubs/ReportsAnalyticsHub.tsx
  - [ ] components/modules/BOQRegistry.tsx
- [ ] Verify TypeScript build/lint
- [ ] Run thorough frontend verification (navigate all affected pages/tabs; exercise primary interactions)
  - [ ] Login/Homepage
  - [ ] PreConstruction add/edit/track + filtering/search
  - [ ] Documents upload + AI OCR scan + preview + edit metadata + delete/download paths
  - [ ] BOQ import + auto-MB + registry add/edit/delete + certify
  - [ ] GIS Road KML ingest + edit road/alignment
  - [ ] ReportsAnalyticsHub tabs + export buttons
- [ ] Confirm no functional/UX regressions

## Progress
- [ ] Start console cleanup
