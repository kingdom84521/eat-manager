# Phase 3: SheetsAPI Runtime Config Patch - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Surgical patch to `src/lib/sheets-api.ts` — make it resolve the GAS URL at call time from SettingsService, with fallback to the VITE_GAS_URL environment variable. No new files, no UI, no new exports. The change is limited to sheets-api.ts internals.

</domain>

<decisions>
## Implementation Decisions

### URL Resolution
- **D-01:** Add a private helper function `getGasUrl()` that checks `SettingsService.getSheetsConfig()?.gasUrl` first, falls back to `import.meta.env.VITE_GAS_URL`. This replaces the module-level `const GAS_URL`.
- **D-02:** `gasGet()` and `gasPost()` call `getGasUrl()` on every invocation instead of referencing a module-level constant. This ensures a URL written to SettingsService takes effect immediately.
- **D-03:** If the runtime `gasUrl` from SettingsService is an empty string or `undefined`, treat it the same as absent — fall back to the env var. This preserves existing behavior when no runtime config is set.

### Scope Boundaries
- **D-04:** Only the GAS URL is made runtime-configurable in this phase. Sheet ID is not used in `sheets-api.ts` (it's only for direct Sheet links in the UI) — runtime Sheet ID handling is Phase 4 scope.
- **D-05:** No changes to the `SheetsAPI` public interface. All methods retain their existing signatures and return types. The change is purely internal to how the URL is resolved.

### Claude's Discretion
- Whether `getGasUrl()` is a named function or an inline expression — as long as it's called per-request
- Import style for SettingsService (top-level import is fine since settings-service.ts has no circular dependency risk)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Target File
- `src/lib/sheets-api.ts` — The file being patched. Current module-level `const GAS_URL = import.meta.env.VITE_GAS_URL` on line 6 must be replaced with call-time resolution.

### SettingsService (dependency)
- `src/lib/settings-service.ts` — `getSheetsConfig()` returns `SheetsConfig | null` where `SheetsConfig = { gasUrl: string, sheetId: string }`

### Requirements
- `.planning/REQUIREMENTS.md` GS-04 — SheetsAPI reads GAS URL at call time (runtime config), not module load time
- `.planning/REQUIREMENTS.md` GS-05 — Fallback to .env VITE_GAS_URL when no runtime config is set

</canonical_refs>

<code_context>
## Existing Code Insights

### Current Implementation
- `sheets-api.ts` line 6: `const GAS_URL = import.meta.env.VITE_GAS_URL;` — resolved once at module load
- `gasGet()` (line 23): Creates `new URL(GAS_URL)` — needs to call `getGasUrl()` instead
- `gasPost()` (line 33): Uses `fetch(GAS_URL, ...)` — needs to call `getGasUrl()` instead
- `SheetsAPI` object (line 45): Public API surface is unchanged

### Established Patterns
- Service singletons exported as plain objects (`DataService`, `SheetsAPI`, `SettingsService`)
- Library files in `src/lib/` use kebab-case naming
- No circular dependency risk: `settings-service.ts` imports from `src/data/` only, never from `src/lib/`

### Integration Points
- `SettingsService.getSheetsConfig()` is the read path — already implemented in Phase 2
- `SettingsService.saveSheetsConfig()` is the write path — Phase 4 settings UI will call this
- No other files need changes — `data-service.ts` calls `SheetsAPI` methods which internally resolve the URL

</code_context>

<specifics>
## Specific Ideas

No specific requirements — the implementation is straightforward: replace module-level constant with a per-call function that checks SettingsService then env var.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-sheetsapi-runtime-config-patch*
*Context gathered: 2026-03-30*
