# Project Research Summary

**Project:** eat-manager v2.0 — Item Management & Supplement Routines
**Domain:** Offline-first static SPA, food/supplement CRUD, ingredient composition, inventory tracking, deterministic routine generation
**Researched:** 2026-03-30
**Confidence:** HIGH

## Executive Summary

This milestone extends an already-working offline-first React SPA (React 19, Vite 6, Tailwind v4, TypeScript 5.8, HashRouter, localStorage + Google Sheets via Apps Script) with full food and supplement catalog management. The existing architecture is sound and well-matched to the new features: the DataService pattern (localStorage-first, Sheets as background sync) extends naturally to catalog CRUD by adding a new `ItemService` singleton. The primary architectural change is introducing id-keyed upsert in the GAS backend alongside the existing date-keyed upsert — a purely additive change. Three new npm packages are justified: `react-hook-form` v7, `zod`, and `@hookform/resolvers`, because food and supplement forms have 10+ fields with cross-field constraints that make native controlled components impractical.

The recommended feature scope proceeds in a strict dependency order: data model restructure first (removes `BehaviorItem`, extends `FoodItem`, formalizes `SupplementItem`), then service layer (`ItemService` and `RoutineService`), then Food Manager page, then Supplement Manager page with inventory tracking, and finally the supplement routine generator overhaul of the existing `SupplementSchedule` page. Public nutrition database lookup for ingredient composition should use Open Food Facts via direct `fetch` — it is the only no-key, CORS-enabled option compatible with a static SPA on GitHub Pages. USDA FoodData Central must be routed through the GAS proxy to avoid embedding a secret key in the client bundle, or avoided entirely in this milestone.

The top risks are: (1) nutrition API key exposure if USDA FDC is used directly from the browser — mitigated by using Open Food Facts or the GAS proxy; (2) USDA FDC CORS failures in the browser, independently confirming the first risk; (3) Apps Script cold-start latency causing users to double-submit CRUD forms — mitigated by the optimistic localStorage write pattern already established in the codebase; (4) circular ingredient references causing infinite recalculation loops — mitigated by enforcing a flat (atomic-only) ingredient model at save time; and (5) supplement inventory drift from estimate-based consumption — mitigated by an event-sourced deduction log rather than a calculated remaining field.

---

## Key Findings

### Recommended Stack

The existing stack requires no new dependencies for the majority of features. All nutrition arithmetic, supplement inventory calculation, and routine generation are pure TypeScript functions under 15 lines each — no math or scheduling library is warranted. The only justified new runtime dependencies are the form validation trio (`react-hook-form`, `zod`, `@hookform/resolvers`) which handle the 10+ field CRUD forms with cross-field constraints. For public nutrition lookup, raw `fetch` against Open Food Facts is the correct choice — it is free, requires no API key, has confirmed CORS support, and has been stable for years. USDA FoodData Central is rejected for direct browser calls due to API key exposure risk and unconfirmed CORS support.

**Core technologies:**
- `react-hook-form` ^7.72.0: form state and validation for CRUD forms — justified by form complexity (10+ fields, cross-field rules)
- `zod` ^4.3.6: schema validation with TypeScript type inference — paired with react-hook-form for compile-time safety
- `@hookform/resolvers` ^5.2.2: bridge between zod schemas and react-hook-form — required for the above pair
- Open Food Facts v1 Search API (`world.openfoodfacts.net`): nutrition database lookup — no key, CORS-enabled, free
- `crypto.randomUUID()`: ID generation for user-created items — built into all modern browsers, zero bundle cost

**Explicitly rejected:** `@openfoodfacts/openfoodfacts-nodejs` (alpha), USDA FDC direct calls (key exposure), any scheduling library (server-required), `uuid` (browser has it natively), Redux/Zustand/Jotai (overengineered for single-user app), `react-query`/`swr` (DataService already covers this), `dexie`/IndexedDB (localStorage sufficient at this scale).

### Expected Features

**Must have (table stakes):**
- Food CRUD: add via nutrition label form (name, serving, cal, protein, fat, carbs, sodium), edit, delete, list with search
- Food composition: create a food from weighted ingredients with live calorie/macro recalculation and total nutrition preview
- Supplement CRUD: add/edit/delete with timing metadata, health goal tags, isCore flag, caution notes
- Supplement inventory: record purchased quantity, capsules per dose, doses per day; compute days remaining with low-stock indicators (amber at 14 days, red at 7)
- Supplement routine generation: deterministic (same date = same plan), timing-grouped, excludes out-of-stock items
- Mark taken/skip per supplement per day

