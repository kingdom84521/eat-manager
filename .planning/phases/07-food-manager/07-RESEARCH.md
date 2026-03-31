# Phase 7: Food Manager - Research

**Researched:** 2026-03-31
**Domain:** React SPA food CRUD page — form state management, ingredient composition with live macro calculation, Open Food Facts API integration
**Confidence:** HIGH

## Summary

Phase 7 builds a single-page Food Manager component (`src/pages/FoodManager.tsx`) that provides full CRUD for the user's food catalog. All service infrastructure (ItemService, FoodItem type, FoodIngredient type) was completed in Phases 5–6 and is ready to consume. The page follows established patterns from Settings.tsx (forms), DailyPlan.tsx (cards, TagBadge), and WeightLog.tsx (useEffect + service call).

The three most technically involved areas are: (1) multi-view state machine inside a single component (`"list" | "add" | "edit" | "compose"`); (2) live macro recalculation as ingredient grams change; and (3) Open Food Facts API integration with debounced search. All three have clear precedents or specifications in the CONTEXT.md decisions.

**Primary recommendation:** Follow the locked decisions in CONTEXT.md verbatim — the architecture is fully specified. Implementation effort is purely in building the UI and wiring to ItemService. Use the v2 API endpoint (`/api/v2/search`) for Open Food Facts rather than the legacy `search.pl` since v2 is current and the CONTEXT.md URL works for both.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Navigation & Routing**
- D-01: Add "食材" (Foods) tab to bottom nav in `App.tsx` with `🍽️` icon at position 2 (after 方案, before 飲食). Path: `/foods`.
- D-02: Food Manager is a single page component `src/pages/FoodManager.tsx` — default export. List view, add form, and edit form all rendered within this single page using local state to switch views (no sub-routes).
- D-03: Page states: `"list"` (default), `"add"`, `"edit"`, `"compose"`. Controlled by `useState<"list" | "add" | "edit" | "compose">`.

**Food List View**
- D-04: Scrollable list of food cards. Each card: food name, serving size, calories, colored indicator if composed food (has ingredients). Pattern: `bg-slate-800/50`, `rounded-lg`, `border-l-3`.
- D-05: Search/filter bar at top — text input filters foods by name (client-side, instant).
- D-06: "新增食材" floating action button bottom-right above tab bar. Two options: "營養標示" and "組合食材".
- D-07: Tap food card → switch to edit view pre-filled. Long-press or swipe → delete confirmation.

**Nutrition Label Form (Add/Edit)**
- D-08: Form fields: name (required), serving (required), cal, protein, fat, carbs, sodium — all numeric default 0. Sugar optional.
- D-09: Source field — free text.
- D-10: Tags — multi-select from existing `HealthTag` values. Optional.
- D-11: Save generates ID as `food_{Date.now()}`. Calls `ItemService.saveFood()`. Edit reuses same ID.

**Ingredient Composition Form**
- D-12: Separate view state `"compose"`. Top: food name + serving description. Bottom: ingredient list.
- D-13: Each ingredient row: food selector (search existing foods by name) + grams input. Add/remove rows.
- D-14: Live macro recalculation: `sum(ingredient.field * (grams / 100))` for each macro. Display at top of ingredient section.
- D-15: Composed foods saved as `FoodItem` with `ingredients` array populated. cal/protein/fat/carbs/sodium stored as computed snapshot values.
- D-16: Ingredient selector shows only non-composed foods (atomic). Composed foods CANNOT reference other composed foods.

**Open Food Facts Integration**
- D-17: Search input in composition form (not nutrition label form).
- D-18: API: `GET https://world.openfoodfacts.org/cgi/search.pl?search_terms={query}&json=true&page_size=10&fields=product_name,nutriments,serving_size,image_front_small_url`
- D-19: Search results: compact cards with product name, kcal/100g, thumbnail. Tap → creates new FoodItem from OFF data, adds as ingredient.
- D-20: OFF nutriment mapping: `energy-kcal_100g` → cal, `proteins_100g` → protein, `fat_100g` → fat, `carbohydrates_100g` → carbs, `sodium_100g` → sodium (convert g→mg by * 1000). Source = "Open Food Facts".
- D-21: Debounced search — 300ms delay. Loading spinner during fetch. "找不到結果" if empty.

