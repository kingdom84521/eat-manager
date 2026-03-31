---
phase: 05-data-model-restructure
plan: 02
subsystem: data
tags: [typescript, react, data-model, resolver, refactor]

# Dependency graph
requires:
  - phase: 05-01
    provides: "New SupplementItem type, supplements.ts module, two-category ItemType"
provides:
  - "resolver.ts updated to two-type system (food + supplement only)"
  - "data-service.ts cleaned of remedy/behavior types and methods"
  - "SupplementSchedule.tsx imports from supplements.ts with timing labels"
  - "DailyPlan.tsx TYPE_STYLES and border trimmed to supplement + food only"
  - "Clean zero-error npm run build"
affects: [06-item-service, 07-food-manager, 08-supplement-manager]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SUPPLEMENT_TIMING_LABELS used for display rendering of SupplementTiming[] arrays"
    - "SupplementItem.isActive used as isCore equivalent in resolver"
    - "SUPPLEMENTS_CATALOG sheet constant separated from SUPPLEMENTS log constant"

key-files:
  created: []
  modified:
    - src/data/resolver.ts
    - src/lib/data-service.ts
    - src/pages/SupplementSchedule.tsx
    - src/pages/DailyPlan.tsx

key-decisions:
  - "SUPPLEMENTS_CATALOG key added to SHEETS constant (not REMEDIES) to avoid collision with existing SUPPLEMENTS log key"
  - "TCMNature removed from data-service.ts imports as it was only used by rowToRemedy"
  - "SupplementSchedule.tsx renders isActive badge (not isCore) since SupplementItem uses isActive field"

patterns-established:
  - "resolveAndGroup returns { supplements, foods } — no remedies or behaviors keys"
  - "Timing arrays rendered by mapping through SUPPLEMENT_TIMING_LABELS and joining with 、"
  - "mechanism field guarded with conditional before rendering (it is optional on SupplementItem)"

requirements-completed: [DM-01, DM-02]

# Metrics
duration: 15min
completed: 2026-03-31
---

# Phase 05 Plan 02: Consumer File Updates Summary

**All four consumer files updated to two-category type system with zero TypeScript errors — resolver, data-service, SupplementSchedule, and DailyPlan now use only food + supplement types**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-31T03:50:00Z
- **Completed:** 2026-03-31T04:05:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- resolver.ts now imports SupplementItem + SUPPLEMENT_MAP; resolveAndGroup returns { supplements, foods } only
- data-service.ts has zero remedy/behavior references; rowToRemedy and getRemedies deleted; REMEDIES sheet key replaced by SUPPLEMENTS_CATALOG
- SupplementSchedule.tsx imports from supplements.ts, renders timing via SUPPLEMENT_TIMING_LABELS, guards mechanism with conditional
- DailyPlan.tsx TYPE_STYLES and border object contain only supplement + food entries
- `npm run build` passes with zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Update resolver.ts and data-service.ts to two-type system** - `ae2edcd` (feat)
2. **Task 2: Update page components and verify clean build** - `8de96ed` (feat)

## Files Created/Modified

- `src/data/resolver.ts` - Rebuilt to use SUPPLEMENT_MAP from supplements.ts; resolveItem maps dosagePerUnit/mechanism/isActive; resolveAndGroup returns { supplements, foods }
- `src/lib/data-service.ts` - Removed RemedyItem/BehaviorItem/TCMNature imports; replaced REMEDIES with SUPPLEMENTS_CATALOG; deleted rowToRemedy and getRemedies
- `src/pages/SupplementSchedule.tsx` - Imports SUPPLEMENTS from supplements.ts; SUPPLEMENT_TIMING_LABELS for timing rendering; mechanism guarded; remedy/behavior JSX blocks removed
- `src/pages/DailyPlan.tsx` - TYPE_STYLES trimmed to supplement + food; border object trimmed to supplement + food

## Decisions Made

- Used `SUPPLEMENTS_CATALOG: "supplements"` for the new sheet constant name to avoid name collision with the existing `SUPPLEMENTS: "supplement_log"` key in the SHEETS object
- Removed TCMNature from data-service.ts imports (Rule 2: auto-add missing critical functionality — this is the reverse: removing unused import to satisfy noUnusedLocals)
- SupplementSchedule.tsx renders `item.isActive` for the core badge since SupplementItem uses `isActive` not `isCore`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed TCMNature from data-service.ts imports**
- **Found during:** Task 1 (Update resolver.ts and data-service.ts)
- **Issue:** TCMNature was imported in data-service.ts but only used by rowToRemedy (which was deleted). With `noUnusedLocals: true`, this would cause a TypeScript build error.
- **Fix:** Removed TCMNature from the import line
- **Files modified:** src/lib/data-service.ts
- **Verification:** npm run build passes with zero errors
- **Committed in:** ae2edcd (Task 1 commit)

**2. [Rule 1 - Bug] Pre-merged Plan 01 changes into worktree before starting**
- **Found during:** Pre-task setup
- **Issue:** This worktree's branch was behind master — Plan 01 changes (types.ts, supplements.ts, remedies.ts deletion) existed on master but not in this worktree branch
- **Fix:** Ran `git merge 562142e` to fast-forward the worktree to include Plan 01 changes
- **Files modified:** N/A (just branch pointer)
- **Verification:** src/data/supplements.ts, src/data/types.ts with SupplementItem all present after merge

---

**Total deviations:** 2 auto-fixed (1 unused import cleanup, 1 branch sync)
**Impact on plan:** Both necessary for build correctness. No scope creep.

## Issues Encountered

None beyond the deviations above.

## Known Stubs

- `SUPPLEMENTS: SupplementItem[] = []` in src/data/supplements.ts — empty array, data loads from Google Sheets at runtime. This is intentional per the data model design (no hardcoded supplement data). SupplementSchedule.tsx will render "沒有符合條件的項目" until Sheets data loads.

## Next Phase Readiness

- Clean two-category type system is now fully wired through all layers
- Phase 6 (item-service) can now build ItemService on top of the new SupplementItem + FoodItem types
- No blocking issues

---
*Phase: 05-data-model-restructure*
*Completed: 2026-03-31*