**Should have (differentiators):**
- Open Food Facts ingredient lookup for composition (with manual fallback for missing/incomplete data)
- Interaction warnings: static lookup table of ~20 known supplement pairs (Ca+Fe, Zn+Cu, etc.)
- Days-until-reorder suggestion: "run out on April 15 — buy by April 8"
- Goal-coverage summary: "8/11 health goals covered by your active supplements"
- Routine export as plain text (for sharing with doctor)

**Defer to v2.1+:**
- USDA FoodData Central lookup (requires API key management, GAS proxy, CORS validation)
- Supplement cycle management (loading/deload phases — high complexity, niche audience)
- Barcode scanning (requires camera API, incompatible with static SPA)
- Push notifications/reminders (require service worker — PWA milestone)
- Composition yield factor (cooking weight loss — deep nutrition science, defer unless requested)
- Duplicate food detection via similarity matching

### Architecture Approach

The v2.0 architecture extends the existing layered pattern without restructuring it. Two new service singletons (`ItemService` for catalog CRUD, `RoutineService` for routine generation and persistence) are added alongside the existing `DataService` and `SettingsService`, following the identical cacheGet/cacheSet + async Sheets fire-and-forget pattern. Two new page components (`FoodManager`, `SupplementManager`) are added as utility flows accessible via "管理" buttons from within existing tabs — not as new bottom nav tabs (which would break the 5-tab mobile layout at 375px). The GAS backend gains two additive functions (`upsertById`, `deleteById`) alongside the existing date-keyed operations. The data model restructure removes `BehaviorItem`, extends `FoodItem` with an optional `ingredients` array, and replaces `RemedyItem` with the richer `SupplementItem`.

**Major components:**
1. `src/lib/item-service.ts` (new) — CRUD for food and supplement catalogs keyed by `id`; localStorage-first + background Sheets sync
2. `src/lib/routine-service.ts` (new) — deterministic daily routine generation, taken/skipped persistence, routine history
3. `src/lib/nutrition-db.ts` (new) — thin `fetch` wrapper around Open Food Facts search; ephemeral results only (no localStorage writes)
4. `src/pages/FoodManager.tsx` (new) — food CRUD page with label input and ingredient composition flows
5. `src/pages/SupplementManager.tsx` (new) — supplement CRUD page with inventory tracking
6. `src/pages/SupplementSchedule.tsx` (modified) — wired to live `RoutineService` data; inventory badges; taken/skipped marking
7. `scripts/gas-api.js` (modified) — `upsertById` and `deleteById` added alongside existing `upsertByDate`

### Critical Pitfalls

1. **Nutrition API key exposed in client bundle** — USDA FDC requires an API key; `VITE_FDC_API_KEY` in the Vite bundle is publicly readable from GitHub Pages. Prevention: use Open Food Facts (no key required) for this milestone; defer USDA FDC until a GAS proxy action is built.

2. **USDA FDC CORS failure in browser** — FDC is designed for server-to-server use and has a documented history of malformed CORS headers that browsers reject. Prevention: verify with a real browser `fetch` call before any FDC integration work; this independently confirms the Open Food Facts preference.

3. **Apps Script cold start causes duplicate CRUD submissions** — First GAS call in a session takes 3–10 seconds; users resubmit believing the first call failed. Prevention: optimistic localStorage write first (show success immediately); make GAS upsert idempotent by keying on item `id`, not blind append.

4. **Circular ingredient references cause infinite recalculation** — If composed foods can be used as ingredients in other composed foods, a cycle produces an infinite loop on page load. Prevention: enforce atomic-only ingredient model at save time; filter composed foods out of the ingredient selector entirely.

5. **Supplement inventory drift from estimate-based calculation** — `remaining = purchased - (dailyRate * daysSincePurchase)` drifts immediately when users skip doses or restock mid-cycle. Prevention: event-sourced deduction log (one entry per routine completion per item); `remaining = purchasedQty - sum(deduction_log)`.

---

