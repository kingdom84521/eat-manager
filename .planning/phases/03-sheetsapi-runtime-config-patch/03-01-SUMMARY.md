---
phase: 03-sheetsapi-runtime-config-patch
plan: 01
subsystem: api
tags: [sheets-api, settings-service, localStorage, runtime-config, typescript]

# Dependency graph
requires:
  - phase: 02-settings-service-persistence
    provides: SettingsService with getSheetsConfig() reading from localStorage
provides:
  - Per-call GAS URL resolution in SheetsAPI via SettingsService with env var fallback
affects: [04-settings-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-call URL resolution: read runtime config on each request rather than caching at module load"
    - "|| fallback for empty string handling: SettingsService.getSheetsConfig()?.gasUrl || import.meta.env.VITE_GAS_URL"

key-files:
  created: []
  modified:
    - src/lib/sheets-api.ts

key-decisions:
  - "Used || operator (not ??) so empty string '' from storage also falls back to VITE_GAS_URL"
  - "getGasUrl() is a module-private function with no public API surface change"

patterns-established:
  - "Runtime config override pattern: call SettingsService per-request, fall back to env var"

requirements-completed: [GS-04, GS-05]

# Metrics
duration: 2min
completed: 2026-03-30
---

# Phase 03 Plan 01: SheetsAPI Runtime Config Patch Summary

**GAS URL resolved per-call via SettingsService.getSheetsConfig() with VITE_GAS_URL env var fallback, enabling user-configured URLs to take effect without page reload**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T01:49:47Z
- **Completed:** 2026-03-30T01:51:31Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Removed module-level `const GAS_URL = import.meta.env.VITE_GAS_URL` constant that captured URL at import time
- Added `getGasUrl()` private helper that reads from `SettingsService.getSheetsConfig()?.gasUrl` first, falling back to env var
- Both `gasGet()` and `gasPost()` now call `getGasUrl()` per request — runtime config changes are picked up immediately
- Zero public API surface changes: `SheetsAPI` export object and all method signatures unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace module-level GAS_URL constant with per-call getGasUrl() helper** - `7894aeb` (feat)

## Files Created/Modified
- `src/lib/sheets-api.ts` - Patched to add SettingsService import, getGasUrl() helper, and per-call URL resolution in gasGet/gasPost

## Decisions Made
- Used `||` operator (not `??`) so an empty string `""` stored in settings also falls back to `VITE_GAS_URL` — this ensures a blank settings form doesn't break the app
- `getGasUrl()` is not exported; the public API surface of `SheetsAPI` is unchanged

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 4 (Settings UI) can now wire up a GAS URL input field — when user saves via `SettingsService.saveSheetsConfig()`, subsequent API calls will use the new URL immediately
- Cross-page settings propagation strategy (window storage event vs React Context) is still unresolved — must decide before Phase 4 implementation starts

---
*Phase: 03-sheetsapi-runtime-config-patch*
*Completed: 2026-03-30*

## Self-Check: PASSED

- FOUND: src/lib/sheets-api.ts
- FOUND: .planning/phases/03-sheetsapi-runtime-config-patch/03-01-SUMMARY.md
- FOUND commit: 7894aeb (feat(03-01): patch SheetsAPI to resolve GAS URL per-call via SettingsService)
