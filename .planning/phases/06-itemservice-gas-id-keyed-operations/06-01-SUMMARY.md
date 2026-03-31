---
phase: "06"
plan: "01"
subsystem: "gas-backend, sheets-api-client"
tags: ["gas", "sheets-api", "crud", "id-keyed"]
dependency_graph:
  requires: []
  provides: ["upsertById-GAS", "deleteById-GAS", "upsertById-client", "deleteById-client"]
  affects: ["src/lib/sheets-api.ts", "scripts/gas-api.js"]
tech_stack:
  added: []
  patterns: ["action-switch-dispatch", "id-column-keyed-upsert"]
key_files:
  created: []
  modified:
    - scripts/gas-api.js
    - src/lib/sheets-api.ts
decisions:
  - "String() coercion on both sides of id comparison to prevent type mismatch between Sheets number cells and JS string IDs"
  - "deleteById wraps id into { id } object to match GAS doPost destructuring pattern (const { action, sheet, data } = body)"
metrics:
  duration: "71 seconds"
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 2
---

# Phase 6 Plan 01: id-keyed GAS Operations Summary

**One-liner:** Added `upsertById` and `deleteById` to GAS backend and SheetsAPI client, enabling catalog CRUD keyed on `id` column instead of `date`.

## What Was Built

Two id-keyed operations mirroring the existing date-keyed pattern, extending the GAS proxy and TypeScript client without modifying any existing methods.

### GAS Backend (`scripts/gas-api.js`)

- `upsertById(sheetName, data)` — searches for an existing row by `id` column using `String()` coercion; overwrites if found, appends if not. Serializes objects/arrays to JSON (same pattern as `appendRow`).
- `deleteById(sheetName, id)` — iterates rows in reverse, deletes the first row matching the given id using `String()` coercion.
- Two new `doPost` switch cases: `case "upsertById"` and `case "deleteById"`.

### SheetsAPI Client (`src/lib/sheets-api.ts`)

- `upsertById(sheet, data)` — calls `gasPost({ action: "upsertById", sheet, data })`, returns `Promise<ApiResponse>`.
- `deleteById(sheet, id)` — calls `gasPost({ action: "deleteById", sheet, data: { id } })`, returns `Promise<ApiResponse>`.

## Verification

| Check | Result |
|-------|--------|
| `grep -c 'upsertById\|deleteById' scripts/gas-api.js` | 6 (2 defs + 2 switch cases + 2 invocations) |
| `grep -c 'upsertById\|deleteById' src/lib/sheets-api.ts` | 4 (2 method defs + 2 gasPost calls) |
| `npx tsc --noEmit` | 0 errors |
| Original `upsertByDate`/`deleteByDate` present | 4 matches (unchanged) |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | d6a621a | feat(06-01): add upsertById and deleteById to GAS backend |
| Task 2 | c14d1c4 | feat(06-01): add upsertById and deleteById to SheetsAPI client |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `/home/ubuntu/works/eat-manager/.claude/worktrees/agent-af610990/scripts/gas-api.js` — verified contains `function upsertById`, `function deleteById`, `case "upsertById"`, `case "deleteById"`
- `/home/ubuntu/works/eat-manager/.claude/worktrees/agent-af610990/src/lib/sheets-api.ts` — verified contains `upsertById` and `deleteById` methods
- Commits d6a621a and c14d1c4 — verified present in `git log`
