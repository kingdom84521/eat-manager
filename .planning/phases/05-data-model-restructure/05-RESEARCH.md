# Phase 5: Data Model Restructure - Research

**Researched:** 2026-03-30
**Domain:** TypeScript type system restructure — remove dead types, rename/enrich core types, extend FoodItem, add InventoryEntry
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Type Removals**
- D-01: Remove `BehaviorItem` interface entirely. Remove `"behavior"` from `ItemType` union. Remove behavior handling from `resolver.ts`.
- D-02: Remove `"remedy"` from `ItemType` union. The old `RemedyItem` (which held both `type: "supplement"` and `type: "remedy"`) is replaced by a single `SupplementItem` with `type: "supplement"` only.
- D-03: `ItemType` becomes `"food" | "supplement"` (two values only).
- D-04: `AnyItem` becomes `FoodItem | SupplementItem`.

**SupplementItem (replaces RemedyItem)**
- D-05: New `SupplementItem` interface with fields: `id`, `type: "supplement"`, `name`, `brand?`, `dosagePerUnit`, `unitsPerDose`, `dosesPerDay`, `timing: SupplementTiming[]`, `tags: HealthTag[]`, `interactions: string[]`, `synergies: string[]`, `mechanism?`, `caution?`, `isActive: boolean`
- D-06: New `SupplementTiming` type: `"empty_stomach" | "before_meal" | "with_meal" | "after_meal" | "bedtime"`

**FoodItem Extension**
- D-07: Add optional `ingredients?: FoodIngredient[]` field to `FoodItem`
- D-08: `FoodIngredient` interface: `{ foodId: string, grams: number }` — atomic-only, no composed-food references
- D-09: Existing nutrition fields remain; for composed foods they are derived (never stored independently)

**InventoryEntry**
- D-10: New `InventoryEntry` interface: `{ supplementId: string, purchasedUnits: number, purchaseDate: string }`
- D-11: New `ConsumptionEvent` interface: `{ supplementId: string, date: string, units: number }`

**File Changes**
- D-12: `types.ts` — Add new types, remove old ones, update unions
- D-13: `remedies.ts` → rename to `supplements.ts`. Export `SUPPLEMENTS: SupplementItem[]` (empty array). Remove `NATURAL_REMEDIES`, `BEHAVIORS`. Update `REMEDY_MAP` → `SUPPLEMENT_MAP`.
- D-14: `resolver.ts` — Update to handle only `food` and `supplement` types. Remove behavior/remedy handling. Update `resolveAndGroup` to return `{ foods, supplements }` only.
- D-15: `schedule.ts` — Already empty. Update `ScheduleSlot` if needed or leave as-is for Phase 9.
- D-16: `data-service.ts` — Update sheet name references from `REMEDIES: "remedies"` naming.
- D-17: `SupplementSchedule.tsx` — Update imports from `remedies` → `supplements`. Remove references to `NATURAL_REMEDIES`, `BEHAVIORS`.

**HealthTag & TCM**
- D-18: Keep all existing `HealthTag` values
- D-19: Keep `TCMInfo` interface. Make it optional on `SupplementItem` via `tcm?: TCMInfo`.

### Claude's Discretion
- Whether to keep the old `ScheduleSlot`/`ItemPool` types as-is or simplify them (Phase 9 will redesign the routine system)
- JSDoc comment language (bilingual zh-TW/EN as per existing convention)
- Whether `SupplementLogEntry` needs updating or can wait for Phase 9

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DM-01 | Remove `BehaviorItem` type and all references from codebase | All 7 call sites identified; all are dead code (empty arrays). Compiler will catch any missed reference. |
| DM-02 | Two hardcoded item categories only: `food` and `supplement` — no `remedy` or `behavior` subtypes | `ItemType` becomes `"food" \| "supplement"`. `"remedy"` string literal appears in 4 files — each site identified below. |
| DM-03 | `FoodItem` supports optional `ingredients` field for composed foods | `FoodIngredient` interface defined in D-08. No calorie fields removed — they remain and are derived for composed foods. |
| DM-04 | `SupplementItem` type with metadata: interactions, synergies, timing, dosage, health tags | New interface specified in D-05/D-06. Replaces `RemedyItem`. |
| DM-05 | `InventoryEntry` type for tracking purchased supplement quantities with purchase date | Specified in D-10. `ConsumptionEvent` in D-11 enables event-sourced deduction (Phase 8 will use it). |
| DM-06 | Composed food nutrition values are always derived (never stored), matching existing derived-values pattern | `ingredients?: FoodIngredient[]` only stores references + grams; nutrition calculated at runtime. Same pattern as `SettingsService` not storing derived TDEE. |
</phase_requirements>