## Implications for Roadmap

The dependency graph is strict: types must be clean before services, services before pages, and the routine generator depends on both supplement CRUD and inventory being complete. No phase can be reordered without breaking downstream work.

### Phase 1: Data Model Restructure

**Rationale:** Every subsequent phase depends on the type definitions being correct. `BehaviorItem` removal touches every existing module; TypeScript strict mode will surface all call sites immediately. This is the highest-risk phase by breadth (8 files touched) but lowest risk by logic (mostly dead code removal and additive fields). The compiler is the safety net — the gate is zero TypeScript errors.
**Delivers:** Clean type foundation; all existing pages still compile and render correctly; `FoodIngredient`, `SupplementItem`, `InventoryEntry`, `SupplementRoutine` types established; `BehaviorItem` and `ItemType: "behavior"` removed.
**Addresses:** Sets up `FoodItem.ingredients` optional array; formalizes `SupplementItem` with rich metadata; establishes `InventoryEntry` schema.
**Avoids:** ID namespace collision (Pitfall 11) — establish `uf_` / `us_` prefix convention for user-created items here; avoids it being retrofitted later.
**Research flag:** Standard patterns — direct TypeScript refactor with compiler as safety net. No research phase needed.

### Phase 2: ItemService + GAS id-keyed Operations

**Rationale:** All CRUD pages depend on a working persistence layer. The GAS `upsertById` change must precede any CRUD UI so the write path is validated end-to-end before UI adds complexity. This mirrors what Phase 3 (SheetsAPI patch) was in the prior milestone — an infrastructure change that unlocks everything downstream.
**Delivers:** Working food and supplement CRUD persistence (localStorage + Sheets); GAS supports id-keyed writes; `ItemService` singleton with `getFoods`, `saveFood`, `deleteFood`, `getSupplements`, `saveSupplement`, `deleteSupplement`, `getInventory`, `upsertInventory`; `SheetsAPI` gains `upsertById` and `deleteById` methods.
**Avoids:** Apps Script cold start causing duplicate submissions (Pitfall 3) — idempotent id-keyed upsert prevents double-write; Sheets read bottleneck (Pitfall 6) — add `updatedAt` field to both food and supplement models here so incremental sync is possible later.
**Research flag:** Standard patterns — GAS additive change is low risk; ItemService directly mirrors existing DataService. No research phase needed.

### Phase 3: Food Manager Page

**Rationale:** Food CRUD is prerequisite for food composition (ingredients reference food IDs) and for the nutrition tracking page to show meaningful data. The label-input path is simpler and should be built and validated before the composition path is added on top.
**Delivers:** Working food management — add via nutrition label, add via ingredient composition with Open Food Facts lookup, edit, delete, list with search; `/foods` route and navigation entry point.
**Uses:** `react-hook-form` + `zod` for form validation; Open Food Facts `fetch` wrapper in `nutrition-db.ts`.
**Avoids:** Circular ingredient references (Pitfall 4) — atomic-only ingredient model enforced at save; unsaved form state lost on navigation (Pitfall 12) — React Router v7 `useBlocker` on forms with dirty state; Open Food Facts missing Asian foods (Pitfall 7) — curated Taiwanese seed ingredient list as fallback; ingredient search rate-limit (ARCHITECTURE anti-pattern 5) — 400ms debounce on search input.
**Research flag:** Warrants a short design spike on the ingredient composition UI interaction pattern — specifically: dynamic ingredient add/remove list with live macro recalculation preview, ratio normalization feedback, and search result disambiguation. The data model is clear; the UX sub-decisions (how to handle partial ratios, how to display disambiguation) need explicit decisions before implementation.

### Phase 4: Supplement Manager Page + Inventory

**Rationale:** Supplement CRUD must exist before the routine generator can have any items to schedule. Inventory tracking is tightly coupled to supplement metadata (capsule unit, daily dose) and belongs in the same phase. This phase is the direct parallel of Phase 3 for the supplement domain.
**Delivers:** Working supplement management — add/edit/delete with full metadata form; inventory tracking (purchased quantity, daily consumption, remaining calculation, low-stock alerts); all inventory data keyed by `supplementId` in localStorage and Sheets.
**Uses:** Same `react-hook-form` + `zod` pattern as Phase 3; `ItemService` CRUD methods.
**Avoids:** Inventory drift (Pitfall 5) — event-sourced deduction pattern, not calculated remaining stored as a field; supplement interaction flat-list becoming unmaintainable (Pitfall 8) — per-supplement interaction map keyed by supplement ID, not pairwise array; localStorage quota exceeded (Pitfall 10) — ID-reference model, size budget (~200 foods, ~50 supplements), visible count in management UI.
**Research flag:** Standard patterns — inventory formula and CRUD form are well-established. No research phase needed.

