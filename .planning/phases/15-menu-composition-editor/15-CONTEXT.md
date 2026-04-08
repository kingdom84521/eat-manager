# Phase 15: Menu Composition Editor - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can build and edit menus slot-by-slot, see live nutritional totals, and persist changes. This phase delivers the full menu editor: create/edit per-slot food assignment, food picker with search, nutritional totals display, and save via MenuService.update().

Requirements: MENU-05, MENU-06, MENU-07, MENU-08, MENU-09

</domain>

<decisions>
## Implementation Decisions

### Slot-based Editing Flow
- **D-01:** Editor shows all time slots (from SCHEDULE). User taps a slot to expand it and see current food items assigned to that slot.
- **D-02:** Each expanded slot shows its food list with remove buttons per item, plus a "+" button that opens the food picker panel scoped to that slot.
- **D-03:** When user selects a food from the picker, it's added to the currently-active slot's food list. Picker closes after selection (tap-to-add, not multi-select).

### Food Picker Panel
- **D-04:** Food picker is a manual slide-up panel (`fixed inset-x-0 bottom-0` with `translate-y` transition) — NOT a headlessui Dialog. Nested Dialog conflicts with the existing sidebar drawer.
- **D-05:** Panel shows a combined list of static catalog foods (FOODS array from `foods.ts`) and user-created foods (from ItemService.getFoods()). User-created foods appear first.
- **D-06:** Text search field at top of picker filters the combined food list by name (case-insensitive substring match).
- **D-07:** Tag filter chips below the search field, derived from actual data tags (never hardcoded — per established feedback). Multiple tags can be active simultaneously (AND filter).

### Nutritional Totals Display
- **D-08:** Sticky summary bar at the top of the editor view showing total calories, protein, fat, and carbs across all slots.
- **D-09:** Totals update live as items are added or removed. Values computed from FoodItem macro fields (cal, protein, fat, carbs).

### Menu Create vs Edit Entry
- **D-10:** MyMenu page gets a "新增菜單" (create new) button that opens the editor with empty slots.
- **D-11:** Each existing menu card gets an edit icon button that opens the editor pre-populated with the menu's saved food assignments.
- **D-12:** Editor is an in-page view within the existing `/menu` route, using ViewState machine pattern (`"list" | "editor" | "picker"`). No new routes needed — mirrors the FoodManager approach from v2.0.

### MenuService.update()
- **D-13:** Add `update(preset: MenuPreset): void` method to MenuService. Accepts a full MenuPreset and upserts by id in the `wellness_menu_presets` localStorage key.
- **D-14:** Per-slot structure preserved: `MenuPreset.foodItemIds` remains `string[][]` (array of slots, each slot an array of food IDs). Do not flatten.

### Claude's Discretion
- Animation/transition details for the slide-up food picker panel
- Exact slot expansion/collapse animation behavior
- Empty slot placeholder text and styling
- How to handle the edge case where SCHEDULE is empty (no slots loaded yet)
- Whether the "create new" flow prompts for a name upfront or after composition

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Menu Data & Service
- `src/lib/menu-service.ts` — MenuPreset interface, MenuService singleton (getAll, save, rename, delete — update() to be added)
- `src/pages/MyMenu.tsx` — Current menu list page with load/rename/delete; will gain create/edit entry points

### Food Data & Resolution
- `src/data/foods.ts` — Static FOODS array, FOOD_MAP, searchFoods() function
- `src/data/resolver.ts` — resolveItem() with user-food fallback (fixed in Phase 14)
- `src/lib/item-service.ts` — ItemService.getFoods() for user-created foods

### Schedule & Slot Structure
- `src/data/schedule.ts` — SCHEDULE array of ScheduleSlot objects (time-based slots)
- `src/data/types.ts` — ScheduleSlot, FoodItem, HealthTag interfaces; HEALTH_TAG_LABELS/COLORS

### UI Patterns (reference implementations)
- `src/pages/FoodManager.tsx` — ViewState machine pattern ("list" | "add" | "edit" | "compose"), NutritionLabelForm, tag-derived filter chips, search pattern
- `src/components/SidebarDrawer.tsx` — Headlessui Dialog-based sidebar (must NOT nest another Dialog inside)

### Requirements
- `.planning/REQUIREMENTS.md` — MENU-05 through MENU-09 definitions
- `.planning/REQUIREMENTS.md` §Out of Scope — No Dialog-based picker, no drag-and-drop, no flat structure, no Sheets sync

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MenuService` in `src/lib/menu-service.ts` — existing save/getAll/rename/delete; needs `update()` added
- `searchFoods(query)` in `src/data/foods.ts` — static catalog text search (can be composed with ItemService results)
- `ItemService.getFoods()` in `src/lib/item-service.ts` — returns user-created FoodItem[] from localStorage
- `resolveItem(id)` in `src/data/resolver.ts` — resolves any food ID (static or user-created) to ResolvedItem
- `reconstructSlots()` in `src/pages/MyMenu.tsx` — rebuilds GeneratedSlot[] from foodItemIds; can be reused or adapted for editor initial state
- `NutritionLabelForm` in `src/pages/FoodManager.tsx` — full food form (NOT reused for Phase 16 quick-create, but shows established form patterns)
- `HEALTH_TAG_LABELS`, `HEALTH_TAG_COLORS` in `src/data/types.ts` — tag display constants for filter chips

### Established Patterns
- **ViewState machine:** FoodManager uses `type ViewState = "list" | "add" | "edit" | "compose"` for in-page navigation — editor should follow this pattern
- **Tag filter chips derived from data:** Tags are extracted from actual food items, never hardcoded (established feedback)
- **Singleton service pattern:** MenuService/ItemService are plain objects with methods, not classes
- **Dark theme styling:** `bg-slate-800/50 border border-slate-700 rounded-xl` for cards, `bg-slate-900` for panels
- **Headlessui Dialog** used for confirmations (load/delete in MyMenu.tsx) — but food picker must NOT use Dialog

### Integration Points
- MyMenu.tsx — add "create" button and "edit" icon, wire ViewState to switch between list and editor views
- MenuService — add update() method for saving edited menus
- SCHEDULE array — editor renders one expandable section per slot

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following established codebase patterns.

</specifics>

<deferred>
## Deferred Ideas

- **Inline food creation (Phase 16):** Quick-create food from within the picker — explicitly out of scope here; picker only shows existing foods
- **Menu duplication (MENU-10):** Duplicate an existing menu as a new preset — deferred to future release
- **Menu Sheets sync (MENU-04):** Sync presets to Google Sheets — deferred; localStorage-only for v4.0

</deferred>

---

*Phase: 15-menu-composition-editor*
*Context gathered: 2026-04-08*
