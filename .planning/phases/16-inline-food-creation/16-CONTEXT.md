# Phase 16: Inline Food Creation - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create a new food item without leaving the menu composition flow and use it immediately. A minimal quick-create form (name + serving size + macros) appears within the food picker panel. After submission, the new food is saved to ItemService and appears at the top of the food picker list in the same session without any page reload.

Requirements: FOOD-08, FOOD-09

</domain>

<decisions>
## Implementation Decisions

### Form Placement
- **D-01:** Quick-create form renders as an inline section within the existing FoodPickerPanel in MyMenu.tsx — NOT a separate overlay, modal, or new route. The picker panel already slides up; the form replaces the food list area when active.
- **D-02:** A "快速新增食物" button appears at the top of the food picker list (above the food items). Tapping it switches the panel content from food list to the quick-create form.
- **D-03:** This is NOT an extraction of NutritionLabelForm from FoodManager.tsx — it's a purpose-built minimal form with different intent and fewer fields.

### Form Fields
- **D-04:** Required fields: name (食物名稱), serving size (份量), calories (cal), protein, fat, carbs — 6 fields total.
- **D-05:** No optional fields (no sugar, sodium, source, tags, TCM info). Users can edit the full details later from the Food Manager page (我的食物).
- **D-06:** All numeric fields default to 0. Name and serving are required non-empty strings for save to proceed.

### Post-Creation Behavior
- **D-07:** After save, the new food is automatically added to the currently-active slot in the menu editor — the user created it specifically to use it.
- **D-08:** After auto-add, the form closes and the picker panel returns to the food list view. The newly created food appears in the list (user-created foods appear first, per Phase 15 D-05).
- **D-09:** The food is persisted via ItemService.saveFood() so it's available in the full food list (我的食物) and future menu editing sessions.

### Claude's Discretion
- Form layout and field arrangement within the picker panel
- Validation error display style
- Transition animation between food list and quick-create form within the panel
- Whether to show a brief success toast/flash after creation

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Food Picker (integration point)
- `src/pages/MyMenu.tsx` — FoodPickerPanel implementation (line 277+), ViewState machine, handleAddFood(), activeSlotIdx state
- `src/pages/MyMenu.tsx` — allFoods list construction (static + user-created), filteredFoods computation

### Food Persistence
- `src/lib/item-service.ts` — ItemService.saveFood() (line 133), ItemService.getFoods() (line 117), localStorage key `wellness_foods`
- `src/data/types.ts` — FoodItem interface definition, HealthTag type

### Food Form Reference (NOT to extract, but to understand field patterns)
- `src/pages/FoodManager.tsx` — NutritionLabelForm (line 69), FoodFormDraft interface (line 56) — shows established form patterns for food items

### Resolver
- `src/data/resolver.ts` — resolveItem() with user-food fallback (Phase 14 fix ensures new foods resolve immediately)

### Requirements
- `.planning/REQUIREMENTS.md` — FOOD-08 and FOOD-09 definitions
- `.planning/REQUIREMENTS.md` §Out of Scope — "Full NutritionLabelForm extraction" explicitly out of scope

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ItemService.saveFood(food)` in `src/lib/item-service.ts` — persists a FoodItem to localStorage; handles both create (new id) and update (existing id)
- `ItemService.getFoods()` — returns all user-created FoodItem[] for refreshing the picker list after creation
- `FOODS` array + `searchFoods()` in `src/data/foods.ts` — static catalog; combined with user foods in the picker
- `resolveItem()` in `src/data/resolver.ts` — already resolves user-created foods (Phase 14 fix)

### Established Patterns
- **ViewState machine:** MyMenu.tsx uses ViewState for in-page navigation; quick-create can be modeled as a sub-state within the picker (e.g., `pickerMode: "list" | "create"`)
- **FoodFormDraft pattern:** FoodManager uses a draft interface with string fields for form inputs, parsing to numbers on save — same pattern applies here with fewer fields
- **ID generation:** ItemService.saveFood() expects a FoodItem with an `id` field; existing pattern generates IDs like `user_food_{timestamp}`
- **Tag filter chips derived from data:** Tags derived at render time, never hardcoded (established feedback)
- **Dark theme styling:** `bg-slate-800 border border-slate-600 rounded-lg` for form inputs, `bg-blue-600 hover:bg-blue-700` for primary action buttons

### Integration Points
- **FoodPickerPanel in MyMenu.tsx** — the "快速新增食物" button and form embed directly here; after save, call the existing `handleAddFood(newFoodId)` to add to the active slot
- **allFoods refresh** — after saveFood(), re-fetch user foods to update the combined list so the new food appears immediately (FOOD-09)
- **ItemService** — single call to `saveFood()` handles persistence; no MenuService changes needed

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following established codebase patterns. The form should be minimal and fast: tap "快速新增食物", fill 6 fields, tap save, food is added to slot.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-inline-food-creation*
*Context gathered: 2026-04-08*
