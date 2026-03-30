# Eat Manager — Settings & Nutrition Configuration

## What This Is

A health/nutrition tracking SPA (React + TypeScript + Vite) deployed to GitHub Pages. Users generate daily meal plans from a curated food/remedy catalog, track weight, log nutrition, and configure personal metabolic profiles — all synced to Google Sheets via Apps Script. The app includes BMR-based nutritional recommendations from 3 national dietary guidelines (Taiwan HPA, USDA AMDR, Japan MHLW).

## Core Value

Users can configure their personal metabolic profile and see nutritional intake recommendations tailored to their BMR, based on established national dietary guidelines — all without leaving the static site.

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

(No active requirements — plan next milestone with `/gsd:new-milestone`)

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
*Last updated: 2026-03-30 after v1.0 milestone completion*

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
