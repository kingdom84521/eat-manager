# Phase 4: Settings Page UI + Integration - Research

**Researched:** 2026-03-30
**Domain:** React SPA form UI, controlled inputs, live computation, cross-page state, Tailwind v4 dark theme
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Single scrollable page with three section headers: (1) BMR profile at top, (2) dietary guideline selector middle, (3) Google Sheets connection config at bottom. No tabs-within-tabs.
- **D-02:** Each section uses the existing dark theme card pattern (`bg-slate-800/50` with rounded corners) — consistent with other pages.
- **D-03:** All UI text in Traditional Chinese (zh-TW) — matching existing app style.
- **D-04:** 5th tab added to the bottom nav: `{ path: "/settings", icon: "⚙️", label: "設定" }`. Appended after the weight tab in the `tabs` array in `App.tsx`.
- **D-05:** New page component: `src/pages/Settings.tsx` (PascalCase, matching existing page naming convention). Route: `/settings`.
- **D-06:** Form fields: age (number), sex (radio: 男/女), height in cm (number), weight in kg (number), activity level (select from 5-level scale). All labels in zh-TW.
- **D-07:** TDEE updates live as each field changes — no submit button for BMR section. Uses `SettingsService.saveUserProfile()` on each valid change.
- **D-08:** Inline validation with zh-TW error messages: age 10-120, height 100-250cm, weight 30-300kg. Invalid fields show error text below the input (red text, matching existing error pattern in WeightLog).
- **D-09:** TDEE display: rounded to nearest 10 kcal/day, prominently shown below the form inputs.
- **D-10:** Radio button group or selectable cards showing all 3 presets (Taiwan HPA, USDA AMDR, Japan MHLW). Each displays authority name, source citation, and the macro ratio percentages.
- **D-11:** On preset switch, macronutrient gram targets update immediately below the selector, reflecting the user's own TDEE (not a reference person's). Uses `SettingsService.saveActiveGuidelineId()` + `SettingsService.getComputedTargets()`.
- **D-12:** Macro display shows: protein g, fat g, carb g — derived from user's TDEE x selected guideline ratios.
- **D-13:** Two text inputs: GAS URL and Sheet ID. Explicit save button (not auto-save).
- **D-14:** GAS URL validation at save time: reject if it does not start with `https://script.google.com/`. Show zh-TW error message on rejection.
- **D-15:** Uses `SettingsService.saveSheetsConfig()` on save. Pre-populates fields from `SettingsService.getSheetsConfig()` on page load if config exists.
- **D-16:** NutritionTracker and WeightLog read from `SettingsService.getComputedTargets()` on every render — no React Context, no events, no global state. SettingsService reads localStorage synchronously, and pages re-render on navigation. Settings are only changed on the settings page, so no stale data risk.
- **D-17:** `NutritionTracker.tsx`: Remove `const DAILY_TARGET = { cal: [1600, 1800], protein: [120, 130] }`. Replace with `SettingsService.getComputedTargets()`. When targets are null (no profile), show an inline prompt linking to settings: "請先完成個人設定".
- **D-18:** `WeightLog.tsx`: Remove `const TARGET_KG = 80` and `const START_KG` hardcoded values. Replace weight target with value from `SettingsService.getUserProfile()?.weightKg` or a target weight field. When no profile exists, show the same settings prompt.
- **D-19:** The settings prompt is a simple link/button navigating to `/settings` — not a modal or overlay.

### Claude's Discretion

