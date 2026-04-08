---
phase: 15-menu-composition-editor
plan: 01
subsystem: ui
tags: [react, typescript, localstorage, menu-editor, viewstate]

# Dependency graph
requires:
  - phase: 14-foundation-fix
    provides: resolveItem() user-food fallback enabling menu preset loading to work
provides:
  - MenuService.update() upsert-by-id method on menu-service.ts
  - MenuEditor sub-component with ViewState machine (list|editor) in MyMenu.tsx
  - Expandable slot cards rendered from SCHEDULE array
  - Sticky nutritional totals bar (cal/protein/fat/carbs) computed from raw FoodItem macros
  - Save logic calling MenuService.save() for new and MenuService.update() for existing
affects:
  - 15-02: FoodPickerPanel wires into activeSlotIdx state already established here

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ViewState machine (list|editor) for in-page view switching without new routes
    - Inline sub-component pattern (MenuEditor defined before default export, same file)
    - foodMap useMemo from ItemService.getFoods() — avoids resolveItem for macro access

key-files:
  created: []
  modified:
    - src/lib/menu-service.ts
    - src/pages/MyMenu.tsx

key-decisions:
  - "MenuEditor defined as inline sub-component in MyMenu.tsx (not separate file) — mirrors FoodManager pattern"
  - "Totals computed from raw FoodItem.cal/protein/fat/carbs via foodMap, not via resolveItem (avoids macro loss from ResolvedItem adapter)"
  - "handleAddFood defined but not wired to a picker yet — activeSlotIdx placeholder panel shows until Plan 02 wires FoodPickerPanel"

patterns-established:
  - "ViewState machine: type ViewState = 'list' | 'editor' with early return before main render"
  - "SCHEDULE empty guard: explicit branch rendering 尚無時段排程 placeholder"

requirements-completed: [MENU-08, MENU-09]

# Metrics
duration: 8min
completed: 2026-04-08
---

# Phase 15 Plan 01: Menu Composition Editor Foundation Summary

**MenuService gains update() upsert method; MyMenu gains MenuEditor sub-component with ViewState machine, expandable slot cards, sticky live-totals bar, and save logic for both create and edit flows**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-08T16:03:00Z
- **Completed:** 2026-04-08T16:11:18Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `MenuService.update()` that upserts by id in `wellness_menu_presets` localStorage key
- Built `MenuEditor` sub-component with ViewState machine (`list` | `editor`) switching
- Sticky nutritional totals bar showing live cal/protein/fat/carbs from raw FoodItem macros (not resolveItem)
- Expandable slot cards from SCHEDULE with per-slot food list, remove button, and "+ 新增食物" button
- Save handler dispatches `MenuService.save()` for new menus, `MenuService.update()` for edits
- SCHEDULE empty edge case shows 尚無時段排程 placeholder (Pitfall 1 guard)
- Edit button added to list card actions, entering editor view with the preset loaded

## Task Commits

Each task was committed atomically:

1. **Task 1: Add MenuService.update() method** - `3f22745` (feat)
2. **Task 2: Build MenuEditor sub-component** - `e1a47ba` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/menu-service.ts` - Added `update(preset: MenuPreset): void` after `save()`, upserts by id
- `src/pages/MyMenu.tsx` - Added ViewState machine, MenuEditor sub-component with slot cards and totals bar

## Decisions Made
- Totals use raw `FoodItem.cal/protein/fat/carbs` via `foodMap` (not resolveItem) — ResolvedItem adapter loses macro fields
- `handleAddFood` defined now so Plan 02 has a stable API to call into; placeholder panel shown when `activeSlotIdx !== null`
- Edit button added to list view cards to enable entering the editor — Plan 02 task 2 was described as wiring entry points, but basic entry is essential for MENU-08 to be testable now

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - TypeScript strict mode passed with zero errors on first attempt; build succeeded.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 02 can immediately wire `FoodPickerPanel` slide-up panel into `activeSlotIdx` state
- `handleAddFood(foodId)` is the stable callback Plan 02 will call when user selects a food
- `MenuService.update()` is fully tested and ready for Plan 02 to rely on

---
*Phase: 15-menu-composition-editor*
*Completed: 2026-04-08*
