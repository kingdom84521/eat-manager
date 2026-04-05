---
phase: 01-static-data-foundation
plan: "02"
subsystem: data
tags: [dietary-guidelines, macro-calculation, pure-functions, nutrition]
dependency_graph:
  requires:
    - src/data/types.ts exports GuidelinePreset, MacroRatios, MacroGrams (Plan 01)
  provides:
    - src/data/dietary-guidelines.ts exports GUIDELINES, GUIDELINE_MAP, calculateMacroGrams
  affects:
    - Phase 2 SettingsService (imports calculateMacroGrams for personalized macro targets)
    - Phase 4 Settings UI (imports GUIDELINES for preset selector, GUIDELINE_MAP for lookup)
tech_stack:
  added: []
  patterns:
    - Pure data module with no side effects or I/O
    - as const array with derived Map for O(1) lookup
    - Named exports only, no default export
key_files:
  created:
    - src/data/dietary-guidelines.ts
  modified:
    - .gitignore (add tsconfig.tsbuildinfo and src/**/*.js build artifacts)
decisions:
  - "Taiwan HPA DRI macro ratios (protein=12%, fat=25%, carb=63%) sourced from secondary sources — MEDIUM confidence, flagged for v1.1 primary PDF verification"
  - "calculateMacroGrams uses Math.round for all gram values (protein/carb: /4, fat: /9)"
metrics:
  duration_minutes: 3
  completed_date: "2026-03-29"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 1
---

# Phase 01 Plan 02: Dietary Guidelines Catalog Summary

**One-liner:** Three-preset dietary guidelines catalog (Taiwan HPA, USDA AMDR, Japan MHLW) with `calculateMacroGrams()` converting TDEE into macro gram targets via kcal/gram conversion constants.

## What Was Built

One new TypeScript module with no runtime dependencies:

**`src/data/dietary-guidelines.ts`** — New file with 3 named exports:

- `GUIDELINES` — Array of 3 `GuidelinePreset` objects:
  - `taiwan-hpa` (Taiwan HPA DRI 2011): protein=12%, fat=25%, carb=63% — MEDIUM confidence
  - `usda-amdr` (USDA AMDR 2025): protein=20%, fat=30%, carb=50% — HIGH confidence
  - `japan-mhlw` (Japan MHLW DRI 2025): protein=16%, fat=25%, carb=59% — HIGH confidence
- `GUIDELINE_MAP` — `Map<string, GuidelinePreset>` for O(1) lookup by id
- `calculateMacroGrams(tdeeKcal, preset)` — Converts TDEE + preset ratios to gram targets using standard kcal/gram factors (protein/carb = 4 kcal/g, fat = 9 kcal/g), rounded to nearest gram

## Verification

- `calculateMacroGrams(2000, usda_preset)` = `{ protein: 100, fat: 67, carb: 250 }` (matches plan spec)
- All 3 preset macroRatios sum to 100: taiwan-hpa (12+25+63), usda-amdr (20+30+50), japan-mhlw (16+25+59)
- `npm run build` (tsc -b && vite build) passes with zero TypeScript errors and zero Vite build errors
- GUIDELINE_MAP provides O(1) lookup for all 3 preset ids

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 — Create src/data/dietary-guidelines.ts | 120376e | src/data/dietary-guidelines.ts, .gitignore |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Configuration] Added build artifact patterns to .gitignore**
- **Found during:** Task 1 post-commit check
- **Issue:** Running `npm run build` (which runs `tsc -b`) generated `.js` files alongside TypeScript sources in `src/` and a `tsconfig.tsbuildinfo` file — none of which should be tracked in git
- **Fix:** Added `src/**/*.js` and `tsconfig.tsbuildinfo` to `.gitignore`
- **Files modified:** `.gitignore`
- **Commit:** 120376e (included with task commit)

## Known Stubs

None — all exported values are fully implemented with real national guideline data from citable primary/secondary sources.

## Self-Check

- [x] `src/data/dietary-guidelines.ts` created with 3 presets, GUIDELINE_MAP, and calculateMacroGrams
- [x] Commit 120376e exists
- [x] TypeScript strict mode passes with zero errors (`tsc -b`)
- [x] Full build passes with zero errors (`npm run build`)
- [x] All macroRatios sum to exactly 100
- [x] Taiwan HPA MEDIUM confidence caveat documented in code comments