**Delete Behavior**
- D-22: Delete shows `window.confirm()`. Calls `ItemService.deleteFood(id)`. Immediate list update.
- D-23: Cannot delete food referenced as ingredient in a composed food. Show: "此食材被其他組合食材使用中".

### Claude's Discretion
- Internal component decomposition within FoodManager.tsx
- Exact Tailwind classes for form inputs (follow existing patterns from Settings.tsx)
- Whether to show "empty state" illustration or just text when no foods exist
- Animation/transition between list/add/edit/compose views
- Whether to pre-populate initial food catalog suggestions

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOOD-01 | User can add a food item by filling in nutrition label fields (name, calories, protein, fat, carbs, sodium, serving size) | D-08/D-09/D-10/D-11 specify the exact form. `ItemService.saveFood()` is ready. ID pattern: `food_{Date.now()}`. |
| FOOD-02 | User can compose a food from multiple ingredients with adjustable quantities | D-12/D-13 specify the compose view. `FoodIngredient` type (foodId, grams) is in types.ts. Only atomic foods shown (D-16). |
| FOOD-03 | Composed food displays dynamically calculated total calories and macros based on current ingredient ratios | D-14 specifies formula: `sum(ingredient.field * (grams / 100))`. Pure JS calculation, no library needed. |
| FOOD-04 | User can search Open Food Facts for ingredient data when composing a food | D-17/D-18/D-19/D-20/D-21 specify API endpoint, field mapping, debounce, and result display. |
| FOOD-05 | User can edit an existing food item | D-07/D-11 specify edit flow. Same form component reused with pre-populated data. Edit preserves original ID. |
| FOOD-06 | User can delete a food item | D-22/D-23 specify delete behavior including reference guard. |
| FOOD-07 | Food list page accessible from app navigation, showing all saved foods with nutrition summary | D-01 (nav tab) + D-04/D-05 (list view) fully specify this. App.tsx needs new route + tab entry. |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.1.0 (installed) | Component rendering, useState, useEffect, useCallback | Already in project |
| TypeScript | ~5.8.3 (installed) | Type safety, FoodItem/FoodIngredient interfaces | Already in project |
| React Router DOM | ^7.6.0 (installed) | NavLink + Route for `/foods` tab | Already in project |
| Tailwind CSS v4 | ^4.1.7 (installed) | Utility classes, dark theme tokens | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ItemService (project) | n/a | getFoods/saveFood/deleteFood — localStorage + Sheets sync | All food persistence |
| FoodItem type (project) | n/a | name, serving, cal, protein, fat, carbs, sugar, sodium, source, tags, ingredients | All food data shapes |
| FoodIngredient type (project) | n/a | { foodId: string; grams: number } | Ingredient rows in compose form |
| HEALTH_TAG_LABELS/COLORS (project) | n/a | Tag badge rendering | Tag multi-select UI |
| Open Food Facts API | free, no key | Search ingredient nutritional data | Compose form ingredient lookup |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native fetch + debounce | axios or swr | No dependency needed; project already uses native fetch throughout |
| `window.confirm()` for delete | Custom modal | D-22 locks this; simpler, already established in project |
| Single-file sub-components | Separate component files | D-02 locks single-file pattern matching existing pages |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

```
src/pages/FoodManager.tsx        # Single file, default export
  ├── FoodCard                   # Sub-component: single food row in list
  ├── NutritionLabelForm         # Sub-component: add/edit form (D-08 fields)
  ├── ComposeForm                # Sub-component: compose view with ingredient rows
  ├── IngredientRow              # Sub-component: single ingredient (food selector + grams)
  └── OffSearchResults           # Sub-component: Open Food Facts result cards
```

