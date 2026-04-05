---
phase: 09-supplement-routine-generator
plan: "02"
subsystem: supplement-schedule
tags: [supplement, routine, checklist, inventory, conflict-resolution]
dependency_graph:
  requires: ["09-01"]
  provides: ["supplement-routine-ui", "daily-checklist", "three-state-toggle"]
  affects: ["src/pages/SupplementSchedule.tsx"]
tech_stack:
  added: []
  patterns:
    - "Deterministic sort by id for reproducible routine generation"
    - "Bidirectional conflict/synergy check at render time"
    - "Three-state toggle with optimistic local state update"
    - "useCallback for stable toggle handler reference"
key_files:
  created: []
  modified:
    - src/pages/SupplementSchedule.tsx
decisions:
  - "Three-state cycle (untouched→taken→skipped) implemented as simple tap cycle per plan recommendation"
  - "Inventory deduction only on untouched→taken transition to prevent double-deduction"
  - "generateRoutine() computed on every render (not stored in state) for correctness"
  - "Empty timing slots hidden by returning null from TIMING_ORDER.map"
metrics:
  duration: "~8 minutes"
  completed_date: "2026-04-05"
  tasks_completed: 2
  files_modified: 1
---

# Phase 09 Plan 02: Supplement Routine Checklist Summary

**One-liner:** Interactive daily supplement routine checklist with deterministic conflict-aware scheduling, three-state tap toggle, inventory deduction, and localStorage persistence.

## What Was Built

Complete rewrite of `src/pages/SupplementSchedule.tsx` from a static catalog browse view into a fully functional daily supplement routine checklist page.

### Core Algorithm: `generateRoutine()`

Deterministic scheduling using `a.id.localeCompare(b.id)` sort:
1. Filters to `isActive === true` AND `calcRemainingUnits() > 0` (in-stock check)
2. Sorts supplements by id for reproducible ordering
3. Assigns each supplement to its preferred timing slot; if conflict found, moves to an alternate slot with warning badge
4. Supplements that conflict everywhere are listed in the "未排入" unscheduled section

### Conflict and Synergy Detection

- `hasConflict(a, b)`: bidirectional — `a.interactions.includes(b.id) || b.interactions.includes(a.id)`
- `hasSynergy(a, b)`: bidirectional — `a.synergies.includes(b.id) || b.synergies.includes(a.id)`
- `slotHasConflict(candidate, occupants)`: checks candidate against all occupants in a slot

### Three-State Toggle

tap cycle: untouched → taken (green ✓) → skipped (strikethrough) → untouched

- Inventory deduction (`ItemService.logConsumption`) fires only on untouched→taken
- Daily log persisted via `ItemService.saveDailyLog` after every state change
- State restored from `ItemService.getDailyLog(today)` on mount

### UI Components

| Component | Purpose |
|-----------|---------|
| `ProgressHeader` | Shows 今日進度: X/Y 已服用 at top |
| `TimingSlotCard` | Slot header with per-slot count + list of RoutineRows |
| `RoutineRow` | Single supplement with state indicator, dosage, tags, conflict warning, synergy notes |
| `UnscheduledCard` | Amber warning section for irresolvable conflicts |
| `TagBadge` | Health tag colored badge (copied from DailyPlan.tsx pattern) |

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Rewrite SupplementSchedule.tsx | 9d95e00 | src/pages/SupplementSchedule.tsx (+429/-126) |
| Task 2: Human verify (auto-approved) | — | — |

## Deviations from Plan

None — plan executed exactly as written. The worktree required rebasing onto master to access Phase 09-01 outputs (item-service.ts, supplements.ts, updated types.ts), handled as Rule 3 (blocking issue auto-fix).

## Known Stubs

None — all data flows are wired to live ItemService calls.

## Self-Check: PASSED

- [x] `src/pages/SupplementSchedule.tsx` exists at 429 lines
- [x] Commit 9d95e00 exists in git log
- [x] `npm run build` passes with zero errors
- [x] All acceptance criteria verified (generateRoutine, hasConflict, hasSynergy, a.id.localeCompare, ItemService.logConsumption, getDailyLog, saveDailyLog, 今日進度, 未排入, 避開, 協同, SUPPLEMENT_TIMING_LABELS, no Math.random)