- Whether BMR form uses controlled inputs with individual `useState` per field or a single form state object
- Whether guideline selector uses radio buttons or selectable cards
- Specific Tailwind styling within the dark theme constraints
- Whether to extract shared validation helpers or inline them
- How to handle the weight target in WeightLog (user's current weight from profile vs a separate goal weight field) — the key requirement is removing the hardcoded constant

### Deferred Ideas (OUT OF SCOPE)

- Connection test button for Google Sheets ("Connected" / "Failed" status) — v2 requirement UX-01
- Visual macro ratio bar chart — v2 requirement UX-02
- Explanation tooltips on guideline presets — v2 requirement UX-03
- Activity level description expansion — v2 requirement UX-04
- Imperial unit toggle — v2 requirement UX-05
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SET-01 | Settings page accessible via new navigation tab (5th tab) | App.tsx tabs array pattern directly supports this; add entry + Route |
| SET-04 | All UI text in Traditional Chinese (zh-TW) matching existing app style | All zh-TW labels and error strings identified and specified below |
| GS-01 | User can input Google Apps Script Web App URL on settings page | Controlled text input with `useState`; pre-populated from `SettingsService.getSheetsConfig()` |
| GS-02 | User can input Google Sheet ID on settings page | Same pattern as GS-01 |
| GS-03 | Explicit save button for Sheets connection config (not auto-save) | Dedicated save handler with URL validation before calling `saveSheetsConfig()` |
| INT-01 | Existing hardcoded targets in NutritionTracker.tsx replaced with settings-derived values | `DAILY_TARGET` constant removal; `SettingsService.getComputedTargets()` call on render; null-guard with prompt |
| INT-02 | Existing hardcoded weight targets in WeightLog.tsx replaced with settings-derived values | `TARGET_KG` + `START_KG` constant removal; `SettingsService.getUserProfile()?.weightKg` as fallback |
</phase_requirements>

---

## Summary

This phase is primarily a UI composition task, not a library research task. All backend service contracts (`SettingsService`, `ACTIVITY_LEVELS`, `GUIDELINES`, `calculateBMRResult`, `calculateMacroGrams`) were fully implemented in Phases 1 and 2. The research confirms that every API this UI will call already exists, is typed, and is tested by the data foundation.

The key implementation decisions are already locked by CONTEXT.md. The main technical questions reduce to: (1) how to structure the BMR form state, (2) how to connect the existing service APIs to live-updating JSX, and (3) how to handle the WeightLog migration gracefully when `START_KG` is removed (since it was used as the progress bar origin, not just a display constant).

**Primary recommendation:** Implement `Settings.tsx` as a single 200-250 line component following the existing page patterns. Use one form state object (not per-field `useState`) for the BMR section to simplify validation orchestration. Use selectable cards (not raw radio inputs) for guideline presets to match the card-heavy dark UI language. Migrate `WeightLog.tsx` by using the user's current logged weight as the progress origin when profile exists, removing both hardcoded constants.

---

## Standard Stack

### Core (already installed, no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.1.0 | UI rendering, `useState` | Already in project |
| React Router DOM | ^7.6.0 | `useNavigate()` for settings prompt link | Already in project |
| Tailwind CSS | ^4.1.7 | All styling via utility classes | Project requirement |
| TypeScript | ~5.8.3 | Type safety on form state | Project requirement |

**No new npm packages are required for this phase.** All functionality is implemented with existing dependencies.

### Supporting (internal modules, no install needed)

| Module | Path | Purpose |
|--------|------|---------|
| SettingsService | `src/lib/settings-service.ts` | All read/write operations |
| ACTIVITY_LEVELS | `src/data/bmr.ts` | Populates activity level select |
| GUIDELINES | `src/data/dietary-guidelines.ts` | Renders preset selector |
| calculateBMRResult | `src/data/bmr.ts` | Live TDEE calculation in form |
| calculateMacroGrams | `src/data/dietary-guidelines.ts` | Macro gram display in guideline section |
| UserProfile, ActivityLevelId, MacroGrams | `src/data/types.ts` | Form state typing |

---

## Architecture Patterns

### Recommended Project Structure Addition

```
src/
├── pages/
│   ├── Settings.tsx          # NEW — 5th tab page
│   ├── NutritionTracker.tsx  # MODIFY — remove DAILY_TARGET, add null-guard
│   ├── WeightLog.tsx         # MODIFY — remove TARGET_KG/START_KG, add null-guard
│   └── ...
├── App.tsx                   # MODIFY — add tab + route
└── lib/
    └── settings-service.ts   # UNCHANGED — API complete from Phase 2
```

### Pattern 1: Controlled Form State Object (BMR Section)

**What:** Single `useState` with the full `UserProfile` shape plus a parallel error object, updated field-by-field with spread.
**When to use:** When multiple fields are validated together before a save action (or live save on valid change).

```typescript
// Source: project pattern from WeightLog.tsx + TypeScript types
interface ProfileFormState {
  ageYears: string;       // string to allow in-progress input (e.g., "")
  sex: "male" | "female";
  heightCm: string;
  weightKg: string;
  activityLevelId: ActivityLevelId;
}

interface ProfileErrors {
  ageYears?: string;
  heightCm?: string;
  weightKg?: string;
}

const [profile, setProfile] = useState<ProfileFormState>(() => {
  const saved = SettingsService.getUserProfile();
  return saved
    ? { ...saved, ageYears: String(saved.ageYears), heightCm: String(saved.heightCm), weightKg: String(saved.weightKg) }
    : { ageYears: "", sex: "male", heightCm: "", weightKg: "", activityLevelId: "sedentary" };
});
const [errors, setErrors] = useState<ProfileErrors>({});
```

**Why strings for numbers:** `<input type="number">` value must be a string in controlled inputs. Parsing happens at validation/save time, not on every keystroke.

### Pattern 2: Live Save on Valid Change (D-07 compliance)

**What:** In the `onChange` handler, validate the changed field. If the whole profile is valid, immediately call `SettingsService.saveUserProfile()`.

```typescript
// Source: D-07, D-08 from CONTEXT.md
function handleProfileChange(field: keyof ProfileFormState, value: string) {
  const next = { ...profile, [field]: value };
  setProfile(next);
  const errs = validateProfile(next);
  setErrors(errs);
  if (Object.keys(errs).length === 0 && isProfileComplete(next)) {
    SettingsService.saveUserProfile(parseProfileForm(next));
  }
}
```

**Key insight:** Save only when ALL fields are valid simultaneously, not per-field. This prevents saving a partial/inconsistent profile.

### Pattern 3: Selectable Card for Guideline Preset (Claude's Discretion)

**What:** `div` styled as a card with `onClick`, visually highlighted when selected (ring/border color change). Better touch target than radio `<input>`.

```typescript
// Source: ItemCard pattern from DailyPlan.tsx adapted
{GUIDELINES.map((g) => (
  <div
    key={g.id}
    onClick={() => handleGuidelineSelect(g.id)}
    className={`rounded-xl p-4 mb-3 cursor-pointer border transition-colors ${
      activeId === g.id
        ? "bg-blue-900/30 border-blue-500/60"
        : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600"
    }`}
  >
    <div className="font-bold text-sm">{g.name}</div>
    <div className="text-xs text-slate-400">{g.authority} · {g.year}</div>
    <div className="text-xs text-slate-500 mt-1">
      蛋白質 {g.macroRatios.protein}% · 脂肪 {g.macroRatios.fat}% · 碳水 {g.macroRatios.carb}%
    </div>
  </div>
))}
```

### Pattern 4: Null-Guard Empty State (D-17, D-18)

**What:** Check `SettingsService.getComputedTargets()` at component render. Render a navigation prompt when null.

```typescript
// Source: D-17 from CONTEXT.md
import { useNavigate } from "react-router-dom";

export default function NutritionTracker() {
  const navigate = useNavigate();
  const targets = SettingsService.getComputedTargets();

  if (!targets) {
    return (
      <div className="px-4 pt-5 text-center">
        <p className="text-slate-400 mb-4">請先完成個人設定</p>
        <button
          onClick={() => navigate("/settings")}
          className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-bold"
        >
          前往設定
        </button>
      </div>
    );
  }
  // ... rest of component using targets.tdee, targets.macros
}
```

### Pattern 5: GAS URL Explicit Save (D-13, D-14)

**What:** Controlled text inputs with local state. On save button click: validate URL prefix, call `SettingsService.saveSheetsConfig()` on pass, set error state on fail.

```typescript
// Source: D-13, D-14, D-15 from CONTEXT.md
const [gasUrl, setGasUrl] = useState(() => SettingsService.getSheetsConfig()?.gasUrl ?? "");
const [sheetId, setSheetId] = useState(() => SettingsService.getSheetsConfig()?.sheetId ?? "");
const [sheetsError, setSheetsError] = useState<string | null>(null);

function handleSheetsSave() {
  if (!gasUrl.startsWith("https://script.google.com/")) {
    setSheetsError("GAS 網址必須以 https://script.google.com/ 開頭");
    return;
  }
  SettingsService.saveSheetsConfig({ gasUrl, sheetId });
  setSheetsError(null);
}
```

### Anti-Patterns to Avoid

- **Separate `useState` per BMR field:** Creates 5+ state variables that must stay in sync; a state object is cleaner and enables validation across fields simultaneously.
- **Auto-saving Sheets config:** Locked as out of scope by D-13. Always use explicit save button.
- **Computing TDEE in the component:** `SettingsService.getComputedTargets()` already does this. Calling `calculateBMRResult` directly in the page re-duplicates logic. Exception: for the live TDEE preview in the Settings form itself, computing in the component is correct so the display updates instantly before the profile is saved (i.e., when the form is partially valid but the user is mid-entry).
- **Storing derived values (TDEE, macro grams) in state:** Compute on-demand from form state or from `SettingsService`. STATE.md records this as an explicit architecture decision.
- **Using `useNavigate()` outside a router context:** It is already inside `HashRouter` in `main.tsx` — safe to use in any page component.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TDEE calculation | custom formula | `calculateBMRResult()` in `src/data/bmr.ts` | Already validated; BMR ref value 1648.75 verified |
| Macro gram calculation | custom ratio math | `calculateMacroGrams()` in `src/data/dietary-guidelines.ts` | Already handles protein/4, fat/9, carb/4 kcal/g |
| Settings persistence | direct `localStorage.setItem` | `SettingsService.saveUserProfile/saveActiveGuidelineId/saveSheetsConfig` | Handles versioned schema, try/catch, migration |
| Guidelines catalog | hardcoded JSX strings | `GUIDELINES` array from `src/data/dietary-guidelines.ts` | Sources, ratios, and zh-TW labels already there |
| Activity level options | hardcoded `<option>` elements | `ACTIVITY_LEVELS` array from `src/data/bmr.ts` | zh-TW labels and IDs already typed |

**Key insight:** Phases 1 and 2 were specifically designed to leave Phase 4 as pure UI composition. Every computation, every data catalog, and every persistence call is already implemented and exported.

---

## WeightLog Migration: Critical Analysis

This is the most nuanced migration in the phase. The current `WeightLog.tsx` uses:

```typescript
const TARGET_KG = 80;        // goal weight
const START_KG = 104;        // origin of progress bar
```

Both serve different purposes:
- `TARGET_KG` is a goal weight — the profile has `weightKg` but that is *current* weight, not goal weight.
- `START_KG` is the starting weight for progress calculation — this has no equivalent in `UserProfile`.

**Decision (Claude's Discretion, per CONTEXT.md D-18):** The requirement is to remove the hardcoded constants. The cleanest approach aligned with existing `UserProfile` shape:

1. Use `SettingsService.getUserProfile()?.weightKg` as the displayed "current target/reference weight" — it is the profile weight, which was entered by the user.
2. For the progress bar origin (`START_KG`), either: (a) use the maximum weight in the entries log as the inferred start, or (b) remove the progress bar entirely when no hardcoded start exists and show only the raw entries list.
3. Option (b) is safer and simpler: when no profile, show the prompt. When profile exists, show current profile weight as the target reference, and remove the START_KG-dependent progress bar or replace it with a simpler "latest vs profile weight" comparison.

**Recommendation:** Show `latest logged weight` vs `profile weightKg` as a delta ("目前 XX.X kg / 設定目標 XX.X kg"), replacing the progress bar that required START_KG. This is less information loss than hiding the section, and does not require adding a new `goalWeightKg` field to `UserProfile` (which would require a new data layer decision outside this phase's scope).

---

## Common Pitfalls

### Pitfall 1: Live TDEE Display Shows Stale Value When Profile Not Yet Saved

**What goes wrong:** User updates a field, TDEE display updates visually (from form state), but `getComputedTargets()` on other pages still returns the old value because `saveUserProfile()` is only called when ALL fields are valid.
**Why it happens:** The live preview in Settings must compute TDEE from local form state, not from `SettingsService`. The service only gets the valid snapshot.
**How to avoid:** Compute live TDEE preview directly from local form state using `calculateBMRResult()`. Call `SettingsService.saveUserProfile()` only when valid. This is intentional and correct.
**Warning signs:** If TDEE preview shows a value but NutritionTracker still shows null-state prompt, the profile hasn't been saved yet — that is correct behavior.

### Pitfall 2: Number Input Empty String Type Error

**What goes wrong:** `<input type="number" value={profile.ageYears}>` where `ageYears` is typed as `number` produces a React warning and broken controlled input during partial entry (e.g., user clears field to type new value).
**Why it happens:** Controlled number inputs must use string state internally to handle empty string, negative sign, decimal-in-progress.
**How to avoid:** Store form fields as `string` in form state object. Parse to `number` only at validation/save time with `parseInt`/`parseFloat`. Pattern from `WeightLog.tsx`: `const kg = parseFloat(inputKg)`.

### Pitfall 3: Bottom Nav Tab Width on 5 Items

**What goes wrong:** Adding a 5th tab to `flex` container on narrow mobile (320px) makes each tab 64px wide. Icon + label may wrap or truncate.
**Why it happens:** `flex-1` distributes equal width; 5 items at 320px = 64px each. Current 4-tab layout is 80px each.
**How to avoid:** The existing tabs use `py-2 text-xs` — this is already compact. 64px per tab is workable for a single Chinese character label ("設定" is 2 chars) + 1.125rem emoji icon. No change needed. Verify visually in dev server. If needed, reduce `py-2` to `py-1.5` or use `text-[10px]` for label.

### Pitfall 4: `navigate()` Used in Module Scope (Outside Component)

**What goes wrong:** Calling `useNavigate()` at module top level or inside event handlers outside a React component throws "useNavigate() may be used only in the context of a Router component."
**Why it happens:** React hooks can only be called inside functional components or custom hooks.
**How to avoid:** Always call `useNavigate()` at the top of the functional component body, not conditionally and not in util functions. The returned `navigate` function can be passed to handlers.

### Pitfall 5: TypeScript `noUnusedLocals` Catching Removed Constants

**What goes wrong:** After removing `DAILY_TARGET` and `TARGET_KG`, any import or variable that referenced them and is now unused causes `tsc -b` to fail (project has `noUnusedLocals: true`).
**Why it happens:** TypeScript strict config enforced project-wide.
**How to avoid:** When removing a constant, scan its usage sites in the same file and remove or replace all references. Run `npm run build` as the verification step — it runs `tsc -b` first.

---

## Code Examples

### Verified — Existing Page Structure (reference for Settings.tsx shape)

```typescript
// Source: src/pages/WeightLog.tsx — controlled input + validation pattern
const [inputKg, setInputKg] = useState("");

const handleLog = async () => {
  const kg = parseFloat(inputKg);
  if (isNaN(kg) || kg < 40 || kg > 200) return;
  // ...
};
```

### Verified — App.tsx Tab Array Extension Point

```typescript
// Source: src/App.tsx — tabs array (add 5th entry here)
const tabs = [
  { path: "/plan",     icon: "🎲", label: "方案" },
  { path: "/track",   icon: "📊", label: "飲食" },
  { path: "/schedule",icon: "💊", label: "時程" },
  { path: "/weight",  icon: "⚖️", label: "體重" },
  { path: "/settings",icon: "⚙️", label: "設定" },  // ADD THIS
];
```

Route addition in `<Routes>`:
```tsx
<Route path="/settings" element={<Settings />} />
```
Place BEFORE the wildcard `<Route path="*" ...>` line.

### Verified — SettingsService API Surface

```typescript
// Source: src/lib/settings-service.ts — complete API
SettingsService.getUserProfile()           // → UserProfile | null
SettingsService.getActiveGuidelineId()     // → string | null
SettingsService.getSheetsConfig()          // → SheetsConfig | null
SettingsService.getComputedTargets()       // → { tdee: number; macros: MacroGrams } | null
SettingsService.saveUserProfile(profile)   // → void
SettingsService.saveActiveGuidelineId(id)  // → void
SettingsService.saveSheetsConfig(config)   // → void
```

### Verified — ACTIVITY_LEVELS for Select Dropdown

```typescript
// Source: src/data/bmr.ts
import { ACTIVITY_LEVELS } from "../data/bmr";

<select value={profile.activityLevelId} onChange={...}>
  {ACTIVITY_LEVELS.map((a) => (
    <option key={a.id} value={a.id}>{a.label}</option>
  ))}
</select>
```

### Verified — GUIDELINES for Preset Selector

```typescript
// Source: src/data/dietary-guidelines.ts
import { GUIDELINES } from "../data/dietary-guidelines";

// Each entry has: id, name, authority, sourceUrl, year, macroRatios.{protein,fat,carb}
```

### Verified — Validation Messages (zh-TW, per D-08 + CONTEXT.md specifics)

```typescript
const VALIDATION = {
  age:    "年齡須介於 10–120",
  height: "身高須介於 100–250 公分",
  weight: "體重須介於 30–300 公斤",
  gasUrl: "GAS 網址必須以 https://script.google.com/ 開頭",
} as const;
```

---

## State of the Art

This phase operates on a stable, mature stack (React 19, Tailwind v4, TypeScript 5.8). No significant API changes are expected.

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `tailwind.config.js` theme extension | `@theme` directive in `src/styles/index.css` | Tailwind v4 — already in use; no config file needed |
| `useHistory()` from React Router v5 | `useNavigate()` from React Router v7 | Already v7; `useNavigate()` is correct |
| Class components | Functional components only | Project enforces this |

---

## Open Questions

1. **WeightLog progress bar origin after removing START_KG**
   - What we know: `START_KG = 104` is hardcoded. The `UserProfile` type has no `startWeightKg` or `goalWeightKg` field.
   - What's unclear: Should the planner add a `goalWeightKg` field to `UserProfile` (data layer change), use the max weight from history as inferred start, or simply replace the progress bar with a delta display?
   - Recommendation: Replace progress bar with a simpler delta display (`latestKg vs profile.weightKg`) without adding new fields to `UserProfile`. This keeps the phase scope tight and avoids touching the data layer. If the user later wants a goal weight feature, that can be added in v2.

2. **Settings page TDEE display when form is partially filled**
   - What we know: TDEE requires all 5 fields to be valid simultaneously.
   - What's unclear: Should the TDEE display show "—" or "請填寫完整資料" when any field is invalid/empty?
   - Recommendation: Show "—" (em dash) with a `text-slate-500` style when not all fields are valid. This is a visual convention that implies "not yet computed" without an error tone.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this phase adds UI components using already-installed packages with no new CLI tools, services, or runtimes required).

---

## Sources

### Primary (HIGH confidence)

- Direct file reads: `src/App.tsx`, `src/pages/NutritionTracker.tsx`, `src/pages/WeightLog.tsx`, `src/pages/DailyPlan.tsx` — exact code patterns verified
- Direct file reads: `src/lib/settings-service.ts` — complete API surface verified
- Direct file reads: `src/data/bmr.ts`, `src/data/dietary-guidelines.ts`, `src/data/types.ts` — all exported symbols confirmed
- Direct file reads: `.planning/phases/04-settings-page-ui-integration/04-CONTEXT.md` — all decisions locked

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — cross-phase decisions and blockers confirmed; "derived values computed on demand, never stored" confirmed as architectural decision

### Tertiary (LOW confidence)

- None — all claims are grounded in direct code inspection of the repository.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies are already installed and imported in the codebase
- Architecture: HIGH — all patterns are direct extensions of existing page patterns in the repo
- Pitfalls: HIGH — identified from direct inspection of existing code and TypeScript config
- WeightLog migration: MEDIUM — the exact approach to the progress bar origin is a discretionary call documented as an open question

**Research date:** 2026-03-30
**Valid until:** This is a closed-scope implementation research. Findings are stable indefinitely (no external dependencies to drift).
