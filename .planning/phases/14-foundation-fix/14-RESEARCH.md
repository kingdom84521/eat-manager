# Phase 14: Foundation Fix — Research

**Researched:** 2026-04-08
**Domain:** TypeScript module wiring, localStorage read, React string literal
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Change the `label` string in `src/components/SidebarDrawer.tsx` NAV_ITEMS array (line 9) from `"我的食材"` to `"我的食物"`. Single string change, no structural impact.
- **D-02:** resolveItem() should fall back to ItemService when FOOD_MAP misses. After the static FOOD_MAP lookup fails, read user-created foods from ItemService (localStorage `wellness_foods`) and check there. This avoids mutating the global FOOD_MAP and always reflects the latest user data.
- **D-03:** The fallback is lazy — only triggered when FOOD_MAP has no match. No startup preloading needed. This keeps the resolver's hot path (static catalog hits) unchanged.

### Claude's Discretion

- Whether to import ItemService directly or extract a small helper function for the localStorage read
- Whether to add the user-food lookup before or after the supplement check (recommended: after both SUPPLEMENT_MAP and FOOD_MAP miss, since user-created items are always type "food")

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NAV-05 | Sidebar label "我的食材" renamed to "我的食物" | Single string at `SidebarDrawer.tsx` line 9, NAV_ITEMS array key `"foods"`. No other label sites found. |
| RES-01 | User-created food items resolve correctly when loading a menu preset (not only static FOOD_MAP) | resolveItem() currently returns null for any ID not in FOOD_MAP. ItemService.getFoods() returns user-created foods from `wellness_foods_catalog` localStorage key. A synchronous localStorage read in the fallback path is sufficient — no async needed. |
</phase_requirements>

---

## Summary

Phase 14 delivers two targeted, self-contained fixes. Both changes are mechanical: one is a single string literal edit; the other is a ~10-line addition to one function in `src/data/resolver.ts`.

**NAV-05** (sidebar rename): The label `"我的食材"` sits in the `NAV_ITEMS` constant array at `SidebarDrawer.tsx` line 9, key `"foods"`. No other component renders this label. One string change closes the requirement.

**RES-01** (resolver fallback): `resolveItem()` currently checks `SUPPLEMENT_MAP` then `FOOD_MAP` and returns `null` on miss. User-created foods are stored by `ItemService` in localStorage under the key `wellness_foods_catalog`. Because `resolveItem()` is a synchronous function called in `.map()` chains (not `async`), the fallback must also be synchronous. `ItemService.getFoods()` is async (it also triggers a background Sheets sync), so the fallback must read localStorage directly using the same `cacheGet` pattern already present in `item-service.ts`. The resolver must not import `ItemService` (which would create a cross-layer async dependency) — instead, it should inline a direct `localStorage.getItem("wellness_foods_catalog")` read and parse. This is idiomatic with the existing `cacheGet` pattern used elsewhere in the codebase.

**Primary recommendation:** Add a synchronous localStorage fallback in `resolveItem()` after the FOOD_MAP miss, reading `"wellness_foods_catalog"` (the `CACHE_PREFIX + CACHE_KEYS.FOODS` key, which resolves to `"wellness_foods_catalog"`). Rename the sidebar label in the same PR.

---

## Standard Stack

No new libraries required. All implementation uses existing project stack:

| Asset | Location | Role |
|-------|----------|------|
| `src/data/resolver.ts` | existing | Add fallback lookup path |
| `src/components/SidebarDrawer.tsx` | existing | Change one string literal |
| localStorage API | browser built-in | Synchronous user-food lookup |

**Installation:** none — no new packages.

---

## Architecture Patterns

### Resolver Lookup Chain (current)

```
resolveItem(id)
  1. SUPPLEMENT_MAP.get(id)  → hit: return ResolvedItem (type: "supplement")
  2. FOOD_MAP.get(id)        → hit: return ResolvedItem (type: "food")
  3. console.warn + return null
```

### Resolver Lookup Chain (after fix)

```
resolveItem(id)
  1. SUPPLEMENT_MAP.get(id)              → hit: return ResolvedItem (type: "supplement")
  2. FOOD_MAP.get(id)                    → hit: return ResolvedItem (type: "food")
  3. localStorage "wellness_foods_catalog" → parse, find by id → hit: return ResolvedItem (type: "food")
  4. console.warn + return null
```

### Pattern: Synchronous localStorage Fallback

