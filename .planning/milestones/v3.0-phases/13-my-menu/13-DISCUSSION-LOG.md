# Phase 13: My Menu - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 13-my-menu
**Areas discussed:** Save trigger & naming, Preset content, Menu list layout, Load behavior
**Mode:** Auto (all areas auto-selected, recommended defaults chosen)

---

## Save Trigger & Naming

| Option | Description | Selected |
|--------|-------------|----------|
| UnifiedPlan header area | Button near regenerate, contextually co-located | ✓ |
| Floating action button | FAB at bottom-right corner | |
| Overflow menu | Hidden in a "more" menu | |

**User's choice:** [auto] UnifiedPlan header area — contextually co-located with plan actions

| Option | Description | Selected |
|--------|-------------|----------|
| Modal dialog with text input | headlessui Dialog, consistent with existing patterns | ✓ |
| Inline input expanding from button | Lighter weight but less familiar | |
| Bottom sheet | Mobile-friendly but no existing pattern | |

**User's choice:** [auto] Modal dialog — reuses headlessui Dialog already in project

---

## Preset Content

| Option | Description | Selected |
|--------|-------------|----------|
| Food item IDs only | Supplements are deterministic, checked state is transient | ✓ |
| Food + supplement IDs | Stores complete daily plan snapshot | |
| Pool references for re-randomization | Allows variation on load | |

**User's choice:** [auto] Food item IDs only — supplements computed from live data, menu = meal template

| Option | Description | Selected |
|--------|-------------|----------|
| Exact resolved IDs per slot | Saves the specific combination user liked | ✓ |
| Pool references | Allows re-randomization within saved structure | |

**User's choice:** [auto] Exact resolved IDs — user saves what they want to repeat

---

## Menu List Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Simple list with name + count + date | Minimal, consistent with existing patterns | ✓ |
| Card grid with food previews | Richer but more complex | |
| Grouped by category/tag | Over-engineered for initial release | |

**User's choice:** [auto] Simple list — matches existing app list patterns

| Option | Description | Selected |
|--------|-------------|----------|
| Empty state with save prompt | Guides user to create first menu | ✓ |
| Generic empty state | Less helpful | |

**User's choice:** [auto] Empty state with save prompt — better onboarding

---

## Load Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Replace food plan, clear checks | Clean slate for food, supplements unaffected | ✓ |
| Merge with existing plan | Complex, confusing UX | |
| Add as additional items | Doesn't match "preset" mental model | |

**User's choice:** [auto] Replace food plan entirely, clear checked state

| Option | Description | Selected |
|--------|-------------|----------|
| Confirmation dialog when locked | Prevents accidental loss of logged data | ✓ |
| Always replace without asking | Fast but risky | |
| Block loading when locked | Too restrictive | |

**User's choice:** [auto] Confirmation dialog — protects logged data

---

## Claude's Discretion

- Visual styling of menu list items
- Food item preview depth in menu rows
- Animation/transition on save/load
- Save dialog name pre-fill behavior
- Sort order of menu list

## Deferred Ideas

- MENU-04: Sheets sync — future milestone
- Menu sharing/export
- Menu scheduling (auto-load on specific days)
- Menu templates with partial randomization