### Phase 5: Supplement Routine Generator + SupplementSchedule Overhaul

**Rationale:** This is the flagship deliverable of the milestone. It requires all previous phases complete: supplements must exist (Phase 4), inventory state must be available (Phase 4), and the data model must be clean (Phase 1). The existing `SupplementSchedule.tsx` page is a stub that renders static data — this phase replaces it with a fully live feature.
**Delivers:** Deterministic daily supplement routine, timing-grouped display (空腹/餐前/餐中/餐後/睡前), taken/skipped marking with persistence, inventory status badges on each supplement, goal-coverage summary, "管理補品" button navigating to `/supplements`; `RoutineService` singleton.
**Avoids:** Routine randomness without seeding (ARCHITECTURE anti-pattern 3) — pure deterministic function using `date` as rotation index; over-constrained schedule producing silent empty plan (Pitfall 9) — explicit unscheduled-item report in UI when conflicts prevent full coverage; date-boundary plan instability (Pitfall 15) — persist generated plan, re-generate only on explicit user request or explicit day advance, not at midnight automatically.
**Research flag:** Standard patterns — deterministic filter/group/sort algorithm is well-understood. No research phase needed.

### Phase Ordering Rationale

- Phase 1 before Phase 2: `ItemService` must import `FoodItem`, `SupplementItem`, `InventoryEntry` from `types.ts` — the types must exist first.
- Phase 2 before Phase 3: `FoodManager` calls `ItemService.saveFood()` — the service must work before the UI calls it.
- Phase 3 before Phase 4: Food IDs are referenced by supplement compositions and daily plans; a working food catalog should precede supplement features that could reference foods.
- Phase 4 before Phase 5: `RoutineService.getOrGenerateRoutine()` calls `ItemService.getSupplements()` and uses inventory state to filter out-of-stock items — both must be complete.
- Throughout Phases 1-4, the existing `SupplementSchedule.tsx` page remains functional in a degraded state (behavior filter removed in Phase 1, live data wired in Phase 5). No phase leaves the app in a broken state.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Food Manager):** Ingredient composition UI design — dynamic ingredient list with live macro recalculation and Open Food Facts search-and-select. The data model is settled; the interaction design (partial ratio entry, normalization feedback, result disambiguation) warrants a short spike before the component is built.

Phases with standard patterns (no research phase needed):
- **Phase 1 (Data Model):** TypeScript refactor with compiler as safety net. Direct execution.
- **Phase 2 (ItemService + GAS):** Mirrors existing DataService pattern exactly. Direct execution.
- **Phase 4 (Supplement Manager):** Form patterns and inventory formula are well-established. Direct execution.
- **Phase 5 (Routine Generator):** Deterministic filter/group/sort. Well-understood algorithm. Direct execution.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All dependency decisions verified via npm registry on 2026-03-30. Open Food Facts CORS confirmed via freepublicapis.com daily monitoring. react-hook-form React 19 compatibility confirmed (v7.52+). |
| Features | HIGH | Feature scope validated against SuppCo, SuppTrack, CareClinic, Supplemate product research. Inventory formula from pharmacy literature. Composition model from USDA/FDA guidance. Routine generation patterns from live supplement tracker apps. |
| Architecture | HIGH | All integration decisions derived directly from reading existing source files. No external architecture research required. GAS additive change verified as non-breaking. Integration pattern mirrors DataService exactly. |
| Pitfalls | HIGH (critical), MEDIUM (moderate) | Critical pitfalls (API key exposure, CORS failure, cold start, circular refs) have direct documentation sources. Moderate pitfalls (interaction model complexity, localStorage limits, routine over-constraint) based on community consensus and direct code audit. |

**Overall confidence:** HIGH

### Gaps to Address

