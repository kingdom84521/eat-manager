# Project Research Summary

**Project:** eat-manager — Settings & Nutrition Configuration milestone
**Domain:** Offline-first health/nutrition SPA — BMR, dietary guidelines, runtime Sheets config
**Researched:** 2026-03-29
**Confidence:** HIGH

## Executive Summary

This milestone adds a proper settings system to an existing static React SPA. The research is unusually clear: all four areas (BMR calculation, dietary guideline data, settings UI, runtime Sheets config) can be implemented with **zero new runtime dependencies** using patterns already established in the codebase. BMR formulas are 3-line arithmetic functions; dietary guidelines are static TypeScript objects mirroring the existing `foods.ts`/`remedies.ts` pattern; form state uses native React hooks with localStorage; and runtime Sheets configuration is a one-line change inside `sheets-api.ts` to move URL resolution from module-load time to call time.

The recommended build order flows from a strict dependency chain: pure data layer first (`bmr.ts`, `dietary-guidelines.ts`), then the `SettingsService` persistence layer, then the `sheets-api.ts` patch that wires runtime config into the existing API client, and finally the `Settings.tsx` page that surfaces everything to the user. This order means each phase has working, testable output before the next starts — no phase is blocked on an incomplete prior phase.

The dominant risk is not technical complexity but data correctness and propagation: BMR formula constants must match peer-reviewed literature exactly, macro targets must be computed as percentages of TDEE (not fixed grams), and the runtime Sheets URL must be validated before storage to prevent silent misdirection or data exfiltration. A secondary risk is schema evolution — the `settings_` localStorage namespace needs a version field from day one so future field additions or renames do not silently corrupt existing users' data.

---

## Key Findings

### Recommended Stack

**No new runtime dependencies are required.** All four feature areas are fully implementable with the existing stack (React 19, Vite 6, Tailwind v4, TypeScript 5.8, React Router 7). BMR formulas are peer-reviewed arithmetic; dietary guidelines are hardcoded TypeScript objects; form persistence uses native `useState` + `localStorage`; the Sheets config change is a one-line architectural fix.

One conditional future dependency exists: if the settings form grows beyond ~10 fields or requires cross-field validation, `react-hook-form` ^7.72.0 + `zod` ^4.3.6 + `@hookform/resolvers` ^5.2.2 is the right addition at that point. Do not add it preemptively.

**Core technologies in use (unchanged):**
- React 19 + TypeScript 5.8 — component logic and type safety
- Vite 6 — build and `import.meta.env` fallbacks for Sheets URL
- Tailwind v4 — existing dark theme tokens; all new UI must match
- Browser `localStorage` — synchronous settings persistence (no new hook library needed)
- Google Apps Script (`sheets-api.ts`) — existing backend proxy, to be patched for runtime URL

**Explicitly excluded (with rationale):**
- `@lukaswhite/bmr`, `iifym.js` — unmaintained, no TypeScript types; three lines of arithmetic require no dependency
- `usehooks-ts` — `useLocalStorage` is a single file; copying avoids a dependency for one hook
- Runtime `/config.json` fetch — async init is incompatible with `SheetsAPI`'s sync context

### Expected Features

**Must have (table stakes) — all Low-Medium complexity, achievable in one phase:**
- Age, sex, height (cm), weight (kg) inputs with inline validation
- Activity level selector — 5 levels with concrete zh-TW descriptions (not abstract labels)
- TDEE output displayed prominently once all inputs are valid
- Macronutrient gram targets derived from TDEE x guideline preset (carbs/protein/fat)
- At least 3 guideline presets (Taiwan HPA, Japan MHLW 2025, USDA AMDR) with source attribution
- Guideline preset selector showing macro percentages alongside preset name
- Google Sheets GAS URL + Sheet ID fields with explicit Save button
- Settings persisted to localStorage on save; auto-loaded on page mount
- Inline input validation (min/max bounds per field; zh-TW error messages)

