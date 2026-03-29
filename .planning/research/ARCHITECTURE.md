# Architecture Patterns

**Domain:** Offline-first React SPA — Settings & Nutrition Configuration integration
**Researched:** 2026-03-29

---

## Context: Existing Architecture Snapshot

Before recommending integration patterns, the current system has these fixed constraints:

- `SheetsAPI` (`src/lib/sheets-api.ts`) reads `VITE_GAS_URL` at module load via `import.meta.env` — a build-time constant, not runtime-configurable today
- `DataService` (`src/lib/data-service.ts`) calls `SheetsAPI` directly as a module-level import — no injection point exists for a different URL
- Pages call `DataService` methods directly; no shared state or context sits between them
- `App.tsx` owns routing and the bottom nav only — no app-level state whatsoever
- `localStorage` key prefix is `wellness_` — settings must use a distinct prefix to avoid namespace collision

---

## Recommended Architecture

### Overview

Three new modules integrate cleanly with the existing layered structure without breaking any current code paths:

```
src/
  data/
    dietary-guidelines.ts   ← static reference data (leaf, no deps)
    bmr.ts                  ← pure calculation functions (leaf, no deps)
  lib/
    settings-service.ts     ← settings CRUD (localStorage, optional Sheets sync)
    sheets-api.ts           ← MODIFIED: read GAS_URL from runtime config, not only env
  pages/
    Settings.tsx            ← new page, reads/writes via SettingsService
  App.tsx                   ← MODIFIED: add /settings route + nav tab
```

`DataService` continues to use `SheetsAPI` but `SheetsAPI` checks runtime settings first, falling back to env vars. No existing page is touched.

---

## Component Boundaries

| Component | Responsibility | Reads From | Writes To |
|-----------|---------------|------------|-----------|
| `src/data/bmr.ts` | Pure BMR formula calculations (Mifflin-St Jeor, Harris-Benedict). No I/O. Returns `{ bmr, tdee, macros }` given user inputs. | — (pure functions) | — (pure functions) |
| `src/data/dietary-guidelines.ts` | Static catalog of guideline presets (TW, US, WHO). Each preset defines macro ratio percentages and cites source. Hardcoded TypeScript, same pattern as `foods.ts`. | — (hardcoded static data) | — |
| `src/lib/settings-service.ts` | CRUD for all user settings: BMR inputs, active guideline preset, runtime Sheets config (GAS URL + Sheet ID). Mirrors `DataService` pattern: localStorage primary, optional async Sheets sync. | `localStorage` (key prefix `settings_`) | `localStorage`, optionally Sheets |
| `src/lib/sheets-api.ts` (modified) | Low-level HTTP client — same as today but reads GAS_URL at call time from `SettingsService`, falling back to `import.meta.env.VITE_GAS_URL`. | `SettingsService.getConnectionConfig()` at call time | — |
| `src/pages/Settings.tsx` | Single page: BMR form, guideline preset selector, Sheets connection config form. All I/O via `SettingsService`. | `SettingsService`, `GUIDELINES`, `calculateBMR()` | `SettingsService` |
| `src/App.tsx` (modified) | Add `/settings` route and nav tab. No state changes. | — | — |

**What does NOT change:** `DataService`, `DailyPlan`, `NutritionTracker`, `SupplementSchedule`, `WeightLog`, `resolver.ts`, all data catalogs.

---

## Data Flow

### Settings Write Path (user saves BMR profile or Sheets config)

```
Settings.tsx (form submit)
  → SettingsService.saveUserProfile({ age, gender, height, weight, activity })
    → localStorage.setItem("settings_profile", ...)  [immediate]
    → SheetsAPI.upsert("settings", ...)              [async, optional, fire-and-forget]
```

### Settings Read Path (page load)

```
Settings.tsx useEffect
  → SettingsService.getUserProfile()
    → localStorage.getItem("settings_profile")       [instant, returns null on first use]
  → SettingsService.getActiveGuideline()
    → localStorage.getItem("settings_guideline")     [instant, returns default preset key]
  → calculateBMR(profile) + GUIDELINES[activeKey]
    → derived values rendered in UI                  [pure, synchronous]
```

### Runtime Sheets Config Override (critical path)

```
SheetsAPI.gasGet() / gasPost()
  → SettingsService.getConnectionConfig()            [sync localStorage read]
    → returns { gasUrl, sheetId } | null
  → if null: fall back to import.meta.env.VITE_GAS_URL
  → construct URL and fetch
```

