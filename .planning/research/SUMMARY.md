# Project Research Summary

**Project:** Eat Manager v3.0 — Sidebar Drawer Navigation & Page Consolidation
**Domain:** Offline-first React SPA — mobile-first health/nutrition tracker
**Researched:** 2026-04-06
**Confidence:** HIGH

## Executive Summary

Eat Manager v3.0 is a structural overhaul of an existing production SPA: replacing a 7-tab bottom nav with a sidebar drawer, merging three separate pages (DailyPlan, NutritionTracker, SupplementSchedule) into a single unified checkbox-driven daily plan, and adding two new features (My Menu saved presets, Profile page). The existing stack — React 19, TypeScript 5.8, Vite 6, Tailwind v4, HashRouter, localStorage + Google Sheets sync — is fully validated and stays unchanged except for one new runtime dependency: `@headlessui/react` for the accessible drawer component.

The recommended architecture is a five-phase incremental build ordered strictly by dependency: drawer shell first (smallest blast radius, no page logic changes), then Profile (lightweight extraction), then UnifiedPlan in two stages (supplement merge, then nutrition + checkbox logging), then My Menu. All phases compile and run independently before the next begins. The most critical architectural decision is treating checked item IDs as part of the same persisted plan record — not a separate localStorage key — to prevent stale state bugs on plan regeneration.

The primary risks are mobile-specific: iOS Safari body scroll lock (requires `position: fixed` technique, not `overflow: hidden`), checked state drifting from plan state (prevent by storing them atomically in a single `TodayPlanRecord`), and a monolithic unified page component (prevent by defining sub-component boundaries before writing any merge code). All risks are well-understood with clear prevention strategies; none require new patterns outside the existing codebase conventions.

---

## Key Findings

### Recommended Stack

The existing stack requires exactly one new dependency. `@headlessui/react@^2.2.9` is the only addition needed for the sidebar drawer: it provides focus trapping, `Escape`-to-close, ARIA `role="dialog"`, and `data-[closed]` attribute hooks that let Tailwind v4's `data-[closed]:-translate-x-full` drive the animation — no JS animation runtime required. All other features (checkbox state, menu persistence, profile data) use the existing `localStorage` + `DataService` + `SettingsService` stack with no new libraries.

**Core technologies:**
- `@headlessui/react@^2.2.9`: Sidebar drawer — only library with focus trap + keyboard close + Tailwind `data-*` transition at ~10 kb gzip; peer dep `"react": "^18 || ^19"` confirmed
- Tailwind v4 CSS transitions: Drawer animation via `transition-transform duration-300` + `data-[closed]:-translate-x-full` — zero JS animation cost
- `useState` + `localStorage` + `DataService`: Checkbox state via `Set<string>`, menu presets via new `MenuService`, profile data via `SettingsService` extension
- `crypto.randomUUID()`: Native browser API for menu/plan IDs — no `uuid` package needed

**What NOT to add:** `motion/react` (34 kb for a single `translate-x`), `vaul` (bottom-sheet model, wrong for sidebar), `zustand`/`jotai` (overkill at current 3K LOC scale), `shadcn/ui` (conflicts with established codebase conventions), `uuid` package (native API available).

### Expected Features

**Must have (v3.0 table stakes):**
- Sidebar drawer replacing the bottom tab nav — without this, the milestone delivers no visual change
- Hamburger icon in fixed top bar; overlay backdrop closes on tap; `Escape` closes; body scroll locked when open
- All nav destinations accessible from drawer; active route highlighted via `useLocation`
- Unified checkbox daily plan (`/plan`) merging food slots + supplement routine + nutrition summary
- Checkbox state persisted to localStorage and rehydrated on page load; checked state stored in same record as plan
- Full re-random locked when any item is checked; per-item swap always available (disabled on checked items)
- Nutrition macro summary bar showing only checked-item contributions
- Profile page with display name, avatar initials, weight log (absorbs WeightLog page)
- My Menu: save named plan preset, list saved menus, load into today's plan, delete

**Should have (v3.1 polish):**
- Swipe-right-to-open drawer gesture (expected on mobile)
- Supplement coverage indicator ("X/Y 已服用") in unified plan
- Lock icon tooltip explaining why re-random is disabled ("已打勾項目，鎖定整體重新隨機")
- Drawer section grouping headers (主要功能 / 管理 / 帳號)

**Defer (v4+):**
- Plain text plan export / copy to clipboard
- Multiple saved plan date history view
- Menu tagging and categorization
- Multiple user profiles (requires authentication, out of scope)

