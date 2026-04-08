# Phase 16: Inline Food Creation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 16-inline-food-creation
**Areas discussed:** Form placement, Form fields, Post-creation behavior
**Mode:** --auto (all decisions auto-selected with recommended defaults)

---

## Form Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Inline section within FoodPickerPanel | Form replaces food list area in the existing slide-up panel | ✓ |
| Separate overlay/modal on top of picker | Additional overlay layer above the picker panel | |
| New sub-route within MyMenu | Navigate to a separate view for food creation | |

**User's choice:** [auto] Inline section within FoodPickerPanel
**Notes:** Recommended default — keeps user in the same panel, no additional overlay needed, matches "don't leave the menu page" requirement. Avoids headlessui Dialog nesting issue.

---

## Form Fields

| Option | Description | Selected |
|--------|-------------|----------|
| Name + serving + cal + protein + fat + carbs (6 fields) | Matches ROADMAP success criteria exactly | ✓ |
| Name + serving + cal only (3 fields) | Ultra-minimal, missing macro breakdown | |
| Full NutritionLabelForm fields | Explicitly out of scope per REQUIREMENTS.md | |

**User's choice:** [auto] Name + serving + cal + protein + fat + carbs (6 fields)
**Notes:** Matches the ROADMAP Phase 16 success criteria verbatim. Full details can be edited later from Food Manager page.

---

## Post-Creation Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-add to active slot, return to picker list | Minimizes taps — user created food to use it | ✓ |
| Return to picker list without auto-adding | User manually selects the new food from the list | |
| Close picker entirely, return to editor | Requires re-opening picker to add more foods | |

**User's choice:** [auto] Auto-add to active slot, return to picker list
**Notes:** Recommended default — the user created the food specifically to add it to the current slot. Auto-adding reduces friction.

---

## Claude's Discretion

- Form layout and field arrangement within the picker panel
- Validation error display style
- Transition animation between food list and quick-create form
- Whether to show a brief success toast/flash after creation

## Deferred Ideas

None — discussion stayed within phase scope
