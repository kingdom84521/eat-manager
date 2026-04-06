---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Sidebar Navigation & Page Consolidation
status: defining-requirements
stopped_at: null
last_updated: "2026-04-06T13:10:00.000Z"
last_activity: 2026-04-06
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** Users can manage food and supplement items, track supplement inventory, and generate intelligent daily supplement routines
**Current focus:** Milestone v3.0 — Sidebar Navigation & Page Consolidation

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-04-06 — Milestone v3.0 started

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0 (v2.0)
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 06 P02 | 5 | 1 tasks | 1 files |
| Phase 07-food-manager P03 | 20 | 1 tasks | 1 files |
| Phase 08 P01 | 8 | 1 tasks | 2 files |
| Phase 08 P02 | 15 | 3 tasks | 1 files |
| Phase 09 P01 | 4 | 2 tasks | 2 files |
| Phase 09 P02 | 8 | 2 tasks | 1 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v2.0 Roadmap]: 5 coarse phases (5-9) derived from strict dependency chain: types → service → food UI → supplement UI → routine
- [v2.0 Roadmap]: Open Food Facts chosen over USDA FDC — no API key needed, CORS-enabled, safe for static SPA
- [v2.0 Roadmap]: Event-sourced deduction log for inventory (not calculated remaining) to prevent drift when doses are skipped
- [v2.0 Roadmap]: Atomic-only ingredient model enforced at save — composed foods cannot be used as ingredients in other composed foods
- [v2.0 Roadmap]: GAS `upsertById` should accept configurable `keyField` parameter — finalize in Phase 6 planning to handle inventory keyed by `supplementId`
- [v2.0 Roadmap]: Food/Supplement manager pages accessed via "管理" buttons from existing tabs, not new bottom nav tabs (preserves 5-tab mobile layout)
- [05-02]: SUPPLEMENTS_CATALOG key added to SHEETS constant (separate from existing SUPPLEMENTS log key) to avoid name collision
- [05-02]: TCMNature removed from data-service.ts imports — only used by rowToRemedy (deleted)
- [05-02]: resolveAndGroup returns { supplements, foods } only — no remedies or behaviors keys
- [Phase 06]: isActive row comparison drops boolean literal: SheetRow values cannot be boolean (TS2367), so check is row.isActive === 'true' || row.isActive === 1
- [Phase 06]: upsertInventory uses SheetsAPI.append not upsertById — InventoryEntry has no id field, purchase records are immutable events
- [07-02]: NutritionLabelForm uses string draft state for all numeric inputs (not number type) — allows empty/partial entry during typing, parseFloat on submit
- [07-02]: Tag chips use inline style prop for selected color (dynamic hex from HEALTH_TAG_COLORS), className for unselected — matches DailyPlan.tsx pattern
- [Phase 07]: ComposeForm uses onAddFromOff callback to save OFF food and refresh parent list, then ComposeForm adds ingredient row using the saved food.id
- [Phase 07]: ComposeForm totals derived on every render via calcTotals() not stored in state — guarantees correctness without sync logic
- [Phase 08]: /schedule icon changed to 🗓️ to avoid duplication with new /supplements 💊 tab
- [Phase 08]: Bidirectional interactions/synergies resolved at render time — no data duplication, avoids stale references
- [Phase 08]: InventorySection appears in edit view only — inventory tracking not applicable to unsaved supplements
- [Phase 09]: getDailyLog/saveDailyLog are synchronous localStorage-only — daily routine state is transient and local, no Sheets sync needed
- [Phase 09]: calcRemainingUnits uses Math.max(0, purchased - consumed) to prevent negative inventory from over-logging
- [Phase 09]: Three-state cycle (untouched→taken→skipped) via simple tap, not long-press — simpler and more reliable on mobile
- [Phase 09]: generateRoutine() computed on each render (not stored in state) — guarantees correctness without stale state issues

### Pending Todos

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260406-h7u | Fix GAS version banner not clearing after reconnect | 2026-04-06 | 88e637a | [260406-h7u-gas](./quick/260406-h7u-gas/) |
| 260406-h36 | Fix OFF CORS: proxy OFF search through GAS | 2026-04-06 | 40a2364 | [260406-h36-fix-off-cors](./quick/260406-h36-fix-off-cors-switch-cgi-search-pl-to-api/) |
| 260406-f2f | Add nested unit system: UnitConversion type, split dosage fields, conversion chain editor, multi-unit inventory | 2026-04-06 | 4bbec72 | [260406-f2f-nested-unit-system](./quick/260406-f2f-nested-unit-system/) |
| 260405-gx7 | Rename schedule tab to 例行, add data-derived tag filter chips | 2026-04-05 | 939842f | [260405-gx7-rename-schedule-tab-and-derive-tag-filte](./quick/260405-gx7-rename-schedule-tab-and-derive-tag-filte/) |
| 260405-nox | Fix: route /schedule→/items, tab 品項, form tags from data only | 2026-04-05 | 097f0b4 | [260405-nox-fix-hardcoded-tags-and-rename-schedule-t](./quick/260405-nox-fix-hardcoded-tags-and-rename-schedule-t/) |
| 260405-o1t | Add copy-to-clipboard button for gas-api.js in Settings step 3 | 2026-04-05 | 11eb028 | - |

### Blockers/Concerns

- [Phase 7]: Open Food Facts coverage for Taiwanese ingredients is sparse — a curated seed list of common local ingredients (燕麥, 豆腐, 山藥, etc.) with verified nutritional data should be prepared before the ingredient composition UI is built
- [Phase 7]: Exact navigation entry point for Food Manager (DailyPlan tab vs NutritionTracker tab) should be confirmed during Phase 7 planning

## Session Continuity

Last session: 2026-04-06T10:54:04Z
Stopped at: Completed quick task 260406-f2f: nested unit system for supplement tracking
Resume file: None
