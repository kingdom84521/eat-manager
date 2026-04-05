# Phase 02: Settings Persistence Layer - Research

**Researched:** 2026-03-29
**Domain:** TypeScript service module, localStorage schema versioning, singleton service pattern
**Confidence:** HIGH

## Summary

Phase 2 is a pure TypeScript service layer with no UI, no React, and no external dependencies. The entire surface is `src/lib/settings-service.ts` — a plain-object singleton that reads and writes a single versioned JSON blob to localStorage under the key `"eat_manager_settings"`.

The codebase already supplies every building block needed: `cacheGet`/`cacheSet` patterns in `data-service.ts`, all required types in `types.ts`, and ready-to-import computation functions from Phase 1 (`calculateBMRResult`, `calculateMacroGrams`, `GUIDELINES`). No new dependencies are required. The entire phase is type-safe TypeScript file authoring against an already-settled design.

The only non-trivial decision left to Claude's discretion is whether `AppSettings` lives in `types.ts` or inline in `settings-service.ts`. Both options are valid; placing it in `types.ts` is more consistent with the existing data-model convention but introduces a dependency from the data layer on the service layer's schema concern. Keeping it in `settings-service.ts` keeps the schema self-contained and avoids that coupling. The recommendation is to define `AppSettings` in `settings-service.ts` and export it from there.

**Primary recommendation:** Author `src/lib/settings-service.ts` as a plain-object singleton following the exact patterns of `DataService` and `SheetsAPI`, with private `readRaw`/`writeRaw` helpers, a `migrate()` function, granular typed getters, partial-update setters, and a `getComputedTargets()` that delegates all computation to Phase 1 functions.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Single localStorage key storing one JSON object with all settings. Not multiple keys per concern.
- **D-02:** Top-level shape: `{ settings_version: number, userProfile: UserProfile | null, activeGuidelineId: string | null, sheetsConfig: { gasUrl: string, sheetId: string } | null }`.
- **D-03:** Derived values (BMR, TDEE, macro grams) are NEVER stored — computed on demand from `userProfile` + `activeGuidelineId` via `getComputedTargets()`. Locked decision from roadmap planning (STATE.md).
- **D-04:** `settings_version: 1` field in root of the settings object.
- **D-05:** Inline migration function with switch/case from version N to N+1, executed on every read. Simple approach appropriate for single-user app.
- **D-06:** If stored data has no version field (version 0 / corrupted), treat as fresh start — return defaults rather than attempting to salvage.
- **D-07:** Granular typed getters: `getUserProfile()`, `getActiveGuidelineId()`, `getSheetsConfig()`, `getComputedTargets()`.
- **D-08:** `getComputedTargets()` returns `null` when no profile or no guideline is saved; returns `{ tdee, macros: MacroGrams }` when both are present. Imports from Phase 1 modules (`calculateBMRResult`, `calculateMacroGrams`, `GUIDELINES`).
- **D-09:** Write via partial update methods: `saveUserProfile(profile)`, `saveActiveGuidelineId(id)`, `saveSheetsConfig(config)`. Each merges into existing blob and writes atomically.
- **D-10:** Export as plain object singleton: `export const SettingsService = { ... }` — matches `DataService` and `SheetsAPI` patterns.
- **D-11:** Dedicated localStorage key `"eat_manager_settings"` — separate from the existing `wellness_` cache prefix used by DataService.

### Claude's Discretion

- Internal helper naming (e.g., `readRaw()`, `writeRaw()` for localStorage access)
- Whether to co-locate the settings type definition in `types.ts` or in the service file
- Error handling strategy for corrupted localStorage data (within the "return defaults" constraint of D-06)
- File placement: `src/lib/settings-service.ts` following existing kebab-case lib convention, or alternative if better justified

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SET-02 | Settings persisted to localStorage across sessions | `readRaw`/`writeRaw` helpers with try/catch, single key `"eat_manager_settings"`, verified pattern from `cacheGet`/`cacheSet` in `data-service.ts` |
| SET-03 | Settings use a versioned schema for future migration support | `settings_version: 1` in root blob, inline `migrate()` switch/case executed on every read, D-06 defines version-0/corrupted fallback behavior |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on This Phase |
|-----------|---------------------|
| Static SPA only — no SSR | No concern; service is pure localStorage |
| All user-facing text in Traditional Chinese | No UI in this phase; JSDoc comments should use zh-TW for domain terms |
| TypeScript strict mode | All types must be explicit; `noUnusedLocals` and `noUnusedParameters` enforced |
| Named exports for data/utilities/services; default exports for pages only | `export const SettingsService = { ... }` — named export, correct |
| Service singletons as plain objects | `SettingsService` must be `export const SettingsService = { ... }`, not a class |
| Library files in `src/lib/` kebab-case | `src/lib/settings-service.ts` — confirmed correct location |
| `import type` for type-only imports | Phase 1 type imports must use `import type { UserProfile, ... }` |
| File-level block comment with ASCII art header | `settings-service.ts` must open with the established section header pattern |
| Section dividers using `// ── Section Name ──` | Use throughout the file |
| Constants use UPPER_SNAKE_CASE | `SETTINGS_KEY = "eat_manager_settings"` |
| `noUnusedLocals: true`, `noUnusedParameters: true` | Every helper and type exported or used internally must be referenced |
| `npm run build` = `tsc -b && vite build` | File must type-check cleanly before phase is done |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ~5.8.3 | Service file authoring | Project standard; strict mode already configured |
| Browser localStorage | Native | Settings persistence | Offline-first constraint; already used by `DataService` |

