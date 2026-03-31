---
phase: 07-food-manager
plan: 03
subsystem: ui
tags: [react, typescript, openfoodfacts, tailwind, food-manager]

# Dependency graph
requires:
  - phase: 07-food-manager/07-01
    provides: FoodManager page shell with ViewState machine and handleSave
  - phase: 07-food-manager/07-02
    provides: NutritionLabelForm for add/edit views, FoodItem types with ingredients field

provides:
  - ComposeForm sub-component with ingredient rows, live macro recalculation, and save handler
  - IngredientRow sub-component with food selector dropdown and grams input
  - OffSearchPanel sub-component with debounced Open Food Facts search and result cards
  - calcTotals() pure function for deriving macro totals from ingredient list
  - offProductToFood() mapper converting OFF API response to FoodItem (sodium g to mg)
  - Wired compose view in FoodManager replacing TODO placeholder

affects:
  - 08-supplement-manager (pattern: sub-component composition within a single page file)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Live derived state pattern: calcTotals called each render, not stored in useState"
    - "useMemo for foodMap lookup table to avoid rebuilding on every ingredient change"
    - "Debounced fetch in useEffect with clearTimeout cleanup for search inputs"
    - "Atomic-only ingredient filter enforced at render time (not at save time)"

key-files:
  created: []
  modified:
    - src/pages/FoodManager.tsx

key-decisions:
  - "IngredientRow uses local query state for the text input and calls onChange only when a food is selected from the dropdown — avoids noisy partial-input saves"
  - "OffSearchPanel is a separate sub-component so its fetch state is isolated and auto-cleared when the panel closes"
  - "onAddFromOff callback saves the food AND refreshes the parent foods list — ComposeForm then adds the ingredient row using the already-created food.id"
  - "Totals are derived on every render (not stored in state) — guarantees totals are always consistent with ingredients without any sync logic"

patterns-established:
  - "Compose form uses handleComposeSave not handleSave to produce FoodItem with ingredients array before calling onSave prop"

requirements-completed:
  - FOOD-02
  - FOOD-03
  - FOOD-04

# Metrics
duration: 20min
completed: 2026-03-31
---

# Phase 7 Plan 03: FoodManager ComposeForm Summary

**ComposeForm sub-component with IngredientRow, OffSearchPanel, live macro recalculation, and Open Food Facts search integration replacing the TODO placeholder in FoodManager**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-31T11:10:00Z
- **Completed:** 2026-03-31T11:30:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Implemented ComposeForm with name/serving fields, live totals card, and ingredient list with add/remove
- IngredientRow provides searchable food selector (dropdown filtered from atomicFoods) and grams input
- OffSearchPanel fetches from Open Food Facts with 300ms debounce, shows results with thumbnails, saves selected products as FoodItems and wires them as ingredient rows
- Live macro recalculation (cal, protein, fat, carbs, sodium) derived every render via calcTotals() — no state sync needed
- Composed food saved with ingredients array and snapshot macro values; source tagged "自行組合"
- Sodium correctly converted from grams to milligrams (* 1000) from OFF nutriments
- Atomic-only filter (atomicFoods) prevents composed foods from being used as ingredients

## Task Commits

1. **Task 1: Build ComposeForm with ingredient rows, live macro totals, and OFF search** - `edce0cc` (feat)

## Files Created/Modified

- `src/pages/FoodManager.tsx` - Added OffProduct interface, calcTotals(), offProductToFood(), IngredientRow, OffSearchPanel, ComposeForm; replaced compose placeholder with ComposeForm

## Decisions Made

- IngredientRow tracks its own text query state locally and only propagates foodId changes when the user selects from the dropdown — clean separation between typing and actual selection
- OffSearchPanel is isolated as its own sub-component so its fetch state (offQuery, offResults, offLoading) is destroyed when the panel closes, avoiding stale state
- onAddFromOff saves food via ItemService and refreshes the parent foods list so the new food appears in IngredientRow's dropdown immediately
- Totals are always derived on render from ingredients state (not stored separately) — guarantees correctness without any sync overhead

## Deviations from Plan

None - plan executed exactly as written. All specified types, functions, and sub-components implemented per the plan spec.

## Issues Encountered

None. TypeScript compiled cleanly on first attempt. Build passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 07 food-manager is now complete: list view, add/edit via NutritionLabelForm, compose via ComposeForm
- Phase 08 supplement-manager can build on the same FoodManager patterns (ViewState machine, sub-components in same file, ItemService.saveFood pattern)
- Open Food Facts integration pattern established — can be reused if supplement ingredient search is needed

---
*Phase: 07-food-manager*
*Completed: 2026-03-31*
