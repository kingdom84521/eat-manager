# Technology Stack — Settings & BMR Milestone

**Project:** eat-manager (Settings / BMR / Dietary Guidelines)
**Researched:** 2026-03-29
**Scope:** Additive libraries and patterns only. Existing stack (React 19, Vite 6, Tailwind v4, TypeScript ~5.8, React Router 7) is fixed and not re-evaluated here.

---

## Summary Recommendation

**No new runtime dependencies are needed.** All four feature areas (BMR calculation, dietary guidelines data, settings UI, runtime Sheets config) can be implemented with zero new npm packages. The formulas are simple arithmetic, the guidelines are static typed data, form handling exists in native React, and localStorage is a browser API. Adding libraries for these would increase bundle size with no architectural benefit for a single-user SPA.

That said, one optional dependency — `react-hook-form` — is conditionally recommended if form validation complexity turns out to be high during implementation. The decision is deferred to Phase 4 (Settings UI) where the actual complexity will be visible.

---

## Feature Area 1: BMR Calculation

### Decision: Hand-roll the formulas (no library)

**Rationale:** Every BMR npm library found (`@lukaswhite/bmr`, `iifym.js`) is unmaintained or has minimal adoption. The formulas themselves are 1-3 lines of arithmetic each. Adding a dependency to avoid writing five lines of math is net-negative for this project.

**Formulas to implement** (`src/data/bmr.ts`):

| Formula | Males | Females | Notes |
|---------|-------|---------|-------|
| Mifflin-St Jeor (1990) | `10W + 6.25H - 5A + 5` | `10W + 6.25H - 5A - 161` | Most accurate for general population per academic review. **Use as primary.** |
| Harris-Benedict (revised 1984) | `13.397W + 4.799H - 5.677A + 88.362` | `9.247W + 3.098H - 4.330A + 447.593` | Older, slightly less accurate than Mifflin-St Jeor. Include as secondary preset. |

Where W = weight in kg, H = height in cm, A = age in years.

**TDEE multipliers** (Harris-Benedict activity factors, universally reused):

| Activity Level | Multiplier |
|---------------|------------|
| Sedentary (little/no exercise) | 1.2 |
| Lightly active (1-3 days/week) | 1.375 |
| Moderately active (3-5 days/week) | 1.55 |
| Very active (6-7 days/week) | 1.725 |
| Extra active (physical job + training) | 1.9 |

**TypeScript interface:**

```typescript
interface UserProfile {
  age: number;         // years
  gender: 'male' | 'female';
  heightCm: number;
  weightKg: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';
  formula?: 'mifflin' | 'harris';  // defaults to 'mifflin'
}

interface BMRResult {
  bmr: number;   // kcal/day at rest
  tdee: number;  // kcal/day with activity
}
```

**Confidence:** HIGH — formulas sourced from peer-reviewed literature (Mifflin & St Jeor 1990, PMC7478086 comparing formula accuracy). No library version risk.

---

## Feature Area 2: Dietary Guidelines Data

### Decision: Static hardcoded TypeScript objects (no external data source)

**Rationale:** No country publishes a machine-readable JSON API for dietary guidelines. The data changes at most every 5 years. Hardcoding in TypeScript follows the exact same pattern already used by `foods.ts` and `remedies.ts` in this codebase. No fetch, no cache invalidation, no offline concern.

**Three guideline presets to implement** (`src/data/dietary-guidelines.ts`):

#### Preset 1: Taiwan MOHW / HPA (DRI 8th Edition)

| Macro | Range | Notes |
|-------|-------|-------|
| Carbohydrates | 50–65% of total energy | Consistent with AMDR from HPA 8th edition |
| Fat | 20–30% of total energy | |
| Protein | 10–20% of total energy | |

- Source: Taiwan Health Promotion Administration (衛生福利部國民健康署), DRI 8th Edition
- URL: `https://www.hpa.gov.tw/Pages/Detail.aspx?nodeid=4248&pid=12285`
- Year: 2011 (8th edition), protein/lipid chapter revised 2019
- Confidence: MEDIUM — percentage ranges obtained indirectly via academic synthesis. Official PDF is Chinese-language. The 50-65/20-30/10-20 split appears consistently across multiple Taiwan nutrition sources.

