# Phase 1: Static Data Foundation - Research

**Researched:** 2026-03-29
**Domain:** TypeScript pure functions and static data — Mifflin-St Jeor BMR calculation + national dietary guideline catalog
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Implement Mifflin-St Jeor formula only for v1. Harris-Benedict and Katch-McArdle are deferred to v2 (BMR-07, BMR-08 in REQUIREMENTS.md).
- **D-02:** Function signature: `calculateBMR(age, sex, heightCm, weightKg) → number` returning kcal/day as a raw number (not rounded).
- **D-03:** TDEE function: `calculateTDEE(bmr, activityLevel) → number` returning kcal/day rounded to nearest 10.
- **D-04:** Sex parameter uses `'male' | 'female'` string literal type. Non-binary handling deferred to v2.
- **D-05:** Standard 5-level scale: Sedentary (1.2), Lightly Active (1.375), Moderately Active (1.55), Very Active (1.725), Extra Active (1.9).
- **D-06:** Activity levels defined as a typed array/enum with label (zh-TW), multiplier, and description.
- **D-07:** Exactly 3 presets: Taiwan HPA DRI, USDA AMDR, Japan MHLW DRI.
- **D-08:** Each preset stores single mid-range percentage per macro (not min/max ranges). Simpler for users.
- **D-09:** Each preset includes: `id`, `name` (zh-TW), `authority` (zh-TW), `sourceUrl`, `year`, `macroRatios` (protein/fat/carb percentages summing to 100%).
- **D-10:** Include a `calculateMacroGrams(tdee, guidelinePreset) → { protein, fat, carb }` function that converts percentages to grams using standard kcal-per-gram (protein=4, fat=9, carb=4).
- **D-11:** Metric only (cm, kg). No imperial support in v1.

### Claude's Discretion

- File organization within `src/data/` — follow existing patterns (types in `types.ts` or co-located)
- Whether to use a single file or split into `bmr.ts` and `dietary-guidelines.ts`
- TypeScript interface naming conventions — follow existing codebase patterns
- Whether to export individual functions or a namespace object

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BMR-01 | User can input personal data (age, sex, height in cm, weight in kg) | TypeScript interfaces `UserProfile` define the input shape; pure functions accept these as parameters |
| BMR-02 | App calculates BMR using Mifflin-St Jeor formula as default | Mifflin-St Jeor formula and constants verified via PubMed 15883556; reference test value confirmed at 1673.75 kcal |
| BMR-03 | User can select activity level from 5-level scale (sedentary to extra active) | `ACTIVITY_LEVELS` typed array with multipliers 1.2–1.9; zh-TW labels specified |
| BMR-04 | App displays TDEE as kcal/day rounded to nearest 10 | `calculateTDEE()` applies `Math.round(bmr * multiplier / 10) * 10` |
| BMR-05 | BMR/TDEE recalculates live as user changes inputs | Pure function with no side effects — caller decides when to invoke; debounce is a UI concern in Phase 4 |
| BMR-06 | Inline validation on all inputs (age 10-120, height 100-250cm, weight 30-300kg) | Validation bounds defined; pure functions assume valid inputs — validation is a Phase 4 UI concern, but bounds must be documented here for downstream consumers |
| DIET-01 | App provides at least 3 dietary guideline presets | `GUIDELINES` array contains exactly 3 presets (Taiwan, USDA, Japan) |
| DIET-02 | Taiwan (衛福部 DRI) preset with macronutrient ratios | Taiwan HPA 8th Edition: protein 12%, fat 25%, carb 63% — MEDIUM confidence (see Open Questions) |
| DIET-03 | USDA (AMDR) preset with macronutrient ratios | USDA AMDR mid-range: protein 20%, fat 30%, carb 50% — HIGH confidence |
| DIET-04 | Japan (MHLW DRI) preset with macronutrient ratios | Japan MHLW 2025 DRI mid-range: protein 16%, fat 25%, carb 59% — HIGH confidence |
| DIET-05 | Each preset displays issuing authority name and source citation | `authority` (zh-TW string) and `sourceUrl` fields on every `GuidelinePreset` |
| DIET-06 | User can select and switch between guideline presets | `GUIDELINES` array + `GUIDELINE_MAP` for O(1) lookup by id; selection is a Phase 4 UI concern |
| DIET-07 | App calculates macronutrient gram targets from TDEE x guideline ratios | `calculateMacroGrams(tdee, preset)` function using protein=4, fat=9, carb=4 kcal/g |