### Supporting (Phase 1 imports)

| Module | Purpose | When to Use |
|--------|---------|-------------|
| `src/data/types.ts` | `UserProfile`, `ActivityLevelId`, `BMRResult`, `MacroRatios`, `MacroGrams`, `GuidelinePreset` | Import types in `settings-service.ts` |
| `src/data/bmr.ts` | `calculateBMRResult()` | Used inside `getComputedTargets()` |
| `src/data/dietary-guidelines.ts` | `GUIDELINES`, `GUIDELINE_MAP`, `calculateMacroGrams()` | Used inside `getComputedTargets()` |

**No new npm packages required.** This phase installs nothing.

---

## Architecture Patterns

### Recommended File Structure

```
src/lib/
├── data-service.ts      # existing — reference pattern
├── sheets-api.ts        # existing — reference pattern
├── utils.ts             # existing
└── settings-service.ts  # NEW — this phase
```

### Pattern 1: Private Read/Write Helpers

The `DataService` pattern uses module-level private functions `cacheGet` and `cacheSet`. `SettingsService` follows the same pattern with `readRaw` and `writeRaw`:

```typescript
// Source: src/lib/data-service.ts (established pattern)
const SETTINGS_KEY = "eat_manager_settings";

function readRaw(): AppSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as AppSettings) : null;
  } catch {
    return null;
  }
}

function writeRaw(data: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
  } catch {
    console.warn("localStorage write failed for", SETTINGS_KEY);
  }
}
```

**Rationale:** Centralizing localStorage access in two helpers means the rest of the service never calls `localStorage` directly — easier to test in isolation and consistent with the existing `cacheGet`/`cacheSet` approach.

### Pattern 2: Inline Migration with Switch/Case

```typescript
// Source: D-05 decision — migrate executed on every read
function migrate(raw: unknown): AppSettings {
  // D-06: no version field = treat as corrupted, return defaults
  if (
    typeof raw !== "object" ||
    raw === null ||
    typeof (raw as Record<string, unknown>).settings_version !== "number"
  ) {
    return defaultSettings();
  }

  let data = raw as AppSettings;

  switch (data.settings_version) {
    case 1:
      // Current version — no migration needed
      break;
    // case 0: would be handled above by the version-check guard
    // case 2: add future migration here
    default:
      // Unknown future version — return defaults rather than corrupt
      return defaultSettings();
  }

  return data;
}
```

**Key insight:** Running migrate on every read means the service can be called from any module at any time — there is no "boot sequence" required before settings are safe to use.

### Pattern 3: Default Settings Factory

```typescript
// Returning a fresh object from a function avoids accidental mutation of shared state
function defaultSettings(): AppSettings {
  return {
    settings_version: 1,
    userProfile: null,
    activeGuidelineId: null,
    sheetsConfig: null,
  };
}
```

### Pattern 4: Partial-Update Write Helpers

Each setter reads the current blob, merges one field, and writes back atomically. This prevents one setter from clobbering fields written by another setter:

```typescript
// Source: D-09 decision pattern
saveUserProfile(profile: UserProfile): void {
  const current = SettingsService._load();
  writeRaw({ ...current, userProfile: profile });
},
```

An internal `_load()` helper (or inlined at each setter) calls `readRaw()` → `migrate()` → returns a guaranteed-valid `AppSettings`. This ensures that even if stored data is corrupted, the setter writes a clean merged object.

### Pattern 5: getComputedTargets()

```typescript
// Source: D-08 decision — null guard then delegation to Phase 1 functions
getComputedTargets(): { tdee: number; macros: MacroGrams } | null {
  const profile = SettingsService.getUserProfile();
  const guidelineId = SettingsService.getActiveGuidelineId();

  if (!profile || !guidelineId) return null;

  const guideline = GUIDELINE_MAP.get(guidelineId);
  if (!guideline) return null;

  const { tdee } = calculateBMRResult(
    profile.ageYears,
    profile.sex,
    profile.heightCm,
    profile.weightKg,
    profile.activityLevelId,
  );

  const macros = calculateMacroGrams(tdee, guideline);
  return { tdee, macros };
},
```

