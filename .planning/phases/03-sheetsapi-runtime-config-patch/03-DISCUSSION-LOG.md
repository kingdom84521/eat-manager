# Phase 3: SheetsAPI Runtime Config Patch - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 03-sheetsapi-runtime-config-patch
**Areas discussed:** URL resolution approach, Sheet ID propagation, Error handling
**Mode:** --auto (all decisions auto-selected)

---

## URL Resolution Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Private helper function | `getGasUrl()` checks SettingsService first, falls back to env var | :white_check_mark: |
| Inline resolution | Each `gasGet`/`gasPost` call checks SettingsService inline | |
| Lazy module variable | Re-assign module variable on first call | |

**User's choice:** [auto] Private helper function (recommended default)
**Notes:** Keeps gasGet/gasPost clean, single source of truth for URL resolution logic.

---

## Sheet ID Propagation

| Option | Description | Selected |
|--------|-------------|----------|
| GAS URL only | Only make GAS URL runtime-configurable; Sheet ID not used in API calls | :white_check_mark: |
| Both URL and Sheet ID | Also propagate Sheet ID through SettingsService | |

**User's choice:** [auto] GAS URL only (recommended default)
**Notes:** Sheet ID is not referenced anywhere in sheets-api.ts — it's only used for direct links in the UI. Making it runtime-configurable is Phase 4 scope (GS-01, GS-02).

---

## Error Handling for Invalid Runtime URL

| Option | Description | Selected |
|--------|-------------|----------|
| Fall back to env var | Empty/null runtime gasUrl treated as absent, use VITE_GAS_URL | :white_check_mark: |
| Throw error | Throw if runtime config exists but gasUrl is empty | |
| Use as-is | Pass whatever value through, let fetch fail naturally | |

**User's choice:** [auto] Fall back to env var (recommended default)
**Notes:** Matches success criterion #3: "no behavioral change to any existing page or feature when no runtime config is present."

---

## Claude's Discretion

- Import style for SettingsService (top-level vs lazy)
- Helper function naming (`getGasUrl` vs `resolveGasUrl`)

## Deferred Ideas

None — discussion stayed within phase scope
