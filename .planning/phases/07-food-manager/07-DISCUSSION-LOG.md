# Phase 7: Food Manager - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 07-food-manager
**Areas discussed:** Page layout, Add/Edit form, Ingredient composition, Open Food Facts, Navigation
**Mode:** Auto (all recommended defaults selected)

---

## Page Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Scrollable card list | Food cards with name + cal, matching existing dark theme | ✓ |
| Table/grid view | Denser but breaks mobile-first pattern | |

**User's choice:** [auto] Scrollable card list matching existing page patterns
**Notes:** Consistent with DailyPlan and SupplementSchedule card layouts.

---

## Add/Edit Form

| Option | Description | Selected |
|--------|-------------|----------|
| In-page view state | Switch page state to form, no sub-routes | ✓ |
| Modal overlay | Overlay form on top of list | |
| Separate routes | /foods/new, /foods/:id/edit | |

**User's choice:** [auto] In-page view state (list/add/edit/compose states)
**Notes:** Matches existing single-page patterns. HashRouter doesn't support nested routes well.

---

## Ingredient Composition

| Option | Description | Selected |
|--------|-------------|----------|
| Inline ingredient list with live recalc | Rows with food selector + grams, auto-updating totals | ✓ |
| Step-by-step wizard | Multi-step composition flow | |

**User's choice:** [auto] Inline ingredient list with live macro recalculation

---

## Open Food Facts Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Search in composition form | Search OFF when adding ingredients | ✓ |
| Standalone search page | Separate search interface | |

**User's choice:** [auto] Search within composition form, debounced 300ms, selectable result cards

---

## Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| New tab in bottom nav | 🍽️ 食材 at position 2 | ✓ |
| Nested under existing tab | Sub-page of 飲食 | |

**User's choice:** [auto] New bottom nav tab (🍽️ 食材)

---

## Claude's Discretion

- Internal component decomposition
- Form input Tailwind styling
- Empty state design
- View transitions
- Initial food suggestions

## Deferred Ideas

None
