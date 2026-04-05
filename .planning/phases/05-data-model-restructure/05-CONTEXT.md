# Phase 5: Data Model Restructure - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Clean type foundation for v2.0: remove `BehaviorItem` type and all references, rename `RemedyItem` to `SupplementItem` with enriched metadata fields, extend `FoodItem` with optional ingredient composition, add `InventoryEntry` type. Update `ItemType`, `AnyItem`, resolver, and all affected modules. No new UI, no new services — pure type/data layer restructure.

</domain>

<decisions>
## Implementation Decisions

### Type Removals
- **D-01:** Remove `BehaviorItem` interface entirely. Remove `"behavior"` from `ItemType` union. Remove behavior handling from `resolver.ts`.
- **D-02:** Remove `"remedy"` from `ItemType` union. The old `RemedyItem` (which held both `type: "supplement"` and `type: "remedy"`) is replaced by a single `SupplementItem` with `type: "supplement"` only.
- **D-03:** `ItemType` becomes `"food" | "supplement"` (two values only).
- **D-04:** `AnyItem` becomes `FoodItem | SupplementItem`.

### SupplementItem (replaces RemedyItem)
- **D-05:** New `SupplementItem` interface with structured fields:
  - `id: string` — unique identifier
  - `type: "supplement"` — discriminant
  - `name: string` — display name (zh-TW)
  - `brand?: string` — brand/manufacturer
  - `dosagePerUnit: string` — e.g., "500mg" per capsule/tablet
  - `unitsPerDose: number` — how many capsules/tablets per dose (default 1)
  - `dosesPerDay: number` — recommended doses per day
  - `timing: SupplementTiming[]` — when to take (array allows multiple times)
  - `tags: HealthTag[]` — health condition tags
  - `interactions: string[]` — supplement IDs that conflict (must not take together)
  - `synergies: string[]` — supplement IDs that pair well
  - `mechanism?: string` — how it works (optional, informational)
  - `caution?: string` — warnings
  - `isActive: boolean` — whether currently in the user's routine (default true)
- **D-06:** New `SupplementTiming` type: `"empty_stomach" | "before_meal" | "with_meal" | "after_meal" | "bedtime"` — used by routine generator to group supplements into timing slots.

### FoodItem Extension
- **D-07:** Add optional `ingredients?: FoodIngredient[]` field to `FoodItem`. When present, the food is a "composed food" and its nutrition values should be derived from ingredients.
- **D-08:** `FoodIngredient` interface: `{ foodId: string, grams: number }` — references another FoodItem by ID with a quantity in grams. Composed foods CANNOT reference other composed foods (atomic-only, per research decision).
- **D-09:** Existing `FoodItem` fields (cal, protein, fat, carbs, sodium) remain. For composed foods, these are derived (never stored) — per D-06 from Phase 2 context (derived values pattern). For label-based foods, they are user-entered.

### InventoryEntry
- **D-10:** New `InventoryEntry` interface: `{ supplementId: string, purchasedUnits: number, purchaseDate: string }` — represents a purchase event. Multiple entries per supplement are allowed (new bottle purchases).
- **D-11:** New `ConsumptionEvent` interface: `{ supplementId: string, date: string, units: number }` — event-sourced deduction. Remaining = sum(purchased) - sum(consumed).

### File Changes
- **D-12:** `types.ts` — Add new types, remove old ones, update unions
- **D-13:** `remedies.ts` — Rename to `supplements.ts`. Export `SUPPLEMENTS: SupplementItem[]` (empty array). Remove `NATURAL_REMEDIES`, `BEHAVIORS` exports. Update `REMEDY_MAP` → `SUPPLEMENT_MAP`.
- **D-14:** `resolver.ts` — Update to handle only `food` and `supplement` types. Remove behavior/remedy handling. Update `resolveAndGroup` to return `{ foods, supplements }` only.
- **D-15:** `schedule.ts` — Already empty. Update `ScheduleSlot` if needed or leave as-is for Phase 9 to redesign.
- **D-16:** `data-service.ts` — Update sheet name references from `SUPPLEMENTS: "supplement_log"` to match new naming.
- **D-17:** `SupplementSchedule.tsx` — Update imports from `remedies` → `supplements`. Remove references to `NATURAL_REMEDIES`, `BEHAVIORS`.

### HealthTag & TCM
- **D-18:** Keep all existing `HealthTag` values — they apply to supplements (including TCM-derived tags like `dehumidify`). Tags drive routine generation in Phase 9.
- **D-19:** Keep `TCMInfo` interface — some supplements have TCM properties. Make it optional on `SupplementItem` via `tcm?: TCMInfo`.

### Claude's Discretion
- Whether to keep the old `ScheduleSlot`/`ItemPool` types as-is or simplify them (Phase 9 will redesign the routine system)
- JSDoc comment language (bilingual zh-TW/EN as per existing convention)
- Whether `SupplementLogEntry` needs updating or can wait for Phase 9

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Files to Modify
- `src/data/types.ts` — Core type definitions; add SupplementItem, FoodIngredient, InventoryEntry, ConsumptionEvent; remove BehaviorItem; update ItemType, AnyItem
- `src/data/remedies.ts` → rename to `src/data/supplements.ts` — empty arrays, updated exports
- `src/data/resolver.ts` — Update to two-type system (food + supplement)
- `src/data/foods.ts` — No changes needed (already empty, FoodItem type changes happen in types.ts)
- `src/lib/data-service.ts` — Update sheet name references
- `src/pages/SupplementSchedule.tsx` — Update imports

### Research
- `.planning/research/FEATURES.md` — Supplement metadata schema, inventory formula, composition model
- `.planning/research/ARCHITECTURE.md` — Data model changes, new types, service design
- `.planning/research/PITFALLS.md` — Composition cycle prevention, inventory event-sourcing

</canonical_refs>

<code_context>
## Existing Code Insights

### Current State
- `BehaviorItem` is dead code — `BEHAVIORS = []` in `remedies.ts`, no runtime instances
- `RemedyItem` supports `type: "supplement" | "remedy"` — being collapsed to `supplement` only
- `resolver.ts` handles 4 types with type-specific branches — simplifying to 2
- `FOOD_MAP` and `REMEDY_MAP` are the lookup mechanisms — `REMEDY_MAP` becomes `SUPPLEMENT_MAP`
- `SupplementSchedule.tsx` imports from `remedies.ts` — needs import path update

### Established Patterns
- Types in `src/data/types.ts` with JSDoc in bilingual zh-TW/EN
- Data files export typed arrays + `Map<string, T>` for O(1) lookup
- Discriminated unions via `type` field on interfaces

### Integration Points
- Phase 6 (ItemService) will import these types
- Phase 7-9 (UI pages) will use the new type system

</code_context>

<specifics>
## Specific Ideas

- `SupplementTiming` values in zh-TW for UI display: 空腹, 餐前, 餐中, 餐後, 睡前
- File rename: `remedies.ts` → `supplements.ts` (kebab-case convention maintained)
- `SUPPLEMENT_MAP` replaces `REMEDY_MAP`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-data-model-restructure*
*Context gathered: 2026-03-30*