### Pattern 6: Plain Object Singleton Export

```typescript
// Source: src/lib/data-service.ts and src/lib/sheets-api.ts — established project pattern
export const SettingsService = {
  getUserProfile(): UserProfile | null { ... },
  getActiveGuidelineId(): string | null { ... },
  getSheetsConfig(): SheetsConfig | null { ... },
  getComputedTargets(): { tdee: number; macros: MacroGrams } | null { ... },
  saveUserProfile(profile: UserProfile): void { ... },
  saveActiveGuidelineId(id: string): void { ... },
  saveSheetsConfig(config: SheetsConfig): void { ... },
};
```

### Anti-Patterns to Avoid

- **Using `wellness_` prefix for the settings key:** DataService uses `wellness_` for transient cache. Settings are persistent configuration — use `"eat_manager_settings"` with no prefix (D-11).
- **Storing computed values (BMR, TDEE, macros):** D-03 locks this out. Never write computed values to localStorage.
- **Mutating the default object directly:** The `defaultSettings()` function must return a new object each call, not a shared constant.
- **Calling `localStorage` directly in getters/setters:** All localStorage access must go through `readRaw`/`writeRaw` so error handling is centralized.
- **Using `export default`:** Data modules and service modules use named exports; default exports are only for page components.
- **Using the `@/*` path alias:** CLAUDE.md documents that the alias is configured but NOT used in practice. Use relative paths.
- **Unused imports:** `noUnusedLocals: true` will cause `tsc -b` to fail if any imported Phase 1 symbol is not referenced.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| BMR + TDEE computation | Custom formula | `calculateBMRResult()` from `src/data/bmr.ts` | Already tested, reference value 1648.75 verified |
| Macro gram calculation | Custom math | `calculateMacroGrams()` from `src/data/dietary-guidelines.ts` | Already tested with known examples |
| Guideline lookup by ID | Custom search | `GUIDELINE_MAP.get(id)` from `src/data/dietary-guidelines.ts` | O(1) Map already exists |
| Schema migration logic | Complex recursive merge | Simple switch/case inline function | Single-user app; one field evolves at a time |
| Type definitions for `UserProfile`, `MacroGrams`, etc. | Redeclare inline | Import from `src/data/types.ts` | Already defined in Phase 1 |

**Key insight:** This phase assembles Phase 1 building blocks behind a storage interface. It writes almost no new computation logic — only composition and persistence.

---

## Common Pitfalls

### Pitfall 1: Circular Import Risk

**What goes wrong:** If `AppSettings` type is placed in `src/data/types.ts`, and `settings-service.ts` imports it from there, the import chain becomes: `types.ts` → (no problem, it has no imports). But if Phase 3 or Phase 4 also imports both `types.ts` and `settings-service.ts`, a circular chain could emerge if `types.ts` is ever made to import from `settings-service.ts`.

**Why it happens:** `types.ts` is the shared data-model module; adding a service-layer schema concern to it blurs the layer boundary.

**How to avoid:** Define `AppSettings` and `SheetsConfig` interfaces directly in `settings-service.ts` and export them from there. Other modules that need these types import from `settings-service.ts`, not from `types.ts`. `types.ts` stays as a pure data-model file.

**Warning signs:** If a future file needs to `import type { AppSettings }` and the natural place seems to be `types.ts`, the layer boundary has been violated.

---

### Pitfall 2: Silent `tsc -b` Failures from Unused Imports

**What goes wrong:** Importing `BMRResult` or `MacroRatios` for documentation purposes when they are not actually referenced in function signatures causes `tsc -b` to fail with `noUnusedLocals: true`.

**Why it happens:** Strict tsconfig enforces this. Phase 1 had this same constraint.

**How to avoid:** Only import types and functions that are directly referenced in the file body. Use `import type` for any type that appears only in annotations.

**Warning signs:** `tsc -b` errors like "TS6133: 'BMRResult' is declared but its value is never read."

---

### Pitfall 3: Migration Function Returns Stale Reference

**What goes wrong:** If `migrate()` returns the same object reference it received (rather than a copy), subsequent mutations during merge operations will corrupt the "old" data.

**Why it happens:** In the `case 1: break` path it is tempting to `return data` directly. If `data` is a reference to the raw parsed object and the caller then spreads it with `{ ...current, userProfile: profile }`, the spread creates a new top-level object but does not deep-clone nested objects. For `settings_version: 1` this is safe because `userProfile`, `sheetsConfig` are replaced wholesale, not mutated in-place.

**How to avoid:** In the `case 1: break` path, `return data` is correct because setters always do `{ ...current, field: newValue }` which creates a new top-level object. No deep clone needed. Document this assumption in a comment.

**Warning signs:** Getter returns stale data after a setter call without page reload.