---

## Summary

Phase 5 is a pure type/data layer restructure with zero new runtime behaviour. All arrays in the affected data files (`SUPPLEMENTS`, `NATURAL_REMEDIES`, `BEHAVIORS`, `FOODS`) are already empty — this is a compiler-only change that cleans the type foundation before CRUD is added in phases 6-9.

The scope is exactly six files: `src/data/types.ts`, `src/data/remedies.ts` (renamed to `supplements.ts`), `src/data/resolver.ts`, `src/lib/data-service.ts`, `src/pages/SupplementSchedule.tsx`, and `src/pages/DailyPlan.tsx`. Every reference to `BehaviorItem`, `"behavior"`, `RemedyItem`, `"remedy"`, `NATURAL_REMEDIES`, `BEHAVIORS`, and `REMEDY_MAP` has been audited — all are dead-code paths operating on empty arrays or type-only constructs. No data migration is required and no runtime behaviour changes.

The critical gate for this phase is a clean TypeScript build (`tsc -b`) with zero errors. Because `noUnusedLocals` and `noUnusedParameters` are enforced in `tsconfig.json`, removing types while leaving stale imports will cause build failures that must be resolved before the phase is complete.

**Primary recommendation:** Execute as a single atomic change per file. Do not partially remove types — the TypeScript compiler is the validation mechanism, and partial removals produce misleading errors.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ~5.8.3 | Type definitions and compile-time validation | Already installed; strict mode with `noUnusedLocals` enforces clean removal |

This phase adds no new dependencies. It is entirely within the existing TypeScript source files.

**Version verification:** No new packages — `npm view` not needed.

---

## Architecture Patterns

### Recommended Project Structure (no changes to structure)
```
src/
├── data/
│   ├── types.ts          # MODIFY — core change
│   ├── supplements.ts    # RENAME from remedies.ts
│   ├── resolver.ts       # MODIFY — update imports and branches
│   ├── foods.ts          # NO CHANGE
│   └── schedule.ts       # NO CHANGE (leave ScheduleSlot as-is for Phase 9)
└── lib/
    └── data-service.ts   # MODIFY — update REMEDIES sheet key + rowToRemedy function
src/pages/
    ├── SupplementSchedule.tsx  # MODIFY — update imports + filter UI
    └── DailyPlan.tsx           # MODIFY — remove behavior/remedy entries from TYPE_STYLES
```

### Pattern 1: Discriminated Union via `type` field
**What:** All item interfaces use a `type` literal field as the discriminant. TypeScript narrows correctly in switch/if blocks.
**When to use:** Always — every new interface (`SupplementItem`, `FoodIngredient`, `InventoryEntry`) should carry a discriminant if it participates in a union.
**Example:**
```typescript
// Source: existing src/data/types.ts pattern
export interface SupplementItem {
  id: string;
  type: "supplement";   // discriminant — literal type, not string
  name: string;
  // ...
}
export type AnyItem = FoodItem | SupplementItem;
```

### Pattern 2: Named export arrays + Map for O(1) lookup
**What:** Every data module exports a typed array (`SUPPLEMENTS: SupplementItem[]`) and a `Map<string, T>` built from it.
**When to use:** All catalog data modules (`supplements.ts`, `foods.ts`).
**Example:**
```typescript
// Source: existing src/data/foods.ts pattern
export const SUPPLEMENTS: SupplementItem[] = [];
export const SUPPLEMENT_MAP = new Map<string, SupplementItem>();
SUPPLEMENTS.forEach((s) => SUPPLEMENT_MAP.set(s.id, s));
```

### Pattern 3: File-level block comment with ASCII art + section dividers
**What:** Each data file opens with a block comment explaining the module; sections use `// ── Name ──` Unicode dividers.
**When to use:** All data files, including the renamed `supplements.ts`.
**Example:**
```typescript
/**
 * ============================================================
 * Supplements 表 — 補品
 * ============================================================
 */
// ── SUPPLEMENTS（補品/膠囊） ────────────────────
```

