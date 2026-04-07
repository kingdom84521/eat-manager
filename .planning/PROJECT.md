# Eat Manager — Sidebar Navigation & Page Consolidation

## What This Is

A health/nutrition tracking SPA (React + TypeScript + Vite) deployed to GitHub Pages. Users manage foods (with nutrition labels or composed from ingredients) and supplements (with inventory tracking and routine planning), generate unified daily plans with checkbox-driven consumption logging, save meal presets, track weight, and configure personal metabolic profiles. All data synced to Google Sheets via Apps Script. Navigation via sidebar drawer.

## Core Value

Users can manage their food and supplement items, generate a unified daily plan with checkbox logging, save/load meal presets, and track supplement inventory — all from a static site synced to Google Sheets.

## Requirements

### Validated

- ✓ Daily meal plan generation with food catalog — existing
- ✓ Weight logging and progress tracking — existing
- ✓ Offline-first persistence (localStorage + Google Sheets sync) — existing
- ✓ Google Apps Script backend proxy for Sheets CRUD — existing
- ✓ GitHub Pages deployment with HashRouter — existing
- ✓ BMR calculation using Mifflin-St Jeor formula — v1.0
- ✓ Integration of dietary guidelines from 3 countries — v1.0
- ✓ Nutritional intake ratio presets derived from BMR x dietary guidelines — v1.0
- ✓ Settings persisted to localStorage with versioned schema — v1.0
- ✓ SheetsAPI runtime config (GAS URL at call time with env var fallback) — v1.0
- ✓ Settings page with BMR form, guideline selector, Sheets config — v1.0
- ✓ Data model restructure: Food & Supplement types only — v2.0
- ✓ Food CRUD with nutrition label input + composition from ingredients — v2.0
- ✓ Public nutrition database integration (Open Food Facts via GAS proxy) — v2.0
- ✓ Supplement CRUD with rich metadata (interactions, timing, dosage) — v2.0
- ✓ Supplement inventory management (quantity tracking, remaining calculation) — v2.0
- ✓ Supplement routine generator (deterministic, covers all daily goals) — v2.0
- ✓ Sidebar drawer navigation replacing bottom tab bar — v3.0
- ✓ Profile page with weight log, avatar+name at drawer bottom — v3.0
- ✓ Unified daily plan: checkbox interface merging food plan + nutrition log + supplement routine — v3.0
- ✓ Single-item re-random with lock on full re-random when items are checked — v3.0
- ✓ My Menu: create, save, reuse meal combinations (localStorage-only) — v3.0

### Active

- [ ] Settings page accessible via icon at drawer bottom (wired but not redesigned)

### Out of Scope

- Server-side anything — static SPA constraint
- User authentication/accounts — single-user app
- Custom macro ratio editor — preset ratios from established guidelines only
- Barcode scanning — camera API complexity deferred
- Swipe-to-open drawer gesture — hamburger tap sufficient
- Real avatar upload — placeholder image for now
- Menu preset sync to Google Sheets — localStorage-only for now (MENU-04 deferred)
- Global state management (Context/Redux) — simple useState sufficient

## Context

- 6,377 LOC TypeScript across pages, data modules, service modules, and shared components
- Routes: `/plan`, `/food`, `/menu`, `/supplements`, `/profile`, `/settings`
- Navigation: sidebar drawer (headlessui Dialog) with hamburger in fixed top bar
- Entirely in Traditional Chinese (zh-TW)
- `SettingsService`, `ItemService`, `MenuService`, `DataService` singletons manage persistence
- SheetsAPI resolves GAS URL at call time from SettingsService (runtime configurable)
- No global state management — each page reads from services on render
- Tailwind CSS v4 with custom dark theme tokens
- @headlessui/react for accessible drawer and dialog components

## Constraints

- **Tech stack**: Must remain a static SPA (React + Vite + GitHub Pages). No SSR, no server.
- **Language**: All user-facing text in Traditional Chinese
- **Styling**: Tailwind CSS v4 with existing dark theme tokens
- **Data**: Dietary guidelines must reference real, citable national sources
- **Compatibility**: Must work offline — settings stored in localStorage

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Runtime Google Sheets config (not just .env) | Users need to connect their own sheets without rebuilding | ✓ v1.0 |
| At least 3 country dietary guidelines | Provides meaningful variety in nutritional recommendations | ✓ v1.0 |
| BMR as foundation for recommendations | Industry-standard approach to personalized nutrition | ✓ v1.0 |
| Derived values never stored | Prevents stale cache bugs | ✓ All milestones |
| Read-on-render for cross-page state | No React Context needed; services read localStorage synchronously | ✓ All milestones |
| Open Food Facts over USDA FDC | No API key, CORS-enabled, safe for static SPA | ✓ v2.0 |
| Event-sourced inventory deduction log | Prevents drift when doses are skipped | ✓ v2.0 |
| headlessui for sidebar drawer | Focus trap, Escape-to-close, ARIA dialog, Tailwind transitions | ✓ v3.0 |
| TodayPlanRecord stores checkedIds + plan atomically | Prevents stale checked IDs after plan regeneration | ✓ v3.0 |
| My Menu localStorage-only | Sheets sync deferred; simpler MVP | ✓ v3.0 |
| Sub-component decomposition before merge | FoodPlanSection, NutritionBudgetBar, SupplementRoutineSection prevent monolithic UnifiedPlan | ✓ v3.0 |

---
*Last updated: 2026-04-07 after v3.0 milestone*

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
