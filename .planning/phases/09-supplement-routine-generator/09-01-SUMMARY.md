---
phase: 09-supplement-routine-generator
plan: "01"
subsystem: item-service/supplement-manager
tags: [consumption-tracking, inventory, item-service, supplement-manager]
dependency_graph:
  requires: []
  provides: [logConsumption, getConsumption, getDailyLog, saveDailyLog, consumption-adjusted-inventory]
  affects: [src/lib/item-service.ts, src/pages/SupplementManager.tsx]
tech_stack:
  added: []
  patterns: [event-sourced-consumption, localStorage-first, background-sheets-sync]
key_files:
  created: []
  modified:
    - src/lib/item-service.ts
    - src/pages/SupplementManager.tsx
decisions:
  - "getDailyLog/saveDailyLog are synchronous localStorage-only methods (no Sheets sync) — daily routine state is transient and local"
  - "logConsumption uses append-only event sourcing matching upsertInventory pattern"
  - "calcRemainingUnits updated to subtract consumption using Math.max(0, ...) to prevent negative values"
metrics:
  duration_minutes: 4
  completed_date: "2026-04-05"
  tasks_completed: 2
  files_modified: 2
---

# Phase 09 Plan 01: Consumption Tracking and Inventory Calculation Summary

Append-only consumption event sourcing in ItemService and consumption-adjusted remaining units in SupplementManager.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add consumption and daily log methods to ItemService | 04d1027 | src/lib/item-service.ts |
| 2 | Update SupplementManager inventory calculation to subtract consumption | 5008400 | src/pages/SupplementManager.tsx |

## What Was Built

### ItemService additions (src/lib/item-service.ts)

Four new methods following the established offline-first pattern:

- **`logConsumption(event: ConsumptionEvent)`** — appends to `consumption_events` localStorage key and fires `SheetsAPI.append("consumption", ...)` in background (fire-and-forget)
- **`getConsumption(supplementId?)`** — reads from localStorage cache, triggers background Sheets sync; optional `supplementId` filter for per-supplement queries
- **`getDailyLog(date)`** — synchronous localStorage-only read of `SupplementLogEntry` for a given date
- **`saveDailyLog(entry)`** — synchronous localStorage-only write of `SupplementLogEntry`

New constants added:
- `SHEETS.CONSUMPTION = "consumption"`
- `CACHE_KEYS.CONSUMPTION = "consumption_events"`
- `CACHE_KEYS.SUPPLEMENT_LOG = "supplement_log"`

New converter: `rowToConsumption(row: SheetRow): ConsumptionEvent`

### SupplementManager updates (src/pages/SupplementManager.tsx)

- `calcRemainingUnits` now accepts `consumption: ConsumptionEvent[]` and computes `Math.max(0, purchased - consumed)`
- `calcDaysRemaining` now uses consumption-adjusted remaining instead of raw purchased total
- Added `const [consumption, setConsumption] = useState<ConsumptionEvent[]>([])` state
- Added `ItemService.getConsumption().then(setConsumption)` to existing `useEffect` mount handler
- All three call sites (low inventory banner, card daysLeft, card remainingUnits) updated to pass consumption parameter

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — consumption data is wired to real localStorage and Sheets. The `getConsumption()` call in `useEffect` will return `[]` until events are actually logged by the routine page (Plan 02), but the calculation is correctly hooked up.

## Self-Check

- [x] src/lib/item-service.ts exists and contains all four methods
- [x] src/pages/SupplementManager.tsx exists and contains consumption state and updated calculations
- [x] Commit 04d1027 exists (Task 1)
- [x] Commit 5008400 exists (Task 2)
- [x] `npm run build` exits 0