### Pattern 4: `import type` for type-only imports
**What:** Interfaces and type aliases imported without runtime value are imported with `import type`.
**When to use:** All type imports across all modified files.
**Example:**
```typescript
import type { SupplementItem, FoodIngredient, InventoryEntry } from "./types";
```

### Anti-Patterns to Avoid
- **Leaving stale imports:** After removing `BehaviorItem`, any `import type { ..., BehaviorItem }` that remains will cause a `noUnusedLocals` TypeScript error. Remove imports as part of the same edit that removes the type usage.
- **Keeping `"remedy"` as a union member:** D-02 is explicit — `ItemType` must be `"food" | "supplement"`. Any filter or TYPE_STYLES record that still keys on `"remedy"` will become a dead branch and must be removed.
- **Leaving old exports in `remedies.ts`:** If the file is renamed to `supplements.ts` but old exports like `getRemediesByTag`, `getCoreRemedies`, `getByType` remain under old names, callers will break in Phase 6. Rename or remove them now.
- **Computed fields stored on FoodIngredient:** `FoodIngredient` stores only `{ foodId, grams }` — per D-08. Nutrition per 100g is looked up from the referenced food at computation time, not duplicated into the ingredient record.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type union exhaustiveness | Manual runtime checks | TypeScript discriminated union + `never` | Compiler enforces all cases handled |
| Cycle detection in ingredient graph | Recursive traversal | Enforce atomic-only at save time (filter out composed foods from ingredient picker) | Prevents infinite loops at data model level, not runtime |

**Key insight:** This phase has no complex runtime logic to hand-roll. All correctness guarantees come from TypeScript's type system and the `tsc -b` build gate.

---

## Runtime State Inventory

> This is a type/rename phase — only source code files change. All data arrays are empty (`SUPPLEMENTS = []`, `NATURAL_REMEDIES = []`, `BEHAVIORS = []`, `FOODS = []`). No runtime state migration is required.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `wellness_remedies` key in localStorage (set by `DataService.getRemedies()` background sync). Currently always empty because Sheets tab `remedies` has no rows in production. | Code edit only — rename the SHEETS constant from `REMEDIES: "remedies"` to a new key. No data migration needed because the cached value is an empty array. |
| Live service config | Google Sheets tab named `"remedies"` — referenced in `data-service.ts` as `SHEETS.REMEDIES`. | Code edit to update the constant value from `"remedies"` to `"supplements"`. The Sheets tab rename (if it exists) is a manual step; Phase 6 will create the `supplements` tab fresh. |
| OS-registered state | None | None |
| Secrets/env vars | None — no env vars reference type names | None |
| Build artifacts | `dist/` if built. `tsc -b` output. | Re-run `npm run build` after phase completes to verify zero errors. |

**Key finding:** Because all data arrays are empty and data comes from Sheets at runtime (not hardcoded), this is a code-only change. No data migration is needed for any user.

---

## Common Pitfalls

### Pitfall 1: Partial type removal leaves stale `import type` causing `noUnusedLocals` build failure
**What goes wrong:** Removing `BehaviorItem` from `types.ts` but leaving `import type { ..., BehaviorItem }` in `resolver.ts` or `data-service.ts` causes `tsc -b` to fail with "is declared but never used".
**Why it happens:** Editors with "auto-import" don't auto-remove imports on type deletion.
**How to avoid:** For each file being edited, grep for all imported names and verify each one is still used after edits.
**Warning signs:** `tsc -b` output mentions `BehaviorItem` or `RemedyItem` in an import statement.

