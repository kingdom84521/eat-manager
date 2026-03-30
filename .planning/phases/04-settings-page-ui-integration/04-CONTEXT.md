# Phase 4: Settings Page UI + Integration - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Settings page accessible as a 5th navigation tab, with three sections: BMR profile form (live-updating TDEE), dietary guideline preset selector, and Google Sheets connection config. Additionally, NutritionTracker and WeightLog pages migrate from hardcoded targets to SettingsService-derived values, with an empty-state prompt when no profile exists.

</domain>

<decisions>
## Implementation Decisions

### Settings Page Layout
- **D-01:** Single scrollable page with three section headers: (1) BMR profile at top, (2) dietary guideline selector middle, (3) Google Sheets connection config at bottom. No tabs-within-tabs.
- **D-02:** Each section uses the existing dark theme card pattern (`bg-slate-800/50` with rounded corners) — consistent with other pages.
- **D-03:** All UI text in Traditional Chinese (zh-TW) — matching existing app style.

### Navigation Integration
- **D-04:** 5th tab added to the bottom nav: `{ path: "/settings", icon: "⚙️", label: "設定" }`. Appended after the weight tab in the `tabs` array in `App.tsx`.
- **D-05:** New page component: `src/pages/Settings.tsx` (PascalCase, matching existing page naming convention). Route: `/settings`.

### BMR Profile Form
- **D-06:** Form fields: age (number), sex (radio: 男/女), height in cm (number), weight in kg (number), activity level (select from 5-level scale). All labels in zh-TW.
- **D-07:** TDEE updates live as each field changes — no submit button for BMR section. Uses `SettingsService.saveUserProfile()` on each valid change.
- **D-08:** Inline validation with zh-TW error messages: age 10-120, height 100-250cm, weight 30-300kg. Invalid fields show error text below the input (red text, matching existing error pattern in WeightLog).
- **D-09:** TDEE display: rounded to nearest 10 kcal/day, prominently shown below the form inputs.

### Dietary Guideline Selector
- **D-10:** Radio button group or selectable cards showing all 3 presets (Taiwan HPA, USDA AMDR, Japan MHLW). Each displays authority name, source citation, and the macro ratio percentages.
- **D-11:** On preset switch, macronutrient gram targets update immediately below the selector, reflecting the user's own TDEE (not a reference person's). Uses `SettingsService.saveActiveGuidelineId()` + `SettingsService.getComputedTargets()`.
- **D-12:** Macro display shows: protein g, fat g, carb g — derived from user's TDEE x selected guideline ratios.

### Google Sheets Connection
- **D-13:** Two text inputs: GAS URL and Sheet ID. Explicit save button (not auto-save — per Phase 2 D-09 / requirement GS-03).
- **D-14:** GAS URL validation at save time: reject if it does not start with `https://script.google.com/`. Show zh-TW error message on rejection.
- **D-15:** Uses `SettingsService.saveSheetsConfig()` on save. Pre-populates fields from `SettingsService.getSheetsConfig()` on page load if config exists.

### Cross-Page State Propagation
- **D-16:** NutritionTracker and WeightLog read from `SettingsService.getComputedTargets()` on every render — no React Context, no events, no global state. SettingsService reads localStorage synchronously, and pages re-render on navigation. Settings are only changed on the settings page, so no stale data risk.

### Hardcoded Target Migration
- **D-17:** `NutritionTracker.tsx`: Remove `const DAILY_TARGET = { cal: [1600, 1800], protein: [120, 130] }`. Replace with `SettingsService.getComputedTargets()`. When targets are null (no profile), show an inline prompt linking to settings: "請先完成個人設定".
- **D-18:** `WeightLog.tsx`: Remove `const TARGET_KG = 80` and `const START_KG` hardcoded values. Replace weight target with value from `SettingsService.getUserProfile()?.weightKg` or a target weight field. When no profile exists, show the same settings prompt.
- **D-19:** The settings prompt is a simple link/button navigating to `/settings` — not a modal or overlay.

