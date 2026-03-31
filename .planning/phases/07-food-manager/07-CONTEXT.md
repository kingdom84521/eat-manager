# Phase 7: Food Manager - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Full food catalog CRUD page: list all foods, add via nutrition label form, compose foods from ingredients with live macro recalculation, search Open Food Facts for ingredient data, edit and delete existing foods. New page accessible from bottom navigation. Uses ItemService from Phase 6 for persistence.

</domain>

<decisions>
## Implementation Decisions

### Navigation & Routing
- **D-01:** Add "食材" (Foods) tab to bottom nav in `App.tsx` with 🍽️ icon at position 2 (after 方案, before 飲食). Path: `/foods`.
- **D-02:** Food Manager is a single page component `src/pages/FoodManager.tsx` — default export. List view, add form, and edit form are all rendered within this single page using local state to switch views (no sub-routes). Matches existing page pattern (single file with sub-components).
- **D-03:** Page states: `"list"` (default), `"add"`, `"edit"`, `"compose"`. Controlled by `useState<"list" | "add" | "edit" | "compose">`.

### Food List View
- **D-04:** Scrollable list of food cards. Each card shows: food name, serving size, calories, and a colored indicator if it's a composed food (has ingredients). Matches existing dark theme card pattern (`bg-slate-800/50`, `rounded-lg`, `border-l-3`).
- **D-05:** Search/filter bar at top — text input filters foods by name (client-side, instant). No server-side search for the food list itself.
- **D-06:** "新增食材" (Add Food) floating action button — positioned bottom-right above tab bar. Two options: "營養標示" (Nutrition Label) for D-07 form, "組合食材" (Compose) for D-12 form.
- **D-07:** Tap a food card → switch to edit view pre-filled with that food's data. Long-press or swipe → delete confirmation.

### Nutrition Label Form (Add/Edit)
- **D-08:** Form fields matching `FoodItem` interface: name (required), serving (required), cal, protein, fat, carbs, sodium. All numeric fields default to 0. Sugar field optional (matches `sugar?: number` on FoodItem).
- **D-09:** Source field — free text for noting where the nutrition data came from (e.g., "7-11 標示", "Open Food Facts").
- **D-10:** Tags — multi-select from existing `HealthTag` values. Optional, can be empty.
- **D-11:** Save generates ID as `food_{Date.now()}` (per Phase 6 D-05), calls `ItemService.saveFood()`, returns to list view. Edit reuses same form with existing ID (no new ID generated).

### Ingredient Composition Form
- **D-12:** Separate view state `"compose"` — form for creating composed foods. Top section: food name + serving description. Bottom section: ingredient list.
- **D-13:** Each ingredient row: food selector (search existing foods by name) + grams input. "新增食材" button adds another row. Can remove rows.
- **D-14:** Live macro recalculation: as ingredient quantities change, total cal/protein/fat/carbs/sodium update in real time. Formula: `sum(ingredient.field * (grams / 100))` for each macro. Display at the top of the ingredient section.
- **D-15:** Composed foods are saved as `FoodItem` with `ingredients` array populated. The cal/protein/fat/carbs/sodium fields are stored as the calculated values at save time (snapshot). Phase 5 D-09 says these are "derived" for composed foods — but for localStorage persistence simplicity, we store the computed values. They get recalculated if ingredients change on edit.
- **D-16:** Ingredient selector only shows non-composed foods (atomic foods). Per Phase 5 D-08: "Composed foods CANNOT reference other composed foods."

### Open Food Facts Integration
- **D-17:** Search input in the composition form (not the nutrition label form). When adding an ingredient, user can search Open Food Facts by name instead of selecting from existing catalog.
- **D-18:** API: `GET https://world.openfoodfacts.org/cgi/search.pl?search_terms={query}&json=true&page_size=10&fields=product_name,nutriments,serving_size,image_front_small_url`. Returns JSON with `products[]` array.
- **D-19:** Search results displayed as compact cards: product name, calories per 100g, image thumbnail (if available). Tap a result → creates a new FoodItem from the OFF data and adds it as an ingredient.
- **D-20:** OFF nutriment mapping: `energy-kcal_100g` → cal, `proteins_100g` → protein, `fat_100g` → fat, `carbohydrates_100g` → carbs, `sodium_100g` → sodium (convert from g to mg by * 1000 if needed). Source set to "Open Food Facts".
- **D-21:** Debounced search — 300ms delay after typing stops before firing API call. Loading spinner during fetch. "找不到結果" message if empty.

### Delete Behavior
- **D-22:** Delete shows a confirmation dialog (simple `window.confirm()` — no custom modal needed). Calls `ItemService.deleteFood(id)`. Food disappears from list immediately.
- **D-23:** Cannot delete a food that is referenced as an ingredient in a composed food. Show warning: "此食材被其他組合食材使用中". User must remove it from composed foods first.

### Claude's Discretion
- Internal component decomposition within FoodManager.tsx (how many sub-components, naming)
- Exact Tailwind classes for form inputs (follow existing patterns from Settings.tsx)
- Whether to show a "empty state" illustration or just text when no foods exist
- Animation/transition between list/add/edit/compose views
- Whether to pre-populate initial food catalog suggestions

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Types & Services
- `src/data/types.ts` — FoodItem, FoodIngredient, HealthTag interfaces
- `src/lib/item-service.ts` — ItemService.getFoods/saveFood/deleteFood methods
- `src/data/foods.ts` — FOODS array (hardcoded catalog, currently empty)

### Existing UI Patterns
- `src/App.tsx` — Router, bottom nav tabs array, page layout structure
- `src/pages/DailyPlan.tsx` — Card-based list pattern, TagBadge component, TYPE_STYLES
- `src/pages/Settings.tsx` — Form input patterns, Tailwind form styling
- `src/pages/WeightLog.tsx` — Form with validation, data service integration pattern

### Styling
- `src/styles/index.css` — Custom theme tokens (emerald-glow, surface, surface-raised)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TagBadge` component in DailyPlan.tsx — renders HealthTag badges with colors. Could be extracted or duplicated.
- `HEALTH_TAG_LABELS` / `HEALTH_TAG_COLORS` in types.ts — label and color maps for HealthTag values
- `ItemCard` pattern in DailyPlan.tsx — card layout with type indicator, expandable details
- Form input pattern in Settings.tsx — dark theme inputs with Tailwind styling

### Established Patterns
- Page components: single file, sub-components defined inline, useState for local state
- Cards: `bg-slate-800/50 rounded-lg border-l-3` with type-colored left border
- Forms: dark inputs on slate-900 backgrounds, blue/violet accent buttons
- Bottom nav: 5 tabs, `flex-1` each, `NavLink` with `isActive` conditional styling
- Data loading: `useEffect` on mount, `ItemService.getX()` → setState

### Integration Points
- `App.tsx` tabs array — add new entry for /foods
- `App.tsx` Routes — add new Route for FoodManager
- `ItemService` — already has getFoods/saveFood/deleteFood ready
- Open Food Facts API — external, no auth needed, CORS-friendly

</code_context>

<specifics>
## Specific Ideas

- Bottom nav is currently 5 tabs (方案, 飲食, 時程, 體重, 設定). Adding "食材" makes 6 tabs. Consider if this is too many — but Phase 8 will add "補品" for a total of 7. The icons + short zh-TW labels should fit on mobile.
- Open Food Facts API is free and doesn't require API key. CORS is supported for browser requests.
- The `FoodIngredient` type uses `grams` field — all macro calculations should be per-100g based (standard nutrition label convention).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-food-manager*
*Context gathered: 2026-03-31*