**Should have (differentiators for v1.1):**
- BMR formula selector (default Mifflin-St Jeor; add Harris-Benedict and Katch-McArdle as options)
- Connection test button ("測試連線") that issues a GET to the saved GAS URL and shows result
- Visual macro ratio bar chart (CSS/SVG horizontal bar — no chart library)
- Activity level description expansion (accordion or tooltip per option)
- Explanation tooltips on each guideline preset ("why is Japan's carb target higher?")

**Defer to v2+:**
- Imperial unit toggle — metric default is correct for zh-TW audience; demand unproven
- Custom macro ratio editor (free-form sliders) — explicitly out of scope per PROJECT.md
- Multiple user profiles / family mode — doubles settings complexity
- Micronutrient targets (vitamins, minerals) — separate milestone
- Automatic nutrient tracking against BMR targets — separate milestone per PROJECT.md
- Preset goal modes (maintenance / cut / bulk) — needs NutritionTracker integration first

**UX note:** Settings page should be a single scrollable page with vertically stacked card sections: [個人資料 → BMR/TDEE 結果 → 飲食指南選擇 → Google Sheets 連線]. TDEE result appears between inputs and preset selector so users see the live number before choosing a preset. Bottom nav grows from 4 tabs to 5 (add settings as last tab).

### Architecture Approach

The integration is additive: three new source files, two patched files, zero existing pages modified. `src/data/bmr.ts` and `src/data/dietary-guidelines.ts` are pure leaves with no I/O. `src/lib/settings-service.ts` mirrors the existing `DataService` pattern (localStorage primary, optional async Sheets sync on write). `src/lib/sheets-api.ts` is patched to resolve its GAS URL at call time instead of module-load time. `src/pages/Settings.tsx` is the only new page and the only settings writer; other pages are consumers only.

**Major components:**
1. `src/data/bmr.ts` — pure functions: `calculateBMR(profile)`, `calculateTDEE(bmr, activityLevel)`; no I/O, no side effects
2. `src/data/dietary-guidelines.ts` — static `GUIDELINES` catalog: Taiwan HPA, Japan MHLW 2025, USDA AMDR, each with `macroRatios` as percentages
3. `src/lib/settings-service.ts` — synchronous reads, synchronous localStorage writes, fire-and-forget async Sheets sync on write; key prefix `settings_` (distinct from existing `wellness_`)
4. `src/lib/sheets-api.ts` (modified) — `resolveGasUrl()` inside `gasGet`/`gasPost`; falls back to `import.meta.env.VITE_GAS_URL` when no runtime config saved
5. `src/pages/Settings.tsx` — settings form, BMR display, guideline selector, Sheets config section; reads via `SettingsService`, derives targets from `calculateBMR()` + active guideline
6. `src/App.tsx` (modified) — add `/settings` route and 5th nav tab; no state changes

