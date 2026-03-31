# Roadmap: Eat Manager

## Milestones

- ✅ **v1.0 Settings & Nutrition Configuration** — Phases 1-4 (shipped 2026-03-30)
- 🚧 **v2.0 Item Management & Supplement Routines** — Phases 5-9 (in progress)

## Phases

<details>
<summary>✅ v1.0 Settings & Nutrition Configuration (Phases 1-4) — SHIPPED 2026-03-30</summary>

- [x] Phase 1: Static Data Foundation (2/2 plans) — BMR functions, dietary guideline catalog
- [x] Phase 2: Settings Persistence Layer (1/1 plan) — SettingsService with versioned localStorage
- [x] Phase 3: SheetsAPI Runtime Config Patch (1/1 plan) — Runtime GAS URL resolution
- [x] Phase 4: Settings Page UI + Integration (2/2 plans) — Settings page + hardcoded target migration

See: `.planning/milestones/v1.0-ROADMAP.md` for full details

</details>

### 🚧 v2.0 Item Management & Supplement Routines (In Progress)

**Milestone Goal:** Users can manage food and supplement catalogs, track supplement inventory, and generate deterministic daily supplement routines — all from a static site synced to Google Sheets.

- [ ] **Phase 5: Data Model Restructure** - Clean type foundation: remove BehaviorItem, define FoodItem with ingredients, SupplementItem with rich metadata, InventoryEntry
- [ ] **Phase 6: ItemService + GAS id-keyed Operations** - Working persistence layer for food/supplement CRUD via localStorage + Sheets
- [ ] **Phase 7: Food Manager** - Full food CRUD page with nutrition label input, ingredient composition, and Open Food Facts lookup
- [ ] **Phase 8: Supplement Manager + Inventory** - Full supplement CRUD page with rich metadata and inventory tracking
- [ ] **Phase 9: Supplement Routine Generator** - Deterministic daily routine page with taken/skipped tracking and inventory deduction

## Phase Details

### Phase 5: Data Model Restructure
**Goal**: All type definitions are clean, consistent, and ready for CRUD — BehaviorItem removed, FoodItem supports ingredient composition, SupplementItem and InventoryEntry formalized
**Depends on**: Phase 4
**Requirements**: DM-01, DM-02, DM-03, DM-04, DM-05, DM-06
**Success Criteria** (what must be TRUE):
  1. `BehaviorItem` type and all references are gone — the TypeScript compiler reports zero errors after removal
  2. Only two item categories exist in the codebase: `food` and `supplement` — no `remedy` or `behavior` subtypes
  3. A `FoodItem` can optionally contain an `ingredients` array referencing other food IDs with quantities
  4. `SupplementItem` type exists with timing, dosage, interactions, synergies, and health tag fields
  5. `InventoryEntry` type exists with supplement ID, purchased quantity, and purchase date
**Plans**: TBD

### Phase 6: ItemService + GAS id-keyed Operations
**Goal**: Food and supplement items can be saved, retrieved, and deleted — persisted to localStorage immediately and synced to Google Sheets in the background
**Depends on**: Phase 5
**Requirements**: GAS-01, GAS-02
**Success Criteria** (what must be TRUE):
  1. `ItemService` singleton provides `getFoods`, `saveFood`, `deleteFood`, `getSupplements`, `saveSupplement`, `deleteSupplement`, `getInventory`, `upsertInventory` — all working against localStorage
  2. Google Apps Script supports id-keyed upsert: posting a food or supplement with an existing ID overwrites it rather than appending
  3. Google Apps Script supports id-keyed delete: posting a delete request by item ID removes the matching row from the sheet
  4. A food item saved via `ItemService.saveFood()` is written to localStorage immediately and a background Sheets sync fires without blocking the UI
**Plans:** 1/2 plans executed
Plans:
- [x] 06-01-PLAN.md — GAS backend upsertById/deleteById + SheetsAPI client methods
- [ ] 06-02-PLAN.md — ItemService singleton with offline-first CRUD for foods, supplements, inventory

