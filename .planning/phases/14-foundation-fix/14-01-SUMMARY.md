---
phase: 14-foundation-fix
plan: "01"
subsystem: navigation, resolver
tags: [nav, resolver, localStorage, user-foods]
dependency_graph:
  requires: []
  provides: [NAV-05, RES-01]
  affects: [src/pages/UnifiedPlan.tsx, src/pages/Menu.tsx]
tech_stack:
  added: []
  patterns: [synchronous-localStorage-fallback]
key_files:
  created: []
  modified:
    - src/components/SidebarDrawer.tsx
    - src/data/resolver.ts
decisions:
  - "Synchronous localStorage read in resolveItem() avoids making it async and breaking all .map(resolveItem) call sites"
  - "No ItemService import in resolver.ts — direct localStorage access keeps the data layer dependency-free"
metrics:
  duration: "5m"
  completed: "2026-04-08"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 2
requirements:
  - NAV-05
  - RES-01
---

# Phase 14 Plan 01: Foundation Fix Summary

## One-Liner

Renamed sidebar "我的食材" to "我的食物" and added synchronous localStorage fallback in resolveItem() so user-created food IDs resolve correctly in menu presets.

## What Was Built

**Task 1: Rename sidebar label and add resolveItem() user-food fallback**

Part A (NAV-05): Changed the sidebar navigation label for the `/foods` route from `"我的食材"` to `"我的食物"` in `src/components/SidebarDrawer.tsx` line 9.

Part B (RES-01): Added a third lookup step in `resolveItem()` in `src/data/resolver.ts`. After checking SUPPLEMENT_MAP and FOOD_MAP, the function now reads `localStorage.getItem("wellness_foods_catalog")`, parses the JSON array of user-created FoodItems, and returns a properly shaped ResolvedItem if the ID matches. The entire block is wrapped in try/catch so corrupted or unavailable localStorage falls through to the existing `console.warn` and `return null`.

The description format matches the existing FOOD_MAP branch: `P{n}g / F{n}g / C{n}g / Na{n}mg`.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | a5e6487 | feat(14-01): rename sidebar label and add resolveItem() user-food fallback |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. Both changes are complete and fully wired.

## Self-Check: PASSED

- `src/components/SidebarDrawer.tsx` - FOUND (modified)
- `src/data/resolver.ts` - FOUND (modified)
- Commit a5e6487 - FOUND
- `npm run build` exits 0 - VERIFIED
- `grep '我的食物' src/components/SidebarDrawer.tsx` - MATCH FOUND
- `grep 'wellness_foods_catalog' src/data/resolver.ts` - MATCH FOUND
- `grep -c 'ItemService' src/data/resolver.ts` returns 0 - VERIFIED