### Pitfall 2: `DailyPlan.tsx` has hard-coded `"remedy"` and `"behavior"` keys in `TYPE_STYLES` and `border` object
**What goes wrong:** After removing `"remedy"` and `"behavior"` from `ItemType`, `DailyPlan.tsx` line 44-51 still contains style entries for those keys. With `noUnusedLocals` and strict TypeScript, this may not error (it's a `Record<string, ...>`, not typed to `ItemType`), but it is dead code that contradicts the new model.
**Why it happens:** `TYPE_STYLES` is typed as `Record<string, { cls: string; label: string }>`, so TypeScript does not flag extra keys.
**How to avoid:** Explicitly remove `remedy` and `behavior` entries from `TYPE_STYLES` and the `border` inline object in `DailyPlan.tsx` as part of the cleanup.
**Warning signs:** `TYPE_STYLES.remedy` or `"remedy"` string literals remain in `DailyPlan.tsx` after phase completion.

### Pitfall 3: `resolveAndGroup()` return type still lists `remedies` and `behaviors` properties
**What goes wrong:** If only the function body is updated but the return type annotation still has `remedies: ResolvedItem[]; behaviors: ResolvedItem[]`, callers in future phases will see misleading type shapes.
**Why it happens:** Return type on `resolveAndGroup` is declared inline — forgetting to update the type while updating the body.
**How to avoid:** Update both the return type annotation AND the function body together in a single edit.
**Warning signs:** `tsc -b` passes but `resolveAndGroup` still declares `remedies` or `behaviors` in its return type.

### Pitfall 4: `SupplementSchedule.tsx` filter UI still shows "remedy" and "behavior" filter buttons
**What goes wrong:** The `TYPE_FILTERS` array in `SupplementSchedule.tsx` has `{ key: "remedy", ... }` and `{ key: "behavior", ... }` entries. These render as filter buttons that will never match any item (since items no longer have those types). The filter logic silently returns 0 results.
**Why it happens:** The UI and data model are updated separately without cross-checking the filter labels.
**How to avoid:** Remove `remedy` and `behavior` entries from `TYPE_FILTERS` in the same edit that updates the imports. Update the stats line ("補品 X 種 · 食療 X 種 · 行為 X 種") to reflect the new structure.
**Warning signs:** Browser renders filter buttons labeled "食療" or "行為" that always produce empty lists.

### Pitfall 5: `SupplementItem.timing` is `SupplementTiming[]` (array) but old `RemedyItem.timing` was `string`
**What goes wrong:** The old `RemedyItem.timing` was `string` (e.g., `"餐後"`). The new `SupplementItem.timing` is `SupplementTiming[]` (an array of enum values). Any code that reads `.timing` as a string will silently get `[object Object]` or crash.
**Why it happens:** The type change is non-trivial — not just a rename. `SupplementSchedule.tsx` line 127 renders `item.timing` directly: `⏰ {item.timing}`.
**How to avoid:** When updating `SupplementSchedule.tsx`, update the timing render path. Since all arrays are empty at this phase, there is no runtime impact now, but the render code must be updated to expect `SupplementTiming[]` for correctness.
**Warning signs:** `item.timing && <p>⏰ {item.timing}</p>` remains in `SupplementSchedule.tsx` after the phase.

### Pitfall 6: `data-service.ts` `rowToRemedy` function imports and returns types that no longer exist
**What goes wrong:** `rowToRemedy()` in `data-service.ts` returns `RemedyItem | BehaviorItem`. After the phase, neither type exists. The function must either be removed or replaced with `rowToSupplement()` returning `SupplementItem`.
**Why it happens:** `data-service.ts` is listed in D-16 as needing updates but the scope is described as "sheet name references" — the actual function and its return type also require updating.
**How to avoid:** Remove `rowToRemedy` entirely. Also remove `getRemedies()` from `DataService` (it will move to `ItemService` in Phase 6). Update the `SHEETS` constant to rename `REMEDIES: "remedies"` to `SUPPLEMENTS: "supplements"`.
**Warning signs:** `tsc -b` reports `RemedyItem` or `BehaviorItem` referenced in `data-service.ts`.

---

## Code Examples

Verified patterns from existing codebase:

### New `SupplementItem` interface (in `src/data/types.ts`)
```typescript
// Source: CONTEXT.md D-05, D-06 decisions

export type SupplementTiming =
  | "empty_stomach"   // 空腹
  | "before_meal"     // 餐前
  | "with_meal"       // 餐中
  | "after_meal"      // 餐後
  | "bedtime";        // 睡前

/** zh-TW display labels for timing */
export const SUPPLEMENT_TIMING_LABELS: Record<SupplementTiming, string> = {
  empty_stomach: "空腹",
  before_meal: "餐前",
  with_meal: "餐中",
  after_meal: "餐後",
  bedtime: "睡前",
};

/**
 * 補品項目 — 膠囊/錠劑/藥用食品
 * v2.0: replaces RemedyItem
 */
export interface SupplementItem {
  id: string;
  type: "supplement";
  /** 顯示名稱（繁體中文） */
  name: string;
  brand?: string;
  /** 每顆/每包的含量，e.g. "500mg" */
  dosagePerUnit: string;
  /** 每次服用幾顆 */
  unitsPerDose: number;
  /** 每天服用幾次 */
  dosesPerDay: number;
  /** 建議服用時機（可多個） */
  timing: SupplementTiming[];
  /** 健康標籤 */
  tags: HealthTag[];
  /** 與哪些補品有衝突（supplement IDs） */
  interactions: string[];
  /** 與哪些補品協同（supplement IDs） */
  synergies: string[];
  /** 作用機制（選填） */
  mechanism?: string;
  /** 注意事項 */
  caution?: string;
  /** 中醫資訊（選填） */
  tcm?: TCMInfo;
  /** 是否納入每日排程 */
  isActive: boolean;
}
```

### New `FoodIngredient` interface (in `src/data/types.ts`)
```typescript
// Source: CONTEXT.md D-07, D-08 decisions

/**
 * 組合食物的成分引用
 * Atomic only — foodId must reference a non-composed FoodItem
 */
export interface FoodIngredient {
  /** 引用的食物 ID（只能是非組合食物） */
  foodId: string;
  /** 本份使用的克數 */
  grams: number;
}

// FoodItem gains optional ingredients field:
export interface FoodItem {
  id: string;
  type: "food";
  name: string;
  serving: string;
  cal: number;
  protein: number;
  fat: number;
  carbs: number;
  sugar?: number;
  sodium: number;
  source: string;
  tags?: HealthTag[];
  /** v2.0: 組合食物的成分列表（原子食物 only）*/
  ingredients?: FoodIngredient[];
}
```

### New `InventoryEntry` and `ConsumptionEvent` (in `src/data/types.ts`)
```typescript
// Source: CONTEXT.md D-10, D-11 decisions

/**
 * 補品庫存補貨記錄
 * One entry per purchase batch
 */
export interface InventoryEntry {
  supplementId: string;
  /** 本次購入顆數 */
  purchasedUnits: number;
  /** 購買日期 ISO YYYY-MM-DD */
  purchaseDate: string;
}

/**
 * 補品服用記錄（事件溯源）
 * remaining = sum(purchasedUnits) - sum(consumedUnits)
 */
export interface ConsumptionEvent {
  supplementId: string;
  /** 服用日期 */
  date: string;
  /** 本次服用顆數 */
  units: number;
}
```

### Updated `ItemType` and `AnyItem` (in `src/data/types.ts`)
```typescript
// Source: CONTEXT.md D-03, D-04

export type ItemType = "food" | "supplement";
export type AnyItem = FoodItem | SupplementItem;
```

### New `supplements.ts` (renamed from `remedies.ts`)
```typescript
// Source: CONTEXT.md D-13, existing remedies.ts pattern

import type { SupplementItem } from "./types";

// ── SUPPLEMENTS（補品） ─────────────────────────

export const SUPPLEMENTS: SupplementItem[] = [];

// ── 查詢工具 ─────────────────────────────────────

export const SUPPLEMENT_MAP = new Map<string, SupplementItem>();
SUPPLEMENTS.forEach((s) => SUPPLEMENT_MAP.set(s.id, s));

/** 根據 tag 篩選 */
export function getSupplementsByTag(tag: string): SupplementItem[] {
  return SUPPLEMENTS.filter((s) => s.tags.includes(tag as any));
}

/** 取得啟用中補品 */
export function getActiveSupplements(): SupplementItem[] {
  return SUPPLEMENTS.filter((s) => s.isActive);
}
```

### Updated `resolver.ts` (key changes)
```typescript
// Source: existing resolver.ts with behavior/remedy branches removed

import type { FoodItem, SupplementItem, ItemType, HealthTag } from "./types";
import { FOOD_MAP } from "./foods";
import { SUPPLEMENT_MAP } from "./supplements";   // renamed import

export interface ResolvedItem {
  id: string;
  type: ItemType;              // "food" | "supplement"
  name: string;
  dose: string;
  cal: number;
  tags: HealthTag[];
  description: string;
  tcm?: { effect: string; nature: string };
  caution?: string;
  isCore: boolean;
  raw: FoodItem | SupplementItem;  // updated union
}

export function resolveAndGroup(ids: string[]): {
  supplements: ResolvedItem[];
  foods: ResolvedItem[];
} {
  const all = resolveItems(ids);
  return {
    supplements: all.filter((i) => i.type === "supplement"),
    foods: all.filter((i) => i.type === "food"),
  };
}
```

### `data-service.ts` changes
```typescript
// Source: existing data-service.ts — changes only

// Remove: import of RemedyItem, BehaviorItem
import type { FoodItem, HealthTag, TCMNature } from "../data/types";

// Update SHEETS constant:
const SHEETS = {
  FOODS: "foods",
  SUPPLEMENTS: "supplements",    // was REMEDIES: "remedies"
  DAILY_PLANS: "daily_plans",
  NUTRITION: "nutrition_log",
  SUPPLEMENT_LOG: "supplement_log",
  WEIGHT: "weight_log",
} as const;

// Remove: rowToRemedy() function entirely
// Remove: DataService.getRemedies() method entirely
// (Both move to ItemService in Phase 6)
```

---

## Complete Call-Site Audit

Every file that must change and exactly what changes are required:

### `src/data/types.ts`
- Remove `BehaviorItem` interface (lines 139-146)
- Remove `"remedy" | "behavior"` from `ItemType` union → `"food" | "supplement"`
- Remove `RemedyItem` interface (lines 116-135)
- Add `SupplementTiming` type
- Add `SUPPLEMENT_TIMING_LABELS` constant
- Add `SupplementItem` interface
- Add `FoodIngredient` interface
- Add `ingredients?: FoodIngredient[]` to `FoodItem`
- Add `InventoryEntry` interface
- Add `ConsumptionEvent` interface
- Update `AnyItem` = `FoodItem | SupplementItem`
- Update file-level block comment ASCII art (remove remedies/behaviors column)

### `src/data/remedies.ts` → `src/data/supplements.ts` (file rename)
- Remove `import type { RemedyItem, BehaviorItem }`
- Add `import type { SupplementItem }`
- Remove `NATURAL_REMEDIES: RemedyItem[]`
- Remove `BEHAVIORS: BehaviorItem[]`
- Rename `SUPPLEMENTS` type annotation from `RemedyItem[]` to `SupplementItem[]`
- Remove `REMEDY_MAP` → add `SUPPLEMENT_MAP: Map<string, SupplementItem>`
- Remove `getRemediesByTag()` → add `getSupplementsByTag()`
- Remove `getCoreRemedies()` → add `getActiveSupplements()`
- Remove `getByType()`
- Update file-level block comment

### `src/data/resolver.ts`
- Update import: remove `RemedyItem, BehaviorItem` → add `SupplementItem`
- Update import: `REMEDY_MAP` from `"./remedies"` → `SUPPLEMENT_MAP` from `"./supplements"`
- Update `ResolvedItem.raw` type: `FoodItem | SupplementItem`
- Remove `behavior` branch from `resolveItem()` (lines 41-55)
- Update `RemedyItem` cast to `SupplementItem` cast
- Update field mapping: `r.mechanism` may not exist (now `mechanism?`) — use `r.mechanism ?? ""`
- Update `resolveAndGroup()` return type: remove `remedies`, `behaviors`; keep only `{ supplements, foods }`
- Update `resolveAndGroup()` body: remove the two old filter lines

### `src/lib/data-service.ts`
- Update imports: remove `RemedyItem, BehaviorItem`
- Rename `SHEETS.REMEDIES: "remedies"` → `SHEETS.SUPPLEMENTS: "supplements"`
- Remove `rowToRemedy()` function entirely
- Remove `DataService.getRemedies()` method entirely
- (The existing `DataService.getFoods()` stays — ownership transfers to `ItemService` in Phase 6, but the method can remain for backward compat until then)

### `src/pages/SupplementSchedule.tsx`
- Update import: `{ SUPPLEMENTS, NATURAL_REMEDIES, BEHAVIORS } from "../data/remedies"` → `{ SUPPLEMENTS } from "../data/supplements"`
- Remove `NATURAL_REMEDIES` and `BEHAVIORS` from `allItems` spread
- Remove `{ key: "remedy", ... }` and `{ key: "behavior", ... }` from `TYPE_FILTERS`
- Update `FilterType` = `"all" | ItemType` (will now only include `"all" | "food" | "supplement"`)
- Update `allItems` spread: `[...SUPPLEMENTS]` only
- Remove `const remedies` and `const behaviors` filter lines
- Update stats line: `補品 {SUPPLEMENTS.length} 種`
- Remove `{remedies.length > 0 && ...}` and `{behaviors.length > 0 && ...}` JSX blocks
- Update item render: `item.timing` is now `SupplementTiming[]` not `string` — render as joined string or map to labels

### `src/pages/DailyPlan.tsx`
- Remove `remedy` entry from `TYPE_STYLES` object (line 44)
- Remove `behavior` entry from `TYPE_STYLES` object (line 46)
- Remove `remedy` and `behavior` entries from the inline `border` object (line 51)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `RemedyItem` covers both supplement + food therapy | `SupplementItem` with `type: "supplement"` only | Phase 5 | Simpler union; each item has one clear category |
| `BehaviorItem` for habits in the supplement catalog | Removed entirely | Phase 5 | Behaviors (habits) are not supplements; removing avoids confusing type union |
| `ItemType` = 4-value union | `ItemType` = 2-value union | Phase 5 | Fewer branches to handle in resolvers, renderers, filters |
| `REMEDY_MAP` | `SUPPLEMENT_MAP` | Phase 5 | Naming aligns with `SUPPLEMENT_*` namespace used throughout v2.0 |

---

## Open Questions

1. **`ScheduleSlot.fixedIds` and `ItemPool.itemIds` reference item IDs — after the type change, what types do those IDs resolve to?**
   - What we know: `SCHEDULE = []` so no slots exist at runtime. `ScheduleSlot` and `ItemPool` types are not imported by any file other than `types.ts` and `DailyPlan.tsx`.
   - What's unclear: Whether `ScheduleSlot` should reference `FoodItem | SupplementItem` IDs or remain generic strings.
   - Recommendation: Per D-15, leave `ScheduleSlot` and `ItemPool` types unchanged for Phase 9 to redesign. They are harmless dead types today.

2. **`SupplementLogEntry.takenIds` comment says "今天實際吃了哪些 remedy IDs" — should this comment be updated?**
   - What we know: The interface itself remains structurally correct (a string array of IDs).
   - What's unclear: Whether the JSDoc comment is in scope for this phase.
   - Recommendation: Update the comment as part of the `types.ts` edit (low cost, correct behaviour). Comment says "remedy IDs" — update to "supplement IDs".

3. **`SupplementSchedule.tsx` currently renders `item.mechanism` (a string) in the expanded detail section. `SupplementItem.mechanism` is now optional (`mechanism?`). Will this break?**
   - What we know: All arrays are empty so no items render at runtime. The TypeScript type change makes the field optional.
   - What's unclear: Whether the render should use `item.mechanism ?? ""` or conditionally hide.
   - Recommendation: Update the render to `{item.mechanism && <p>{item.mechanism}</p>}` pattern matching the existing `{item.timing && ...}` conditional pattern in the same file.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code/config changes with no external dependencies. All changes are TypeScript source file edits verified by `tsc -b`.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase audit — `src/data/types.ts`, `src/data/remedies.ts`, `src/data/resolver.ts`, `src/lib/data-service.ts`, `src/pages/SupplementSchedule.tsx`, `src/pages/DailyPlan.tsx` — all call sites read directly
- `.planning/phases/05-data-model-restructure/05-CONTEXT.md` — locked decisions D-01 through D-19
- `.planning/research/ARCHITECTURE.md` — v2.0 data model design with code examples
- `.planning/research/PITFALLS.md` — Pitfall 4 (circular ingredients), Pitfall 10 (localStorage size), Pitfall 11 (ID namespace)

### Secondary (MEDIUM confidence)
- `tsconfig.json` — `noUnusedLocals: true`, `noUnusedParameters: true` confirmed as enforced; these rules are the primary validation mechanism for this phase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; existing TypeScript toolchain
- Architecture: HIGH — all call sites audited from actual source code
- Pitfalls: HIGH — derived from direct code reading + prior research in PITFALLS.md

**Research date:** 2026-03-30
**Valid until:** Stable — pure TypeScript type changes in a codebase with no external type dependencies
