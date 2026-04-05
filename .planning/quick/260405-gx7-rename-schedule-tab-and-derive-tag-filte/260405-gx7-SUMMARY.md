---
phase: quick
plan: 260405-gx7
subsystem: navigation, supplement-manager
tags: [ui, filter, navigation, supplements]
dependency_graph:
  requires: []
  provides: [renamed-schedule-tab, supplement-tag-filter]
  affects: [src/App.tsx, src/pages/SupplementManager.tsx]
tech_stack:
  added: []
  patterns: [useMemo-derived-filter-state, chip-toggle-filter]
key_files:
  modified:
    - src/App.tsx
    - src/pages/SupplementManager.tsx
decisions:
  - Derived usedTags from supplements state via useMemo — only tags present in saved data shown as chips, not all possible HealthTags
  - Tag chips use same inline-style pattern as form tag chips (dynamic hex from HEALTH_TAG_COLORS for selected state)
metrics:
  duration: ~5m
  completed: "2026-04-05"
---

# Phase quick Plan 260405-gx7: Rename Schedule Tab and Derive Tag Filter Summary

**One-liner:** Renamed /schedule bottom nav tab from "🗓️ 時程" to "💊 例行" and added data-derived tag filter chips to the SupplementManager list view via useMemo.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rename schedule tab and add data-derived tag filter | 96787fd | src/App.tsx, src/pages/SupplementManager.tsx |

## What Was Built

**src/App.tsx:** Changed `/schedule` tab entry — icon from `🗓️` to `💊`, label from `時程` to `例行`. Reflects the page's actual purpose as a daily supplement routine checklist.

**src/pages/SupplementManager.tsx:**
- Added `tagFilter` state (`useState<HealthTag | "">("")`) alongside existing `searchTerm` and `timingFilter`
- Added `usedTags` computed via `useMemo` — iterates `supplements` state to collect unique tags into a `Set<HealthTag>`, then converts to array. Only tags actually in use appear as filter chips.
- Extended `filteredSupplements` predicate with `if (tagFilter && !s.tags.includes(tagFilter)) return false`
- Added tag chip block in list view JSX between timing filter select and low-inventory banner — chips use `HEALTH_TAG_LABELS[tag]` for display text and `HEALTH_TAG_COLORS[tag]` as background when active (inline style), `bg-slate-700` when inactive
- Updated empty state ternary to include `tagFilter` in the "no results" condition

**Form tag chips unchanged** — `ALL_TAGS` still used in the add/edit form so users can assign any valid HealthTag to a new supplement.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `src/App.tsx` modified: found /schedule tab with label "例行" (line 15)
- `src/pages/SupplementManager.tsx` modified: usedTags useMemo present, tagFilter state present, chip JSX present
- Commit `96787fd` exists: confirmed via git log
- Build: `npm run build` passed with 0 TypeScript errors
