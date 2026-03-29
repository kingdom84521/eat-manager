# Domain Pitfalls

**Domain:** Nutrition/BMR settings — React SPA with offline-first localStorage + Google Sheets sync
**Researched:** 2026-03-29
**Scope:** BMR calculation, multi-country dietary guideline integration, runtime API configuration UI

---

## Critical Pitfalls

Mistakes that cause incorrect data, silent breakage, or full rewrites.

---

### Pitfall 1: GAS_URL Baked at Build Time — Runtime Config Goes Nowhere

**What goes wrong:**
`sheets-api.ts` line 6 reads `const GAS_URL = import.meta.env.VITE_GAS_URL` at module load time. If you add a settings UI that writes a user-provided URL to localStorage, the running `SheetsAPI` instance never sees it — it already captured the build-time value. Every API call continues using the env var URL silently.

**Why it happens:**
ES module top-level constants are evaluated once at import. There is no mechanism to re-evaluate `import.meta.env` at runtime.

**Consequences:**
The runtime configuration UI appears to work (it saves to localStorage) but has zero effect on API calls. Users believe they have connected their own Sheet when the app is still talking to the build-time endpoint (or nothing, if the env var was blank).

**Prevention:**
`SheetsAPI` must read the URL dynamically on every call from a resolver function, not from a module-level constant. The resolver checks localStorage first, falls back to the env var. Example shape:

```typescript
function resolveGasUrl(): string {
  return localStorage.getItem("settings_gas_url") || import.meta.env.VITE_GAS_URL || "";
}
```

Replace the constant with a call to `resolveGasUrl()` inside `gasGet` and `gasPost`.

**Warning signs:**
- Settings page saves successfully but Sheets sync still targets the old URL
- No error thrown when the new URL is entered — the old URL just keeps working
- Checking DevTools Network tab shows requests going to the build-time URL after "connecting" a new sheet

**Phase:** Address in the settings implementation phase, before adding any Settings UI. Update `sheets-api.ts` first.

---

### Pitfall 2: BMR Formula Uses Wrong Constant for Gender

**What goes wrong:**
The Mifflin-St Jeor formula differs between male and female only in the final additive constant: `+5` for male, `-161` for female. The Harris-Benedict equation has completely different coefficients per gender. Swapping or misapplying these constants produces a wrong calorie baseline of 160–166 kcal, which then propagates into every macro target derived from it.

**Why it happens:**
The formulas look structurally identical; it is easy to implement the shared terms correctly but copy the wrong constant, especially when translating from a reference that uses different variable names or orderings.

**Consequences:**
All BMR-derived targets (calorie budget, protein/carb/fat grams) are silently wrong. A 166 kcal error is large enough to cause real dietary harm if the user follows the recommendations.

**Prevention:**
- Encode gender as a typed discriminant, not a boolean or raw string: `"male" | "female"`.
- Co-locate the formula constants with a source citation comment so the values can be spot-checked:
  ```typescript
  // Mifflin-St Jeor (1990): doi:10.1093/ajcn/51.2.241
  const GENDER_OFFSET = gender === "male" ? 5 : -161;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + GENDER_OFFSET;
  ```
- Write a unit test that validates known reference values (e.g., 30-year-old male, 70 kg, 175 cm should produce 1,673.75 kcal with Mifflin-St Jeor).

**Warning signs:**
- BMR output for male and female with identical other inputs differs by exactly `166` kcal — this is the correct differential; any other difference indicates a formula bug.
- Results match for one gender but are off by hundreds for the other.

**Phase:** BMR calculation phase. Must be verified with reference values before wiring to UI.

---

### Pitfall 3: Metric/Imperial Unit Conversion Not Applied Before Formula

