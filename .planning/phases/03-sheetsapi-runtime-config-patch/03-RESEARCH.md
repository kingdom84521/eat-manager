# Phase 3: SheetsAPI Runtime Config Patch - Research

**Researched:** 2026-03-30
**Domain:** TypeScript module patching — call-time URL resolution in a singleton service module
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Add a private helper function `getGasUrl()` that checks `SettingsService.getSheetsConfig()?.gasUrl` first, falls back to `import.meta.env.VITE_GAS_URL`. This replaces the module-level `const GAS_URL`.
- **D-02:** `gasGet()` and `gasPost()` call `getGasUrl()` on every invocation instead of referencing a module-level constant. This ensures a URL written to SettingsService takes effect immediately.
- **D-03:** If the runtime `gasUrl` from SettingsService is an empty string or `undefined`, treat it the same as absent — fall back to the env var. This preserves existing behavior when no runtime config is set.
- **D-04:** Only the GAS URL is made runtime-configurable in this phase. Sheet ID is not used in `sheets-api.ts` — runtime Sheet ID handling is Phase 4 scope.
- **D-05:** No changes to the `SheetsAPI` public interface. All methods retain their existing signatures and return types. The change is purely internal to how the URL is resolved.

### Claude's Discretion

- Whether `getGasUrl()` is a named function or an inline expression — as long as it's called per-request
- Import style for SettingsService (top-level import is fine since settings-service.ts has no circular dependency risk)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GS-04 | SheetsAPI reads GAS URL at call time (runtime config), not module load time | Replace module-level constant with `getGasUrl()` called inside `gasGet()` and `gasPost()` |
| GS-05 | Fallback to .env `VITE_GAS_URL` when no runtime config is set | `getGasUrl()` returns `SettingsService.getSheetsConfig()?.gasUrl || import.meta.env.VITE_GAS_URL` |
</phase_requirements>

---

## Summary

This phase is a one-file surgical patch. The only file changing is `src/lib/sheets-api.ts`. The current module evaluates `const GAS_URL = import.meta.env.VITE_GAS_URL` once at module load time — meaning any URL written to `SettingsService` after the module has been imported is invisible to subsequent API calls. The fix is to replace the module-level constant with a `getGasUrl()` helper that reads `SettingsService.getSheetsConfig()?.gasUrl` on every invocation and falls back to the env var when the result is falsy.

The dependency graph is benign: `settings-service.ts` imports only from `src/data/` and never from `src/lib/`, so importing `SettingsService` into `sheets-api.ts` introduces no circular dependency. All callers of `SheetsAPI` (five methods in `data-service.ts`, all consumed in page components) remain entirely unchanged — the change is fully internal.

The existing error-handling contract is preserved: callers wrap all `SheetsAPI` calls in `.catch(() => {})`, so any URL-resolution failure (empty string, undefined) will surface as a fetch network error swallowed by the same silent-catch pattern already present throughout `data-service.ts`.

**Primary recommendation:** Replace line 6 of `sheets-api.ts` with a top-level import of `SettingsService` and a `getGasUrl()` helper; update the two usages inside `gasGet()` and `gasPost()`.

---

## Standard Stack

No new libraries. This phase uses only existing project dependencies.

| Component | Current Role | Phase 3 Role |
|-----------|-------------|-------------|
| `import.meta.env.VITE_GAS_URL` | Sole URL source (module load time) | Fallback when no runtime config |
| `SettingsService.getSheetsConfig()` | Unused in sheets-api.ts | Primary URL source (call time) |

**Installation:** None required.

---

## Architecture Patterns

### Current Module Structure (sheets-api.ts)

```
sheets-api.ts
├── const GAS_URL = import.meta.env.VITE_GAS_URL   ← evaluated once at module load
├── gasGet(params)          uses GAS_URL
├── gasPost(body)           uses GAS_URL
└── export SheetsAPI        public surface (unchanged)
```

### Target Module Structure (sheets-api.ts after patch)

