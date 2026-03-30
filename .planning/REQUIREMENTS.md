# Requirements: Eat Manager — Settings & Nutrition Configuration

**Defined:** 2026-03-29
**Core Value:** Users can configure their personal metabolic profile and see nutritional intake recommendations tailored to their BMR, based on established national dietary guidelines

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### BMR Calculation

- [x] **BMR-01**: User can input personal data (age, sex, height in cm, weight in kg) on settings page
- [x] **BMR-02**: App calculates BMR using Mifflin-St Jeor formula as default
- [x] **BMR-03**: User can select activity level from 5-level scale (sedentary to extra active)
- [x] **BMR-04**: App displays TDEE (Total Daily Energy Expenditure) as kcal/day, rounded to nearest 10
- [x] **BMR-05**: BMR/TDEE recalculates live as user changes inputs (no submit button)
- [x] **BMR-06**: Inline validation on all inputs (age 10-120, height 100-250cm, weight 30-300kg)

### Dietary Guidelines

- [x] **DIET-01**: App provides at least 3 dietary guideline presets from different countries/organizations
- [x] **DIET-02**: Taiwan (衛福部 DRI) preset with macronutrient ratios
- [x] **DIET-03**: USDA (Dietary Guidelines for Americans / AMDR) preset with macronutrient ratios
- [x] **DIET-04**: WHO/FAO or Japan (MHLW DRI) preset with macronutrient ratios
- [x] **DIET-05**: Each preset displays issuing authority name and source citation
- [x] **DIET-06**: User can select and switch between guideline presets
- [x] **DIET-07**: App calculates macronutrient gram targets (protein/fat/carbs) from TDEE x selected guideline ratios

### Settings Page

- [x] **SET-01**: Settings page accessible via new navigation tab (5th tab)
- [x] **SET-02**: Settings persisted to localStorage across sessions
- [x] **SET-03**: Settings use a versioned schema for future migration support
- [x] **SET-04**: All UI text in Traditional Chinese (zh-TW) matching existing app style

### Google Sheets Connection

- [x] **GS-01**: User can input Google Apps Script Web App URL on settings page
- [x] **GS-02**: User can input Google Sheet ID on settings page
- [x] **GS-03**: Explicit save button for Sheets connection config (not auto-save)
- [x] **GS-04**: SheetsAPI reads GAS URL at call time (runtime config), not module load time
- [x] **GS-05**: Fallback to .env VITE_GAS_URL when no runtime config is set

### Integration

- [ ] **INT-01**: Existing hardcoded targets in NutritionTracker.tsx replaced with settings-derived values
- [ ] **INT-02**: Existing hardcoded weight targets in WeightLog.tsx replaced with settings-derived values

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Enhanced BMR

- **BMR-07**: BMR formula selector (Mifflin-St Jeor / Harris-Benedict / Katch-McArdle)
- **BMR-08**: Optional body fat percentage input (unlocked by Katch-McArdle selection)
- **BMR-09**: Preset goal modes (maintenance / mild cut / bulk) with calorie adjustments

### Enhanced UX

- **UX-01**: Connection test button for Google Sheets ("Connected" / "Failed" status)
- **UX-02**: Visual macro ratio bar chart (colored segments for carbs/protein/fat)
- **UX-03**: Explanation tooltips on each guideline preset
- **UX-04**: Activity level description expansion (accordion/tooltip)
- **UX-05**: Imperial unit toggle option

### Enhanced Integration

- **INT-03**: Automatic nutrient tracking against BMR targets in NutritionTracker
- **INT-04**: Settings sync to Google Sheets as backup

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom macro ratio editor (free-form sliders) | PROJECT.md explicit exclusion; preset-only for v1 |
| Micronutrient targets (vitamins, minerals) | Dramatically increases data maintenance; no existing display surface |
| User accounts / authentication | Single-user static app; localStorage + Sheets covers backup |
| Multiple profiles / family mode | Doubles settings complexity; bottom-tab paradigm doesn't support it |
| BMR coaching tips / motivational content | Settings page is utilitarian — inputs, outputs, save |
| Real-time Sheets sync on every keystroke | Network latency on local config changes; sync on explicit save only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BMR-01 | Phase 1 | Complete |
| BMR-02 | Phase 1 | Complete |
| BMR-03 | Phase 1 | Complete |
| BMR-04 | Phase 1 | Complete |
| BMR-05 | Phase 1 | Complete |
| BMR-06 | Phase 1 | Complete |
| DIET-01 | Phase 1 | Complete |
| DIET-02 | Phase 1 | Complete |
| DIET-03 | Phase 1 | Complete |
| DIET-04 | Phase 1 | Complete |
| DIET-05 | Phase 1 | Complete |
| DIET-06 | Phase 1 | Complete |
| DIET-07 | Phase 1 | Complete |
| SET-01 | Phase 4 | Complete |
| SET-02 | Phase 2 | Complete |
| SET-03 | Phase 2 | Complete |
| SET-04 | Phase 4 | Complete |
| GS-01 | Phase 4 | Complete |
| GS-02 | Phase 4 | Complete |
| GS-03 | Phase 4 | Complete |
| GS-04 | Phase 3 | Complete |
| GS-05 | Phase 3 | Complete |
| INT-01 | Phase 4 | Pending |
| INT-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-03-29*
*Last updated: 2026-03-29 after roadmap creation — all 24 requirements mapped*
