# Milestones

## v3.0 Sidebar Navigation & Page Consolidation (Shipped: 2026-04-07)

**Phases completed:** 4 phases, 6 plans | **Timeline:** 2 days (2026-04-06 → 2026-04-07)
**Source changes:** 17 files, +1,931 / -754 lines (net +1,177)

**Key accomplishments:**

- Sidebar drawer (headlessui Dialog) replaces bottom tab nav with hamburger-triggered slide-in, 4 nav items + profile/settings footer
- Profile page with display name, avatar initials, and embedded weight log (standalone /weight retired)
- Unified daily plan merging food plan + supplement routine with checkbox logging, nutrition budget bar, lock mechanic, and single-item swap
- My Menu preset system: save current plan as named preset, browse/load/rename/delete saved menus (localStorage-only)

---

## v1.0 Settings & Nutrition Configuration (Shipped: 2026-03-30)

**Phases completed:** 4 phases, 6 plans, 3 tasks

**Key accomplishments:**

- One-liner:
- GAS URL resolved per-call via SettingsService.getSheetsConfig() with VITE_GAS_URL env var fallback, enabling user-configured URLs to take effect without page reload
- Settings.tsx (363 lines)

---