**Anti-features to avoid building:**
- Full image avatar upload (base64 in localStorage causes storage bloat)
- Nested/expandable drawer sub-menus (interaction complexity, Material Design guidance advises against)
- Auto-save plan as menu on date change (pollutes menu list with junk entries)
- Drag-to-reorder items in unified plan (scroll conflict on touch devices)

### Architecture Approach

The v3.0 architecture introduces `src/components/` for the first time (for `SidebarDrawer`, a true shared layout component) and adds three new pages/services alongside retiring four existing pages. `App.tsx` owns drawer open/close state and renders a fixed top bar with hamburger; pages never manage drawer state, eliminating prop threading. The drawer auto-closes on route change via `useEffect([location.pathname])`. UnifiedPlan uses internal tabs (`"food" | "supplements"`) with explicit sub-components (`FoodPlanSection`, `NutritionBudgetBar`, `SupplementRoutineSection`) to keep the merged page maintainable at an expected ~250–350 LOC.

**Major components:**
1. `SidebarDrawer` (`src/components/SidebarDrawer.tsx`) — overlay nav with CSS slide animation, profile/settings footer links, auto-close on route change
2. `UnifiedPlan` (`src/pages/UnifiedPlan.tsx`) — replaces DailyPlan + NutritionTracker + SupplementSchedule; owns `checkedIds`, `locked`, `plan` state; delegates rendering to named sub-components
3. `Profile` (`src/pages/Profile.tsx`) — absorbs WeightLog; adds `displayName`/`avatarInitials` via `SettingsService` extension
4. `MyMenu` (`src/pages/MyMenu.tsx`) + `MenuService` (`src/lib/menu-service.ts`) — named meal combinations persisted under `wellness_menus` key
5. `App.tsx` (modified) — removes bottom `<nav>`, adds `<SidebarDrawer>` + fixed top bar with hamburger, adds `/menu` and `/profile` routes

**Files being retired** (kept as files until absorbing phase is complete, then removed): `DailyPlan.tsx`, `NutritionTracker.tsx`, `SupplementSchedule.tsx`, `WeightLog.tsx`.

### Critical Pitfalls

1. **iOS Safari body scroll lock** — `overflow: hidden` on `<body>` does not prevent scroll on iOS. Prevention: use `position: fixed; top: -${scrollY}px` on body when drawer opens + restore on close; or `overscroll-behavior: contain` on the drawer scroll container (Safari 16+). Verify on real iOS device — DevTools mobile emulation does not reproduce this bug.

2. **Checked state and generated plan stored in separate localStorage keys** — causes stale checked IDs after plan regeneration. Prevention: store both in a single `TodayPlanRecord { date, generatedAt, slots, checkedIds }`. Re-generating the plan writes a new record with empty `checkedIds`.

3. **Lock state reset on page refresh** — if `locked` is `useState` only (not derived from persisted data), it disappears on reload. Prevention: derive `locked` at render time from `checkedIds.length > 0` read from the persisted `TodayPlanRecord`. Lock is not a separate flag.

4. **Monolithic UnifiedPlan component** — merging three 120–200 LOC pages naively produces a 500+ LOC unmaintainable file. Prevention: define `FoodPlanSection`, `NutritionBudgetBar`, `SupplementRoutineSection` sub-component interfaces explicitly before writing any merge code. Sub-component design is a required deliverable, not an afterthought.

5. **Bottom nav `pb-20` padding residue** — removing the bottom nav without removing its body padding leaves ~80px empty space on every page. Prevention: remove `pb-20` from `App.tsx` in the same commit as removing the nav markup; audit all pages for `pb-16`/`pb-20`/`pb-24` classes.

---

## Implications for Roadmap

The architecture research defines a clean five-phase build order with strict dependency flow. Each phase produces a shippable state before the next begins.

### Phase 1: Sidebar Drawer Shell

**Rationale:** Smallest blast radius — no page logic changes. Must come first because all navigation in subsequent phases depends on it. Establishing drawer state in `App.tsx` here prevents the prop-threading anti-pattern from infecting later phases. Bottom nav padding cleanup belongs here too — atomic removal.
**Delivers:** Working sidebar drawer replacing bottom tab nav; hamburger in fixed top bar; all existing routes accessible; active route highlight; overlay backdrop; `Escape`/tap-outside to close; body scroll lock (iOS-safe); stub routes for `/menu` and `/profile`; `pb-20` bottom padding removed.
**Addresses:** Sidebar drawer navigation (P1 table stakes), drawer profile footer stub, bottom nav migration
**Avoids:** iOS body scroll lock bug (Pitfall 1), drawer state placement problem (Pitfall 2), bottom nav padding residue (Pitfall 7)
**Research flag:** None — full implementation pattern provided in ARCHITECTURE.md; all pitfalls documented with specific code fixes.

