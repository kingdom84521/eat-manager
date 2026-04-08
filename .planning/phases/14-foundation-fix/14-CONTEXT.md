# Phase 14: Foundation Fix - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers two targeted fixes that unblock Phase 15 (Menu Composition Editor):
1. Rename sidebar label "我的食材" → "我的食物" (NAV-05)
2. Make resolveItem() resolve user-created food items from ItemService, not only static FOOD_MAP entries (RES-01)

No new features, no UI changes beyond the label rename.

</domain>

<decisions>
## Implementation Decisions

### Sidebar Rename
- **D-01:** Change the `label` string in `src/components/SidebarDrawer.tsx` NAV_ITEMS array from `"我的食材"` to `"我的食物"`. Single string change, no structural impact.

### Resolver Merge Strategy
- **D-02:** resolveItem() should fall back to ItemService when FOOD_MAP misses. After the static FOOD_MAP lookup fails, read user-created foods from ItemService (localStorage `wellness_foods`) and check there. This avoids mutating the global FOOD_MAP and always reflects the latest user data.
- **D-03:** The fallback is lazy — only triggered when FOOD_MAP has no match. No startup preloading needed. This keeps the resolver's hot path (static catalog hits) unchanged.

### Claude's Discretion
- Whether to import ItemService directly or extract a small helper function for the localStorage read
- Whether to add the user-food lookup before or after the supplement check (recommended: after both SUPPLEMENT_MAP and FOOD_MAP miss, since user-created items are always type "food")

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Resolver & Data Layer
- `src/data/resolver.ts` — Current resolveItem() implementation; only checks FOOD_MAP and SUPPLEMENT_MAP
- `src/data/foods.ts` — Static FOOD_MAP definition (lines 15-16)
- `src/data/types.ts` — FoodItem interface definition
- `src/lib/item-service.ts` — ItemService with user-created food CRUD; localStorage key `wellness_foods`

### Navigation
- `src/components/SidebarDrawer.tsx` — NAV_ITEMS array with sidebar labels (line 9)

### Requirements
- `.planning/REQUIREMENTS.md` — NAV-05 and RES-01 definitions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ItemService.getFoods()` in `src/lib/item-service.ts` — returns all user-created foods from localStorage; can be called synchronously from resolveItem()
- `FOOD_MAP` in `src/data/foods.ts` — static Map<string, FoodItem> for catalog foods
- `SUPPLEMENT_MAP` in `src/data/supplements.ts` — static Map<string, SupplementItem>

### Established Patterns
- Resolver checks SUPPLEMENT_MAP first, then FOOD_MAP, returns null on miss with console.warn
- ItemService uses `wellness_` prefix for localStorage keys, same cacheGet/cacheSet helpers as DataService
- All food items (static and user-created) share the same FoodItem interface

### Integration Points
- `resolveItem()` is called from `UnifiedPlan.tsx` and `MyMenu.tsx` — both will benefit from the fix without code changes
- SidebarDrawer.tsx NAV_ITEMS array is the single source of sidebar labels

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The fix is mechanical: add an ItemService fallback path in resolveItem() and change one string in SidebarDrawer.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-foundation-fix*
*Context gathered: 2026-04-08*