#### Preset 2: US DRI / USDA (Dietary Guidelines for Americans 2025–2030)

| Macro | Range | Notes |
|-------|-------|-------|
| Carbohydrates | 45–65% of total energy | AMDR — unchanged across multiple DGA editions |
| Fat | 20–35% of total energy | |
| Protein | 10–35% of total energy | |

- Source: USDA Dietary Guidelines for Americans 2025–2030
- URL: `https://www.dietaryguidelines.gov/`
- Year: 2025 (updated from 2020–2025)
- Confidence: HIGH — AMDR figures explicitly stated in official USDA documentation and confirmed by multiple secondary sources.

#### Preset 3: WHO/FAO (Technical Report Series 916)

| Macro | Range | Notes |
|-------|-------|-------|
| Carbohydrates | 55–75% of total energy | Bulk of energy; free sugars <10% |
| Fat | 15–30% of total energy | Saturated fat <10% |
| Protein | 10–15% of total energy | |

- Source: WHO/FAO Joint Expert Consultation, "Diet, Nutrition and the Prevention of Chronic Diseases"
- URL: `https://www.who.int/publications/i/item/924120916X`
- Year: 2003 (still the primary WHO reference; WHO 2020 healthy diet guidelines align with these ranges)
- Confidence: HIGH — figures from official WHO press release and referenced across dozens of peer-reviewed sources.

**TypeScript interface:**

```typescript
interface MacroRange {
  min: number;  // % of total energy
  max: number;
}

interface GuidelinePreset {
  key: string;
  name: string;          // Display name (zh-TW)
  source: string;        // Organization name
  sourceUrl: string;     // Citable URL
  year: number;
  macroRatios: {
    carbs: MacroRange;
    fat: MacroRange;
    protein: MacroRange;
  };
}
```

**Why not Japan DRI as a fourth preset?**

Japan's 2020 DRI (protein 13-20%, fat 20-30%, carbs 50-65%) is nearly identical to Taiwan's 8th edition. Adding it provides minimal differentiation for the user. If a fourth preset is desired later, Japan DRI 2020 (MHLW) is well-documented and trivial to add.

---

## Feature Area 3: Settings / Configuration UI

### Decision: Native React state + controlled components (no form library for now)

**Rationale:** The Settings page will have approximately 6-7 form fields (age, gender, height, weight, activity level, guideline preset, two text inputs for GAS URL + Sheet ID). This is well within the range where a custom `useLocalStorage` hook plus controlled `<input>` / `<select>` elements is simpler than introducing a form library. The project has no existing form library and no existing tests; adding `react-hook-form` now adds ~45KB (gzipped ~13KB) for a form with minimal validation logic.

**Pattern to use:**

```typescript
// Custom hook — no library needed
function useSettings() {
  const [profile, setProfile] = useState<UserProfile | null>(
    () => SettingsService.getUserProfile()
  );
  // ... etc
}
```

State is initialized from localStorage via a lazy initializer (avoids a useEffect flash). Saves are triggered on explicit submit, not on every keystroke.

**Conditional upgrade path:** If the form grows beyond the initial scope (e.g., detailed macro overrides, multiple profiles), `react-hook-form` v7.72.0 with `zod` v4.3.6 and `@hookform/resolvers` v5.2.2 is the established pattern for TypeScript React forms. Add only then.

```bash
# Only if form complexity justifies it:
npm install react-hook-form zod @hookform/resolvers
```

**Validation rules (to implement natively):**

| Field | Constraint |
|-------|------------|
| Age | Integer, 10–120 |
| Height | 50–300 cm |
| Weight | 10–500 kg |
| GAS URL | Must start with `https://script.google.com` |
| Sheet ID | Non-empty string, no validation beyond that |

**Confidence:** HIGH — native React pattern, no external dependency risk.

---

## Feature Area 4: Runtime Google Sheets Configuration

### Decision: localStorage-backed config read synchronously at call time in SheetsAPI

**Rationale:** This is purely an architectural change to `src/lib/sheets-api.ts`, not a new library. The pattern is well-established for SPAs: user-configurable values are stored in localStorage and read at the point of use rather than at module initialization. No runtime config file, no window globals, no build-step injection.

