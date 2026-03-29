# Phase 1: Static Data Foundation - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Pure BMR calculation functions and dietary guideline catalog as tested, importable TypeScript modules. No I/O, no side effects, no UI, no localStorage. These are leaf modules that downstream phases import.

</domain>

<decisions>
## Implementation Decisions

### BMR Formula
- **D-01:** Implement Mifflin-St Jeor formula only for v1. Harris-Benedict and Katch-McArdle are deferred to v2 (BMR-07, BMR-08 in REQUIREMENTS.md).
- **D-02:** Function signature: `calculateBMR(age, sex, heightCm, weightKg) → number` returning kcal/day as a raw number (not rounded).
- **D-03:** TDEE function: `calculateTDEE(bmr, activityLevel) → number` returning kcal/day rounded to nearest 10.
- **D-04:** Sex parameter uses `'male' | 'female'` string literal type. Non-binary handling deferred to v2.

### Activity Levels
- **D-05:** Standard 5-level scale: Sedentary (1.2), Lightly Active (1.375), Moderately Active (1.55), Very Active (1.725), Extra Active (1.9).
- **D-06:** Activity levels defined as a typed array/enum with label (zh-TW), multiplier, and description.

### Dietary Guidelines
- **D-07:** Exactly 3 presets: Taiwan HPA DRI, USDA AMDR, Japan MHLW DRI.
- **D-08:** Each preset stores single mid-range percentage per macro (not min/max ranges). Simpler for users.
- **D-09:** Each preset includes: `id`, `name` (zh-TW), `authority` (zh-TW), `sourceUrl`, `year`, `macroRatios` (protein/fat/carb percentages summing to 100%).
- **D-10:** Include a `calculateMacroGrams(tdee, guidelinePreset) → { protein, fat, carb }` function that converts percentages to grams using standard kcal-per-gram (protein=4, fat=9, carb=4).

### Unit System
- **D-11:** Metric only (cm, kg). No imperial support in v1. Target audience is Taiwan (metric country).

### Claude's Discretion
- File organization within `src/data/` — follow existing patterns (types in `types.ts` or co-located)
- Whether to use a single file or split into `bmr.ts` and `dietary-guidelines.ts`
- TypeScript interface naming conventions — follow existing codebase patterns
- Whether to export individual functions or a namespace object

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Data Layer Patterns
- `src/data/types.ts` — Existing type definitions, follow naming and export patterns
- `src/data/foods.ts` — Reference for how static data catalogs are structured (arrays + Maps)
- `src/data/remedies.ts` — Another data catalog example
- `src/data/resolver.ts` — Adapter pattern for cross-type resolution

### Research
- `.planning/research/STACK.md` — BMR formula details, guideline source data, zero-dependency recommendation
- `.planning/research/FEATURES.md` — Specific guideline percentage values from official sources
- `.planning/research/PITFALLS.md` — BMR constant errors to avoid, unit normalization requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/data/types.ts`: Existing type definition patterns — new BMR/guideline types should follow same conventions
- `src/data/foods.ts` and `src/data/remedies.ts`: Static data catalog pattern with typed arrays and `Map<string, T>` lookup

### Established Patterns
- Data files export both raw arrays and pre-built Maps for O(1) lookup
- Types defined with explicit interfaces (not inferred)
- No external validation libraries — plain TypeScript types
- Files in `src/data/` are pure leaf modules with no I/O dependencies

### Integration Points
- New modules will be imported by Phase 2's SettingsService and Phase 4's Settings page
- Type exports must be clean for consumption by downstream phases

</code_context>

<specifics>
## Specific Ideas

- BMR reference test value: 30yo male, 70kg, 175cm → Mifflin-St Jeor = 1673.75 kcal (from published literature)
- Taiwan HPA DRI: ~12% protein / 25% fat / 63% carbs (provisional — official PDF in Chinese)
- USDA AMDR mid-range: ~20% protein / 30% fat / 50% carbs
- Japan MHLW DRI mid-range: ~16% protein / 25% fat / 59% carbs
- All guideline labels in Traditional Chinese (e.g., "台灣衛福部 DRI", "美國 USDA AMDR", "日本厚生勞動省 DRI")

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-static-data-foundation*
*Context gathered: 2026-03-29*