The codebase already has this pattern in `item-service.ts`. The resolver should replicate it inline (not import `cacheGet` from item-service, which would create an inappropriate cross-module dependency):

```typescript
// Source: src/lib/item-service.ts — cacheGet pattern
const raw = localStorage.getItem("wellness_foods_catalog");
const userFoods: FoodItem[] = raw ? JSON.parse(raw) : [];
const userFood = userFoods.find((f) => f.id === id);
if (userFood) {
  return {
    id: userFood.id,
    type: "food",
    name: userFood.name,
    dose: userFood.serving,
    cal: userFood.cal,
    tags: userFood.tags ?? [],
    description: `P${userFood.protein}g / F${userFood.fat}g / C${userFood.carbs}g / Na${userFood.sodium}mg`,
    isCore: false,
    raw: userFood,
  };
}
```

The `description` format `P{n}g / F{n}g / C{n}g / Na{n}mg` is copied verbatim from the existing FOOD_MAP branch (line 68 of `resolver.ts`) to keep rendering consistent.

### Pattern: NAV_ITEMS Label Edit

```typescript
// src/components/SidebarDrawer.tsx line 9 — change:
{ key: "foods", path: "/foods", icon: "🍽️", label: "我的食材" },
// to:
{ key: "foods", path: "/foods", icon: "🍽️", label: "我的食物" },
```

### Anti-Patterns to Avoid

- **Do not import ItemService into resolver.ts.** `ItemService.getFoods()` is async and triggers a Sheets background sync. Calling it from `resolveItem()` would force the entire resolver to become async, breaking all `.map(resolveItem)` call sites in `UnifiedPlan.tsx` (lines 63, 72, 922) and `MyMenu.tsx` (line 26).
- **Do not mutate FOOD_MAP at startup.** D-03 explicitly requires lazy lookup. Preloading user foods into FOOD_MAP creates stale-data risk (user adds food, resolver still has old snapshot).
- **Do not wrap localStorage.getItem in try/catch suppression silently.** Follow the existing pattern: catch exceptions, return empty array as fallback, let the null path continue to the console.warn.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| localStorage read with parse | Custom abstraction | Direct `localStorage.getItem` + `JSON.parse` — matches existing cacheGet pattern |
| Food shape for ResolvedItem | New adapter | Copy existing FOOD_MAP branch shape from resolver.ts line 60-70 |

---

## Runtime State Inventory

This phase modifies the resolver lookup logic, not stored data. No data migration required.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | `wellness_foods_catalog` in localStorage — user-created FoodItem[] array | Read-only during resolve; no schema change |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | None | None |

---

## Common Pitfalls

### Pitfall 1: localStorage Key Mismatch

**What goes wrong:** The resolver reads the wrong key and always gets an empty array, making the fallback appear to work but never actually find user foods.

**Why it happens:** ItemService constructs the key as `CACHE_PREFIX + CACHE_KEYS.FOODS` = `"wellness_" + "foods_catalog"` = `"wellness_foods_catalog"`. If the resolver uses a different key string, it silently reads nothing.

**How to avoid:** Hardcode the exact string `"wellness_foods_catalog"` in the resolver's fallback. Verify against `item-service.ts` CACHE_PREFIX (`"wellness_"`) and CACHE_KEYS.FOODS (`"foods_catalog"`).

**Warning signs:** `console.warn([resolveItem] Unknown ID: ...)` still fires for known user-created food IDs after the fix.

### Pitfall 2: JSON.parse on null or malformed data

**What goes wrong:** `JSON.parse(null)` throws; `JSON.parse` on corrupted data throws. Either crashes resolveItem().

**Why it happens:** localStorage.getItem returns `null` when key is absent; stored value may be corrupted.

**How to avoid:** Guard: `const raw = localStorage.getItem("wellness_foods_catalog"); const userFoods: FoodItem[] = raw ? JSON.parse(raw) : [];` — wrapped in try/catch returning `[]` on failure, consistent with existing cacheGet pattern.

### Pitfall 3: TypeScript noUnusedLocals Violation

**What goes wrong:** If `FoodItem` is not already imported in `resolver.ts`, adding it only for the type annotation of `userFoods` is necessary — but forgetting to add the import causes a build error.

**Why it happens:** `resolver.ts` currently imports `FoodItem` and `SupplementItem` via `import type { FoodItem, SupplementItem, ItemType, HealthTag } from "./types"` — `FoodItem` IS already imported, so this is a non-issue. Confirm during implementation.

