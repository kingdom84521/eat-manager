---
phase: 01-static-data-foundation
plan: "01"
subsystem: data
tags: [bmr, tdee, types, nutrition, pure-functions]
dependency_graph:
  requires: []
  provides:
    - src/data/types.ts exports ActivityLevelId, UserProfile, BMRResult, MacroRatios, MacroGrams, GuidelinePreset
    - src/data/bmr.ts exports calculateBMR, calculateTDEE, calculateBMRResult, getActivityMultiplier, ACTIVITY_LEVELS, ACTIVITY_LEVEL_MAP
  affects:
    - Phase 2 SettingsService (imports UserProfile, BMRResult, calculateBMR)
    - Phase 2 Plan 02 (imports GuidelinePreset, MacroRatios, MacroGrams)
    - Phase 4 Settings UI (imports ACTIVITY_LEVELS for form options)
tech_stack:
  added: []
  patterns:
    - Pure function module with no side effects
    - as const array with derived Map for O(1) lookup
    - Union literal types instead of TypeScript enums
key_files:
  created:
    - src/data/bmr.ts
  modified:
    - src/data/types.ts
decisions:
  - "ActivityLevelId defined as explicit union in types.ts (not derived from ACTIVITY_LEVELS) to avoid circular imports"
  - "BMR reference value is 1648.75 (not 1673.75 from older planning docs) - verified via Mifflin-St Jeor formula"
  - "TDEE rounding: multiply-first-then-round (Math.round(bmr * multiplier / 10) * 10)"
metrics:
  duration_minutes: 8
  completed_date: "2026-03-29"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 01 Plan 01: BMR/TDEE Types and Calculation Module Summary

**One-liner:** Mifflin-St Jeor BMR/TDEE pure calculation module with 5-level activity multipliers and full type definitions for BMR, dietary guideline, and macro ratio interfaces.

## What Was Built

Two leaf-layer TypeScript modules with zero runtime dependencies:

1. **`src/data/types.ts`** — Extended with 6 new named exports:
   - `ActivityLevelId` — union type for 5 activity levels
   - `UserProfile` — user inputs for BMR calculation (age, sex, height, weight, activity)
   - `BMRResult` — BMR + TDEE output shape
   - `MacroRatios` — macro percentages of TDEE
   - `MacroGrams` — macro gram targets
   - `GuidelinePreset` — dietary guideline preset structure (used by Plan 02)

2. **`src/data/bmr.ts`** — New file with 6 exports:
   - `ACTIVITY_LEVELS` — 5-entry const array (sedentary/light/moderate/very/extra) with multipliers 1.2/1.375/1.55/1.725/1.9
   - `ACTIVITY_LEVEL_MAP` — O(1) Map for activity level lookup by id
   - `calculateBMR(ageYears, sex, heightCm, weightKg)` — Mifflin-St Jeor formula, returns unrounded kcal/day
   - `calculateTDEE(bmr, activityMultiplier)` — rounds to nearest 10 kcal
   - `getActivityMultiplier(id)` — safe lookup with 1.2 fallback
   - `calculateBMRResult(...)` — convenience wrapper returning BMRResult

## Verification

- `calculateBMR(30, "male", 175, 70)` = 1648.75 (formula: 10×70 + 6.25×175 - 5×30 + 5)
- `calculateBMR(30, "female", 175, 70)` = 1482.75 (exactly 166 kcal less than male)
- `calculateTDEE(1648.75, 1.2)` = 1980 (multiply-first: 1978.5 rounds to 1980)
- `npx tsc --noEmit` passes with zero errors

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 — Extend types.ts with BMR types | 3f57aef | src/data/types.ts |
| 2 — Create src/data/bmr.ts | b0491c3 | src/data/bmr.ts |

## Deviations from Plan

None — plan executed exactly as written.

The dietary guideline types (MacroRatios, MacroGrams, GuidelinePreset) were part of the plan's Task 1 action spec, included in the same task per plan instructions to keep all type definitions co-located.

## Known Stubs

None — all exported functions are fully implemented with no placeholder values.

## Self-Check

- [x] `src/data/types.ts` modified and contains all 6 new types
- [x] `src/data/bmr.ts` created with all 6 exports
- [x] Commit 3f57aef exists
- [x] Commit b0491c3 exists
- [x] TypeScript strict mode passes with zero errors