```
sheets-api.ts
├── import { SettingsService } from "./settings-service"
├── function getGasUrl()    reads SettingsService per-call, falls back to env var
├── gasGet(params)          calls getGasUrl()
├── gasPost(body)           calls getGasUrl()
└── export SheetsAPI        unchanged — no signature or behavior change for callers
```

### Pattern: Per-Call Configuration Resolution

**What:** A module-level constant that captures configuration at import time is replaced with a function that reads configuration on every invocation from an external source (localStorage via SettingsService), with a deterministic fallback.

**When to use:** When a configuration value must reflect user-written state that can change after module load without a page reload. The pattern trades a single property lookup at module load for one `localStorage.getItem` + `JSON.parse` per API call — negligible for network I/O bounded operations.

**Example (verified against existing codebase):**

```typescript
// Source: src/lib/settings-service.ts — SettingsService.getSheetsConfig()
// Source: src/lib/sheets-api.ts — current gasGet/gasPost

import { SettingsService } from "./settings-service";

// Replaces: const GAS_URL = import.meta.env.VITE_GAS_URL;
function getGasUrl(): string {
  return SettingsService.getSheetsConfig()?.gasUrl || import.meta.env.VITE_GAS_URL;
}

// gasGet becomes:
async function gasGet(params: Record<string, string>): Promise<SheetRow[]> {
  const url = new URL(getGasUrl());          // was: new URL(GAS_URL)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// gasPost becomes:
async function gasPost(body: Record<string, unknown>): Promise<ApiResponse> {
  const res = await fetch(getGasUrl(), {     // was: fetch(GAS_URL, ...)
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
```

### Falsy Guard — D-03

The `||` operator naturally handles all falsy cases:

| `getSheetsConfig()` result | `?.gasUrl` | `|| VITE_GAS_URL` result |
|---------------------------|-----------|--------------------------|
| `null` | `undefined` | env var used |
| `{ gasUrl: "" }` | `""` (falsy) | env var used |
| `{ gasUrl: "https://..." }` | `"https://..."` (truthy) | runtime URL used |

This requires no extra conditional logic beyond the `||` operator.

### Anti-Patterns to Avoid

- **Module-level const for mutable config:** The current pattern (`const GAS_URL = import.meta.env.VITE_GAS_URL`) is the problem being fixed. Do not re-introduce a module-level cache variable that stores the result of `getGasUrl()` — that defeats the entire purpose.
- **Strict `?? ""` instead of `||`:** Using nullish coalescing (`??`) would fail to fall back on empty string (`""`), violating D-03. Use `||` or explicit `|| import.meta.env.VITE_GAS_URL`.
- **Changing the public SheetsAPI interface:** D-05 is locked. No new exports, no modified method signatures.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reactive URL propagation | StorageEvent listener, React Context, module-level cache invalidation | Per-call `getGasUrl()` read from localStorage | The app is already offline-first with localStorage as truth; reading per-call costs one JSON.parse per network request — a non-issue compared to network latency |
| Custom change notification | pub/sub, EventEmitter, module hot-reload | Per-call resolution | Zero dependencies, zero new abstractions, trivially verifiable |

**Key insight:** Because `SheetsAPI` calls are always async and already preceded by localStorage reads in `DataService`, adding one more synchronous `localStorage.getItem` inside `getGasUrl()` adds no observable latency.

---

## Common Pitfalls

### Pitfall 1: Circular Import Risk (Not Present Here — Verified)
**What goes wrong:** Importing `SettingsService` from `settings-service.ts` into `sheets-api.ts` could create a circular dependency if `settings-service.ts` imported from `sheets-api.ts`.
**Why it happens:** Circular deps cause one module to receive an incomplete (partially initialized) export object.
**How to avoid:** Verified — `settings-service.ts` imports only from `../data/types`, `../data/bmr`, `../data/dietary-guidelines`. It has zero imports from `src/lib/`. No circular dependency exists.
**Warning signs:** TypeScript compiler error on import, or runtime `undefined` for exported values at module init time.