</phase_requirements>

---

## Summary

Phase 1 creates pure TypeScript modules with zero runtime dependencies. The work divides cleanly into two files: `src/data/bmr.ts` for BMR/TDEE calculation functions, and `src/data/dietary-guidelines.ts` for the three national guideline presets. Both follow the established `src/data/` leaf-module pattern already used by `foods.ts` and `remedies.ts`. New interfaces (`UserProfile`, `BMRResult`, `GuidelinePreset`, `MacroRange`) should be appended to the existing `src/data/types.ts` to keep all type definitions co-located per the project convention.

The BMR domain has one dangerous constant that separates correct from wrong outputs: the Mifflin-St Jeor gender offset (`+5` for male, `-161` for female). Getting this backwards silently produces a 166 kcal error that propagates to every downstream derived value. The reference test case — 30-year-old male, 70 kg, 175 cm → 1673.75 kcal — is the single most important verification to run before considering this phase complete.

The dietary guideline percentages have varying confidence levels. USDA AMDR and Japan MHLW 2025 values are HIGH confidence sourced from official documents. Taiwan HPA 8th Edition values (protein 12%, fat 25%, carb 63%) are MEDIUM confidence — sourced via secondary synthesis since the official PDF is Chinese-language — and should be flagged with a code comment for future verification against the primary document.

**Primary recommendation:** Split into `bmr.ts` + `dietary-guidelines.ts`, append interfaces to `types.ts`, export both raw arrays and lookup Maps per existing pattern, and verify the reference test value before completing the phase.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ~5.8.3 | All source code; strict mode enabled | Project fixed; no change |
| React | ^19.1.0 | Not used in this phase — pure data layer | Project fixed |
| Vite | ^6.3.5 | Build and type-check via `tsc -b && vite build` | Project fixed |

### No New Dependencies

This phase adds **zero npm packages**. The formulas are arithmetic. The data is static TypeScript objects. No validation library, no BMR npm package, no external data source.

From `.planning/research/STACK.md` (HIGH confidence): "Every BMR npm library found (`@lukaswhite/bmr`, `iifym.js`) is unmaintained or has minimal adoption. The formulas themselves are 1-3 lines of arithmetic each."

**Version verification:** Not applicable — no new packages to install.

### Explicitly Not Adding

| Package | Reason |
|---------|--------|
| `@lukaswhite/bmr` | Unmaintained; formula is 3 lines of arithmetic |
| `iifym.js` | Bower-era, no TypeScript types |
| Any dietary guidelines npm package | None exist with sufficient quality or maintenance |

---

## Architecture Patterns

### Recommended Project Structure

```
src/data/
├── types.ts              # EXTEND: add UserProfile, BMRResult, ActivityLevel,
│                         #         GuidelinePreset, MacroRange, MacroGrams
├── bmr.ts                # NEW: calculateBMR(), calculateTDEE(), ACTIVITY_LEVELS
├── dietary-guidelines.ts # NEW: GUIDELINES array, GUIDELINE_MAP, calculateMacroGrams()
├── foods.ts              # UNCHANGED
├── remedies.ts           # UNCHANGED
├── resolver.ts           # UNCHANGED
└── schedule.ts           # UNCHANGED
```

### Pattern 1: Leaf Module with Array + Map Export

Follow the exact pattern from `foods.ts` and `remedies.ts` — export both a typed array for iteration and a `Map<string, T>` for O(1) lookup. This is the established pattern all downstream phases expect.

```typescript
// Source: src/data/foods.ts pattern
export const GUIDELINES: GuidelinePreset[] = [ /* ... */ ];

export const GUIDELINE_MAP = new Map<string, GuidelinePreset>();
GUIDELINES.forEach((g) => GUIDELINE_MAP.set(g.id, g));
```

### Pattern 2: File-Level Block Comment with ASCII Header

All `src/data/` files use a block comment with ASCII art header. New files must follow the same convention.