This means `SettingsService` must provide a **synchronous** config read. It reads only from `localStorage` — no async needed for this path. The async Sheets sync only happens on settings write.

### Derived Nutrition Targets (future integration point)

```
Any page that needs targets:
  → SettingsService.getComputedTargets()             [sync]
    → getUserProfile() + getActiveGuideline()
    → calculateBMR(profile) × guideline.macroRatios
    → returns { calories, proteinG, fatG, carbsG }
```

This function is computed on demand — no caching needed since it is pure derivation from localStorage data. NutritionTracker can call it when it needs targets (future milestone).

---

## Key Design Decisions

### Decision 1: SettingsService is synchronous for reads

`DataService` methods are all `async` because Sheets sync is interleaved. `SettingsService.get*()` methods should be **synchronous** for reads. Rationale: settings are always in localStorage (no remote-only source), and `SheetsAPI` needs to call `getConnectionConfig()` inside a sync context at call construction time. Async settings reads would force `SheetsAPI` to become async at the module level or use top-level await, both of which create initialization ordering problems.

Pattern: reads return `T | null` synchronously from localStorage. Writes are synchronous to localStorage, then fire async Sheets sync.

### Decision 2: SheetsAPI reads runtime config at call time, not module load time

Current code: `const GAS_URL = import.meta.env.VITE_GAS_URL` is evaluated once at module import. This must change to a function call inside `gasGet`/`gasPost` that reads from `SettingsService` each time. This enables the runtime override without any other code changes.

The fallback chain: `SettingsService.getConnectionConfig()?.gasUrl ?? import.meta.env.VITE_GAS_URL`. Env vars remain the default — existing deployments with `.env` continue working with no change required.

### Decision 3: Dietary guidelines are static TypeScript, not fetched data

Guidelines from TW MOHW, US DRI, and WHO are stable reference data that changes infrequently (annually at most). Hardcoding them in TypeScript matches the existing pattern for `foods.ts` and `remedies.ts`. No fetch, no cache invalidation, no offline concern. Each preset object includes: `key`, `name`, `source` (URL), `year`, `macroRatios: { proteinPct, fatPct, carbsPct }`, and `ranges` for each macro.

### Decision 4: BMR calculations are pure functions, no service needed

`calculateBMR(profile)` and `calculateTDEE(bmr, activityLevel)` are deterministic pure functions. They live in `src/data/bmr.ts` alongside the data layer (not in `src/lib/`) because they have no side effects and no I/O. The Settings page imports and calls them directly.

### Decision 5: No React Context needed

The existing app avoids global state intentionally. Settings access follows the same pattern: each component that needs settings calls `SettingsService` directly, just as pages call `DataService` directly. The Settings page is the only page that writes settings. Other pages only read (and only NutritionTracker needs targets — in a future milestone). No prop drilling required, no Context overhead.

---

## Suggested Build Order (Phase Dependencies)

These are ordered by dependency — each phase can only proceed once its prerequisites exist.

### Phase 1: Static foundation (no runtime deps)

Build `src/data/bmr.ts` and `src/data/dietary-guidelines.ts` first. These are pure data/functions with zero dependencies. Unit-testable in isolation.

**Produces:** `calculateBMR()`, `calculateTDEE()`, `GUIDELINES`, `GuidlinePreset` type

### Phase 2: SettingsService (depends on Phase 1 types)

Build `src/lib/settings-service.ts`. Reads/writes `localStorage` with key prefix `settings_`. Exposes:
- `getUserProfile(): UserProfile | null` (sync)
- `saveUserProfile(p: UserProfile): void`
- `getActiveGuideline(): string` (returns preset key, sync)
- `setActiveGuideline(key: string): void`
- `getConnectionConfig(): ConnectionConfig | null` (sync)
- `saveConnectionConfig(c: ConnectionConfig): void`
- `getComputedTargets(): NutritionTargets | null` (sync, derived, returns null if no profile)

No Sheets sync in Phase 2 — add optional sync in Phase 3 or later.

**Produces:** `SettingsService` singleton

### Phase 3: Patch SheetsAPI runtime config (depends on Phase 2)

Modify `src/lib/sheets-api.ts`: move `GAS_URL` resolution from module-level constant to inside `gasGet`/`gasPost`, reading `SettingsService.getConnectionConfig()` with env fallback. Verify existing pages still work (no behavior change when settings are null).

