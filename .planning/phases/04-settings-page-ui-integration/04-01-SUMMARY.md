---
phase: 04-settings-page-ui-integration
plan: "01"
subsystem: ui
tags: [settings, bmr, dietary-guidelines, sheets-config, navigation]
dependency_graph:
  requires:
    - src/lib/settings-service.ts
    - src/data/bmr.ts
    - src/data/dietary-guidelines.ts
    - src/data/types.ts
  provides:
    - src/pages/Settings.tsx
    - 5th navigation tab (/settings route)
  affects:
    - src/App.tsx
tech_stack:
  added: []
  patterns:
    - controlled-form-with-inline-validation
    - live-derived-value-preview
    - partial-settings-persistence
key_files:
  created:
    - src/pages/Settings.tsx
  modified:
    - src/App.tsx
decisions:
  - "Live TDEE computed from form state directly via calculateBMRResult(), not via SettingsService.getComputedTargets(), to enable real-time preview before save"
  - "GAS URL validation only applied when non-empty; empty string allowed to clear config"
  - "Profile auto-saves on every valid change (no explicit save button for BMR form); Sheets config has explicit save button per plan spec"
metrics:
  duration_seconds: 117
  completed_date: "2026-03-30T02:36:35Z"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase 4 Plan 01: Settings Page UI Integration Summary

Settings page created with live TDEE + BMR form, 3-country guideline selector, and Sheets config persistence — all wired into the app as the 5th bottom nav tab.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create Settings.tsx with BMR form, guideline selector, and Sheets config | 5041a4f | src/pages/Settings.tsx (created) |
| 2 | Add Settings tab and route to App.tsx | 4ba205a | src/App.tsx (modified) |

## What Was Built

**Settings.tsx (363 lines)** — A scrollable settings page with three card sections:

1. **個人資料 (BMR Profile Form)**
   - Five fields: age (10-120), sex (male/female radio buttons), height (100-250cm), weight (30-300kg), activity level (select from ACTIVITY_LEVELS)
   - Inline zh-TW validation errors displayed as `text-red-400 text-xs mt-1` below each invalid field
   - Auto-saves to `SettingsService.saveUserProfile()` on every valid change (all fields pass validation)
   - Live TDEE display: `calculateBMRResult()` called directly on form state, updates on every keystroke, shows `text-emerald-400 text-2xl font-black` when valid or `—` with `text-slate-500` when incomplete/invalid

2. **飲食指南 (Dietary Guideline Selector)**
   - Renders all 3 `GUIDELINES` as selectable cards
   - Each card shows: name, authority + year, macro ratios (蛋白質/脂肪/碳水 %)
   - Selected state: `bg-blue-900/30 border-blue-500/60`; unselected: `bg-slate-800/50 border-slate-700/50`
   - On click: `SettingsService.saveActiveGuidelineId()` called immediately
   - When both TDEE valid and guideline selected: macro grams computed via `calculateMacroGrams()` and displayed as `text-lg font-bold text-slate-200`

3. **Google Sheets 連接 (Sheets Config)**
   - Two text inputs: GAS 網址 and Sheet ID
   - Explicit save button with GAS URL validation: must start with `https://script.google.com/` (or be empty to clear)
   - Error shown in `text-red-400 text-xs mt-2`
   - Success feedback: button text changes to zh-TW `已儲存` in `text-emerald-400` for 2 seconds via `setTimeout`

**App.tsx** — Added import, 5th tab `{ path: "/settings", icon: "⚙️", label: "設定" }`, and `<Route path="/settings" element={<Settings />} />` before wildcard route.

## Verification Results

- `npm run build` passes (TypeScript strict mode + Vite production build): PASS
- `grep -c "設定" src/App.tsx` returns 1: PASS
- `grep -c "SettingsService" src/pages/Settings.tsx` returns 8 (≥ 5): PASS
- `grep -c "calculateBMRResult" src/pages/Settings.tsx` returns 2 (≥ 1): PASS
- `grep "export default function Settings" src/pages/Settings.tsx` matches: PASS

## Deviations from Plan

None — plan executed exactly as written. The `GUIDELINE_MAP` import was included as specified, used for resolving the selected guideline for macro gram computation.

## Known Stubs

None. All three sections have their data sources wired:
- Profile form reads from `SettingsService.getUserProfile()` on mount and saves on valid change
- Guideline selector reads from `SettingsService.getActiveGuidelineId()` on mount and saves on click
- Sheets config reads from `SettingsService.getSheetsConfig()` on mount and saves on explicit button click

## Self-Check: PASSED

- `src/pages/Settings.tsx` exists: FOUND
- `src/App.tsx` modified: FOUND
- Commit 5041a4f exists: FOUND
- Commit 4ba205a exists: FOUND
