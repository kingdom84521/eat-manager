# Roadmap: Eat Manager

## Milestones

- ✅ **v1.0 Settings & Nutrition Configuration** — Phases 1-4 (shipped 2026-03-30)
- ✅ **v2.0 Item Management & Supplement Routines** — Phases 5-9 (shipped 2026-04-05)
- ✅ **v3.0 Sidebar Navigation & Page Consolidation** — Phases 10-13 (shipped 2026-04-07)
- 🚧 **v4.0 Menu Composition & Navigation Refinement** — Phases 14-16 (active)

## Phases

<details>
<summary>✅ v1.0 Settings & Nutrition Configuration (Phases 1-4) — SHIPPED 2026-03-30</summary>

- [x] Phase 1: Static Data Foundation (2/2 plans) — BMR functions, dietary guideline catalog
- [x] Phase 2: Settings Persistence Layer (1/1 plan) — SettingsService with versioned localStorage
- [x] Phase 3: SheetsAPI Runtime Config Patch (1/1 plan) — Runtime GAS URL resolution
- [x] Phase 4: Settings Page UI + Integration (2/2 plans) — Settings page + hardcoded target migration

See: `.planning/milestones/v1.0-ROADMAP.md` for full details

</details>

<details>
<summary>✅ v2.0 Item Management & Supplement Routines (Phases 5-9) — SHIPPED 2026-04-05</summary>

- [x] Phase 5: Data Model Restructure (2/2 plans) — Clean type foundation
- [x] Phase 6: ItemService + GAS id-keyed Operations (2/2 plans) — Persistence layer
- [x] Phase 7: Food Manager (3/3 plans) — Food CRUD + composition + Open Food Facts
- [x] Phase 8: Supplement Manager + Inventory (2/2 plans) — Supplement CRUD + inventory
- [x] Phase 9: Supplement Routine Generator (2/2 plans) — Deterministic daily routine

See: `.planning/milestones/v2.0-ROADMAP.md` for full details

</details>

<details>
<summary>✅ v3.0 Sidebar Navigation & Page Consolidation (Phases 10-13) — SHIPPED 2026-04-07</summary>

- [x] Phase 10: Sidebar Drawer Shell (1/1 plan) — headlessui sidebar drawer replacing bottom tab nav
- [x] Phase 11: Profile Page (1/1 plan) — Profile page with weight log, avatar+name
- [x] Phase 12: Unified Daily Plan (2/2 plans) — Merged food + supplement view with checkbox logging
- [x] Phase 13: My Menu (2/2 plans) — Named meal preset CRUD

See: `.planning/milestones/v3.0-ROADMAP.md` for full details

</details>

### v4.0 Menu Composition & Navigation Refinement

- [ ] **Phase 14: Foundation Fix** — Rename sidebar label + fix resolveItem() to resolve user-created foods
- [ ] **Phase 15: Menu Composition Editor** — Full menu editor: create/edit per-slot, food picker with search, nutritional totals, save via MenuService.update()
- [ ] **Phase 16: Inline Food Creation** — Quick-create food from within menu flow; newly created food appears immediately in picker

## Phase Details

### Phase 14: Foundation Fix
**Goal**: The app correctly names food items in navigation and loads user-created foods from saved menu presets
**Depends on**: Nothing (first phase of v4.0)
**Requirements**: NAV-05, RES-01
**Success Criteria** (what must be TRUE):
  1. Sidebar navigation item reads "我的食物" (not "我的食材")
  2. User opens a saved menu preset that contains user-created food IDs and all items load with their correct names and macros (not "unknown" or blank)
  3. User-created food items added to FOOD_MAP (or equivalent lookup) so resolveItem() returns them alongside static catalog foods
**Plans**: TBD

### Phase 15: Menu Composition Editor
**Goal**: Users can build and edit menus slot-by-slot, see live nutritional totals, and persist changes
**Depends on**: Phase 14 (resolveItem() must be fixed before food picker can load all items)
**Requirements**: MENU-05, MENU-06, MENU-07, MENU-08, MENU-09
**Success Criteria** (what must be TRUE):
  1. User taps "新增菜單" on the menu page, selects foods per time slot, and saves a new named menu — it appears in the menu list
  2. User opens an existing menu in the editor, adds a food to a slot and removes another, then saves — the menu list reflects the updated composition
  3. User types a keyword in the food picker search field and the list filters to matching foods only
  4. The menu editor displays calorie, protein, fat, and carb totals that update as items are added or removed
  5. Saved changes persist across page navigation and page reload (MenuService.update() called on save)
**Plans**: TBD
**UI hint**: yes

### Phase 16: Inline Food Creation
**Goal**: Users can create a new food item without leaving the menu composition flow and use it immediately
**Depends on**: Phase 15 (food picker panel must exist before quick-create can be embedded in it)
**Requirements**: FOOD-08, FOOD-09
**Success Criteria** (what must be TRUE):
  1. From within the food picker panel, user taps a "快速新增食物" action and a form appears (name + serving size + calories + protein + fat + carbs) without navigating away from the menu page
  2. After submitting the quick-create form, the new food appears at the top of the food picker list in the same session without any page reload
  3. The quick-created food is saved to ItemService and is available in the full food list (我的食物) after the user navigates there
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Static Data Foundation | v1.0 | 2/2 | Complete | 2026-03-29 |
| 2. Settings Persistence Layer | v1.0 | 1/1 | Complete | 2026-03-29 |
| 3. SheetsAPI Runtime Config Patch | v1.0 | 1/1 | Complete | 2026-03-30 |
| 4. Settings Page UI + Integration | v1.0 | 2/2 | Complete | 2026-03-30 |
| 5. Data Model Restructure | v2.0 | 2/2 | Complete | 2026-03-31 |
| 6. ItemService + GAS id-keyed Operations | v2.0 | 2/2 | Complete | 2026-03-31 |
| 7. Food Manager | v2.0 | 3/3 | Complete | 2026-03-31 |
| 8. Supplement Manager + Inventory | v2.0 | 2/2 | Complete | 2026-04-02 |
| 9. Supplement Routine Generator | v2.0 | 2/2 | Complete | 2026-04-05 |
| 10. Sidebar Drawer Shell | v3.0 | 1/1 | Complete | 2026-04-06 |
| 11. Profile Page | v3.0 | 1/1 | Complete | 2026-04-06 |
| 12. Unified Daily Plan | v3.0 | 2/2 | Complete | 2026-04-07 |
| 13. My Menu | v3.0 | 2/2 | Complete | 2026-04-07 |
| 14. Foundation Fix | v4.0 | 0/? | Not started | - |
| 15. Menu Composition Editor | v4.0 | 0/? | Not started | - |
| 16. Inline Food Creation | v4.0 | 0/? | Not started | - |