**Produces:** Runtime-configurable Sheets connection

### Phase 4: Settings page (depends on Phases 1–3)

Build `src/pages/Settings.tsx` and update `src/App.tsx` to add `/settings` route and nav tab. The page uses `SettingsService` (Phase 2) and pure functions (Phase 1). The Sheets config form exercises Phase 3.

**Produces:** Usable settings UI, complete milestone deliverable

---

## File Change Impact Matrix

| File | Change Type | Risk |
|------|-------------|------|
| `src/data/bmr.ts` | New file | None — no consumers yet |
| `src/data/dietary-guidelines.ts` | New file | None — no consumers yet |
| `src/lib/settings-service.ts` | New file | None — no consumers yet |
| `src/lib/sheets-api.ts` | Modify — URL resolution only | Low — logic equivalent when settings null, existing tests/behavior unchanged |
| `src/pages/Settings.tsx` | New file | None |
| `src/App.tsx` | Modify — add route + nav entry | Low — additive only, no existing routes changed |

No existing page files are modified.

---

## LocalStorage Key Map (complete picture)

| Key | Owner | Format |
|-----|-------|--------|
| `wellness_foods` | DataService (existing) | `FoodItem[]` JSON |
| `wellness_remedies` | DataService (existing) | `(RemedyItem\|BehaviorItem)[]` JSON |
| `wellness_daily_plans_recent` | DataService (existing) | `DailyPlan[]` JSON |
| `wellness_nutrition_log_{date}` | DataService (existing) | `NutritionEntry[]` JSON |
| `wellness_weight_recent` | DataService (existing) | `WeightEntry[]` JSON |
| `settings_profile` | SettingsService (new) | `UserProfile` JSON |
| `settings_guideline` | SettingsService (new) | string (preset key) |
| `settings_connection` | SettingsService (new) | `ConnectionConfig` JSON |

The `settings_` prefix is distinct from `wellness_` — no collisions.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Module-level SheetsAPI URL read (already exists, must fix)

**What goes wrong:** `const GAS_URL = import.meta.env.VITE_GAS_URL` is evaluated once at import time. If SettingsService is read at that same time, circular import risk exists and runtime config isn't yet available.

**Prevention:** Move URL resolution to inside `gasGet`/`gasPost` function bodies. Read `SettingsService` lazily (at call time, not import time).

### Anti-Pattern 2: Async settings reads in the SheetsAPI hot path

**What goes wrong:** If `getConnectionConfig()` returns a Promise, `gasGet` must await it, making every single Sheets call incur a microtask. Worse, it requires top-level await or initialization guards.

**Prevention:** Settings reads are always synchronous — localStorage reads are synchronous in browsers. No async needed for the get path.

### Anti-Pattern 3: React Context for settings

**What goes wrong:** Adding a SettingsContext forces `App.tsx` to become stateful, requires Provider wrapping, and adds re-render coupling across all pages whenever settings change.

**Prevention:** Settings change infrequently (only when user explicitly saves in the Settings page). Direct `SettingsService` calls per-component follow the same pattern as `DataService` and have negligible overhead.

### Anti-Pattern 4: Storing computed BMR/targets in localStorage

**What goes wrong:** Derived values (TDEE, macro gram targets) become stale when the source inputs change. Double storage creates sync bugs.

**Prevention:** Always derive on demand from stored inputs. `getComputedTargets()` is a pure computation over stored `UserProfile` + active guideline preset, called at render time.

---

## Scalability Considerations

| Concern | Current | After This Milestone |
|---------|---------|---------------------|
| localStorage size | Small (meal plans, weight log) | Negligible addition (settings JSON is <1KB) |
| SheetsAPI coupling | All callers use same hardcoded URL | URL resolved at call time; callers unchanged |
| New pages | 4 routes | 5 routes — additive, no restructuring |
| Future macro targets in NutritionTracker | No mechanism | `SettingsService.getComputedTargets()` ready to call |

---

## Sources

- Existing codebase analysis: `src/lib/sheets-api.ts`, `src/lib/data-service.ts`, `src/App.tsx`, `src/data/types.ts`
- Architecture baseline: `.planning/codebase/ARCHITECTURE.md` (2026-03-29)
- Project requirements: `.planning/PROJECT.md` (2026-03-29)
- Confidence: HIGH — all recommendations derived directly from reading the existing source files; no external research required for integration architecture decisions
