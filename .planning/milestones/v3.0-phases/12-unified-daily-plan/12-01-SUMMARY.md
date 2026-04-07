---
phase: 12-unified-daily-plan
plan: "01"
subsystem: pages/unified-plan
tags: [react, typescript, localStorage, nutrition, supplements]
dependency_graph:
  requires:
    - src/lib/item-service.ts
    - src/lib/settings-service.ts
    - src/data/resolver.ts
    - src/data/schedule.ts
    - src/data/types.ts
  provides:
    - src/pages/UnifiedPlan.tsx
    - TodayPlanRecord persistence in data-service.ts
  affects:
    - src/App.tsx (route wiring — separate task)
tech_stack:
  added: []
  patterns:
    - Inline sub-component decomposition (FoodPlanSection, NutritionBudgetBar, SupplementRoutineSection)
    - Debounced Sheets write (300ms syncTimerRef) for rapid checkbox interactions
    - Re-upsert strategy for removeMealEntry (no per-item GAS delete)
    - generateRoutine() computed on render, not stored (Map not JSON-serializable)
key_files:
  created:
    - src/pages/UnifiedPlan.tsx
  modified:
    - src/lib/data-service.ts
decisions:
  - TodayPlanRecord stores foodSlots + checkedIds + skippedSupplementIds but NOT supplementRoutine (Map cannot JSON.stringify)
  - generateRoutine() is recomputed on every render from live supplement/inventory/consumption data
  - removeMealEntry uses items_json.includes(itemId) filter — pragmatic string search for single-item removal
  - Supplement takenStates derived from checkedIds (supps only) + skippedSupplementIds for SupplementRoutineSection
  - NutritionBudgetBar shows absolute values only when no settings targets configured (per D-10)
metrics:
  duration: ~15min
  completed_date: "2026-04-07"
  tasks_completed: 2
  files_modified: 2
---

# Phase 12 Plan 01: Unified Daily Plan Page Summary

## One-liner

Merged food plan + supplement routine + nutrition budget bar into a single checkbox-driven UnifiedPlan page with localStorage persistence via TodayPlanRecord.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add TodayPlanRecord type and persistence helpers to data-service.ts | 40cd098 | src/lib/data-service.ts |
| 2 | Create UnifiedPlan.tsx with FoodPlanSection, NutritionBudgetBar, SupplementRoutineSection | 5dcccde | src/pages/UnifiedPlan.tsx |

## What Was Built

### data-service.ts additions

- `GeneratedSlot` interface exported (mirrors DailyPlan.tsx local interface)
- `TodayPlanRecord` interface: `{ date, foodSlots, checkedIds, skippedSupplementIds }` — excludes supplementRoutine (Map not JSON-serializable)
- `saveTodayPlan(record)` — writes to `wellness_today_plan` in localStorage
- `loadTodayPlan()` — reads and parses from localStorage, returns null on miss
- `DataService.removeMealEntry(date, itemId)` — filters nutrition log cache by itemId, silent Sheets fail

### UnifiedPlan.tsx (990 lines)

Sub-components defined inline before default export:

- `TagBadge` — health tag pill (copied from DailyPlan.tsx)
- `NutritionBudgetBar` — computes totals from checked food IDs, shows progress bar vs TDEE target or absolute value fallback
- `ItemCard` — extended with checkbox at left; opacity-60 when checked; swap button hidden when checked
- `FoodPlanSection` — timeline layout with time slots, passes check/swap handlers
- `RoutineRow` — three-state supplement row (untouched/taken/skipped) with conflict/synergy badges
- `TimingSlotCard` — timing slot group with taken count
- `UnscheduledCard` — unschedulable supplement warning
- `SupplementRoutineSection` — renders TIMING_ORDER slots + unscheduled card + progress counter

Main component behaviors:
- On mount: loads foods/supplements/inventory/consumption via `Promise.all`, restores stored plan + supplement daily log
- `locked = checkedIds.size > 0` derived at render — full re-random button disabled
- `generate()`: gets 3-day history, calls `generatePlan()`, clears checked/skipped, persists
- `handleFoodCheck()`: add/remove from checkedIds, debounced logMeal/removeMealEntry (300ms)
- `handleSupplementToggle()`: three-state cycle, logConsumption on untouched→taken, saveDailyLog on each transition
- `swapItem()`: guarded by checkedIds check, persists after swap
- `persistRecord()`: called after every state mutation, writes TodayPlanRecord to localStorage

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `ScheduleSlot` import**
- **Found during:** Task 2 TypeScript check
- **Issue:** `ScheduleSlot` was listed in plan imports but not used directly (used inside `GeneratedSlot` from data-service.ts)
- **Fix:** Removed from import list
- **Files modified:** src/pages/UnifiedPlan.tsx
- **Commit:** 5dcccde (inline fix before commit)

**2. [Rule 1 - Bug] Removed unused `ItemPool` import from data-service.ts**
- **Found during:** Task 1 TypeScript check
- **Issue:** `ItemPool` was in plan imports but `GeneratedSlot` uses it via `ScheduleSlot` inline, not directly
- **Fix:** Removed `ItemPool` from data-service.ts imports
- **Files modified:** src/lib/data-service.ts
- **Commit:** 40cd098 (inline fix before commit)

## Known Stubs

None. UnifiedPlan.tsx is wired to live data via ItemService and DataService. The food plan section will show an empty state if SCHEDULE is empty (which it is — food data is user-managed via Sheets, not hardcoded), which is the correct existing behavior documented in the plan (RESEARCH.md Pitfall 5).

**Note:** UnifiedPlan is not yet registered as a route in App.tsx. That wiring is the responsibility of a subsequent plan (12-02 or App.tsx update). The page is complete and functional but unreachable via navigation until routed.

## Self-Check: PASSED

Files exist:
- src/pages/UnifiedPlan.tsx — FOUND
- src/lib/data-service.ts — FOUND (modified)

Commits exist:
- 40cd098 — feat(12-01): add TodayPlanRecord type and persistence helpers
- 5dcccde — feat(12-01): create UnifiedPlan.tsx
