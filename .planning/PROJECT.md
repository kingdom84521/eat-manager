# Eat Manager — Item Management & Supplement Routines

## What This Is

A health/nutrition tracking SPA (React + TypeScript + Vite) deployed to GitHub Pages. Users manage two types of items — foods (with nutrition labels or composed from ingredients) and supplements (with inventory tracking and routine planning) — track weight, log nutrition, and configure personal metabolic profiles. All data synced to Google Sheets via Apps Script.

## Core Value

Users can manage their food and supplement items, track supplement inventory, and generate intelligent daily supplement routines that deterministically cover all their health goals — all from a static site synced to Google Sheets.

## Current Milestone: v3.0 Sidebar Navigation & Page Consolidation

**Goal:** 從底部 tab 改為 sidebar drawer 導航，合併今日方案 + 飲食紀錄 + 補品時程為統一的打勾式介面，新增菜單管理功能。

**Target features:**
- Collapsable sidebar drawer replacing bottom tab navigation
- Today's Plan overhaul: merged food plan + nutrition log + supplement routine into unified checkbox-based interface
  - Check = log consumed, uncheck = remove log entry
  - Lock full-page re-random when any item is checked; allow single-item re-random
- My Menu (我的菜單): new feature — create, save, reuse meal combinations
- Profile page: weight log + avatar+name entry at drawer bottom (separate from settings)
- Settings page: icon entry at drawer bottom (independent page)

## Requirements

### Validated

- ✓ Daily meal plan generation with food/remedy catalog — existing
- ✓ Weight logging and progress tracking — existing
- ✓ Nutrition tracking page — existing
- ✓ Offline-first persistence (localStorage + Google Sheets sync) — existing
- ✓ Google Apps Script backend proxy for Sheets CRUD — existing
- ✓ Mobile-first responsive UI with bottom tab navigation — existing
- ✓ GitHub Pages deployment with HashRouter — existing
- ✓ BMR calculation using Mifflin-St Jeor formula — v1.0
- ✓ Integration of dietary guidelines from 3 countries — v1.0
- ✓ Nutritional intake ratio presets derived from BMR x dietary guidelines — v1.0
- ✓ Settings persisted to localStorage with versioned schema — v1.0
- ✓ SheetsAPI runtime config (GAS URL at call time with env var fallback) — v1.0
- ✓ Settings page with BMR form, guideline selector, Sheets config (5th tab ⚙️ 設定) — v1.0
- ✓ NutritionTracker and WeightLog use settings-derived targets — v1.0

### Active

- [ ] Settings page accessible via icon at drawer bottom

### Recently Validated (v3.0)

- ✓ Sidebar drawer navigation replacing bottom tab bar — Phase 10
- ✓ Profile page with weight log, avatar+name at drawer bottom — Phase 11
- ✓ Unified daily plan: checkbox interface merging food plan + nutrition log + supplement routine — Phase 12
- ✓ Single-item re-random with lock on full re-random when items are checked — Phase 12
- ✓ My Menu: create, save, reuse meal combinations — Phase 13

### Recently Validated (v2.0)

- ✓ Data model restructure: Food & Supplement types only — Phase 5
- ✓ Food CRUD with nutrition label input — Phase 7
- ✓ Food composition from ingredients with dynamic calorie recalculation — Phase 7
- ✓ Public nutrition database integration (Open Food Facts) — Phase 7
- ✓ Supplement CRUD with rich metadata (interactions, timing, dosage) — Phase 8
- ✓ Supplement inventory management (quantity tracking, remaining calculation) — Phase 8
- ✓ Supplement routine generator (deterministic, covers all daily goals) — Phase 9

### Out of Scope

- Server-side BMR calculation — all client-side, this is a static site
- User authentication/accounts — single-user app
- Custom macro ratio editor — v1 uses preset ratios from established guidelines only
- Automatic nutrient tracking against BMR targets — future milestone

## Context

- 3,060 LOC TypeScript across 5 pages, 4 data modules, 3 service modules
- 5 routes: `/plan`, `/track`, `/schedule`, `/weight`, `/settings`
- Entirely in Traditional Chinese (zh-TW)
- `SettingsService` singleton manages user profile, guideline selection, and Sheets config in localStorage
- SheetsAPI resolves GAS URL at call time from SettingsService (runtime configurable)
- No global state management — each page reads from SettingsService on render
- Tailwind CSS v4 with custom dark theme tokens

## Constraints

- **Tech stack**: Must remain a static SPA (React + Vite + GitHub Pages). No SSR, no server.
- **Language**: All user-facing text in Traditional Chinese
- **Styling**: Tailwind CSS v4 with existing dark theme tokens
- **Data**: Dietary guidelines must reference real, citable national sources
- **Compatibility**: Must work offline — settings stored in localStorage

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Runtime Google Sheets config (not just .env) | Users need to connect their own sheets without rebuilding | ✓ Shipped v1.0 |
| At least 3 country dietary guidelines | Provides meaningful variety in nutritional recommendations | ✓ Shipped v1.0 (Taiwan HPA, USDA AMDR, Japan MHLW) |
| BMR as foundation for recommendations | Industry-standard approach to personalized nutrition | ✓ Shipped v1.0 (Mifflin-St Jeor) |
| Single mid-range percentage per macro (not ranges) | Simpler for users, fewer decisions | ✓ Shipped v1.0 |
| Derived values never stored | Prevents stale cache bugs | ✓ Shipped v1.0 |
| Read-on-render for cross-page state | No React Context needed; SettingsService reads localStorage synchronously | ✓ Shipped v1.0 |

---
*Last updated: 2026-04-06 — milestone v3.0 started*

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state
