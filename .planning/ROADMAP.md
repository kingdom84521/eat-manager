# Roadmap: Eat Manager

## Milestones

- ✅ **v1.0 Settings & Nutrition Configuration** — Phases 1-4 (shipped 2026-03-30)
- ✅ **v2.0 Item Management & Supplement Routines** — Phases 5-9 (shipped 2026-04-05)
- 🚧 **v3.0 Sidebar Navigation & Page Consolidation** — Phases 10-13 (in progress)

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

</details>

### 🚧 v3.0 Sidebar Navigation & Page Consolidation (In Progress)

**Milestone Goal:** Replace bottom tab navigation with a sidebar drawer, merge food plan + nutrition log + supplement routine into a unified checkbox-driven daily plan, add My Menu saved presets, and introduce a Profile page.

- [x] **Phase 10: Sidebar Drawer Shell** - Sidebar drawer replacing bottom tab nav; hamburger in fixed top bar; all routes accessible; body scroll lock (completed 2026-04-06)
- [ ] **Phase 11: Profile Page** - Profile page with display name, avatar initials, weight log embedded; drawer footer functional
- [ ] **Phase 12: Unified Daily Plan** - Merged food + supplement view with checkbox logging, nutrition bar, lock mechanic, and single-item swap
- [ ] **Phase 13: My Menu** - Named meal preset CRUD; save current plan, browse and load saved menus

## Phase Details

### Phase 10: Sidebar Drawer Shell
**Goal**: Users navigate the entire app through a sidebar drawer — bottom tab bar is gone, all destinations are reachable, and the drawer behaves correctly on iOS Safari
**Depends on**: Phase 9
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04
**Success Criteria** (what must be TRUE):
  1. User can open the sidebar by tapping a hamburger icon in the fixed top bar, and close it by tapping the X, tapping the backdrop, or pressing Escape
  2. The drawer lists all four main navigation items (今日方案, 我的食材, 我的菜單, 營養補充) and tapping any item navigates to that route
  3. Tapping a navigation item auto-closes the drawer and highlights the active route
  4. The drawer footer shows an avatar+name area (stub) linking to `/profile` and a settings icon linking to `/settings`
  5. The page behind the drawer does not scroll while the drawer is open on an iOS Safari device
**Plans**: 1 plan

Plans:
- [x] 10-01-PLAN.md — Sidebar drawer shell: install headlessui, create SidebarDrawer component, wire into App.tsx, remove bottom nav
**UI hint**: yes

### Phase 11: Profile Page
**Goal**: Users can view and edit their display name and avatar initials on a dedicated Profile page, and access their weight log there — the `/weight` standalone route is retired
**Depends on**: Phase 10
**Requirements**: PROF-01, PROF-02, PROF-03
**Success Criteria** (what must be TRUE):
  1. User can tap the avatar+name area in the drawer footer and land on the `/profile` page
  2. User can enter a display name and avatar initials; they persist after a page reload and appear in the drawer footer
  3. A placeholder avatar using the user's initials (or a default icon) is visible on the Profile page and in the drawer footer
  4. User can log weight entries and view their weight history from the Profile page (WeightLog content absorbed)
**Plans**: TBD
**UI hint**: yes

### Phase 12: Unified Daily Plan
**Goal**: Today's Plan shows food items and supplement routine in one view where users check off consumed items — checking logs the entry, unchecking removes it, full re-random is locked while any item is checked, and single-item swap is available on unchecked items
**Depends on**: Phase 11
**Requirements**: PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05
**Success Criteria** (what must be TRUE):
  1. The `/plan` page shows food plan slots and supplement routine sections together without requiring separate page visits
  2. User can check an item to log it as consumed; the nutrition macro bar updates immediately to reflect checked-item totals; unchecking removes the log entry from localStorage and Sheets
  3. Once any item is checked, the full re-random button is disabled (locked); the lock clears automatically when all items are unchecked
  4. User can tap a re-random icon on any single unchecked item to swap only that item; the icon is absent (or disabled) on checked items
  5. Checked state and the generated plan survive navigation away and back, and survive a page reload
**Plans**: TBD
**UI hint**: yes

### Phase 13: My Menu
**Goal**: Users can save the current meal plan as a named preset, browse saved presets, and load one to replace today's plan — with full edit and delete capability
**Depends on**: Phase 12
**Requirements**: MENU-01, MENU-02, MENU-03
**Success Criteria** (what must be TRUE):
  1. User can tap a "儲存為菜單" button on the plan page, enter a name, and the menu appears in the My Menu list immediately
  2. User can open the `/menu` page, see all saved menu presets with their names and item summaries, and tap one to load it as today's plan
  3. User can rename or delete a saved menu preset and the change is reflected immediately in the list
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
| 10. Sidebar Drawer Shell | v3.0 | 1/1 | Complete    | 2026-04-06 |
| 11. Profile Page | v3.0 | 0/? | Not started | - |
| 12. Unified Daily Plan | v3.0 | 0/? | Not started | - |
| 13. My Menu | v3.0 | 0/? | Not started | - |
