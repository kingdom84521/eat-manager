# Phase 15: Menu Composition Editor - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 15-menu-composition-editor
**Areas discussed:** Slot-based editing flow, Food picker search/filter, Nutritional totals display, Menu create vs edit entry
**Mode:** --auto (all areas auto-selected, recommended defaults chosen)

---

## Slot-based Editing Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Tap slot to expand with add/remove | Mobile-first, mirrors existing expandable patterns | ✓ |
| Inline editable grid per slot | Desktop-oriented, more complex | |
| Drag-and-drop between slots | Rejected in REQUIREMENTS.md Out of Scope | |

**User's choice:** [auto] Tap slot to expand, show food list with add/remove per slot, "+" opens picker
**Notes:** Matches mobile-first SPA constraint. Picker scoped to active slot.

---

## Food Picker Search/Filter

| Option | Description | Selected |
|--------|-------------|----------|
| Text search + tag filter chips from data | Combines existing searchFoods() with ItemService, tags derived from data | ✓ |
| Text search only | Simpler but no tag browsing | |
| Category-based browsing | More structured but heavier UX | |

**User's choice:** [auto] Text search + data-derived tag filter chips
**Notes:** Tag filter chips must be derived from actual data per established feedback (never hardcoded). User-created foods appear first in results.

---

## Nutritional Totals Display

| Option | Description | Selected |
|--------|-------------|----------|
| Sticky summary bar at top | Always visible, standard for meal planners | ✓ |
| Per-slot subtotals only | Granular but no overall view | |
| Bottom floating bar | Visible but competes with mobile nav | |

**User's choice:** [auto] Sticky summary bar at top showing cal/protein/fat/carbs
**Notes:** Live-updating as items added/removed. Computed from FoodItem macro fields.

---

## Menu Create vs Edit Entry

| Option | Description | Selected |
|--------|-------------|----------|
| Button on MyMenu + edit icon per card, ViewState machine | Mirrors FoodManager pattern, no new routes | ✓ |
| Separate /menu/edit route | Cleaner URL but breaks SPA pattern | |
| FAB (floating action button) for create | Mobile-native but adds UI element | |

**User's choice:** [auto] "新增菜單" button + edit icon, in-page ViewState machine
**Notes:** ViewState: "list" | "editor" | "picker". Matches FoodManager v2.0 pattern.

---

## Claude's Discretion

- Animation/transition details for slide-up picker panel
- Slot expansion/collapse animation
- Empty slot placeholder text
- Edge case: empty SCHEDULE
- Whether name prompt is upfront or after composition

## Deferred Ideas

- Inline food creation — Phase 16
- Menu duplication — MENU-10, future release
- Menu Sheets sync — MENU-04, future release