- **Open Food Facts coverage for Taiwanese ingredients:** OFF coverage for Taiwan and East Asian foods is sparse (燕麥, 豆腐, 山藥, 小米 often missing calorie data). A curated seed list of common local ingredients with verified nutritional data should be prepared before the Phase 3 ingredient lookup UI is built. This is a data preparation task, not a code architecture decision.

- **USDA FDC CORS status:** If USDA FDC direct browser calls are desired in a future milestone, a live browser `fetch` test (not curl, not Node.js) must be run against `api.nal.usda.gov` before any integration work begins. The malformed CORS header issue documented in GitHub USDA/USDA-APIs#79 may or may not be resolved at that time.

- **GAS `upsertById` key column convention:** The `supplement_inventory` sheet is keyed by `supplementId` rather than `id`. The `upsertById` GAS function should accept a configurable `keyField` parameter rather than hardcoding `"id"`. This design detail should be finalized in Phase 2 planning to avoid a GAS rewrite in Phase 4.

- **Navigation entry points for Foods and Supplements management pages:** Research recommends "管理" buttons within existing tabs rather than new nav tabs — specifically DailyPlan or NutritionTracker for foods, SupplementSchedule for supplements. The exact placement should be confirmed against actual user flow during Phase 3-4 planning to avoid confusing navigation.

---

## Sources

### Primary (HIGH confidence)
- Open Food Facts CORS status — [FreePublicAPIs daily monitoring](https://www.freepublicapis.com/openfoodfacts): CORS enabled, confirmed
- Open Food Facts API docs — [https://openfoodfacts.github.io/openfoodfacts-server/api/](https://openfoodfacts.github.io/openfoodfacts-server/api/): rate limits, search endpoint, field names
- react-hook-form v7.72.0 — [https://www.npmjs.com/package/react-hook-form](https://www.npmjs.com/package/react-hook-form): React 19 compatibility, current version confirmed
- zod v4.3.6 — [https://www.npmjs.com/package/zod](https://www.npmjs.com/package/zod): current version confirmed
- @hookform/resolvers v5.2.2 — [https://www.npmjs.com/package/@hookform/resolvers](https://www.npmjs.com/package/@hookform/resolvers): current version confirmed
- React Router v7 `useBlocker` — verified against installed react-router-dom v7.6.0
- Apps Script quotas — [https://developers.google.com/apps-script/guides/services/quotas](https://developers.google.com/apps-script/guides/services/quotas): 6 min execution limit, 20K URL fetch/day
- Existing codebase audit — `src/data/types.ts`, `src/lib/data-service.ts`, `src/lib/sheets-api.ts`, `scripts/gas-api.js`, all page components

### Secondary (MEDIUM confidence)
- USDA FDC CORS issue — [GitHub USDA/USDA-APIs#79](https://github.com/USDA/USDA-APIs/issues/79): malformed `Access-Control-Allow-Origin` header documented
- Apps Script cold start latency — [Google Apps Script Community](https://groups.google.com/g/google-apps-script-community/c/7mBvElBwvnc): shared infrastructure, cold starts observed
- Open Food Facts rate limits — [GitHub issue #8818](https://github.com/openfoodfacts/openfoodfacts-server/issues/8818): 100/10/2 req/min limits
- Supplement interaction pairs — [Supplements-AI interaction guide](https://supplements-ai.com/blog/guides/supplement-interactions): Ca/Mg, Zn/Cu, Fe/polyphenols documented
- localStorage quota errors — [RxDB localStorage article](https://rxdb.info/articles/localstorage.html): 5-10 MB limit, QuotaExceededError behaviour
- SuppCo, SuppTrack, CareClinic, Supplemate — product research for supplement tracker feature conventions
- API key exposure in static sites — [Wiz Blog mass exposure research](https://www.wiz.io/blog/exposed-moltbook-database-reveals-millions-of-api-keys): confirmed risk at scale

### Tertiary (LOW confidence)
- Pharmacy days-supply formula — [ISBE reference](https://www.isbe.net/CTEDocuments/HST-690049.pdf): `floor(totalCapsules / (capsulesPerDose x dosesPerDay))`; LOW confidence only because source is educational materials, though formula matches MDTools calculator output

---
*Research completed: 2026-03-30*
*Ready for roadmap: yes*