### Claude's Discretion
- Whether BMR form uses controlled inputs with individual `useState` per field or a single form state object
- Whether guideline selector uses radio buttons or selectable cards
- Specific Tailwind styling within the dark theme constraints
- Whether to extract shared validation helpers or inline them
- How to handle the weight target in WeightLog (user's current weight from profile vs a separate goal weight field) — the key requirement is removing the hardcoded constant

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Target Files
- `src/App.tsx` — Route definitions and bottom nav tabs array; add 5th tab and `/settings` route
- `src/pages/NutritionTracker.tsx` — Contains hardcoded `DAILY_TARGET`; migrate to SettingsService
- `src/pages/WeightLog.tsx` — Contains hardcoded `TARGET_KG`; migrate to SettingsService

### Service Layer (dependencies)
- `src/lib/settings-service.ts` — `SettingsService` singleton: `getUserProfile()`, `getActiveGuidelineId()`, `getSheetsConfig()`, `getComputedTargets()`, `saveUserProfile()`, `saveActiveGuidelineId()`, `saveSheetsConfig()`
- `src/data/bmr.ts` — `calculateBMRResult()`, `ACTIVITY_LEVELS` array for the form selector
- `src/data/dietary-guidelines.ts` — `GUIDELINES` catalog for the preset selector, `calculateMacroGrams()`
- `src/data/types.ts` — `UserProfile`, `ActivityLevelId`, `MacroGrams`, `GuidelinePreset` types

### Existing Page Patterns
- `src/pages/DailyPlan.tsx` — Reference for page component structure, sub-components, Tailwind styling patterns
- `src/pages/WeightLog.tsx` — Reference for form input handling, validation pattern
- `src/styles/index.css` — Custom theme tokens (`--color-surface`, `--color-surface-raised`, `--color-emerald-glow`)

### Requirements
- `.planning/REQUIREMENTS.md` — SET-01, SET-04, GS-01, GS-02, GS-03, INT-01, INT-02

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `App.tsx` tabs array pattern: `{ path, icon, label }` — extend with 5th entry
- `WeightLog.tsx` form input pattern: controlled input with `useState`, `parseFloat`, range validation with early return
- `SettingsService`: Complete getter/setter API already implemented (Phase 2)
- `ACTIVITY_LEVELS` array in `bmr.ts`: Labels in zh-TW, ready for select dropdown
- `GUIDELINES` array in `dietary-guidelines.ts`: Authority names and citations in zh-TW
- `calculateBMRResult()` and `calculateMacroGrams()`: Ready to import for live TDEE/macro computation

### Established Patterns
- Page components: default export, PascalCase, `src/pages/` directory
- Local state via `useState` hooks — no global state
- Tailwind dark theme: `bg-slate-950` base, `bg-slate-800/50` cards, `text-slate-100` text
- Sub-components defined in same file as parent page (e.g., `TagBadge`, `ItemCard` in DailyPlan)
- JSX with inline Tailwind classes, dynamic styles via template literals

### Integration Points
- `App.tsx`: Add route + tab entry
- `NutritionTracker.tsx`: Replace `DAILY_TARGET` with `SettingsService.getComputedTargets()`
- `WeightLog.tsx`: Replace `TARGET_KG` with settings-derived value
- Bottom nav: 5 tabs → may need slight width adjustment for mobile

</code_context>

<specifics>
## Specific Ideas

- Tab label: "設定" (Settings in zh-TW)
- Tab icon: ⚙️ (gear)
- Empty state prompt text: "請先完成個人設定" (Please complete personal settings first)
- GAS URL validation prefix: `https://script.google.com/`
- Validation messages in zh-TW: "年齡須介於 10-120", "身高須介於 100-250 公分", "體重須介於 30-300 公斤"

</specifics>

<deferred>
## Deferred Ideas

- Connection test button for Google Sheets ("Connected" / "Failed" status) — v2 requirement UX-01
- Visual macro ratio bar chart — v2 requirement UX-02
- Explanation tooltips on guideline presets — v2 requirement UX-03
- Activity level description expansion — v2 requirement UX-04
- Imperial unit toggle — v2 requirement UX-05

</deferred>

---

*Phase: 04-settings-page-ui-integration*
*Context gathered: 2026-03-30*