All sub-components defined inline in FoodManager.tsx (matches DailyPlan.tsx and SupplementSchedule.tsx pattern).

### Pattern 1: Multi-View State Machine

**What:** Single page component with `useState<"list" | "add" | "edit" | "compose">` to switch between views. No sub-routes, no React Router navigation.

**When to use:** As specified in D-02/D-03.

**Example:**
```typescript
// Source: established pattern from project CONTEXT.md D-03
type ViewState = "list" | "add" | "edit" | "compose";

export default function FoodManager() {
  const [view, setView] = useState<ViewState>("list");
  const [editTarget, setEditTarget] = useState<FoodItem | null>(null);
  const [foods, setFoods] = useState<FoodItem[]>([]);

  useEffect(() => {
    ItemService.getFoods().then(setFoods);
  }, []);

  if (view === "add") return <NutritionLabelForm onSave={handleSave} onCancel={() => setView("list")} />;
  if (view === "edit" && editTarget) return <NutritionLabelForm food={editTarget} onSave={handleSave} onCancel={() => setView("list")} />;
  if (view === "compose") return <ComposeForm foods={foods} onSave={handleSave} onCancel={() => setView("list")} />;
  return <ListView foods={foods} onEdit={handleEdit} onDelete={handleDelete} onAdd={handleAdd} />;
}
```

### Pattern 2: Live Macro Calculation

**What:** Derive macro totals from ingredient list in real time. No state for totals — computed from ingredient state on each render.

**When to use:** Inside ComposeForm for composed food totals (D-14).

**Example:**
```typescript
// Source: CONTEXT.md D-14 formula
function calcTotals(ingredients: IngredientDraft[], foodMap: Map<string, FoodItem>) {
  return ingredients.reduce(
    (acc, ing) => {
      const food = foodMap.get(ing.foodId);
      if (!food) return acc;
      const ratio = ing.grams / 100;
      return {
        cal: acc.cal + food.cal * ratio,
        protein: acc.protein + food.protein * ratio,
        fat: acc.fat + food.fat * ratio,
        carbs: acc.carbs + food.carbs * ratio,
        sodium: acc.sodium + food.sodium * ratio,
      };
    },
    { cal: 0, protein: 0, fat: 0, carbs: 0, sodium: 0 }
  );
}
```

### Pattern 3: Debounced API Search

**What:** `useEffect` with cleanup timer to delay API call 300ms after keystroke (D-21).

**When to use:** OFF search input in ComposeForm.

**Example:**
```typescript
// Source: CONTEXT.md D-21 + standard React debounce pattern
const [query, setQuery] = useState("");
const [results, setResults] = useState<OffProduct[]>([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  if (!query.trim()) { setResults([]); return; }
  const timer = setTimeout(async () => {
    setLoading(true);
    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=true&page_size=10&fields=product_name,nutriments,serving_size,image_front_small_url`;
      const res = await fetch(url);
      const data = await res.json();
      setResults(data.products ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, 300);
  return () => clearTimeout(timer);
}, [query]);
```

### Pattern 4: Save Food with ID Generation

**What:** New foods get `food_{Date.now()}` ID. Edits reuse existing ID.

**When to use:** NutritionLabelForm and ComposeForm save handlers (D-11).

**Example:**
```typescript
// Source: CONTEXT.md D-11, D-15
async function handleSave(draft: FoodItemDraft, existingId?: string) {
  const food: FoodItem = {
    ...draft,
    id: existingId ?? `food_${Date.now()}`,
    type: "food",
  };
  await ItemService.saveFood(food);
  const updated = await ItemService.getFoods();
  setFoods(updated);
  setView("list");
}
```

### Pattern 5: Reference Guard for Delete

**What:** Before deleting, check if any composed food references the target food ID in its `ingredients` array (D-23).

**Example:**
```typescript
// Source: CONTEXT.md D-23
function isIngredientInUse(foodId: string, allFoods: FoodItem[]): boolean {
  return allFoods.some(
    (f) => f.ingredients?.some((ing) => ing.foodId === foodId) ?? false
  );
}

