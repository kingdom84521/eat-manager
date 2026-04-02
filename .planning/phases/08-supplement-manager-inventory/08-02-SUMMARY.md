---
phase: 08-supplement-manager-inventory
plan: "02"
subsystem: supplement-ui
tags: [react, supplements, inventory, interactions, synergies]
dependency_graph:
  requires: ["08-01"]
  provides: ["supplement-interactions", "supplement-inventory"]
  affects: ["src/pages/SupplementManager.tsx"]
tech_stack:
  added: []
  patterns:
    - "Bidirectional relationship resolution at render time (no data duplication)"
    - "Optimistic local state update after async service call"
    - "onMouseDown + setTimeout blur pattern for dropdown dismiss"
key_files:
  created: []
  modified:
    - src/pages/SupplementManager.tsx
decisions:
  - "Bidirectional interactions/synergies resolved at render time — avoids data duplication and stale references"
  - "InventorySection appears in edit view only (not add view per D-15)"
  - "Deleted supplement references gracefully filtered via .find() returning undefined then filtered by type guard"
metrics:
  duration_minutes: 15
  completed_date: "2026-04-02"
  tasks_completed: 3
  files_modified: 1
---

# Phase 08 Plan 02: Interactions/Synergies Multi-select and Inventory Section Summary

**One-liner:** Added searchable interactions/synergies multi-select with bidirectional display and edit-only inventory purchase recording with remaining-units/days-left display.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add interactions/synergies searchable multi-select to SupplementForm | 94c83fd | src/pages/SupplementManager.tsx |
| 2 | Add inventory section to edit view with purchase recording and history | 94c83fd | src/pages/SupplementManager.tsx |
| 3 | Verify Supplement Manager page end-to-end | (auto-approved) | - |

## What Was Built

### Task 1: Interactions/Synergies Multi-select

- `SupplementRefSelector` inline sub-component: searchable dropdown (limit 8 results), onMouseDown to beat blur dismiss, red-tinted chips for conflicts, green-tinted chips for synergies
- `resolveInteractions()` and `resolveSynergies()` module-level helpers that combine direct + indirect references for bidirectional display
- Indirect interactions/synergies shown as read-only dimmed chips with "（由對方設定）" label
- Deleted supplement references gracefully filtered — IDs that don't resolve to a current supplement are silently excluded from chip display
- `interactionIds` and `synergyIds` state in SupplementForm, saved correctly to SupplementItem on submit
- `SupplementCard` updated to show "⚠ N 衝突" and "✓ N 協同" badges using bidirectional resolve counts

### Task 2: Inventory Section

- `InventorySection` inline sub-component shows only in edit mode (supp prop present)
- Remaining summary card at top with color-coded INV_COLORS status
- Purchase recording form: quantity (number input) + date (date input defaults to today) + "記錄" button
- Purchase history list sorted by date descending
- `handleRecordPurchase` in parent calls `ItemService.upsertInventory` then optimistically updates local `inventory` state
- `SupplementForm` props extended: `allSupplements`, `inventory`, `onRecordPurchase`

### Task 3: Checkpoint

Auto-approved (auto_advance: true). Build passes cleanly with all TypeScript strict checks.

## Decisions Made

- Bidirectional relationships resolved at render time — no data duplication, avoids stale references when supplements are deleted
- InventorySection placed after save button in edit mode only — per D-15, inventory doesn't apply to not-yet-saved supplements
- Optimistic local state update after `upsertInventory` — avoids full re-fetch, provides instant UI feedback

## Deviations from Plan

None — plan executed exactly as written. Both Task 1 and Task 2 were implemented in a single file write since they target the same file and have no logical conflict.

## Self-Check: PASSED

- [x] `src/pages/SupplementManager.tsx` exists and modified
- [x] Commit 94c83fd exists
- [x] `npm run build` passes
- [x] All acceptance criteria verified via grep
