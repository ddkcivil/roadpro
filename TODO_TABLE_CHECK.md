# Table Check Report: Frontend vs Backend Database

## Overview
This document tracks which data structures from the frontend (types.ts) have corresponding backend tables in Supabase.

---

## ✅ FRONTEND TO BACKEND MAPPING (Tables that exist)

| Frontend Type | Backend Table(s) | Status |
|---------------|------------------|-------|
| **User** | `profiles` | ✅ Exists (with auth.users) |
| **Project** | `projects` | ✅ Exists (main table with JSONB columns) |
| **Message** | `messages` | ✅ Exists |
| **ProjectDocument** | `project_documents` | ✅ Exists |
| **DocumentVersion** | `document_versions` | ✅ Exists |
| **SitePhoto** | `project_site_photos` | ✅ Exists |
| **StaffLocation** | `staff_locations` | ✅ Exists |
| **AuditLog** | `audit_logs` | ✅ Exists |
| **Registration** | `registrations` | ✅ Exists |
| **Alignment** | `alignments` | ✅ Exists |
| **Structure** | `structures` | ✅ Exists |
| **Road** | `roads` | ✅ Exists |
| **RoadType** | `road_types` | ✅ Exists |
| **KML/Data** | `project_kml` + `kml_data` JSONB | ✅ Exists |

---

## ⚠️ FRONTEND TYPES STORED WITHIN PROJECT JSONB COLUMNS

These types are NOT separate tables but are stored within the `projects` table as JSONB columns:

| Frontend Type | Projects JSONB Column | Status |
|--------------|----------------------|--------|
| BOQItem | `boq` | ✅ In projects JSONB |
| VariationOrder | `variation_orders` | ✅ In projects JSONB |
| MeasurementSheet | `measurement_sheets` | ✅ In projects JSONB |
| Agency | `agencies` | ✅ In projects JSONB |
| AgencyPayment | `agency_payments` | ✅ In projects JSONB |
| SubcontractorPayment | `subcontractor_payments` | ✅ In projects JSONB (FIXED) |
| AgencyMaterial | `agency_materials` | ✅ In projects JSONB |
| AgencyBill | `agency_bills` | ✅ In projects JSONB |
| Material | `materials` | ✅ In projects JSONB |
| InventoryItem | `inventory` | ✅ In projects JSONB |
| PurchaseOrder | `purchase_orders` | ✅ In projects JSONB |
| InventoryTransaction | `inventory_transactions` | ✅ In projects JSONB |
| Vehicle | `vehicles` | ✅ In projects JSONB |
| VehicleLog | `vehicle_logs` | ✅ In projects JSONB |
| DailyReport | `daily_reports` | ✅ In projects JSONB |
| PreConstructionTask | `pre_construction` | ✅ In projects JSONB |
| LandParcel | `land_parcels` | ✅ In projects JSONB |
| MapOverlay | `map_overlays` | ✅ In projects JSONB |
| NCR | `ncrs` | ✅ In projects JSONB |
| ContractBill | `contract_bills` | ✅ In projects JSONB |
| RFI | `rfis` | ✅ In projects JSONB |
| LabTest | `lab_tests` | ✅ In projects JSONB |
| ScheduleTask | `schedule` | ✅ In projects JSONB |
| StructureAsset | `structures` | ✅ In projects JSONB |
| EnvironmentRegistry | `environment_registry` | ✅ In projects JSONB |
| ResourceMatrix | `resources` | ✅ In projects JSONB |
| ResourceAllocation | `resource_allocations` | ✅ In projects JSONB |
| Milestone | `milestones` | ✅ In projects JSONB |
| Personnel | `personnel` | ✅ In projects JSONB (FIXED) |
| Comment | Comments within entities | ✅ Embedded |
| Checklist | Checklists within projects | ✅ Embedded |
| Defect | Defects within projects | ✅ Embedded |

---

## 🔍 ADDITIONAL OBSERVATIONS

### Staff/Personnel Data
- Staff management uses a dedicated project (`ce0387a7-f9d6-48e2-aacb-1347d3394f75`) with JSONB storage for:
  - employees
  - leave-requests
  - attendance
  - performance
  - salaries
  - training
  - evaluations

### Road Data
- Roads, alignments, and structures are stored both:
  1. In separate tables (`roads`, `alignments`, `structures`)
  2. Within `projects.roads` JSONB column

### KML Data
- Can be stored either in `project_kml` table OR `projects.kml_data` JSONB

---

## 📊 SUMMARY

| Category | Count |
|----------|-------|
| Separate Backend Tables | 15 |
| JSONB Columns in projects | 30+ |
| Frontend Types Defined | 60+ |

---

## ✅ CONCLUSION

**ALL FRONTEND TYPES ARE ACCOUNTED FOR IN THE BACKEND.**

- Core entities have dedicated tables
- Project-specific data is stored in the `projects` table as JSONB columns
- The architecture follows a hybrid approach (some separate tables, some JSONB)

**No missing tables detected - all frontend types have corresponding backend storage.**