**What goes wrong:**
Both Mifflin-St Jeor and Harris-Benedict require weight in **kilograms** and height in **centimetres**. If the input form accepts pounds and inches (or if a user enters metric values but the code assumes imperial), the formula receives unconverted values and the output is meaningless (e.g., a 170 lb person's weight is used as 170 kg, producing a 50% inflated BMR).

**Why it happens:**
Forms that expose unit selection as a UI affordance often leave the conversion as an afterthought. The calculation function receives the raw input and assumes a specific unit.

**Consequences:**
BMR wildly overestimates or underestimates. With height in inches instead of cm, the height term shrinks by a factor of 2.54, understating BMR by roughly 150–200 kcal. With weight in lbs instead of kg, BMR is inflated by a factor of 2.2.

**Prevention:**
- Define a single canonical internal representation (`weightKg`, `heightCm`) and convert at the boundary (form input), not inside the BMR function.
- The BMR function must accept only kg/cm arguments — enforce this with TypeScript parameter names and JSDoc.
- If the app is always zh-TW and targeted at Taiwan, default to metric (kg/cm) and avoid offering imperial entirely to reduce surface area.

**Warning signs:**
- BMR output is a round number divisible by the conversion factor (2.2, 2.54)
- BMR for height input of "170" (cm, valid) produces a result 2.54x smaller than expected when unit is mistakenly treated as inches

**Phase:** BMR calculation phase.

---

### Pitfall 4: Activity Multiplier "Bucketing" Produces Misleading TDEE

**What goes wrong:**
The standard PAL (Physical Activity Level) multipliers — sedentary 1.2, lightly active 1.375, moderately active 1.55, very active 1.725, extra active 1.9 — are coarse buckets. Research shows TDEE calculators using discrete activity categories produce errors exceeding 250 kcal/day in ~50% of cases, and >500 kcal/day in >20% of cases. Users consistently self-rate their activity level too high.

**Why it happens:**
The categories are ambiguous. A user with a desk job who trains 4 days a week might select "very active" when 1.55 (moderately active) is closer to their actual expenditure.

**Consequences:**
TDEE-derived calorie targets are materially inaccurate. If presented without caveat, users may over-eat (if they selected too-high a level) while believing they are following a calibrated plan.

**Prevention:**
- Use concrete behavioural descriptions for activity levels in zh-TW, not abstract labels. E.g., "坐辦公室，每週運動 0–1 次" rather than "久坐".
- Display the calculated TDEE with an explicit disclaimer that it is an estimate (±200 kcal).
- Do not present macro gram targets as precise numbers — show ranges.

**Warning signs:**
- Users reporting the calorie budget feels too high/low despite correct formula output
- Activity level labels are translated directly from English without adaptation for typical Taiwanese lifestyles

**Phase:** BMR/settings UI phase.

---

### Pitfall 5: localStorage Settings Schema Changes Break Existing Users' Data

**What goes wrong:**
The app currently uses a `wellness_` prefix for cache keys with no versioning. When the settings schema evolves between milestones (e.g., adding a new field, renaming `gasUrl` to `gas_url`, changing the type of `activityLevel` from a string to a numeric index), the app tries to parse old-format JSON and either crashes or silently uses a partially-populated object as if it were valid.

**Why it happens:**
`JSON.parse` without schema validation accepts any shape. Default values are only applied to missing top-level keys; nested type mismatches are invisible at runtime without TypeScript running in the browser.

**Consequences:**
A user who had settings saved from a previous version loads the page and gets NaN BMR or 0 calorie targets, with no visible error. Given the existing pattern of silent error swallowing (9 `.catch(() => {})` instances in `data-service.ts`), this will not surface to the user.

**Prevention:**
- Introduce a `settings_version` key in the stored settings object (start at `1`).
- Write a migration function that reads the version and transforms old shapes to the current schema before use.
- Provide explicit defaults for every field so a missing key is never undefined.
- Store all settings under a single key (`wellness_settings`) rather than individual keys, to make migrations atomic.

**Warning signs:**
- App behaves correctly on a fresh install but incorrectly after a code update for users who had existing settings
- BMR displays as NaN or 0 after a settings schema change
- `JSON.parse` returning an object that satisfies TypeScript types at compile time but has wrong value types at runtime

**Phase:** Settings data layer phase. Define the schema and version before writing any settings to localStorage.

---

### Pitfall 6: Dietary Guideline Macros Applied as Absolute Grams Instead of Percentages of TDEE

**What goes wrong:**
National dietary guidelines express macronutrient recommendations as percentage of total energy intake (e.g., USDA: 45–65% carbs, 20–35% fat, 10–35% protein). If these are implemented as hardcoded gram values (e.g., "120g protein") rather than as ratios applied to the user's calculated TDEE, every user gets the same targets regardless of their body size and metabolic needs. This is exactly the current bug in `NutritionTracker.tsx` line 13 (`DAILY_TARGET = { cal: [1600, 1800], protein: [120, 130] }`).

**Why it happens:**
It is simpler to display fixed numbers. Reference materials often publish sample values in grams for a "reference person" (typically a 2,000 kcal/day adult), which get copy-pasted without adapting them to be percentage-based.

**Consequences:**
The entire purpose of connecting BMR to dietary guidelines is defeated. A 60 kg sedentary person and a 90 kg active person see identical targets. This is the existing hardcoding problem, now with a settings system that appears to personalise but does not.

**Prevention:**
- Store guideline presets as percentage ratios, not gram values.
- Compute gram targets at display time: `proteinGrams = (tdee * proteinPct) / 4` (4 kcal/g for protein; 4 for carbs; 9 for fat).
- When a user's BMR/activity changes, macro gram targets automatically update without touching the guideline data.

**Warning signs:**
- Two users with different TDEE values see the same macro gram targets after selecting the same guideline preset
- Gram values in the guideline preset constants match common "2000 kcal reference" numbers exactly

**Phase:** Dietary guideline integration phase.

---

### Pitfall 7: User-Provided GAS URL Accepted Without Validation — XSS and Data Exfiltration Risk

**What goes wrong:**
If the settings form accepts a free-text GAS URL and passes it directly to `fetch()`, an attacker (or misconfigured user) can enter a `javascript:` URI, a `data:` URI, or a URL pointing to a malicious server. Because `fetch()` will send the request with the full cookie context, this can be used to exfiltrate localStorage contents or probe internal network addresses.

**Why it happens:**
The existing codebase has no input sanitization (noted in CONCERNS.md). The runtime URL feature is new and will be the first user-controlled input wired directly to a network call.

**Consequences:**
A pasted URL from an untrusted source (e.g., a shared URL that looked like a GAS endpoint) silently routes all Sheets writes to an attacker-controlled endpoint. All user health data is exfiltrated.

**Prevention:**
- Validate on save, not on use: check that the URL begins with `https://script.google.com/` before storing it.
- Reject `javascript:`, `data:`, `file:`, and any non-`https` protocol.
- Display the stored URL in the UI (not just "connected") so the user can see what endpoint is active.

**Warning signs:**
- URL input field accepts any string and the value is passed to `fetch()` without inspection
- No error shown when a non-GAS URL is entered

**Phase:** Settings UI phase, before runtime URL feature is shipped.

---

## Moderate Pitfalls

---

### Pitfall 8: Hardcoded Targets in Existing Pages Not Replaced — Dual Sources of Truth

**What goes wrong:**
`NutritionTracker.tsx` line 13 and `WeightLog.tsx` lines 4–5 contain hardcoded personal targets. When the settings system is implemented, the new settings-derived values exist in localStorage while the old hardcoded values remain in the page components. If the replacement is incomplete, some UI surfaces read from settings while others read from constants — the app appears partially personalised.

**Why it happens:**
It is easy to add settings reading to the new Settings page and forget to update the existing pages.

**Consequences:**
Users configure their BMR and see correct targets on the Settings page but NutritionTracker still caps calories at 1,800 kcal. Confusing and undermines trust in the feature.

**Prevention:**
- Treat the settings migration (replacing hardcoded constants) as a mandatory task in the same phase as settings implementation, not as a follow-up.
- After implementing settings, grep the codebase for the literal values (`1600`, `1800`, `120`, `130`, `80`, `104`) and verify all have been removed.

**Warning signs:**
- `DAILY_TARGET` constant still present in `NutritionTracker.tsx` after settings milestone ships
- `TARGET_KG` and `START_KG` still hardcoded in `WeightLog.tsx`

**Phase:** Settings implementation phase.

---

### Pitfall 9: Different Countries' Guidelines Use Incompatible Energy Basis

**What goes wrong:**
Taiwan's DRIS (dietary reference intakes) may express protein targets per kg body weight (e.g., 0.8 g/kg/day), while USDA expresses protein as a percentage of caloric intake (10–35%), and WHO may use a fixed percentage with a lower-bound absolute floor. Implementing three presets without normalising to the same calculation basis means each preset uses a fundamentally different formula, making the outputs incomparable and the code inconsistent.

**Why it happens:**
Different national nutrition authorities use different frameworks. Developers copy the numbers from different sources without noticing the measurement basis differs.

**Consequences:**
The Taiwan preset computes 56 g protein for a 70 kg person while the USDA preset computes 88–350 g for the same person at 2,000 kcal — both are "correct" per their source but incomparable. The preset selector becomes meaningless.

**Prevention:**
- Normalise all guidelines to a single calculation basis before implementing: percentage of TDEE is the most composable.
- When a source uses g/kg body weight, convert: `grams = ratePerKg * weightKg`, then express as a percentage of TDEE for storage.
- Cite sources and basis in code comments so future changes can be verified.

**Warning signs:**
- Two presets for the same user at the same TDEE produce protein gram targets that differ by more than 100g
- Preset constants are a mix of percentages and absolute gram values in the same data structure

**Phase:** Dietary guideline data modelling phase, before any UI is built.

---

### Pitfall 10: Settings State Not Available to Other Pages — Each Page Re-reads localStorage Independently

**What goes wrong:**
The existing app has no global state management — each page manages its own state via hooks. If Settings are stored in localStorage and each page reads them independently on mount, a user who changes their BMR in Settings and navigates to NutritionTracker will see stale targets until they reload the page. This reproduces the existing "background sync never updates UI" bug (CONCERNS.md) in the settings domain.

**Why it happens:**
Without a shared store or context, there is no signal mechanism for "settings changed". Each page's `useEffect` only fires on mount.

**Consequences:**
User changes settings, goes to the nutrition tracker, sees old targets. This is especially confusing when the old targets are the previous hardcoded constants — the settings change appears to have done nothing.

**Prevention:**
- Use a React Context for settings (or a minimal Zustand/Jotai store) so changes propagate reactively.
- Alternatively, use the `storage` window event to listen for localStorage changes and re-render.
- Do not rely on navigation causing a full page remount — with HashRouter and React's component lifecycle, navigating between tabs does not always unmount/remount components.

**Warning signs:**
- NutritionTracker targets do not update after changing settings without a page reload
- Settings reads are spread across multiple `useEffect` calls in different page components

**Phase:** Settings data layer phase. Decide on propagation strategy before implementing any settings consumer.

---

## Minor Pitfalls

---

### Pitfall 11: BMR Formula Produces Negative or Zero for Edge-Case Inputs

**What goes wrong:**
Mifflin-St Jeor can theoretically produce negative values for extreme inputs (very old, very low weight). The formula has no built-in floor. A user who enters 0 or leaves a field blank receives NaN or a negative calorie target, which then causes division-by-zero or negative macro gram calculations.

**Prevention:**
- Validate all inputs before calculating: minimum age 15, minimum weight 30 kg, minimum height 100 cm.
- Add a minimum floor of 500 kcal to BMR output regardless of formula result.
- Show validation errors in zh-TW for out-of-range inputs, not silent wrong values.

**Phase:** BMR calculation phase.

---

### Pitfall 12: GAS URL Input Field Exposes Existing URL to Anyone with Device Access

**What goes wrong:**
The settings page will display the stored GAS URL. The GAS URL is effectively a password — anyone who reads it can access all the user's health data (existing security concern in CONCERNS.md). Showing it in plain text in a form field makes it trivially readable from across the room or in a screenshot.

**Prevention:**
- Mask the URL after first save (show only the domain, e.g. `script.google.com/...`).
- Provide a "test connection" button rather than displaying the full URL.
- Do not log it to the browser console.

**Phase:** Settings UI phase.

---

### Pitfall 13: Preset Switch Does Not Recalculate Immediately on Guideline Change

**What goes wrong:**
If macro targets are computed lazily (e.g., only on page load or on explicit "save"), a user who switches guideline presets does not see updated targets until they navigate away and back. This makes the preset selector feel broken.

**Prevention:**
- Macro targets derived from BMR × guideline preset must be computed reactively — derive them in a `useMemo` or computed selector that re-runs whenever either the BMR profile or selected preset changes.

**Phase:** Settings UI phase.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| `sheets-api.ts` refactor | GAS URL baked at module load (Pitfall 1) | Make URL dynamic before any settings UI |
| BMR formula implementation | Gender constant error, unit conversion (Pitfalls 2, 3) | Unit tests with reference values |
| Activity level UI | Misleading TDEE from bucket selection (Pitfall 4) | Descriptive zh-TW labels with caveats |
| Settings localStorage schema | Schema version migration (Pitfall 5) | Version field + migration function from day one |
| Dietary guideline data model | Incompatible energy bases across countries (Pitfall 9) | Normalise to % of TDEE before implementation |
| Guideline preset computation | Absolute grams vs percentage ratio (Pitfall 6) | Compute grams at display time only |
| Settings UI input | Unvalidated GAS URL (Pitfall 7) | Allowlist `https://script.google.com/` prefix |
| Migrating hardcoded constants | Dual sources of truth (Pitfall 8) | Grep for literal values after migration |
| Cross-page settings access | Stale settings in non-Settings pages (Pitfall 10) | Settings context or storage event listener |

---

## Sources

- Mifflin-St Jeor accuracy review: [PubMed 15883556](https://pubmed.ncbi.nlm.nih.gov/15883556/) — systematic review comparing predictive equations; HIGH confidence
- TDEE activity multiplier error analysis: [MacroFactor help](https://help.macrofactorapp.com/en/articles/126-why-is-my-expenditure-in-macrofactor-different-from-the-output-of-a-tdee-calculator) — >250 kcal/day error in 50% of cases; MEDIUM confidence
- Mifflin-St Jeor formula constants: [Medscape reference](https://reference.medscape.com/calculator/846/mifflin-st-jeor-equation) — authoritative; HIGH confidence
- BMR formula unit requirements (kg/cm): [The Calculator Site](https://www.thecalculatorsite.com/articles/health/bmr-formula.php) — MEDIUM confidence
- Global dietary guideline comparison: [PMC 8471688](https://pmc.ncbi.nlm.nih.gov/articles/PMC8471688/) — food-based guidelines worldwide; MEDIUM confidence
- Taiwan dietary pattern: [PMC 9268716](https://pmc.ncbi.nlm.nih.gov/articles/PMC9268716/) — Healthy Taiwanese Eating Approach; MEDIUM confidence
- localStorage schema versioning: [DEV Community](https://dev.to/prakash_chokalingam/introduction-to-a-stateful-maintainable-react-local-storage-hook-31ie) — MEDIUM confidence (community article, pattern widely corroborated)
- XSS/SPA security: [WorkOS blog](https://workos.com/blog/security-threats-in-spas-and-how-to-defend-against-them) — MEDIUM confidence
- User-input URL validation: [OWASP SSRF Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) — HIGH confidence
- Existing codebase analysis: `.planning/codebase/CONCERNS.md` — HIGH confidence (direct code audit)