async function handleDelete(id: string) {
  if (isIngredientInUse(id, foods)) {
    alert("此食材被其他組合食材使用中");
    return;
  }
  if (!window.confirm("確定要刪除此食材？")) return;
  await ItemService.deleteFood(id);
  setFoods((prev) => prev.filter((f) => f.id !== id));
}
```

### Pattern 6: Bottom Nav Extension

**What:** Add new tab object to the `tabs` array in `App.tsx` at position 2 (index 1). Add `Route` for `/foods`.

**Example:**
```typescript
// Source: src/App.tsx pattern — current tabs array has 5 entries
const tabs = [
  { path: "/plan",     icon: "🎲", label: "方案" },
  { path: "/foods",    icon: "🍽️", label: "食材" },   // NEW — position 2
  { path: "/track",    icon: "📊", label: "飲食" },
  { path: "/schedule", icon: "💊", label: "時程" },
  { path: "/weight",   icon: "⚖️", label: "體重" },
  { path: "/settings", icon: "⚙️", label: "設定" },
];
```

### Anti-Patterns to Avoid

- **Storing computed totals as state in ComposeForm:** Totals should be derived from ingredient state on render. Storing them separately creates sync bugs when ingredients change.
- **Using sub-routes for list/add/edit/compose views:** D-02 locks this to local state switching. Sub-routes would break the nav bar active state and the existing HashRouter pattern.
- **Allowing composed foods in the ingredient selector:** D-16 is firm. Must filter `f.ingredients == null || f.ingredients.length === 0` when building the atomic foods list.
- **Searching existing food list via `foods.ts` searchFoods():** The `FOODS` array in `foods.ts` is empty (data comes from ItemService). Ingredient selector must filter from the `foods` state array (loaded via `ItemService.getFoods()`), not from the static module.
- **Not encoding the query in the OFF URL:** `encodeURIComponent(query)` is required for non-ASCII characters (e.g., Chinese search terms). OFF may return no results or errors for unencoded unicode.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Food persistence (CRUD) | Custom localStorage serialization | `ItemService.saveFood/deleteFood/getFoods` | Already handles upsert, delete, cache, and Sheets sync |
| Macro calculation | Custom nutrition math library | Inline `sum(field * grams / 100)` formula | The formula is exactly 1 line per macro — no abstraction needed |
| Debounce utility | Custom debounce function | `useEffect` + `setTimeout` + `clearTimeout` cleanup | React idiom, no library needed; <10 lines |
| Tag badge rendering | Custom tag component | Duplicate `TagBadge` from DailyPlan.tsx inline in FoodManager.tsx | Existing component covers exact use case |
| Form validation | Validation library (Zod, Yup) | Inline `if (name.trim() === "")` guards | Only 2 required fields; no library overhead justified |
| Delete confirmation | Custom modal component | `window.confirm()` | D-22 specifies this explicitly |

**Key insight:** Phases 5–6 built all persistence and type infrastructure. Phase 7 is a pure UI build with zero new service layer work.

---

## Open Food Facts API — Integration Details

### Endpoint (as decided in D-18)
```
GET https://world.openfoodfacts.org/cgi/search.pl
  ?search_terms={encoded_query}
  &json=true
  &page_size=10
  &fields=product_name,nutriments,serving_size,image_front_small_url
```

### Response Shape
```typescript
interface OffSearchResponse {
  count: number;
  page: number;
  page_size: number;
  products: OffProduct[];
}

