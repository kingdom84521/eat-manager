# Phase 2: Settings Persistence Layer - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

SettingsService singleton with versioned localStorage schema — reads and writes user settings synchronously, callable by any module before the UI exists. No UI, no React components, no page routes. This is a pure service layer that Phase 3 (SheetsAPI patch) and Phase 4 (Settings UI) will consume.

</domain>

<decisions>
## Implementation Decisions

### Settings Schema Structure
- **D-01:** Single localStorage key storing one JSON object with all settings. Not multiple keys per concern.
- **D-02:** Top-level shape: `{ settings_version: number, userProfile: UserProfile | null, activeGuidelineId: string | null, sheetsConfig: { gasUrl: string, sheetId: string } | null }`.
- **D-03:** Derived values (BMR, TDEE, macro grams) are NEVER stored — computed on demand from `userProfile` + `activeGuidelineId` via `getComputedTargets()`. This is a locked decision from roadmap planning (STATE.md).

### Schema Versioning & Migration
- **D-04:** `settings_version: 1` field in root of the settings object.
- **D-05:** Inline migration function with switch/case from version N to N+1, executed on every read. Simple approach appropriate for single-user app.
- **D-06:** If stored data has no version field (version 0 / corrupted), treat as fresh start — return defaults rather than attempting to salvage.

### API Surface Design
- **D-07:** Granular typed getters: `getUserProfile()`, `getActiveGuidelineId()`, `getSheetsConfig()`, `getComputedTargets()`.
- **D-08:** `getComputedTargets()` returns `null` when no profile or no guideline is saved; returns `{ tdee, macros: MacroGrams }` when both are present. Imports from Phase 1 modules (`calculateBMRResult`, `calculateMacroGrams`, `GUIDELINES`).
- **D-09:** Write via partial update methods: `saveUserProfile(profile)`, `saveActiveGuidelineId(id)`, `saveSheetsConfig(config)`. Each merges into existing blob and writes atomically.
- **D-10:** Export as plain object singleton: `export const SettingsService = { ... }` — matches `DataService` and `SheetsAPI` patterns.

### Storage Namespace
- **D-11:** Dedicated localStorage key `"eat_manager_settings"` — separate from the existing `wellness_` cache prefix used by DataService. Settings are not transient cache data.

### Claude's Discretion
- Internal helper naming (e.g., `readRaw()`, `writeRaw()` for localStorage access)
- Whether to co-locate the settings type definition in `types.ts` or in the service file
- Error handling strategy for corrupted localStorage data (within the "return defaults" constraint of D-06)
- File placement: `src/lib/settings-service.ts` following existing kebab-case lib convention, or alternative if better justified

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Service Patterns
- `src/lib/data-service.ts` — Reference for singleton service pattern, `cacheGet`/`cacheSet` helpers, localStorage conventions
- `src/lib/sheets-api.ts` — Reference for how SheetsAPI singleton is exported; Phase 3 will patch this to read from SettingsService

### Phase 1 Data Modules (dependencies)
- `src/data/types.ts` — `UserProfile`, `ActivityLevelId`, `BMRResult`, `MacroRatios`, `MacroGrams`, `GuidelinePreset` type definitions
- `src/data/bmr.ts` — `calculateBMRResult()`, `getActivityMultiplier()` functions that `getComputedTargets()` will import
- `src/data/dietary-guidelines.ts` — `GUIDELINES` catalog and `calculateMacroGrams()` that `getComputedTargets()` will import

### Requirements
- `.planning/REQUIREMENTS.md` §SET-02, §SET-03 — Settings persistence and versioned schema requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `cacheGet<T>()` / `cacheSet()` in `data-service.ts`: Pattern reference for localStorage read/write with try/catch. SettingsService can use a similar approach but with its own key.
- `UserProfile` interface already defined in `types.ts` with all needed fields (ageYears, sex, heightCm, weightKg, activityLevelId).
- `calculateBMRResult()` and `calculateMacroGrams()` from Phase 1 — ready to import for `getComputedTargets()`.

### Established Patterns
- Service singletons exported as plain objects (`DataService`, `SheetsAPI`)
- Library files in `src/lib/` use kebab-case naming
- localStorage access wrapped in try/catch with silent fallback
- Type definitions in `src/data/types.ts` with JSDoc comments in Traditional Chinese

### Integration Points
- Phase 3 will import `SettingsService.getSheetsConfig()` to resolve GAS URL at call time
- Phase 4 will import all getters/setters plus `getComputedTargets()` for the settings page UI
- `NutritionTracker.tsx` and `WeightLog.tsx` will eventually read from `getComputedTargets()` (Phase 4 work)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-settings-persistence-layer*
*Context gathered: 2026-03-29*
