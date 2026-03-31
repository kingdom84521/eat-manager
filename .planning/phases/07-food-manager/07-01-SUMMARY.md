---
phase: 07-food-manager
plan: 01
subsystem: food-manager-ui
tags: [react, ui, routing, food-manager]
dependency_graph:
  requires:
    - src/lib/item-service.ts
    - src/data/types.ts (FoodItem, FoodIngredient)
  provides:
    - src/pages/FoodManager.tsx
    - /foods route and nav tab
  affects:
    - src/App.tsx
tech_stack:
  added: []
  patterns:
    - ViewState machine (list/add/edit/compose) via useState
    - Inline sub-components (FoodCard, Fab) in page file
    - Offline-first data via ItemService.getFoods / deleteFood
    - Reference guard before delete (isIngredientInUse)
key_files:
  created:
    - src/pages/FoodManager.tsx
  modified:
    - src/App.tsx
decisions:
  - "Added 食材 tab at position 2 (index 1) in bottom nav, giving 6 tabs total as specified"
  - "handleSave defined in FoodManager for plans 02/03 integration — function body is wired but not yet called from stubs"
  - "Merged worktree branch with local-main/master to get FoodIngredient type and item-service.ts before implementing"
metrics:
  duration_minutes: 3
  completed_date: "2026-03-31"
  tasks_completed: 1
  files_modified: 2
---

# Phase 7 Plan 1: Food Manager Page Shell Summary

**One-liner:** FoodManager page with ViewState machine, food list, search filtering, delete with reference guard, and FAB — all wired to ItemService.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add /foods route, nav tab, FoodManager page | ae87685 | src/App.tsx, src/pages/FoodManager.tsx |

## What Was Built

- `/foods` route registered in App.tsx with `<FoodManager />` element
- Bottom nav updated to 6 tabs: 方案, 食材, 飲食, 時程, 體重, 設定 (食材 icon: 🍽️, position 2)
- `FoodManager.tsx` (279 lines):
  - `ViewState` type alias (`"list" | "add" | "edit" | "compose"`) + `useState<ViewState>("list")`
  - `useEffect` on mount calling `ItemService.getFoods()` populating `useState<FoodItem[]>([])` 
  - `isIngredientInUse()` guard checks `food.ingredients` array before delete
  - `handleDelete()` alerts and blocks if food is an ingredient in another composed food, then calls `window.confirm` before `ItemService.deleteFood()`
  - `handleSave()` saves via `ItemService.saveFood()`, refreshes list, resets to list view
  - Search bar filters by `f.name.includes(searchTerm)` (instant, no debounce needed)
  - `FoodCard` sub-component: violet border + "組合" badge for composed foods, amber border for atomic
  - `Fab` sub-component: expands to show "營養標示" (→ add view) and "組合食材" (→ compose view) buttons
  - Placeholder views for "add", "edit", "compose" with back buttons (plans 02/03 will replace)
  - Empty state: "尚無食材，點擊下方「+」新增"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Merged worktree branch from 30 commits behind main**
- **Found during:** Task 1 — TypeScript reported missing `../lib/item-service` and missing `FoodIngredient` fields on `FoodItem`
- **Issue:** The worktree `agent-aaf0fa80` was at commit `39d9a01` (Phase 5 context), which predated Phase 6 work adding `item-service.ts`, `FoodIngredient`, `SupplementItem`, and `ingredients` field to `FoodItem`
- **Fix:** Added `local-main` remote pointing to `/home/ubuntu/works/eat-manager` and ran `git merge local-main/master --no-edit` to bring worktree up to date (30 commits)
- **Files modified:** All Phase 5/6 work files (already committed via merge commit)
- **Commit:** Part of existing merge

## Known Stubs

| File | Line(s) | Stub | Resolved By |
|------|---------|------|-------------|
| src/pages/FoodManager.tsx | 188-189 | `<p>Add form (Plan 02)</p>` placeholder | Plan 02 |
| src/pages/FoodManager.tsx | 207-208 | `<p>Edit form (Plan 02)</p>` placeholder | Plan 02 |
| src/pages/FoodManager.tsx | 225-226 | `<p>Compose form (Plan 03)</p>` placeholder | Plan 03 |

These stubs are **intentional** per plan spec — the view state machine works end-to-end (navigation between views works), but the form UI is deferred to plans 02 and 03. The plan's stated goal (list view, search, delete, FAB) is fully achieved.

## Verification

- `npx tsc --noEmit`: PASS (0 errors)
- `npm run build`: PASS (58 modules, 276KB JS bundle)
- All 12 acceptance criteria: PASS

## Self-Check: PASSED

- `src/pages/FoodManager.tsx`: FOUND (279 lines, > 80 line minimum)
- `src/App.tsx`: FOUND, contains `/foods`
- Commit `ae87685`: FOUND (`git log --oneline -5` confirms)