**Implementation pattern:**

```typescript
// In sheets-api.ts — move from module-level const to function-level read:
function getGasUrl(): string {
  return SettingsService.getConnectionConfig()?.gasUrl
    ?? import.meta.env.VITE_GAS_URL;
}
```

This approach:
- Requires zero new dependencies
- Is synchronous (localStorage reads are sync — no await needed)
- Preserves full backward compatibility (env vars still work as default)
- Works offline (localStorage available without network)

**What NOT to use:**

| Approach | Why Not |
|----------|---------|
| `window.__ENV__` injection | Requires build-step modification or a served config file — not compatible with static GitHub Pages |
| Runtime `/config.json` fetch | Async initialization makes it unusable in SheetsAPI's sync context; adds network dependency |
| `react-env` or `runtime-env-cra` packages | Designed for CRA/server-rendered apps, incompatible with pure static Vite + GitHub Pages |
| React Context for config | Overkill — SheetsAPI is not a React component; Context requires being inside the component tree |

**Confidence:** HIGH — derived directly from reading the existing `sheets-api.ts` module structure.

---

## Complete Dependency Delta

**New runtime dependencies: 0**

All functionality implemented with:
- TypeScript pure functions (BMR formulas)
- TypeScript static data objects (guidelines)
- Native React hooks and controlled components (settings form)
- Browser `localStorage` API (persistence)
- Existing `DataService` / `SheetsAPI` pattern (Sheets sync)

**Optional future dependencies (add only if needed):**

| Package | Version | Purpose | Trigger |
|---------|---------|---------|---------|
| `react-hook-form` | ^7.72.0 | Form state + validation | Settings form grows beyond 10 fields or needs cross-field validation |
| `zod` | ^4.3.6 | Schema validation + TypeScript inference | If react-hook-form is added |
| `@hookform/resolvers` | ^5.2.2 | Connects zod resolver to react-hook-form | If both above are added |

---

## What to Explicitly Not Add

| Package | Reason |
|---------|--------|
| `@lukaswhite/bmr` | Unmaintained (no recent npm activity), adds a dependency for 3 lines of arithmetic |
| `iifym.js` | Bower-era package, no TypeScript types, no recent activity |
| Any dietary guidelines npm package | None exist with sufficient data quality or maintenance |
| `usehooks-ts` | `useLocalStorage` hook is a single file; copying it or writing it inline avoids a 3.1.1 dep for one hook |
| `react-hook-form-persist` | Single-author package, low activity; native localStorage + useState pattern is simpler here |

---

## Sources

- BMR formula accuracy: [PMC7478086 — Predicting Equations and Resting Energy Expenditure](https://pmc.ncbi.nlm.nih.gov/articles/PMC7478086/)
- WHO macronutrient recommendations: [WHO/FAO TRS 916 announcement](https://www.who.int/news/item/23-04-2003-fao-who-launch-expert-report-on-diet-nutrition-and-prevention-of-chronic-diseases)
- USDA AMDR: [Dietary Guidelines for Americans 2020-2025 (PDF)](https://www.dietaryguidelines.gov/sites/default/files/2020-12/Dietary_Guidelines_for_Americans_2020-2025.pdf)
- Taiwan HPA DRI 8th Edition: [HPA English page](https://www.hpa.gov.tw/EngPages/Detail.aspx?nodeid=1050&pid=13117) / [HPA Chinese (DRI 8th)](https://www.hpa.gov.tw/Pages/Detail.aspx?nodeid=4248&pid=12285)
- Japan DRI 2020 (reference, not used): [MHLW PDF](https://www.mhlw.go.jp/content/001151422.pdf)
- react-hook-form v7.72.0: [npm](https://www.npmjs.com/package/react-hook-form) (last published 7 days ago as of 2026-03-29)
- zod v4.3.6: [npm](https://www.npmjs.com/package/zod) (last published 2 months ago as of 2026-03-29)
- @hookform/resolvers v5.2.2: [npm](https://www.npmjs.com/package/@hookform/resolvers) (last published 6 months ago as of 2026-03-29)
- usehooks-ts v3.1.1: [npm](https://www.npmjs.com/package/usehooks-ts) (current version confirmed via `npm info`)