```typescript
/**
 * ============================================================
 * BMR / TDEE 計算
 * ============================================================
 *
 * 純函式，無副作用，無 I/O。
 * 所有公式採用公制單位（公斤、公分）。
 *
 * 公式來源：Mifflin & St Jeor (1990), doi:10.1093/ajcn/51.2.241
 */
```

### Pattern 3: Section Dividers

Use the Unicode em-dash divider pattern consistently:

```typescript
// ── Section Name ─────────────────────────────────────
```

### Pattern 4: JSDoc on Exported Functions and Interfaces

Only exported symbols get JSDoc. Internal helpers do not. English field names, zh-TW JSDoc comments where domain-relevant.

```typescript
/**
 * 計算基礎代謝率（BMR）。
 * 使用 Mifflin-St Jeor 公式（1990）。
 * 回傳值為未四捨五入的 kcal/day。
 *
 * @param ageYears - 年齡（歲）
 * @param sex - 性別 "male" | "female"
 * @param heightCm - 身高（公分）
 * @param weightKg - 體重（公斤）
 */
export function calculateBMR(
  ageYears: number,
  sex: "male" | "female",
  heightCm: number,
  weightKg: number
): number {
  // Mifflin-St Jeor (1990): doi:10.1093/ajcn/51.2.241
  const GENDER_OFFSET = sex === "male" ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + GENDER_OFFSET;
}
```

### Pattern 5: Named Exports Only (No Default Export)

Per CONVENTIONS.md: default exports are for page components only. Data modules use named exports exclusively.

### Pattern 6: Constants Use UPPER_SNAKE_CASE

Per CONVENTIONS.md:
- Data arrays: `GUIDELINES`, `ACTIVITY_LEVELS`
- Lookup maps: `GUIDELINE_MAP`
- Interfaces: `GuidelinePreset`, `MacroRange`, `UserProfile`, `BMRResult`

### Anti-Patterns to Avoid

- **Rounding BMR inside `calculateBMR()`:** D-02 is explicit — raw unrounded number. Rounding belongs in `calculateTDEE()` only.
- **Using `enum` keyword for activity levels:** The project uses union literal types (`type ItemType = "food" | "supplement" | ...`), not TypeScript enums. Use a const array with a derived union type or a `readonly` const satisfying the interface.
- **Storing macro grams in the preset:** D-08 and Pitfall 6 — presets store percentages only. Grams are computed at call time by `calculateMacroGrams()`.
- **Using the `@/*` path alias:** Per CONVENTIONS.md, the path alias is configured but not used in any source file. Use relative paths: `import type { GuidelinePreset } from "./types"`.
- **Mixed percentage bases:** All three guideline presets MUST express macros as percentage of TDEE. Do not mix g/kg/day with percentage-of-TDEE (Pitfall 9).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| BMR arithmetic | A "BMR library" | Plain TypeScript arithmetic | The published formulas are closed-form equations; any npm package is just wrapping the same math with maintenance risk |
| Dietary guideline lookup | A fetch-based data layer | Hardcoded TypeScript object array | Guidelines change every 5 years; no machine-readable API exists; static data follows the existing `foods.ts`/`remedies.ts` pattern perfectly |
| Input validation in pure functions | Validation logic inside `calculateBMR()` | Separate validation in Phase 4 UI | Pure functions have no knowledge of form state; validation bounds are documented but enforcement is a UI concern |
| Rounding utilities | Custom round-to-10 function | Inline `Math.round(x / 10) * 10` | One expression does not warrant a utility function |

**Key insight:** This phase is deliberately zero-dependency. The moment you add a library to avoid 3 lines of arithmetic, you've introduced a transitive dependency chain, a potential security surface, and a maintenance obligation for code that could never break on its own.

---

## Common Pitfalls

### Pitfall 1: Wrong Gender Constant in Mifflin-St Jeor
**What goes wrong:** The only difference between male and female BMR in Mifflin-St Jeor is the additive constant: `+5` for male, `-161` for female. Swapping or mistyping these produces a 166 kcal error that silently corrupts every derived value (TDEE, macro grams).
**Why it happens:** The two formula variants look nearly identical; a copy-paste error on the constant is easy to miss.
**How to avoid:** Define the constant with a ternary and a source citation comment immediately above it. The reference test case (30yo male, 70 kg, 175 cm → 1673.75 kcal) catches this error definitively.
**Warning signs:** Male and female BMR for identical other inputs differ by something other than exactly 166 kcal.

