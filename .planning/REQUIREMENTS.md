# Requirements: Eat Manager — Item Management & Supplement Routines

**Defined:** 2026-03-30
**Core Value:** Users can manage their food and supplement items, track supplement inventory, and generate intelligent daily supplement routines

## v2.0 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Data Model

- [ ] **DM-01**: Remove `BehaviorItem` type and all references from codebase
- [ ] **DM-02**: Two hardcoded item categories only: Food (`food`) and Supplement (`supplement`) — no `remedy` or `behavior` subtypes
- [ ] **DM-03**: `FoodItem` supports optional `ingredients` field for composed foods (array of ingredient references with quantities)
- [ ] **DM-04**: `SupplementItem` type with metadata fields: interactions, synergies, recommended timing, dosage per intake, daily max dosage, health tags
- [ ] **DM-05**: `InventoryEntry` type for tracking purchased supplement quantities with purchase date
- [ ] **DM-06**: Composed food nutrition values are always derived (never stored), matching existing derived-values pattern

### Backend (GAS)

- [ ] **GAS-01**: Google Apps Script supports id-keyed upsert (not just date-keyed) for catalog CRUD operations
- [ ] **GAS-02**: Google Apps Script supports id-keyed delete for catalog items

### Food Management

- [ ] **FOOD-01**: User can add a food item by filling in nutrition label fields (name, calories, protein, fat, carbs, sodium, serving size)
- [ ] **FOOD-02**: User can compose a food from multiple ingredients with adjustable quantities
- [ ] **FOOD-03**: Composed food displays dynamically calculated total calories and macros based on current ingredient ratios
- [ ] **FOOD-04**: User can search Open Food Facts for ingredient data when composing a food
- [ ] **FOOD-05**: User can edit an existing food item
- [ ] **FOOD-06**: User can delete a food item
- [ ] **FOOD-07**: Food list page accessible from app navigation, showing all saved foods with nutrition summary

### Supplement Management

- [ ] **SUPP-01**: User can add a supplement with name, brand, dosage per capsule/tablet, health tags, recommended timing
- [ ] **SUPP-02**: User can add interaction warnings for a supplement (conflicts with other supplements)
- [ ] **SUPP-03**: User can add synergy notes for a supplement (pairs well with other supplements)
- [ ] **SUPP-04**: User can edit an existing supplement
- [ ] **SUPP-05**: User can delete a supplement
- [ ] **SUPP-06**: Supplement list page accessible from app navigation, showing all supplements with key metadata

### Supplement Inventory

- [ ] **INV-01**: User can record a supplement purchase (quantity, purchase date)
- [ ] **INV-02**: App tracks remaining quantity based on actual consumption events (event-sourced, not estimated)
- [ ] **INV-03**: User can see remaining quantity and estimated days of supply for each supplement
- [ ] **INV-04**: Low inventory warning when estimated days remaining drops below threshold

### Supplement Routine

- [ ] **RTN-01**: App generates a deterministic daily supplement routine grouped by timing slots (not random)
- [ ] **RTN-02**: Routine ensures all active, in-stock supplements appear in the daily plan
- [ ] **RTN-03**: Routine respects supplement interaction warnings (conflicting supplements separated by timing)
- [ ] **RTN-04**: User can mark supplements as taken or skipped in the daily routine
- [ ] **RTN-05**: Marking a supplement as taken deducts from inventory
- [ ] **RTN-06**: Routine displays unsatisfied supplements explicitly when timing conflicts prevent scheduling all items

## v3.0 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Enhanced Food
- **FOOD-08**: Barcode scanning for food lookup via Open Food Facts
- **FOOD-09**: Meal logging with food items (connect to NutritionTracker page)
- **FOOD-10**: Favorite/frequent foods for quick access

### Enhanced Supplements
- **SUPP-07**: Supplement effectiveness tracking (user-rated over time)
- **SUPP-08**: Auto-reorder reminders when inventory is critically low

### Enhanced UX
- **UX-06**: Undo/redo for item edits
- **UX-07**: Import/export items as CSV

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom macro ratio editor | v1 explicit exclusion; preset-only |
| User authentication/accounts | Single-user static app |
| Server-side anything | Static SPA constraint |
| Barcode scanning | Requires camera API complexity; defer to v3 |
| Meal logging integration | NutritionTracker page is placeholder; defer to v3 |
| Automatic nutrient tracking against BMR targets | Defer to v3 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DM-01 | Phase 5 | Pending |
| DM-02 | Phase 5 | Pending |
| DM-03 | Phase 5 | Pending |
| DM-04 | Phase 5 | Pending |
| DM-05 | Phase 5 | Pending |
| DM-06 | Phase 5 | Pending |
| GAS-01 | Phase 6 | Pending |
| GAS-02 | Phase 6 | Pending |
| FOOD-01 | Phase 7 | Pending |
| FOOD-02 | Phase 7 | Pending |
| FOOD-03 | Phase 7 | Pending |
| FOOD-04 | Phase 7 | Pending |
| FOOD-05 | Phase 7 | Pending |
| FOOD-06 | Phase 7 | Pending |
| FOOD-07 | Phase 7 | Pending |
| SUPP-01 | Phase 8 | Pending |
| SUPP-02 | Phase 8 | Pending |
| SUPP-03 | Phase 8 | Pending |
| SUPP-04 | Phase 8 | Pending |
| SUPP-05 | Phase 8 | Pending |
| SUPP-06 | Phase 8 | Pending |
| INV-01 | Phase 8 | Pending |
| INV-02 | Phase 8 | Pending |
| INV-03 | Phase 8 | Pending |
| INV-04 | Phase 8 | Pending |
| RTN-01 | Phase 9 | Pending |
| RTN-02 | Phase 9 | Pending |
| RTN-03 | Phase 9 | Pending |
| RTN-04 | Phase 9 | Pending |
| RTN-05 | Phase 9 | Pending |
| RTN-06 | Phase 9 | Pending |

**Coverage:**
- v2.0 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-03-30*
