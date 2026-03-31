---
phase: 05-data-model-restructure
plan: "01"
subsystem: data-model
tags: [types, supplements, refactor]
dependency_graph:
  requires: []
  provides: [SupplementItem, FoodIngredient, InventoryEntry, ConsumptionEvent, SupplementTiming, supplements.ts]
  affects: [src/data/resolver.ts, src/lib/data-service.ts, src/pages/SupplementSchedule.tsx]
tech_stack:
  added: []
  patterns: [discriminated-union, event-sourcing]
key_files:
  created:
    - src/data/supplements.ts
  modified:
    - src/data/types.ts
  deleted:
    - src/data/remedies.ts
decisions:
  - "Removed all JSDoc references to RemedyItem from SupplementItem comment to satisfy zero-occurrence requirement"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_changed: 3
---

# Phase 5 Plan 01: Type System Restructure Summary

**One-liner:** Removed BehaviorItem and RemedyItem from the type system, introduced SupplementItem with full dosage/timing/interaction metadata, FoodIngredient composition, and InventoryEntry/ConsumptionEvent for event-sourced inventory tracking.

## What Was Done

Executed a clean two-category type refactor in `src/data/types.ts` and replaced `src/data/remedies.ts` with a new `src/data/supplements.ts`.

### Task 1: Restructure types.ts

- **Removed:** `RemedyItem` interface, `BehaviorItem` interface, their section comments
- **Updated:** `ItemType` from `"food" | "supplement" | "remedy" | "behavior"` to `"food" | "supplement"`
- **Updated:** `AnyItem` from `FoodItem | RemedyItem | BehaviorItem` to `FoodItem | SupplementItem`
- **Added:** `SupplementTiming` type with 5 values and `SUPPLEMENT_TIMING_LABELS` record
- **Added:** `SupplementItem` interface with 15 fields: id, type, name, brand, dosagePerUnit, unitsPerDose, dosesPerDay, timing, tags, interactions, synergies, mechanism, caution, tcm, isActive
- **Added:** `FoodIngredient` interface (foodId, grams) and `ingredients?: FoodIngredient[]` to FoodItem
- **Added:** `InventoryEntry` interface (supplementId, purchasedUnits, purchaseDate)
- **Added:** `ConsumptionEvent` interface (supplementId, date, units)
- **Updated:** `SupplementLogEntry` JSDoc: "remedy IDs" -> "supplement IDs"
- **Updated:** File-level block comment: three-table diagram -> two-table diagram

### Task 2: Create supplements.ts, delete remedies.ts

- **Created:** `src/data/supplements.ts` with clean `SupplementItem`-typed exports
- **Exports:** `SUPPLEMENTS`, `SUPPLEMENT_MAP`, `getSupplementsByTag()`, `getActiveSupplements()`
- **Deleted:** `src/data/remedies.ts` (no longer needed)

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 16d1205 | feat(05-01): restructure types.ts with two-category type system |
| 2 | 7b2a964 | feat(05-01): create supplements.ts replacing remedies.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed JSDoc comment reference to "RemedyItem" inside SupplementItem**
- **Found during:** Task 1 verification
- **Issue:** Plan specified zero occurrences of "RemedyItem" in types.ts; the JSDoc comment "v2.0: replaces RemedyItem" inside SupplementItem violated this
- **Fix:** Changed JSDoc to "v2.0: 新型補品資料模型" (no English RemedyItem reference)
- **Files modified:** src/data/types.ts
- **Commit:** 16d1205

## Known Stubs

- `SUPPLEMENTS: SupplementItem[] = []` in `src/data/supplements.ts` — intentional empty catalog; data will come from Google Sheets (per plan design: "資料來自 Google Sheets，不在此硬編碼")
- `SUPPLEMENT_MAP` is empty at build time — populated dynamically when Sheets data is loaded

These stubs are intentional by design (data-source-agnostic catalog) and will be wired in Phase 6 (data service layer).

## Self-Check: PASSED

- [x] `src/data/types.ts` exists and modified
- [x] `src/data/supplements.ts` created
- [x] `src/data/remedies.ts` deleted
- [x] Commits 16d1205 and 7b2a964 exist
- [x] Zero occurrences of BehaviorItem/RemedyItem in types.ts and supplements.ts
- [x] All required interfaces and types present