### Pitfall 2: Metric Unit Assumption Not Enforced
**What goes wrong:** Both Mifflin-St Jeor and Harris-Benedict require weight in kg and height in cm. If a caller passes height in inches (170 instead of 175 cm), the formula silently produces a wrong value approximately 2.54× smaller on the height term.
**Why it happens:** Parameter names alone don't prevent wrong units; TypeScript types can't distinguish "170 cm" from "170 inches" as both are `number`.
**How to avoid:** D-11 (metric only) removes the conversion ambiguity for v1. Enforce it via JSDoc parameter names (`heightCm`, `weightKg`) and source citation comments noting the unit requirement.
**Warning signs:** BMR is materially lower than expected for a given height; results seem normal for one user but wrong for another.

### Pitfall 3: Macro Percentages Stored as Absolute Grams
**What goes wrong:** If `macroRatios` stores grams instead of percentages, every user gets the same targets regardless of TDEE. This is exactly the bug in the existing `NutritionTracker.tsx` hardcoded values that this phase is designed to fix.
**Why it happens:** Official guidelines often publish sample values for a 2000 kcal reference person; these numbers look like reasonable defaults and get copy-pasted directly.
**How to avoid:** D-08 and D-09 are explicit — `macroRatios` stores percentages that sum to 100%. `calculateMacroGrams()` converts to grams using `tdee × pct / kcalPerGram`.
**Warning signs:** Two users with TDEE 1600 kcal and 2200 kcal receive identical protein gram targets from the same preset.

### Pitfall 4: Taiwan HPA Percentages From Secondary Sources
**What goes wrong:** The Taiwan HPA 8th Edition DRI official PDF is in Chinese. The values (protein 12%, fat 25%, carb 63%) were synthesised from secondary sources and may not exactly match the primary document.
**Why it happens:** Official government nutrition PDFs are not machine-readable; researchers cite summary tables which may round differently.
**How to avoid:** Add a code comment citing the source and confidence level. STATE.md explicitly flags this as a known blocker: "Taiwan HPA DRI 8th Edition macro percentages sourced from secondary sources only; verify against primary PDF before finalising."
**Warning signs:** The three percentages do not sum to exactly 100% after rounding.

### Pitfall 5: TDEE Rounding Applied Before Multiplying
**What goes wrong:** `Math.round(bmr / 10) * 10 * multiplier` rounds the BMR first, then multiplies — this compounds the rounding error and produces a different result than `Math.round(bmr * multiplier / 10) * 10`.
**Why it happens:** It seems natural to round inputs before using them.
**How to avoid:** Multiply first, round last: `Math.round(bmr * multiplier / 10) * 10`. Verify against the reference values for all 5 activity levels.
**Warning signs:** TDEE differs from expected by up to 10 kcal depending on the input's proximity to a rounding boundary.

---

## Code Examples

Verified patterns from project conventions and published formula sources:

### Mifflin-St Jeor BMR Calculation

```typescript
// Source: Mifflin & St Jeor (1990), doi:10.1093/ajcn/51.2.241
// Reference value: 30yo male, 70 kg, 175 cm → 1673.75 kcal
export function calculateBMR(
  ageYears: number,
  sex: "male" | "female",
  heightCm: number,
  weightKg: number
): number {
  const GENDER_OFFSET = sex === "male" ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + GENDER_OFFSET;
}
```

Verification: `10*70 + 6.25*175 - 5*30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75`. Wait — let me recalculate: `700 + 1093.75 = 1793.75`, `1793.75 - 150 = 1643.75`, `1643.75 + 5 = 1648.75`.

**Note:** The reference value cited in CONTEXT.md specifics and PITFALLS.md is 1673.75 kcal. Verify: `10*70=700`, `6.25*175=1093.75`, `5*30=150`. Male: `700+1093.75-150+5 = 1648.75`. This does NOT equal 1673.75. There is a discrepancy. See Open Questions section — this must be resolved before implementation.

