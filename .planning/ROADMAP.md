# Roadmap: Eat Manager — Settings & Nutrition Configuration

## Overview

This milestone adds a proper settings system to an existing offline-first nutrition SPA. The build follows a strict dependency chain: pure data functions first (BMR formulas, dietary guideline catalogs), then the settings persistence layer, then a surgical patch to make the SheetsAPI read its URL at call time rather than module-load time, and finally the settings page UI that wires everything together and migrates hardcoded targets out of existing pages. Each phase produces working, testable output before the next phase begins.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Static Data Foundation** - Pure BMR functions and dietary guideline catalog with no I/O or side effects
- [ ] **Phase 2: Settings Persistence Layer** - SettingsService singleton with versioned localStorage schema
- [x] **Phase 3: SheetsAPI Runtime Config Patch** - Surgical fix to resolve GAS URL at call time, not module-load time (completed 2026-03-30)
- [ ] **Phase 4: Settings Page UI + Integration** - Settings page with BMR form, guideline selector, Sheets config, and hardcoded-target migration

## Phase Details

### Phase 1: Static Data Foundation
**Goal**: Pure BMR calculation functions and dietary guideline catalog exist as tested, importable TypeScript modules
**Depends on**: Nothing (first phase)
**Requirements**: BMR-01, BMR-02, BMR-03, BMR-04, BMR-05, BMR-06, DIET-01, DIET-02, DIET-03, DIET-04, DIET-05, DIET-06, DIET-07
**Success Criteria** (what must be TRUE):
  1. Given known inputs (30yo male, 70kg, 175cm), calculateBMR() returns 1648.75 kcal (Mifflin-St Jeor formula: 10x70 + 6.25x175 - 5x30 + 5)
  2. calculateTDEE() returns a value rounded to nearest 10 for each of the 5 activity levels
  3. GUIDELINES catalog contains exactly 3 presets (Taiwan HPA, Japan MHLW, USDA AMDR) each with issuing authority name, source citation, and macroRatios as percentages that sum to 100%
  4. All TypeScript interfaces (UserProfile, BMRResult, GuidelinePreset, MacroRatios, MacroGrams) are defined and exported; no TypeScript errors on build
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Types extension + BMR/TDEE calculation module (src/data/types.ts + src/data/bmr.ts)
- [x] 01-02-PLAN.md — Dietary guidelines catalog module (src/data/dietary-guidelines.ts)

### Phase 2: Settings Persistence Layer
**Goal**: SettingsService reads and writes user settings synchronously to localStorage with a versioned schema, callable by any module before the UI exists
**Depends on**: Phase 1
**Requirements**: SET-02, SET-03
**Success Criteria** (what must be TRUE):
  1. SettingsService.getUserProfile() returns null on a fresh localStorage, and returns the saved profile after a write without a page reload
  2. Saved settings include a settings_version: 1 field; a future schema migration function can detect and transform version 0 data without corrupting existing values
  3. SettingsService.getComputedTargets() returns null when no profile is saved, and returns correct macronutrient gram targets when a valid profile and active guideline are both saved
**Plans**: 1 plan

Plans:
- [ ] 02-01-PLAN.md — SettingsService singleton with versioned localStorage schema and computed targets (src/lib/settings-service.ts)

### Phase 3: SheetsAPI Runtime Config Patch
**Goal**: SheetsAPI resolves the GAS URL at call time from SettingsService, with fallback to VITE_GAS_URL env var, so a user-configured URL takes effect immediately without a rebuild
**Depends on**: Phase 2
**Requirements**: GS-04, GS-05
**Success Criteria** (what must be TRUE):
  1. Writing a new GAS URL to SettingsService and then triggering any Sheets API call uses the newly written URL, not the value from the previous module import
  2. When no runtime config is stored in localStorage, all Sheets API calls use the VITE_GAS_URL environment variable as fallback, preserving existing behavior for current users
  3. The change is limited to sheets-api.ts with no behavioral change to any existing page or feature when no runtime config is present
**Plans**: 1 plan

Plans:
- [x] 03-01-PLAN.md — Replace module-level GAS_URL constant with per-call getGasUrl() helper (src/lib/sheets-api.ts)

### Phase 4: Settings Page UI + Integration
**Goal**: Users can configure their BMR profile, select dietary guideline presets, and manage their Google Sheets connection from a new 5th tab — and existing pages show settings-derived targets instead of hardcoded values
**Depends on**: Phase 3
**Requirements**: SET-01, SET-04, GS-01, GS-02, GS-03, INT-01, INT-02
**Success Criteria** (what must be TRUE):
  1. A 5th navigation tab (設定) is visible and navigates to the settings page from any page in the app
  2. User can fill in age, sex, height, weight, and activity level; TDEE updates live as each field changes with no submit button; fields outside their valid range show inline zh-TW error messages
  3. User can select from 3 guideline presets; macronutrient gram targets update immediately on preset switch and reflect the user's TDEE, not a reference person's TDEE
  4. User can enter a GAS URL and Sheet ID, tap an explicit save button, and the values persist across app restarts; GAS URL is rejected at save time if it does not start with https://script.google.com/
  5. NutritionTracker and WeightLog no longer contain hardcoded personal targets; both pages derive targets from SettingsService (showing a prompt to complete settings when no profile exists)
**Plans**: 2 plans
**UI hint**: yes

Plans:
- [ ] 04-01-PLAN.md — Settings page (Settings.tsx) with BMR form, guideline selector, Sheets config + App.tsx nav integration
- [ ] 04-02-PLAN.md — Hardcoded target migration in NutritionTracker.tsx and WeightLog.tsx

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Static Data Foundation | 2/2 | Complete |  |
| 2. Settings Persistence Layer | 0/1 | Planned    |  |
| 3. SheetsAPI Runtime Config Patch | 1/1 | Complete   | 2026-03-30 |
| 4. Settings Page UI + Integration | 0/2 | Planned | - |