**Warning signs:** `tsc -b` fails with "FoodItem is not defined".

### Pitfall 4: ResolvedItem.raw Type

**What goes wrong:** `ResolvedItem.raw` is typed as `FoodItem | SupplementItem`. When building the user-food ResolvedItem, assign `raw: userFood` — this satisfies the union. No cast needed.

---

## Code Examples

### Full resolveItem() after fix

```typescript
// src/data/resolver.ts

export function resolveItem(id: string): ResolvedItem | null {
  // 先查 supplement
  const supplement = SUPPLEMENT_MAP.get(id);
  if (supplement) {
    return {
      id: supplement.id,
      type: "supplement",
      name: supplement.name,
      dose: supplement.dosagePerUnit,
      cal: 0,
      tags: supplement.tags,
      description: supplement.mechanism ?? "",
      tcm: supplement.tcm,
      caution: supplement.caution,
      isCore: supplement.isActive,
      raw: supplement,
    };
  }

  // 再查靜態 food 表
  const food = FOOD_MAP.get(id);
  if (food) {
    return {
      id: food.id,
      type: "food",
      name: food.name,
      dose: food.serving,
      cal: food.cal,
      tags: food.tags ?? [],
      description: `P${food.protein}g / F${food.fat}g / C${food.carbs}g / Na${food.sodium}mg`,
      isCore: false,
      raw: food,
    };
  }

  // 最後查使用者自建食物（localStorage wellness_foods_catalog）
  try {
    const raw = localStorage.getItem("wellness_foods_catalog");
    const userFoods: FoodItem[] = raw ? JSON.parse(raw) : [];
    const userFood = userFoods.find((f) => f.id === id);
    if (userFood) {
      return {
        id: userFood.id,
        type: "food",
        name: userFood.name,
        dose: userFood.serving,
        cal: userFood.cal,
        tags: userFood.tags ?? [],
        description: `P${userFood.protein}g / F${userFood.fat}g / C${userFood.carbs}g / Na${userFood.sodium}mg`,
        isCore: false,
        raw: userFood,
      };
    }
  } catch {
    // localStorage unavailable or corrupted — fall through to warn
  }

  console.warn(`[resolveItem] Unknown ID: ${id}`);
  return null;
}
```

### SidebarDrawer NAV_ITEMS change

```typescript
// src/components/SidebarDrawer.tsx — line 9
// Before:
{ key: "foods", path: "/foods", icon: "🍽️", label: "我的食材" },
// After:
{ key: "foods", path: "/foods", icon: "🍽️", label: "我的食物" },
```

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — both changes are code-only edits to existing TypeScript source files).

---

## Open Questions

None. Both changes are fully specified by the CONTEXT.md decisions and the existing codebase structure. No ambiguity remains.

---

## Sources

### Primary (HIGH confidence)

- `src/data/resolver.ts` — current resolveItem() implementation, lookup chain, ResolvedItem shape
- `src/lib/item-service.ts` — CACHE_PREFIX (`"wellness_"`), CACHE_KEYS.FOODS (`"foods_catalog"`), FoodItem[] localStorage storage pattern
- `src/components/SidebarDrawer.tsx` — NAV_ITEMS array, exact label string location (line 9)
- `src/data/foods.ts` — FOOD_MAP definition; FOODS is empty array (all foods come from localStorage/Sheets)
- `src/data/types.ts` — FoodItem interface fields (id, name, serving, cal, protein, fat, carbs, sodium, tags)
- `src/pages/UnifiedPlan.tsx`, `src/pages/MyMenu.tsx` — confirmed resolveItem() callers; both use synchronous `.map(resolveItem)` — async refactor is off-limits

### Secondary (MEDIUM confidence)

- `.planning/phases/14-foundation-fix/14-CONTEXT.md` — user decisions D-01, D-02, D-03

---

## Metadata

**Confidence breakdown:**
- NAV-05 fix: HIGH — single string literal, single file, confirmed by direct file read
- RES-01 fix: HIGH — localStorage key derived from constants in item-service.ts, async constraint confirmed by call-site audit, FoodItem shape confirmed from types.ts
- Pitfalls: HIGH — derived from actual code, TypeScript strict config, and existing codebase patterns

**Research date:** 2026-04-08
**Valid until:** Stable — no external dependencies; valid until CACHE_KEYS.FOODS or CACHE_PREFIX changes in item-service.ts