### Phase 7: Food Manager
**Goal**: Users can manage their personal food catalog — adding foods via nutrition label, composing foods from ingredients with live macro recalculation, searching Open Food Facts, and editing or deleting any saved food
**Depends on**: Phase 6
**Requirements**: FOOD-01, FOOD-02, FOOD-03, FOOD-04, FOOD-05, FOOD-06, FOOD-07
**Success Criteria** (what must be TRUE):
  1. User can open a Food Manager page from app navigation and see all saved foods with name and calorie summary
  2. User can add a food by filling in a nutrition label form (name, serving size, calories, protein, fat, carbs, sodium) and the food appears in the list immediately after saving
  3. User can compose a food from multiple ingredients with adjustable quantities and see the total calories and macros update in real time as quantities change
  4. User can search Open Food Facts by name and select a result to pre-fill ingredient nutrition data in the composition form
  5. User can tap an existing food to edit its fields, save changes, and see the updated values reflected immediately in the list
  6. User can delete a food item and it disappears from the list immediately
**Plans**: TBD
**UI hint**: yes

### Phase 8: Supplement Manager + Inventory
**Goal**: Users can manage their supplement catalog with full metadata — interactions, synergies, timing, dosage — and track inventory per supplement so remaining supply and days until empty are always visible
**Depends on**: Phase 6
**Requirements**: SUPP-01, SUPP-02, SUPP-03, SUPP-04, SUPP-05, SUPP-06, INV-01, INV-02, INV-03, INV-04
**Success Criteria** (what must be TRUE):
  1. User can open a Supplement Manager page from app navigation and see all saved supplements with name, timing, and inventory status
  2. User can add a supplement with name, brand, dosage per tablet/capsule, health tags, and recommended timing — it appears in the list immediately
  3. User can add interaction warnings and synergy notes to a supplement and they are saved alongside other metadata
  4. User can record a supplement purchase (quantity, purchase date) and see the remaining quantity and estimated days of supply update immediately
  5. User sees an amber warning when a supplement has fewer than 14 days of supply remaining, and a red warning below 7 days
  6. User can edit or delete any supplement, with changes reflected immediately in the list
**Plans**: TBD
**UI hint**: yes

### Phase 9: Supplement Routine Generator
**Goal**: The SupplementSchedule page shows a live, deterministic daily routine grouping all in-stock supplements by timing, respects interaction conflicts, lets users mark items taken or skipped, and deducts from inventory on each taken event
**Depends on**: Phase 8
**Requirements**: RTN-01, RTN-02, RTN-03, RTN-04, RTN-05, RTN-06
**Success Criteria** (what must be TRUE):
  1. The supplement schedule page generates the same routine for the same date every time it is opened — not random
  2. Every active, in-stock supplement appears in the daily routine grouped under its recommended timing slot (空腹/餐前/餐中/餐後/睡前)
  3. Supplements with known conflicts are placed in different timing slots — they never appear in the same slot on the same day
  4. User can mark a supplement as taken or skipped and the state persists when the page is refreshed
  5. Marking a supplement as taken deducts one dose from its inventory, and the remaining count on the Supplement Manager page reflects the deduction
  6. When interaction conflicts prevent scheduling all supplements, the unscheduled items are listed explicitly with an explanation — the routine does not silently drop them
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Static Data Foundation | v1.0 | 2/2 | Complete | 2026-03-29 |
| 2. Settings Persistence Layer | v1.0 | 1/1 | Complete | 2026-03-29 |
| 3. SheetsAPI Runtime Config Patch | v1.0 | 1/1 | Complete | 2026-03-30 |
| 4. Settings Page UI + Integration | v1.0 | 2/2 | Complete | 2026-03-30 |
| 5. Data Model Restructure | v2.0 | 0/? | Not started | - |
| 6. ItemService + GAS id-keyed Operations | v2.0 | 1/2 | In Progress|  |
| 7. Food Manager | v2.0 | 0/? | Not started | - |
| 8. Supplement Manager + Inventory | v2.0 | 0/? | Not started | - |
| 9. Supplement Routine Generator | v2.0 | 0/? | Not started | - |