interface OffProduct {
  product_name: string;
  serving_size?: string;
  image_front_small_url?: string;
  nutriments: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    fat_100g?: number;
    carbohydrates_100g?: number;
    sodium_100g?: number;   // in grams — multiply * 1000 for mg
  };
}
```

### Nutriment Field Mapping (D-20)
| OFF field | FoodItem field | Transform |
|-----------|---------------|-----------|
| `energy-kcal_100g` | `cal` | Direct (already kcal) |
| `proteins_100g` | `protein` | Direct (grams) |
| `fat_100g` | `fat` | Direct (grams) |
| `carbohydrates_100g` | `carbs` | Direct (grams) |
| `sodium_100g` | `sodium` | * 1000 (g → mg) |

### CORS Status
**MEDIUM confidence** — The legacy `search.pl` endpoint is widely used from browsers in community projects. The v2 API (`/api/v2/search`) documentation shows browser fetch examples. Historical GitHub issues show some OFF sub-endpoints lacked CORS headers, but the main world.openfoodfacts.org search endpoints have CORS headers in practice. The project CONTEXT.md (verified during prior discussion) states "CORS is supported for browser requests" — treat this as the authoritative decision. If CORS fails in testing, fallback is a CORS proxy or switching to `api/v2/search`.

### Rate Limit Consideration
OFF documentation notes 10 requests/minute for search. With 300ms debounce this is unlikely to be hit in normal use. No special handling needed for MVP.

### Taiwanese Product Coverage
As noted in STATE.md blockers: OFF coverage for Taiwanese ingredients is sparse. This is a product/data concern, not an implementation concern — the UI works correctly regardless of OFF results. If OFF returns empty for a query, the "找不到結果" message (D-21) handles this gracefully. Users can always fall back to manually entering nutrition data via the label form.

---

## Common Pitfalls

### Pitfall 1: getFoods() Returns Merged Result (Hardcoded + Cache)
**What goes wrong:** `ItemService.getFoods()` merges `FOODS` (hardcoded, currently empty array) + cached items. If called without awaiting, returns a stale snapshot. Editing a food requires re-fetching to see updated state.
**Why it happens:** The pattern mirrors DataService — reads localStorage synchronously, fires background Sheets sync. The returned value is the localStorage snapshot at call time.
**How to avoid:** Always call `ItemService.getFoods()` after save/delete operations and set state from the result. Or filter/update local state directly after a successful save (faster, no re-fetch needed).
**Warning signs:** Edited food shows old values in list after returning to list view.

### Pitfall 2: Composed Food in Ingredient Selector
**What goes wrong:** If the ingredient selector shows all foods (including composed ones), users can create nested compositions. The `FoodItem.ingredients` array stores `foodId` references — if that food is itself composed, macro calculation becomes recursive.
**Why it happens:** Not filtering by `!food.ingredients || food.ingredients.length === 0`.
**How to avoid:** Filter the food selector list: `const atomicFoods = foods.filter(f => !f.ingredients?.length)`.

### Pitfall 3: Sodium Unit Mismatch
**What goes wrong:** OFF returns `sodium_100g` in **grams** (e.g., `0.45` = 450mg). FoodItem stores sodium in **milligrams**. If raw OFF value is stored directly, sodium shows as 0.45mg instead of 450mg.
**Why it happens:** Nutrition label convention (mg) differs from SI unit convention (g) used in OFF data.
**How to avoid:** Apply `* 1000` when mapping: `sodium: Math.round((nutriments.sodium_100g ?? 0) * 1000)`.

### Pitfall 4: Floating Point in Macro Totals Display
**What goes wrong:** `0.1 * 100 / 100` in JS produces `0.10000000000000001`. Displaying raw totals shows ugly precision.
**Why it happens:** IEEE 754 floating point arithmetic.
**How to avoid:** Round display values with `Math.round(total * 10) / 10` (1 decimal) or `toFixed(1)` for display. Store unrounded values in the FoodItem.

### Pitfall 5: Delete Without Reference Check Corrupts Composed Foods
**What goes wrong:** If a food used as an ingredient in a composed food is deleted, the composed food has a dangling `foodId` reference. The macro calculation returns 0 for that ingredient silently.
**Why it happens:** No foreign key constraint in localStorage.
**How to avoid:** Implement the reference guard (see Pattern 5 above) before calling `ItemService.deleteFood()`. This is specified in D-23.

### Pitfall 6: OFF Search with Chinese Characters
**What goes wrong:** Searching "豆腐" without URL encoding sends raw UTF-8 characters in the query string, which some networks/proxies may mangle.
**Why it happens:** URL spec requires encoding of non-ASCII characters.
**How to avoid:** Always `encodeURIComponent(query)` before appending to URL.

### Pitfall 7: Tab Count — 6 Tabs on Mobile
**What goes wrong:** Adding "食材" tab makes 6 tabs on the bottom nav. At very small screen widths (<320px) the labels may truncate or overflow.
**Why it happens:** `flex-1` divides space evenly — 6 tabs each get ~16.6% vs 20% for 5 tabs.
**How to avoid:** Keep labels to 2 Chinese characters maximum (all current labels are 2 chars). Phase 8 will add a 7th tab — monitor at that point for a nav redesign. For Phase 7, 6 tabs is acceptable.

---

## Code Examples

### App.tsx — Nav + Route Changes
```typescript
// Source: src/App.tsx pattern — add after existing imports
import FoodManager from "./pages/FoodManager";

