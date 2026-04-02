# Phase 8: Supplement Manager + Inventory - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 08-supplement-manager-inventory
**Areas discussed:** Navigation, List view, Form, Interactions/Synergies, Inventory, Warnings
**Mode:** Auto (all recommended defaults selected)

---

## Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| New tab (💊 補品) | Position 4, 7 tabs total | ✓ |
| Repurpose 時程 tab | Combine schedule + management | |

**User's choice:** [auto] New bottom nav tab
**Notes:** Phase 9 will redesign the 時程 tab. Keep separate for now.

---

## List View

| Option | Description | Selected |
|--------|-------------|----------|
| Card list with inventory bar | Timing badges + inventory status | ✓ |
| Table view | Dense but breaks mobile pattern | |

**User's choice:** [auto] Card list matching FoodManager pattern

---

## Form Design

| Option | Description | Selected |
|--------|-------------|----------|
| In-page view state | Matching FoodManager pattern | ✓ |
| Modal | Overlay form | |

**User's choice:** [auto] View state machine (list/add/edit)

---

## Interactions & Synergies

| Option | Description | Selected |
|--------|-------------|----------|
| Searchable multi-select | Filter existing supplements by name | ✓ |
| Free text | Manual entry of supplement names | |

**User's choice:** [auto] Searchable multi-select with colored chips

---

## Inventory

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in edit view | Purchase form + history below form | ✓ |
| Separate page | Dedicated inventory management | |

**User's choice:** [auto] Inline inventory section in edit view

---

## Warnings

| Option | Description | Selected |
|--------|-------------|----------|
| Color-coded bar + header count | Green/amber/red with days remaining | ✓ |
| Toast notifications | Pop-up alerts | |

**User's choice:** [auto] Color-coded inventory bar on cards + header count

---

## Claude's Discretion

- Component decomposition
- TCM info handling
- Empty state design
- SupplementSchedule.tsx changes (deferred to Phase 9)

## Deferred Ideas

- ConsumptionEvent tracking → Phase 9
- SupplementSchedule.tsx redesign → Phase 9