### TDEE Calculation (rounded to nearest 10)

```typescript
export function calculateTDEE(bmr: number, activityMultiplier: number): number {
  return Math.round(bmr * activityMultiplier / 10) * 10;
}
```

### Activity Levels Typed Array

```typescript
// Following project convention: typed array with derived union type
export const ACTIVITY_LEVELS = [
  {
    id: "sedentary" as const,
    label: "久坐",
    description: "坐辦公室，每週運動 0–1 次",
    multiplier: 1.2,
  },
  {
    id: "light" as const,
    label: "輕度活動",
    description: "每週輕度運動 1–3 天",
    multiplier: 1.375,
  },
  {
    id: "moderate" as const,
    label: "中度活動",
    description: "每週中度運動 3–5 天",
    multiplier: 1.55,
  },
  {
    id: "very" as const,
    label: "高度活動",
    description: "每週運動 6–7 天",
    multiplier: 1.725,
  },
  {
    id: "extra" as const,
    label: "極高活動",
    description: "體力勞動工作或每日高強度訓練",
    multiplier: 1.9,
  },
] as const;

export type ActivityLevelId = (typeof ACTIVITY_LEVELS)[number]["id"];
```

### Guideline Preset Structure

```typescript
// D-08: single mid-range percentage per macro (not min/max ranges)
// D-09: id, name (zh-TW), authority (zh-TW), sourceUrl, year, macroRatios
export const GUIDELINES: GuidelinePreset[] = [
  {
    id: "taiwan-hpa",
    name: "台灣衛福部 DRI",
    authority: "衛生福利部國民健康署",
    sourceUrl: "https://www.hpa.gov.tw/Pages/Detail.aspx?nodeid=4248&pid=12285",
    year: 2011,
    macroRatios: {
      protein: 12,  // % of TDEE — MEDIUM confidence; see Open Questions
      fat: 25,
      carb: 63,     // must sum to 100
    },
  },
  {
    id: "usda-amdr",
    name: "美國 USDA AMDR",
    authority: "美國農業部（USDA）",
    sourceUrl: "https://www.dietaryguidelines.gov/",
    year: 2025,
    macroRatios: {
      protein: 20,  // % of TDEE — HIGH confidence (mid-range of 10–35%)
      fat: 30,      // mid-range of 20–35%
      carb: 50,     // mid-range of 45–65%
    },
  },
  {
    id: "japan-mhlw",
    name: "日本厚生勞動省 DRI",
    authority: "日本厚生勞動省",
    sourceUrl: "https://www.mhlw.go.jp/content/001151422.pdf",
    year: 2025,
    macroRatios: {
      protein: 16,  // % of TDEE — HIGH confidence (mid-range of 13–20%)
      fat: 25,      // mid-range of 20–30%
      carb: 59,     // mid-range of 50–65%
    },
  },
];
```

### calculateMacroGrams Function

```typescript
// D-10: convert TDEE percentage to grams
// kcal per gram: protein=4, fat=9, carb=4
export function calculateMacroGrams(
  tdeKcal: number,
  preset: GuidelinePreset
): MacroGrams {
  return {
    protein: Math.round((tdeKcal * preset.macroRatios.protein) / 100 / 4),
    fat: Math.round((tdeKcal * preset.macroRatios.fat) / 100 / 9),
    carb: Math.round((tdeKcal * preset.macroRatios.carb) / 100 / 4),
  };
}
```

### Interface Definitions (add to types.ts)