const tabs = [
  { path: "/plan",     icon: "🎲", label: "方案" },
  { path: "/foods",    icon: "🍽️", label: "食材" },   // NEW
  { path: "/track",    icon: "📊", label: "飲食" },
  { path: "/schedule", icon: "💊", label: "時程" },
  { path: "/weight",   icon: "⚖️", label: "體重" },
  { path: "/settings", icon: "⚙️", label: "設定" },
];

// Inside Routes, add:
<Route path="/foods" element={<FoodManager />} />
```

### Input Style (matching Settings.tsx)
```typescript
// Source: src/pages/Settings.tsx INPUT_CLASS constant
const INPUT_CLASS =
  "w-full bg-slate-800 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500";
```

### Food Card (list view, D-04)
```typescript
// Source: DailyPlan.tsx ItemCard pattern adapted for FoodItem
function FoodCard({ food, onTap, onDelete }: { food: FoodItem; onTap: () => void; onDelete: () => void }) {
  const isComposed = (food.ingredients?.length ?? 0) > 0;
  return (
    <div
      className={`rounded-lg p-3 mb-2 cursor-pointer bg-slate-800/50 border-l-3 ${isComposed ? "border-violet-500/50" : "border-amber-500/30"}`}
      onClick={onTap}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="font-bold text-sm text-slate-100">{food.name}</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {food.serving} · {food.cal} kcal
            {isComposed && <span className="ml-1.5 text-violet-400 text-[9px] font-bold bg-violet-900/30 px-1.5 py-0.5 rounded">組合</span>}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-slate-600 hover:text-red-400 px-2 py-1 text-sm"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
```

### NutritionLabelForm draft type
```typescript
// Source: FoodItem interface in src/data/types.ts
interface FoodFormDraft {
  name: string;
  serving: string;
  cal: string;       // string to allow empty input, parse on save
  protein: string;
  fat: string;
  carbs: string;
  sugar: string;
  sodium: string;
  source: string;
  tags: HealthTag[];
}
```

### OFF Product to FoodItem Mapper (D-20)
```typescript
// Source: CONTEXT.md D-20
function offProductToFood(p: OffProduct): FoodItem {
  const n = p.nutriments;
  return {
    id: `food_${Date.now()}`,
    type: "food",
    name: p.product_name ?? "未知食品",
    serving: "100g",
    cal: Math.round(n["energy-kcal_100g"] ?? 0),
    protein: Math.round((n.proteins_100g ?? 0) * 10) / 10,
    fat: Math.round((n.fat_100g ?? 0) * 10) / 10,
    carbs: Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
    sodium: Math.round((n.sodium_100g ?? 0) * 1000),  // g → mg
    source: "Open Food Facts",
    tags: [],
  };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| OFF legacy endpoint: `/cgi/search.pl` | v2 API: `/api/v2/search` also available | Ongoing (v2 stable) | Both work; D-18 specifies `search.pl` — use as specified |
| Tailwind v3 config file | Tailwind v4 `@import "tailwindcss"` | v4 (current) | No `tailwind.config.js` — use CSS `@theme` tokens in index.css |
| React class components | Functional components + hooks | Years ago | Project uses functional only — no deviation |

---

## Environment Availability

Step 2.6: SKIPPED — Phase 7 is purely client-side code changes. External dependency is Open Food Facts API (confirmed browser-accessible from prior project decisions). No new CLI tools, runtimes, databases, or services required beyond what is already running.

---

## Open Questions

1. **OFF API: `search.pl` vs `api/v2/search`**
   - What we know: D-18 specifies `search.pl`. The v2 API docs note that "full text search currently works only for v1 API". Both endpoints exist.
   - What's unclear: Whether the v2 search endpoint supports free-text `search_terms` or only faceted filters.
   - Recommendation: Use `search.pl` as specified in D-18. If it returns 503 in testing (as it did during research), confirm with a live browser test — the 503 may be intermittent load rather than a permanent issue.

2. **Long-press / swipe delete on mobile**
   - What we know: D-07 specifies "long-press or swipe → delete confirmation" for food cards.
   - What's unclear: Long-press requires `onMouseDown` + `setTimeout` or `onTouchStart`; swipe requires touch event tracking. Neither is complex, but both need care to avoid triggering on tap.
   - Recommendation: For Phase 7, implement a visible delete button on the card (✕) plus `window.confirm()` (D-22). Long-press/swipe is a UX enhancement within Claude's Discretion — a visible delete button satisfies D-22 without the gesture complexity.

3. **Initial empty state**
   - What we know: `FOODS` array is empty (`src/data/foods.ts` exports `[]`). On first load with no localStorage cache, the list will be empty.
   - What's unclear: Whether to show a prompt to add first food or a neutral empty state.
   - Recommendation: Show a text-only empty state: "尚無食材，點擊下方「+」新增" — within Claude's Discretion.

---

## Sources

### Primary (HIGH confidence)
- `src/data/types.ts` — FoodItem, FoodIngredient, HealthTag interfaces — read directly
- `src/lib/item-service.ts` — ItemService.getFoods/saveFood/deleteFood — read directly
- `src/pages/Settings.tsx` — INPUT_CLASS, form patterns, section layout — read directly
- `src/pages/DailyPlan.tsx` — TagBadge, ItemCard, TYPE_STYLES, card pattern — read directly
- `src/App.tsx` — tabs array structure, NavLink pattern, Routes — read directly
- `.planning/phases/07-food-manager/07-CONTEXT.md` — all locked decisions — read directly
- `src/data/foods.ts` — FOODS is empty; data comes via ItemService — read directly

### Secondary (MEDIUM confidence)
- [Open Food Facts API Tutorial](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorial-off-api/) — confirms `products[]` array response, nutriments field names, v2 search endpoint
- [Open Food Facts API CheatSheet](https://openfoodfacts.github.io/openfoodfacts-server/api/ref-cheatsheet/) — confirms `fields` parameter and product_name/nutriments structure
- [Project STATE.md](`.planning/STATE.md`) — confirms OFF chosen for no-API-key + CORS-friendly reasons; confirms Taiwanese coverage is sparse (blocker note)

### Tertiary (LOW confidence)
- Web search results re CORS: conflicting signals between "CORS not enabled" and "CORS works for world.openfoodfacts.org" — deferred to project CONTEXT.md locked decision which overrides

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; verified from package.json via CLAUDE.md
- Architecture: HIGH — all decisions locked in CONTEXT.md, all types/services confirmed by reading source files
- OFF API integration: MEDIUM — endpoint and field names confirmed by official docs; CORS confirmed by project locked decision; sodium unit convention confirmed by standard nutrition data practice
- Common pitfalls: HIGH — derived directly from reading source types and service code

**Research date:** 2026-03-31
**Valid until:** 2026-05-01 (stable stack; OFF API is stable but free service)