### Phase 2: Profile Page

**Rationale:** Self-contained — no dependency on UnifiedPlan. Lightweight extraction from WeightLog. Unlocks the drawer footer (avatar + name) being functional rather than a stub, and unblocks the drawer UX feeling complete.
**Delivers:** `/profile` page with display name entry, avatar initials picker, weight log embedded; `SettingsService` extended with `displayName?` and `avatarInitials?`; drawer footer shows real name/avatar; `/weight` route retired.
**Addresses:** Profile page features (P1), drawer profile footer (P1), WeightLog consolidation
**Avoids:** WeightLog as separate route after v3.0 (Anti-Pattern 3 in ARCHITECTURE.md)
**Research flag:** None — extraction + minor SettingsService extension; well-understood.

### Phase 3: UnifiedPlan — Supplement Section Merge

**Rationale:** Starts UnifiedPlan incrementally. Supplement merge is lower risk than checkbox logging — no new data model, no lock mechanic. Validates the internal tab structure (`"food" | "supplements"`) and sub-component decomposition before adding data-model complexity in Phase 4.
**Delivers:** `/plan` shows both food plan tab and supplement routine tab in a single page; existing supplement taken/skipped state works; `/schedule` route retired.
**Addresses:** Unified daily plan (part 1 of 2), supplement timing sections in unified view
**Avoids:** Monolithic component (Pitfall 3) — sub-component boundaries must be defined as a deliverable before coding begins; this phase validates the structure before the harder Phase 4
**Research flag:** None — merge pattern well-documented in ARCHITECTURE.md.

### Phase 4: UnifiedPlan — Checkbox Logging + Nutrition Bar

**Rationale:** Highest-complexity phase. Builds on the stable UnifiedPlan shell from Phase 3. The `TodayPlanRecord` atomic data model must be designed explicitly before any code is written — it is the load-bearing decision for this phase. Requires adding `DataService.removeMealEntry()`.
**Delivers:** Checkbox on each food item logs it as `NutritionEntry`; unchecking removes it; nutrition macro bar updates in real time; full re-random locked when any item checked; per-item swap disabled on checked items; checked state survives navigation and page reload.
**Addresses:** Checkbox logging (P1), lock full re-random (P1), nutrition summary bar (P1)
**Avoids:** Stale checked IDs from split storage (Pitfall 4), lock reset on refresh (Pitfall 5), swap on checked item corrupts nutrition budget (Pitfall 6)
**Research flag:** Warrants explicit design review before execution. `TodayPlanRecord` schema, `DataService.removeMealEntry()` method signature, and checked-state rehydration logic are all load-bearing. Consider a brief design spike to validate the data model before coding begins.

### Phase 5: My Menu

**Rationale:** Depends on UnifiedPlan having a stable item ID structure (Phase 4). New feature with no existing consumers — lowest regression risk. Cleanest phase to end on.
**Delivers:** `MenuService` CRUD; `/menu` page with list/create/delete; "套用菜單" button on plan slots replaces slot items with saved menu items; menus persisted under `wellness_menus` key with schema version field.
**Addresses:** Meal menu save/load (P1 table stakes)
**Avoids:** My Menu without schema version (technical debt documented in PITFALLS.md — add `schemaVersion` field from day one to enable future migrations)
**Research flag:** None — straightforward CRUD following existing `ItemService` / `DataService` singleton pattern exactly.

### Phase Ordering Rationale

- **Drawer first:** It is the navigation shell. Building pages before the drawer would require keeping the bottom nav alive as a scaffold — more risk, not less.
- **Profile before UnifiedPlan:** Profile is independent and small (~60 LOC extraction). UnifiedPlan is the highest-risk phase; having the codebase in a clean state first is lower risk.
- **UnifiedPlan split into two phases:** Phase 3 validates the tab structure and sub-component decomposition. Phase 4 adds the data-model-heavy checkpoint/lock/nutrition logic. Shipping them atomically in one phase doubles the failure surface for no benefit.
- **My Menu last:** Depends on a stable UnifiedPlan; is net-new with no dependencies on other v3.0 work; failure here does not affect any shipped phase.