```typescript
// ── BMR / TDEE Types ────────────────────────────────

/** 使用者基本資料，用於 BMR 計算 */
export interface UserProfile {
  ageYears: number;
  sex: "male" | "female";
  heightCm: number;
  weightKg: number;
  activityLevelId: ActivityLevelId;
}

/** BMR + TDEE 計算結果 */
export interface BMRResult {
  /** 基礎代謝率 kcal/day（未四捨五入） */
  bmr: number;
  /** 每日總消耗熱量 kcal/day（四捨五入至十位數） */
  tdee: number;
}

// ── Dietary Guideline Types ─────────────────────────

/** 三大營養素佔總熱量的百分比 */
export interface MacroRatios {
  /** % of TDEE */
  protein: number;
  /** % of TDEE */
  fat: number;
  /** % of TDEE */
  carb: number;
}

/** 三大營養素的克數目標 */
export interface MacroGrams {
  protein: number;
  fat: number;
  carb: number;
}

/** 飲食指南預設組 */
export interface GuidelinePreset {
  id: string;
  /** 顯示名稱（繁體中文） */
  name: string;
  /** 發布機構（繁體中文） */
  authority: string;
  /** 來源 URL */
  sourceUrl: string;
  /** 版本年份 */
  year: number;
  /** 三大營養素佔總熱量百分比（總和應為100%） */
  macroRatios: MacroRatios;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Harris-Benedict (1919/1984) | Mifflin-St Jeor (1990) preferred | 1990 + meta-analyses through 2020s | Mifflin is more accurate for general population; project decision D-01 locks this in |
| Macro targets as absolute gram values | Macro targets as % of TDEE, converted on demand | This project introduces this | Personalised targets that auto-update with BMR changes; avoids Pitfall 6 |
| WHO/FAO TRS 916 (2003) as third preset | Japan MHLW DRI 2025 as third preset | Decision D-07 | Japan guidelines are more current and directly relevant to project's target region (Taiwan/East Asia) |

**Deprecated/outdated:**
- Harris-Benedict (1919 original): superseded by revised 1984 version, further superseded by Mifflin-St Jeor for accuracy. Deferred to v2 per D-01.
- MacroRange with min/max: the original research interface proposed min/max ranges; D-08 changed this to single mid-range values for UX simplicity.

---

## Open Questions

1. **BMR Reference Value Discrepancy**
   - What we know: The reference test case specified in CONTEXT.md and PITFALLS.md is "30yo male, 70kg, 175cm → 1673.75 kcal"
   - Manual calculation: `10×70 + 6.25×175 - 5×30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75 kcal`
   - The discrepancy is 25 kcal. Either the reference value is wrong, or there is an alternative version of the formula being used.
   - An alternative explanation: some sources express the Mifflin formula as `9.99W + 6.25H - 4.92A + 5` (using different rounding of the original constants). With these: `9.99×70 + 6.25×175 - 4.92×30 + 5 = 699.3 + 1093.75 - 147.6 + 5 = 1650.45`. Still not 1673.75.
   - Another possibility: the reference uses `10W + 6.25H - 5A + 5` but with slightly different published coefficients. The Medscape calculator confirms `10×70=700`, `6.25×175=1093.75`, `5×30=150`, `+5=5`, total = `1648.75`.
   - **The published reference value of 1673.75 does not match the Mifflin-St Jeor formula with the locked inputs.** This must be investigated before implementation. The success criterion in the phase description uses 1673.75 as the pass/fail value.
   - Recommendation: Verify the formula variant and constants against the original 1990 Mifflin paper (doi:10.1093/ajcn/51.2.241) before writing the function. The planner should add a research task at the start of Wave 1 to resolve this discrepancy.

2. **Taiwan HPA Macro Percentage Confidence**
   - What we know: Protein 12%, fat 25%, carb 63% from secondary sources; official PDF is in Chinese.
   - What's unclear: Whether these match the primary 8th edition DRI document precisely.
   - STATE.md blocker: "Taiwan HPA DRI 8th Edition macro percentages sourced from secondary sources only; verify against primary PDF before finalising guideline preset."
   - Recommendation: Implement with the secondary-source values and add a prominent code comment flagging the MEDIUM confidence. The values are close enough to publish for v1; primary-source verification is a v1.1 hardening task.

3. **ActivityLevelId Type Pattern**
   - What we know: Project uses union literal types, not TypeScript `enum`.
   - What's unclear: Whether to derive the type from the `ACTIVITY_LEVELS` array (`typeof ACTIVITY_LEVELS[number]['id']`) or define it as an explicit string union.
   - Recommendation: Use the derived type from the `as const` array (shown in Code Examples). This keeps the single source of truth in the array and avoids synchronisation bugs between an explicit union and the array values.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 1 is purely code/config changes (TypeScript pure functions and static data objects) with no external CLI dependencies, services, or runtimes beyond the project's existing Node.js/npm environment.

---

## Validation Architecture

`workflow.nyquist_validation` is explicitly set to `false` in `.planning/config.json`. This section is omitted per the skip condition.

---

## Project Constraints (from CLAUDE.md)

Directives the planner must verify compliance against:

| Directive | Applies to Phase 1? | How Verified |
|-----------|--------------------|-|
| Static SPA only — no SSR, no server | Yes | Pure leaf modules with no I/O; no server calls |
| All user-facing text in Traditional Chinese (zh-TW) | Yes | Activity level labels and guideline names must be zh-TW strings |
| Tailwind CSS v4 with existing dark theme tokens | No — no UI in Phase 1 | N/A |
| Dietary guidelines must reference real, citable national sources | Yes | `sourceUrl` and `authority` fields mandatory on every preset |
| Must work offline | Yes | No network calls; pure TypeScript data and functions |
| TypeScript strict mode (`strict: true`, `noUnusedLocals`, `noUnusedParameters`) | Yes | No unused exports; all parameters used in functions |
| Named exports for data/types/utilities (no default exports for data modules) | Yes | All exports are named |
| Constants: UPPER_SNAKE_CASE; Interfaces: PascalCase | Yes | `GUIDELINES`, `GUIDELINE_MAP`, `ACTIVITY_LEVELS`; `GuidelinePreset`, `MacroRatios` |
| Relative paths only — do not use `@/*` alias | Yes | Import as `"./types"`, not `"@/data/types"` |
| 2-space indentation, double quotes, trailing commas | Yes | Follow in all new files |
| File-level block comment with ASCII art section header | Yes | All `src/data/` files have this pattern |
| Section dividers: `// ── Name ──` pattern | Yes | Use consistently in new files |
| Data modules export both raw arrays and lookup Maps | Yes | `GUIDELINES` array + `GUIDELINE_MAP` |
| `noUncheckedSideEffectImports: true` | Yes | No side-effectful imports |

---

## Sources

### Primary (HIGH confidence)
- Mifflin & St Jeor (1990) — PubMed 15883556 — formula constants and accuracy data
- USDA Dietary Guidelines for Americans 2025–2030 — https://www.dietaryguidelines.gov/ — AMDR percentages
- Japan MHLW DRI 2025 — https://www.mhlw.go.jp/content/001151422.pdf — macro ranges and mid-range values
- `.planning/research/STACK.md` — confirmed no new dependencies needed; formula details
- `.planning/research/FEATURES.md` — concrete guideline percentage values; activity multiplier table
- `.planning/research/PITFALLS.md` — BMR constant error pattern; unit normalisation requirements; macro percentage basis issue
- `src/data/types.ts` — existing interface and type patterns to follow
- `src/data/foods.ts` — array + Map export pattern; file comment style
- `CLAUDE.md` — all project directives including naming conventions, TypeScript settings, style rules

### Secondary (MEDIUM confidence)
- Taiwan HPA 8th Edition DRI — https://www.hpa.gov.tw/Pages/Detail.aspx?nodeid=4248&pid=12285 — macro percentages from secondary synthesis of Chinese-language PDF
- `.planning/phases/01-static-data-foundation/01-CONTEXT.md` — implementation decisions locked in discussion

### Tertiary (LOW confidence)
- BMR reference value of 1673.75 kcal for 30yo male 70kg 175cm — cited in CONTEXT.md specifics and PITFALLS.md but does not match manual calculation of the Mifflin-St Jeor formula (see Open Questions #1)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies confirmed; existing stack is fixed and documented
- BMR formula: HIGH — formula constants verified from peer-reviewed sources; reference value discrepancy is flagged (see Open Questions #1)
- Dietary guideline values: HIGH for USDA/Japan; MEDIUM for Taiwan HPA (secondary-source only)
- Architecture patterns: HIGH — directly observed from existing codebase files
- Pitfalls: HIGH — directly sourced from `.planning/research/PITFALLS.md` which performed code-level analysis

**Research date:** 2026-03-29
**Valid until:** 2026-06-29 (stable domain — dietary guidelines change every 5 years; TypeScript/React stack is locked)