### Pitfall 2: Empty String Not Caught by Nullish Coalescing
**What goes wrong:** If `getSheetsConfig()` returns `{ gasUrl: "", sheetId: "" }` (an initialized but empty config), `??` treats `""` as defined and passes it as the URL, causing `new URL("")` to throw a `TypeError`.
**Why it happens:** D-03 requires empty string to be treated as absent. `??` only guards `null`/`undefined`, not `""`.
**How to avoid:** Use `||` operator: `SettingsService.getSheetsConfig()?.gasUrl || import.meta.env.VITE_GAS_URL`.
**Warning signs:** `TypeError: Failed to construct 'URL': The URL '' is invalid` in the browser console.

### Pitfall 3: TypeScript noUnusedLocals Violation
**What goes wrong:** Removing `const GAS_URL` without also removing its two usages (or vice versa) causes a TypeScript compile error. The project has `noUnusedLocals: true`.
**Why it happens:** The build command runs `tsc -b` before `vite build`, so type errors block deployment.
**How to avoid:** The patch must atomically: (1) remove `const GAS_URL`, (2) add `getGasUrl()`, (3) replace both `GAS_URL` references with `getGasUrl()` calls, (4) add the `SettingsService` import.
**Warning signs:** `npm run build` fails with "TS6133: 'GAS_URL' is declared but its value is never read."

---

## Code Examples

### Complete Patched sheets-api.ts

```typescript
/**
 * Google Sheets API client via Apps Script proxy
 * Offline-first: localStorage cache + async sync
 */

// Source: existing pattern from settings-service.ts + CONTEXT.md D-01/D-02/D-03
import { SettingsService } from "./settings-service";

// ── Types ───────────────────────────────────────

export interface SheetRow {
  [key: string]: string | number | null;
}

interface ApiResponse<T = SheetRow[]> {
  success?: boolean;
  error?: string;
  data?: T;
}

// ── URL Resolution ──────────────────────────────

/** 取得 GAS URL：優先使用 SettingsService 的執行期設定，回退至環境變數 */
function getGasUrl(): string {
  return SettingsService.getSheetsConfig()?.gasUrl || import.meta.env.VITE_GAS_URL;
}

// ── Low-level API ───────────────────────────────

async function gasGet(
  params: Record<string, string>
): Promise<SheetRow[]> {
  const url = new URL(getGasUrl());
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function gasPost(body: Record<string, unknown>): Promise<ApiResponse> {
  const res = await fetch(getGasUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ── High-level API ──────────────────────────────

export const SheetsAPI = {
  // ... unchanged
};
```

---

## Environment Availability

Step 2.6: SKIPPED — this phase is a pure code change to a single TypeScript file with no external tool dependencies. The existing Node.js/npm/TypeScript/Vite toolchain from Phase 2 remains unchanged.

---

## Open Questions

None. All decisions are locked in CONTEXT.md. The implementation is a deterministic four-step patch with no ambiguity.

---

## Sources

### Primary (HIGH confidence)
- `src/lib/sheets-api.ts` — Current implementation verified by direct file read; line 6 (`const GAS_URL`), line 25 (`new URL(GAS_URL)`), line 34 (`fetch(GAS_URL, ...)`) are the three change points
- `src/lib/settings-service.ts` — `SettingsService.getSheetsConfig()` returns `SheetsConfig | null`; import graph verified (no lib imports)
- `src/lib/data-service.ts` — All five `SheetsAPI` call sites verified; no changes needed in this file
- `.planning/phases/03-sheetsapi-runtime-config-patch/03-CONTEXT.md` — All implementation decisions locked
- `tsconfig.json` (via CLAUDE.md) — `noUnusedLocals: true`, `strict: true` constraints verified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; existing codebase fully inspected
- Architecture: HIGH — change is one file, three lines, plus one import; fully determined by CONTEXT.md decisions
- Pitfalls: HIGH — all three identified pitfalls are verified against the actual source files

**Research date:** 2026-03-30
**Valid until:** N/A — this research covers a single deterministic patch; it does not depend on external library versions or ecosystem state
