# Phase 5: Data Model Restructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 05-data-model-restructure
**Areas discussed:** SupplementItem schema, FoodItem ingredients, RemedyItem migration, HealthTag scope
**Mode:** --auto (all decisions auto-selected)

---

## SupplementItem Schema

| Option | Description | Selected |
|--------|-------------|----------|
| Structured fields | Arrays of IDs for interactions/synergies, timing enum, structured dosage | :white_check_mark: |
| Free text fields | Interactions/synergies as free text descriptions | |
| Mixed | Some structured, some free text | |

**User's choice:** [auto] Structured fields (recommended default)
**Notes:** Enables routine generator to programmatically handle interactions and timing slots.

---

## FoodItem Ingredients

| Option | Description | Selected |
|--------|-------------|----------|
| ID references | `{ foodId: string, grams: number }` referencing other FoodItems | :white_check_mark: |
| Embedded objects | Full ingredient data embedded in the composed food | |
| Separate ingredient type | New `IngredientItem` type distinct from FoodItem | |

**User's choice:** [auto] ID references (recommended default)
**Notes:** Keeps composition simple, allows dynamic recalculation, prevents data duplication.

---

## RemedyItem Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Rename to SupplementItem | Drop "remedy" entirely, single SupplementItem type | :white_check_mark: |
| Keep RemedyItem name | Just remove "remedy" subtype, keep interface name | |
| Both types | Keep RemedyItem for food-therapy, add SupplementItem for capsules | |

**User's choice:** [auto] Rename to SupplementItem (recommended default)
**Notes:** User explicitly said two categories only: food & supplement.

---

## HealthTag Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Keep all tags | All existing tags apply to supplements too | :white_check_mark: |
| Remove TCM-only tags | Drop dehumidify and other TCM-specific tags | |
| Reorganize tags | Create separate tag systems for food vs supplements | |

**User's choice:** [auto] Keep all tags (recommended default)
**Notes:** Tags drive routine generation. TCM tags like dehumidify are valid for supplement recommendations.

---

## Claude's Discretion

- ScheduleSlot/ItemPool type handling (keep or simplify)
- SupplementLogEntry update timing (now or Phase 9)

## Deferred Ideas

None
