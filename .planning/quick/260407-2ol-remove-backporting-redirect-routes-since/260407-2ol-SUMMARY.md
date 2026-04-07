# Quick Task 260407-2ol: Remove backporting redirect routes

**Status:** Complete
**Commit:** 5e1109b

## What Changed

Removed 3 backwards-compatibility redirect routes from `src/App.tsx`:
- `/track` → `/plan` (retired NutritionTracker)
- `/items` → `/plan` (retired route)
- `/weight` → `/profile` (retired WeightLog)

The catch-all `/*` → `/plan` remains for standard SPA routing.

## Files Modified

- `src/App.tsx` — removed 3 redirect Route elements (3 lines deleted)
