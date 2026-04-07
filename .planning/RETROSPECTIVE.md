# Retrospective

Living document tracking lessons learned across milestones.

---

## Milestone: v1.0 — Settings & Nutrition Configuration

**Shipped:** 2026-03-30
**Phases:** 4 | **Plans:** 6 | **Timeline:** 2 days (2026-03-29 to 2026-03-30)

### What Was Built
- Pure BMR/TDEE calculation functions (Mifflin-St Jeor) and dietary guideline catalog (3 countries)
- SettingsService singleton with versioned localStorage schema and computed targets
- SheetsAPI runtime config patch (GAS URL at call time with env var fallback)
- Settings page (363 LOC) with BMR form, guideline selector, Sheets config, and 5th nav tab
- Hardcoded target migration in NutritionTracker and WeightLog

### What Worked
- Strict dependency chain (data > persistence > API patch > UI) prevented integration issues
- Derived values never stored — computed on demand avoided stale cache bugs
- Read-on-render pattern for cross-page state was the simplest viable approach
- Single-file surgical patches (Phase 3) completed quickly with high confidence

### What Was Inefficient
- Phase 2 ROADMAP progress tracking drifted (showed "Planned" even after completion)
- Some SUMMARY.md one-liner extraction failed (empty or partial results)

### Patterns Established
- Service singletons as plain objects (`SettingsService` follows `DataService`/`SheetsAPI`)
- Versioned settings schema with inline migration (switch/case from version N to N+1)
- Validation messages in zh-TW hardcoded inline (no i18n framework)
- `||` operator (not `??`) for fallback when empty strings should also fall through

### Key Lessons
- For single-file patches, one plan with one task is the right granularity
- UI phases benefit from 2 waves: create page first, then migrate consumers

### Cost Observations
- Model mix: Opus for planning, Sonnet for research/execution/verification
- Sessions: 1 main session covering Phases 3-4 (Phases 1-2 completed in prior sessions)
- Notable: Phase 3 (surgical patch) was the most efficient — minimal research, 1 plan, 1 task

---

## Milestone: v3.0 — Sidebar Navigation & Page Consolidation

**Shipped:** 2026-04-07
**Phases:** 4 | **Plans:** 6 | **Timeline:** 2 days (2026-04-06 to 2026-04-07)

### What Was Built
- Sidebar drawer (headlessui Dialog) replacing 7-tab bottom nav with hamburger-triggered slide-in, 4 nav items + profile/settings footer
- Profile page with display name, avatar initials, and embedded WeightSection (standalone /weight retired)
- Unified daily plan merging food plan + supplement routine with checkbox logging, nutrition budget bar, lock mechanic, and single-item swap
- My Menu preset system: save current plan, browse/load/rename/delete (localStorage-only, MenuService singleton)

### What Worked
- Sub-component decomposition (FoodPlanSection, NutritionBudgetBar, SupplementRoutineSection) before building UnifiedPlan prevented monolithic component
- headlessui provided focus trap, scroll lock, Escape-to-close, and ARIA for free — reduced accessibility code
- TodayPlanRecord storing checkedIds + plan atomically prevented stale state on reload
- Read-on-render pattern continued to scale (SettingsService, MenuService, ItemService all read synchronously)
- Research phase for Phase 12 correctly identified the need to split into 2 plans (sub-components first, then wiring)

### What Was Inefficient
- Some SUMMARY.md one-liner extraction still produced noisy results (rule numbers, partial fragments)
- v2.0 milestone entry in MILESTONES.md was never properly cleaned up (missing from archive)
- Pending todos in STATE.md accumulated items that were resolved but never cleared

### Patterns Established
- `src/components/` directory for shared components (SidebarDrawer is the first)
- headlessui Dialog pattern for modals and drawers — reused across drawer, save dialog, delete confirmation
- MenuService follows ItemService/DataService singleton pattern with crypto.randomUUID() IDs
- reconstructSlots() pattern for rebuilding plan structure from saved food IDs

### Key Lessons
- Phase research adds high value for UI merge phases — Phase 12 research identified sub-component decomposition as prerequisite
- headlessui's built-in scroll lock worked for iOS Safari without the position:fixed workaround
- Debounce on checkbox interactions is essential for preventing data corruption on rapid taps

### Cost Observations
- Model mix: Opus for planning/milestone completion, Sonnet for research/execution
- Sessions: Multiple sessions across 2 days for 4 phases
- Notable: Phase 10 (sidebar shell) was most efficient — single plan, clear headlessui docs

---

## Cross-Milestone Trends

| Metric | v1.0 | v3.0 |
|--------|------|------|
| Phases | 4 | 4 |
| Plans | 6 | 6 |
| Timeline | 2 days | 2 days |
| Verification pass rate | 100% | 100% |
| Gap closure phases | 0 | 0 |
| Source changes | — | +1,931/-754 (17 files) |
