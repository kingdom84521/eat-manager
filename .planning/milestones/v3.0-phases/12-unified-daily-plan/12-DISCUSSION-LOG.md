# Phase 12: Unified Daily Plan - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 12-unified-daily-plan
**Areas discussed:** TodayPlanRecord schema, Check/uncheck logging, Nutrition macro bar, Sub-component decomposition
**Mode:** Auto (all areas auto-selected, recommended defaults chosen)

---

## TodayPlanRecord Schema

| Option | Description | Selected |
|--------|-------------|----------|
| Single atomic localStorage key | Food plan + supplement routine + checkedIds in one record | ✓ |
| Separate keys per concern | food_plan, supplement_log, checked_ids as separate keys | |
| Extend existing DailyPlan | Add checkedIds to existing DailyPlan interface | |

**User's choice:** [auto] Single atomic localStorage key (recommended — per ROADMAP decision)
**Notes:** Prevents stale checkedIds after plan regeneration. One key = one source of truth for today's state.

---

## Check/Uncheck Logging Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate local + debounced persist | State updates instantly, localStorage/Sheets writes debounced 300ms | ✓ |
| Synchronous write on every tap | Every check/uncheck writes immediately | |
| Batch write on page leave | Collect all changes, write on beforeunload | |

**User's choice:** [auto] Immediate local + debounced persist (recommended — responsive UX + data safety)
**Notes:** Debounce prevents rapid-tap data thrashing. Local state always up to date.

---

## Nutrition Macro Bar

| Option | Description | Selected |
|--------|-------------|----------|
| Derived at render from checkedIds | Compute totals from checked food items' nutritional data | ✓ |
| Stored running total | Maintain totalCal/totalProtein in state, increment on check | |
| Fetch from Sheets | Query Sheets for today's logged totals | |

**User's choice:** [auto] Derived at render from checkedIds (recommended — follows existing computed-at-render pattern)
**Notes:** Matches existing pattern (generateRoutine, calcRemainingUnits). No sync issues.

---

## Sub-Component Decomposition

| Option | Description | Selected |
|--------|-------------|----------|
| Three inline sub-components in UnifiedPlan.tsx | FoodPlanSection, NutritionBudgetBar, SupplementRoutineSection | ✓ |
| Separate files in src/components/ | Each sub-component as its own file | |
| Monolithic single component | All logic in one large component | |

**User's choice:** [auto] Three inline sub-components (recommended — per ROADMAP mandate, matches existing pattern)
**Notes:** Sub-components defined in same file as parent page — consistent with DailyPlan.tsx pattern (ItemCard, TagBadge).

---

## Claude's Discretion

- Section ordering (food first vs supplements first)
- Scroll-to behavior for supplement navigation
- Check/uncheck animations
- "All done" summary state
- Exact debounce timing

## Deferred Ideas

- My Menu integration (Phase 13)
- Menu Sheets sync (MENU-04, future milestone)