---

### Pitfall 4: `getComputedTargets()` Returning Stale Values

**What goes wrong:** If a component caches the result of `getComputedTargets()` in React state and the user later updates their profile, the displayed values are stale.

**Why it happens:** `getComputedTargets()` is synchronous and pure — it reads from localStorage each call. Stale data only occurs in the UI layer if the component does not re-call `getComputedTargets()` after a save.

**How to avoid:** This is a Phase 4 UI concern, not a Phase 2 service concern. Document in the service that callers must re-invoke `getComputedTargets()` after any `save*()` call to get fresh values. The `storage` event approach flagged in STATE.md blockers is the Phase 4 solution.

**Warning signs:** Settings page shows old macro targets after changing activity level.

---

## Code Examples

### AppSettings Interface Definition

```typescript
// Source: D-02 decision — exact shape locked
/** 使用者設定儲存結構。儲存於 localStorage key "eat_manager_settings" */
export interface SheetsConfig {
  gasUrl: string;
  sheetId: string;
}

/** 應用程式設定根物件 */
export interface AppSettings {
  /** 結構版本號，用於 schema migration。目前版本為 1 */
  settings_version: number;
  /** 使用者基本資料（BMR 計算用），未設定為 null */
  userProfile: UserProfile | null;
  /** 選用的飲食指南 ID，未設定為 null */
  activeGuidelineId: string | null;
  /** Google Sheets 連接設定，未設定為 null */
  sheetsConfig: SheetsConfig | null;
}
```

### Full Internal Load Helper

```typescript
// Source: synthesized from D-05, D-06 decisions and cacheGet pattern
function loadSettings(): AppSettings {
  const raw = readRaw();
  if (raw === null) return defaultSettings();
  return migrate(raw);
}
```

### Setter Merge Pattern

```typescript
// Source: D-09 decision — partial update with atomic write
saveUserProfile(profile: UserProfile): void {
  const current = loadSettings();
  writeRaw({ ...current, userProfile: profile });
},
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Multiple localStorage keys per concern | Single versioned JSON blob | Migration is table-driven, all settings move atomically |
| Storing computed values | Compute on demand | No stale-cache bugs when inputs change |

---

## Open Questions

1. **Should `SheetsConfig` type live in `settings-service.ts` or `types.ts`?**
   - What we know: `SheetsConfig` is only used by `SettingsService` and eventually by `SheetsAPI` (Phase 3). `UserProfile` (in `types.ts`) is used by many modules.
   - What's unclear: Whether Phase 3's `SheetsAPI` patch should import the type from `settings-service.ts` or from `types.ts`.
   - Recommendation: Define `SheetsConfig` in `settings-service.ts`. Phase 3 imports both the service (to call `getSheetsConfig()`) and the type (for its own function signatures) from `settings-service.ts`. This keeps the type co-located with its only author.

2. **File-level comment style: should `AppSettings` get full JSDoc or inline comments?**
   - What we know: CLAUDE.md says JSDoc `/** */` on exported types and key functions. `settings-service.ts` will export `AppSettings` and `SheetsConfig`.
   - Recommendation: Use `/** zh-TW description */` JSDoc on both exported interfaces and all exported service methods. Internal helpers (`readRaw`, `writeRaw`, `migrate`, `defaultSettings`, `loadSettings`) get short inline `//` comments.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this phase is pure TypeScript file authoring using only browser-native `localStorage` and already-installed project dependencies).

---

## Sources

### Primary (HIGH confidence)

- `src/lib/data-service.ts` — localStorage pattern, cacheGet/cacheSet, CACHE_PREFIX convention, DataService singleton shape
- `src/lib/sheets-api.ts` — SheetsAPI singleton export pattern
- `src/data/types.ts` — `UserProfile`, `ActivityLevelId`, `BMRResult`, `MacroRatios`, `MacroGrams`, `GuidelinePreset` type definitions (verified present)
- `src/data/bmr.ts` — `calculateBMRResult()` signature and behavior (verified present)
- `src/data/dietary-guidelines.ts` — `GUIDELINES`, `GUIDELINE_MAP`, `calculateMacroGrams()` (verified present)
- `CLAUDE.md` — naming conventions, module design rules, TypeScript config constraints
- `.planning/phases/02-settings-persistence-layer/02-CONTEXT.md` — all decisions D-01 through D-11

### Secondary (MEDIUM confidence)

- `.planning/REQUIREMENTS.md` §SET-02, §SET-03 — requirements text confirmed
- `.planning/STATE.md` — roadmap decisions and accumulated context

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all tools already in repo
- Architecture: HIGH — all patterns verified directly from existing source files
- Pitfalls: HIGH — derived from TypeScript strict config (verified in tsconfig), existing code conventions, and locked decisions

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable — no external dependencies or ecosystem churn risk)