### Research Flags

Phases likely needing design review or research during planning:
- **Phase 4 (Checkbox Logging):** `TodayPlanRecord` schema and `DataService.removeMealEntry()` need explicit design sign-off before any code is written. The interactions between checked state, nutrition log entries, plan generation lock, and single-item swap are load-bearing and interdependent.

Phases with well-documented standard patterns (research not needed):
- **Phase 1 (Sidebar Drawer):** Full implementation pattern, pitfall mitigations, and code sketches in ARCHITECTURE.md. Direct execution.
- **Phase 2 (Profile):** Extraction pattern; `SettingsService` extension is additive. Direct execution.
- **Phase 3 (Supplement Merge):** Internal tab pattern; no new data model. Direct execution.
- **Phase 5 (My Menu):** Mirrors `ItemService` singleton pattern exactly. Direct execution.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | npm registry queries confirmed live versions on 2026-04-06; single new dep (`@headlessui/react@2.2.9`) peer deps verified against React 19 |
| Features | HIGH | Feature set derived from Material Design spec, competitor analysis (MyFitnessPal, Cronometer, Samsung Food), and direct codebase audit of existing pages |
| Architecture | HIGH | All decisions derived from direct source file inspection (`App.tsx`, all 4 retiring pages, all service files); no external library assumptions; build order validated against actual file dependency graph |
| Pitfalls | HIGH | iOS scroll lock sourced from PQINA + multiple community sources; React Router unmounting confirmed against existing HashRouter usage; data model pitfalls from direct codebase audit |

**Overall confidence:** HIGH

### Gaps to Address

- **iOS scroll lock implementation choice:** Two approaches documented (`position: fixed` body technique vs. `overscroll-behavior: contain`). The `overscroll-behavior: contain` approach requires Safari 16+ — acceptable for the current iOS landscape but must be verified with real-device testing before Phase 1 is marked complete. If compatibility is a concern, use the `position: fixed` technique which works back to iOS 15.

- **Hamburger button placement:** PITFALLS.md flags top-left placement may be out of thumb reach on large phones (suggests bottom FAB or swipe gesture). ARCHITECTURE.md defaults to top-left fixed bar. This UX tradeoff should be resolved explicitly before Phase 1 coding begins — either commit to top-left with swipe-to-open as the v3.1 gesture, or change to a bottom FAB now.

- **NutritionTracker deprecation timing:** Once Phase 4 ships, `/track` is redundant. The exact timing of the redirect (`/track` → `/plan`) should be decided during Phase 4 planning to avoid a separate cleanup phase.

- **My Menu Sheets sync scope:** ARCHITECTURE.md notes Sheets sync for menus is "optional." v3.0 is localStorage-only — this should be confirmed during Phase 5 planning to avoid a data migration issue in v3.1 if users expect cross-device menu access.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase audit: `src/App.tsx`, `src/pages/DailyPlan.tsx`, `src/pages/NutritionTracker.tsx`, `src/pages/SupplementSchedule.tsx`, `src/pages/WeightLog.tsx`, `src/lib/data-service.ts`, `src/lib/settings-service.ts`, `src/lib/item-service.ts`
- npm registry live queries (2026-04-06): `@headlessui/react@2.2.9`, `vaul@1.1.2`, `motion@12.38.0` — peer dependencies confirmed
- [Headless UI Dialog docs](https://headlessui.com/react/dialog) — `data-closed` transition API and sidebar pattern
- [PQINA — Prevent scrolling on iOS Safari 15](https://pqina.nl/blog/how-to-prevent-scrolling-the-page-on-ios-safari/) — `position: fixed` body scroll lock technique

### Secondary (MEDIUM confidence)
- [Material Design Navigation Drawer spec](https://m1.material.io/patterns/navigation-drawer.html) — avatar/name in drawer footer, section grouping
- [Material Design 3 — Navigation drawer guidelines](https://m3.material.io/components/navigation-drawer/guidelines) — active state, nesting guidance
- [Josh W. Comeau — Persisting React State in localStorage](https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/) — rehydration pattern
- Competitor analysis: MyFitnessPal, Cronometer, Samsung Food, Plan to Eat — feature survey (2026-04-06)

### Tertiary (LOW confidence)
- [DEV Community — 100vh problem with iOS Safari](https://dev.to/maciejtrzcinski/100vh-problem-with-ios-safari-3ge9) — viewport height considerations for full-height drawer

---
*Research completed: 2026-04-06*
*Ready for roadmap: yes*
