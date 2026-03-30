# Eat Manager — Settings & Nutrition Configuration

## What This Is

A health/nutrition tracking SPA (React + TypeScript + Vite) deployed to GitHub Pages. Users can generate daily meal plans from a curated food/remedy catalog, track weight, and log nutrition — all synced to Google Sheets via Apps Script. This milestone focuses on adding a proper settings system: personal BMR configuration, multi-country dietary guideline integration, and in-app Google Sheets connection setup.

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
- ✓ BMR calculation using Mifflin-St Jeor formula — Phase 1
- ✓ Integration of dietary guidelines from 3 countries (Taiwan HPA, USDA AMDR, Japan MHLW) — Phase 1
- ✓ Nutritional intake ratio presets derived from BMR x dietary guidelines — Phase 1
- ✓ Settings persisted to localStorage with versioned schema — Phase 2
- ✓ SheetsAPI reads GAS URL at call time (runtime config, not module-load time) — Phase 3
- ✓ Fallback to .env VITE_GAS_URL when no runtime config is set — Phase 3

- ✓ Settings page accessible from app navigation (5th tab ⚙️ 設定) — Phase 4
- ✓ Personal BMR configuration UI with live TDEE preview — Phase 4
- ✓ User can select and switch between guideline presets — Phase 4
- ✓ Google Sheets connection configuration UI with explicit save — Phase 4
- ✓ NutritionTracker and WeightLog use settings-derived targets — Phase 4

### Active

(All v1 requirements validated — milestone complete)

### Out of Scope

- Server-side BMR calculation — all client-side, this is a static site
- User authentication/accounts — single-user app
- Custom macro ratio editor — v1 uses preset ratios from established guidelines only
- Automatic nutrient tracking against BMR targets — future milestone

## Context

- The app is entirely in Traditional Chinese (zh-TW), all new UI should match
- Existing data layer uses `DataService` pattern (localStorage primary, Sheets async background)
- Google Sheets connection currently configured via `.env` variables (`VITE_GAS_URL`, `VITE_SHEET_ID`) — the goal is to make this configurable at runtime from the UI
- No global state management — each page manages its own state via hooks
- Tailwind CSS v4 with custom dark theme tokens
- The app already has 4 routes (`/plan`, `/track`, `/schedule`, `/weight`) — settings will be a new route

## Constraints

- **Tech stack**: Must remain a static SPA (React + Vite + GitHub Pages). No SSR, no server.
- **Language**: All user-facing text in Traditional Chinese
- **Styling**: Tailwind CSS v4 with existing dark theme tokens
- **Data**: Dietary guidelines must reference real, citable national sources
- **Compatibility**: Must work offline — settings stored in localStorage

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Runtime Google Sheets config (not just .env) | Users need to connect their own sheets without rebuilding | — Pending |
| At least 3 country dietary guidelines | Provides meaningful variety in nutritional recommendations | — Pending |
| BMR as foundation for recommendations | Industry-standard approach to personalized nutrition | — Pending |

---
*Last updated: 2026-03-30 after Phase 4 completion — all v1 requirements validated, milestone complete*

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