**Critical architectural decisions:**
- Settings reads are **synchronous** — `SettingsService.get*()` returns `T | null` directly from localStorage. This is required because `SheetsAPI` must call `getConnectionConfig()` synchronously during URL resolution inside each fetch call.
- Derived values (TDEE, macro grams) are **computed on demand**, never stored — avoids stale cache bugs.
- **No React Context** for settings — direct `SettingsService` calls per component, matching the existing `DataService` pattern. (See caveat in Critical Pitfalls #5 below.)

### Critical Pitfalls

1. **GAS URL baked at module-load time** — `SheetsAPI` line 6 reads `import.meta.env.VITE_GAS_URL` once at import. A settings UI that writes to localStorage has zero effect on running API calls. **Fix:** Move URL resolution to a `resolveGasUrl()` function called inside `gasGet`/`gasPost`. Do this before building any Settings UI.

2. **BMR gender constant error** — Mifflin-St Jeor differs only in the final constant (`+5` male, `-161` female). A wrong constant silently propagates a ~166 kcal error into every macro target. **Fix:** Co-locate formula constants with DOI citation comments; write unit tests against known reference values (e.g., 30yo male 70 kg 175 cm = 1,673.75 kcal).

3. **Dietary guideline grams vs percentages** — National guidelines express macros as % of TDEE, but the current `NutritionTracker.tsx` hardcodes absolute gram values for a "reference person." The new system must store presets as `{ proteinPct, fatPct, carbsPct }` and compute grams at display time: `proteinGrams = (tdee * proteinPct) / 4`. Two users with different TDEE must see different gram targets from the same preset.

4. **localStorage schema evolution** — The existing `wellness_` store has no versioning. As the settings schema evolves between milestones, old-format JSON parsed without validation causes silent NaN/0 outputs. **Fix:** Include a `settings_version: 1` field from day one; write a migration function that transforms old shapes before use.

5. **Stale settings in non-Settings pages** — Without a shared signal mechanism, changing BMR in Settings and navigating to NutritionTracker shows old hardcoded targets until page reload. The architecture recommendation (no Context) is correct for the Settings page itself, but consumer pages need a propagation strategy. **Options:** window `storage` event listener in consumer pages, or a minimal React Context wrapping only the settings read. Decide before implementing any settings consumer.

6. **Unvalidated GAS URL is a security risk** — A user-provided URL passed directly to `fetch()` without validation can route all health data to an attacker-controlled endpoint. **Fix:** Validate on save — reject anything not starting with `https://script.google.com/`; reject `javascript:`, `data:`, `file:` protocols.

7. **Dual sources of truth after migration** — `NutritionTracker.tsx` line 13 and `WeightLog.tsx` lines 4-5 contain hardcoded personal targets. After settings ships, these must be replaced. **Fix:** Treat constant removal as a required task in the same phase, not a follow-up. Grep for literal values `1600`, `1800`, `120`, `130`, `80`, `104` after the migration.

---

## Implications for Roadmap

All four research dimensions agree on the same build order. The dependency chain is strict and there is no ambiguity about sequencing.

### Phase 1: Static Data Foundation

**Rationale:** `bmr.ts` and `dietary-guidelines.ts` are pure leaves with zero dependencies. They must exist before anything else can be built, and they are the easiest to verify correct (unit tests against published reference values).
**Delivers:** `calculateBMR()`, `calculateTDEE()`, `GUIDELINES` catalog, all TypeScript interfaces (`UserProfile`, `BMRResult`, `GuidelinePreset`, `MacroRange`)
**Addresses:** Table stakes — TDEE output, guideline preset data, macronutrient targets
**Avoids:** Pitfall 2 (wrong BMR constants), Pitfall 3 (unit conversion), Pitfall 6 (grams vs percentages), Pitfall 9 (incompatible energy bases across countries)
**Research flag:** Standard patterns — no additional research needed. Formula constants sourced from peer-reviewed literature (PMC7478086, PubMed 15883556). Guideline percentages verified against official USDA, WHO, and Taiwan HPA documents.

### Phase 2: Settings Persistence Layer

**Rationale:** `SettingsService` is a dependency of both the SheetsAPI patch (Phase 3) and the Settings page (Phase 4). It must be built and testable in isolation before either consumer exists. Schema version field must be defined here, not retrofitted later.
**Delivers:** `SettingsService` singleton with synchronous reads (`getUserProfile`, `getActiveGuideline`, `getConnectionConfig`, `getComputedTargets`) and synchronous localStorage writes; `settings_version: 1` schema; `settings_` key namespace
**Addresses:** Settings persisted across sessions (table stakes), computed targets available to future consumers
**Avoids:** Pitfall 5 (schema evolution breaks existing users), Pitfall 8 (dual sources of truth — `getComputedTargets()` becomes the canonical target source)
**Research flag:** Standard patterns — localStorage CRUD with versioning is a well-documented pattern. No external research needed.

### Phase 3: SheetsAPI Runtime Config Patch

**Rationale:** This is a surgical one-function change to `sheets-api.ts` that unblocks the entire runtime config feature. It must land before any Settings UI is shipped, otherwise the GAS URL field in Settings has no effect (silent failure — the most dangerous kind).
**Delivers:** Runtime-configurable Sheets connection; `resolveGasUrl()` inside `gasGet`/`gasPost`; env var fallback preserved; zero behavioral change when no runtime config is saved
**Addresses:** Google Sheets URL/ID runtime configuration (table stakes)
**Avoids:** Pitfall 1 (GAS URL baked at module-load time — the single highest-severity pitfall in the research)
**Research flag:** Standard patterns — architectural decision derived directly from reading the existing source. No external research needed.

### Phase 4: Settings Page UI + Navigation

**Rationale:** All dependencies (BMR functions, guideline data, SettingsService, patched SheetsAPI) are ready. This phase assembles the user-facing surface and also completes the hardcoded-constant migration in NutritionTracker and WeightLog.
**Delivers:** `Settings.tsx` page, 5th nav tab in `App.tsx`, complete BMR/TDEE form with inline validation, guideline preset selector, Google Sheets config section, removal of all hardcoded personal targets from existing pages
**Addresses:** All 8 MVP table stakes features from FEATURES.md
**Avoids:** Pitfall 4 (activity level descriptions must be concrete zh-TW behavioral descriptions), Pitfall 7 (GAS URL validation on save), Pitfall 8 (remove hardcoded constants), Pitfall 10 (decide on cross-page settings propagation strategy — window storage event or minimal Context), Pitfall 12 (mask GAS URL after first save), Pitfall 13 (preset switch recalculates immediately via useMemo)
**Research flag:** Needs attention on Pitfall 10 resolution (stale settings propagation) before implementation starts. All other patterns are standard.

### Phase Ordering Rationale

- Phase 1 before Phase 2: `SettingsService.getComputedTargets()` calls `calculateBMR()` and references `GUIDELINES` — the types must exist first.
- Phase 2 before Phase 3: `SheetsAPI` calls `SettingsService.getConnectionConfig()` — the service must be importable before the patch.
- Phase 3 before Phase 4: A Settings UI that cannot actually change the active Sheets endpoint is worse than no Settings UI — it creates a false sense of configuration.
- Phase 4 includes constant migration: replacing `DAILY_TARGET` in NutritionTracker and `TARGET_KG`/`START_KG` in WeightLog is a required sub-task of this phase, not an optional follow-up.

### Research Flags

**Phases needing deeper research before implementation:**
- **Phase 4 (Settings UI):** Resolve Pitfall 10 propagation strategy before writing any consumer-side code. Options are window `storage` event vs minimal React Context. The architecture recommendation in ARCHITECTURE.md says no Context, but PITFALLS.md identifies this as a real stale-data risk. Decision needed.
- **Phase 4 (GAS URL masking):** Decide on display format for saved URL (full visible, partially masked, or test-only). Security implication from Pitfall 12.

**Phases with standard patterns (no additional research needed):**
- **Phase 1:** Pure arithmetic + static data. Formula constants are from primary literature.
- **Phase 2:** localStorage CRUD with versioning. Fully established pattern.
- **Phase 3:** Function-level lazy read replacing module-level constant. Direct codebase derivation.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new dependencies; conclusions derived from reading existing source files and confirmed no viable library alternatives exist |
| Features | HIGH | BMR formulas verified via PubMed meta-analyses; USDA and WHO guideline numbers from official documentation; Taiwan HPA numbers MEDIUM (official PDF is Chinese-language, numbers corroborated across multiple secondary sources) |
| Architecture | HIGH | All decisions derived directly from reading `sheets-api.ts`, `data-service.ts`, `App.tsx`; no inference required |
| Pitfalls | HIGH (technical), MEDIUM (UX) | Technical pitfalls (GAS URL, formula constants, schema versioning) are verifiable from source. UX pitfalls (activity level mis-selection causing TDEE error) sourced from community documentation, not primary research |

**Overall confidence:** HIGH

### Gaps to Address

- **Taiwan HPA DRI 8th Edition exact macro percentages:** The official document is Chinese-language PDF. The 50-65% carbs / 20-30% fat / 10-20% protein split appears consistently in multiple sources but has not been verified against the primary PDF. New Taiwan guidelines are expected Q2 2026 — if released before this milestone ships, update the preset. Flag for verification during Phase 1.
- **Cross-page settings propagation strategy:** ARCHITECTURE.md recommends no React Context; PITFALLS.md identifies stale-data as a real risk. These two recommendations are in mild tension. Resolution must be decided in Phase 2 planning before Phase 4 implementation. The window `storage` event approach is lower-overhead and consistent with the no-global-state philosophy.
- **Sheets sync for settings writes:** ARCHITECTURE.md notes optional async Sheets sync on settings write but does not fully specify when/whether to implement it. For MVP, localStorage-only is sufficient. Sheets sync for settings is a nice-to-have; defer to v1.1.
- **Japan MHLW DRI 2025 vs 2020:** FEATURES.md references Japan DRI 2025; STACK.md references Japan DRI 2020. The macro ranges are effectively identical (protein 13-20%, fat 20-30%, carbs 50-65%) but the year should be consistent and the 2025 version should be preferred if its source URL is accessible.

---

## Sources

### Primary (HIGH confidence)
- Mifflin-St Jeor accuracy: [PMC7478086](https://pmc.ncbi.nlm.nih.gov/articles/PMC7478086/) — formula constants and accuracy comparison
- Mifflin-St Jeor validation: [PubMed 15883556](https://pubmed.ncbi.nlm.nih.gov/15883556/) — most accurate predictor of RMR for general population
- WHO/FAO macro ranges: [WHO TRS 916](https://www.who.int/publications/i/item/924120916X) — carbs 55-75%, fat 15-30%, protein 10-15%
- USDA AMDR: [Dietary Guidelines for Americans 2020-2025](https://www.dietaryguidelines.gov/sites/default/files/2020-12/Dietary_Guidelines_for_Americans_2020-2025.pdf) — carbs 45-65%, fat 20-35%, protein 10-35%
- OWASP SSRF Cheat Sheet — GAS URL allowlist validation pattern
- Existing codebase: `src/lib/sheets-api.ts`, `src/lib/data-service.ts`, `src/App.tsx` — architecture baseline

### Secondary (MEDIUM confidence)
- Taiwan HPA DRI 8th Edition: [HPA English page](https://www.hpa.gov.tw/EngPages/Detail.aspx?nodeid=1050&pid=13117) — macro ranges corroborated across multiple Taiwan nutrition sources
- Japan MHLW DRI 2025: [Researcher.life summary](https://discovery.researcher.life/article/dietary-reference-intakes-for-japanese-2025-the-fundamental-and-comprehensive-guideline-for-healthy-and-diets/60825ba3b88b3c86b249920ec1fb3a01) — protein 13-20%, fat 20-30%, carbs 50-65%
- TDEE activity multiplier error analysis: [MacroFactor help](https://help.macrofactorapp.com/en/articles/126-why-is-my-expenditure-in-macrofactor-different-from-the-output-of-a-tdee-calculator) — >250 kcal/day error in 50% of discrete-bucket calculations
- localStorage schema versioning: [DEV Community pattern](https://dev.to/prakash_chokalingam/introduction-to-a-stateful-maintainable-react-local-storage-hook-31ie)
- NNGroup progressive disclosure: [NNGroup](https://www.nngroup.com/articles/progressive-disclosure/) — settings form UX

### Tertiary (LOW confidence / needs validation)
- Taiwan new guidelines Q2 2026: [Focus Taiwan](https://focustaiwan.tw/society/202601110007) — flagged for monitoring; update Taiwan preset if released before milestone ships

---
*Research completed: 2026-03-29*
*Ready for roadmap: yes*
