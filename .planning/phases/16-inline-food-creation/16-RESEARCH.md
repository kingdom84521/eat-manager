# Phase 16: Inline Food Creation - Research

**Researched:** 2026-04-08
**Domain:** React inline form within a slide-up panel; localStorage-backed food persistence
**Confidence:** HIGH

## Summary

Phase 16 adds a quick-create form for new food items embedded directly inside the FoodPickerPanel in `MyMenu.tsx`. All required building blocks already exist: `ItemService.saveFood()` persists food to localStorage, `getFoods()` returns the updated list, `handleAddFood()` adds to the active slot, and the FoodPickerPanel slide-up panel is already rendered and working. The implementation is a self-contained state machine addition to the existing `MenuEditor` sub-component.

The key pattern is a `pickerMode: "list" | "create"` local state variable inside `MenuEditor` that switches the FoodPickerPanel content area between the existing food list and the new quick-create form. No new routes, no overlays, no headlessui Dialogs. After the user submits the form: (1) `ItemService.saveFood()` persists, (2) `handleAddFood(newFoodId)` adds to the active slot, (3) user foods are re-fetched via `ItemService.getFoods()` to update `allFoods` state so the new food appears in the list, (4) `pickerMode` resets to `"list"`.

The `FoodFormDraft` pattern from `FoodManager.tsx` (all numeric fields as strings, parsed on save) is the established codebase convention for form state. The quick-create form uses a subset of those fields (name, serving, cal, protein, fat, carbs — 6 fields, no sugar/sodium/source/tags).

**Primary recommendation:** Add `pickerMode` state to `MenuEditor`, render the quick-create form inside the FoodPickerPanel's scrollable area when `pickerMode === "create"`, reuse the `FoodFormDraft` / `parseFloat` / validation pattern from `FoodManager.tsx`, and generate IDs with the same `food_${Date.now()}` pattern.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Quick-create form renders as an inline section within the existing FoodPickerPanel in MyMenu.tsx — NOT a separate overlay, modal, or new route. The picker panel already slides up; the form replaces the food list area when active.
- **D-02:** A "快速新增食物" button appears at the top of the food picker list (above the food items). Tapping it switches the panel content from food list to the quick-create form.
- **D-03:** This is NOT an extraction of NutritionLabelForm from FoodManager.tsx — it's a purpose-built minimal form with different intent and fewer fields.
- **D-04:** Required fields: name (食物名稱), serving size (份量), calories (cal), protein, fat, carbs — 6 fields total.
- **D-05:** No optional fields (no sugar, sodium, source, tags, TCM info). Users can edit the full details later from the Food Manager page (我的食物).
- **D-06:** All numeric fields default to 0. Name and serving are required non-empty strings for save to proceed.
- **D-07:** After save, the new food is automatically added to the currently-active slot in the menu editor — the user created it specifically to use it.
- **D-08:** After auto-add, the form closes and the picker panel returns to the food list view. The newly created food appears in the list (user-created foods appear first, per Phase 15 D-05).
- **D-09:** The food is persisted via ItemService.saveFood() so it's available in the full food list (我的食物) and future menu editing sessions.

### Claude's Discretion

- Form layout and field arrangement within the picker panel
- Validation error display style
- Transition animation between food list and quick-create form within the panel
- Whether to show a brief success toast/flash after creation

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOOD-08 | User can quick-create a food item (name + serving + macros) from within the menu composition flow without leaving the menu page | D-01 through D-06: inline form in FoodPickerPanel with 6 required fields; `pickerMode` state machine switches panel content |
| FOOD-09 | Newly created food item appears immediately in the food picker list | After `ItemService.saveFood()`, call `ItemService.getFoods()` and call `setAllFoods([...FOODS, ...userFoods])` to refresh; new food sorts to top because `FOOD_MAP.has(id)` is false for user-created IDs |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React `useState` | 19.1.0 (project) | `pickerMode` toggle, draft form fields, validation errors | Already in use throughout MyMenu.tsx |
| `ItemService.saveFood()` | project-internal | Persist new FoodItem to localStorage `wellness_foods_catalog` | Established persistence layer; handles upsert |
| `ItemService.getFoods()` | project-internal | Re-fetch all user foods after creation to refresh `allFoods` state | Returns `[...FOODS, ...cached]` — correct combined list |
| CSS `translate-y` transition | Tailwind v4 | FoodPickerPanel open/close | Already used on the panel; no new animation needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `crypto.randomUUID()` | Browser API | Generate food ID | For new foods (no id yet); already used in MenuEditor for menu IDs |
| `parseFloat()` | JS built-in | Parse string draft fields to numbers on save | Established FoodFormDraft pattern |

No new npm packages needed.

---

## Architecture Patterns

### Recommended Project Structure

No new files required. All changes are in `src/pages/MyMenu.tsx` within the `MenuEditor` sub-component.

### Pattern 1: pickerMode State Machine

**What:** A local `pickerMode: "list" | "create"` state variable inside `MenuEditor` controls what the FoodPickerPanel body renders.

**When to use:** Whenever a panel needs to swap between browsing and creating in-place, without a new route or overlay.

**Example:**
```typescript
// Inside MenuEditor function
const [pickerMode, setPickerMode] = useState<"list" | "create">("list");

// Reset to list when picker closes
function closePicker() {
  setActiveSlotIdx(null);
  setPickerMode("list");
  setSearchQuery("");
  setActiveTags([]);
}
```

### Pattern 2: FoodFormDraft (Minimal Variant)

**What:** All form inputs are strings; numeric fields default to `"0"`; name and serving validated as non-empty; numbers parsed with `parseFloat()` on save.

**When to use:** Any React form with numeric inputs in this codebase. Avoids controlled `number` input edge cases (empty string, leading zeros).

**Example (minimal draft for Phase 16):**
```typescript
interface QuickFoodDraft {
  name: string;
  serving: string;
  cal: string;
  protein: string;
  fat: string;
  carbs: string;
}

const [draft, setDraft] = useState<QuickFoodDraft>({
  name: "",
  serving: "",
  cal: "0",
  protein: "0",
  fat: "0",
  carbs: "0",
});
```

### Pattern 3: Post-Creation Refresh

**What:** After `ItemService.saveFood()`, re-fetch user foods and merge with static catalog to update `allFoods`. The existing sort in `filteredFoods` (`!FOOD_MAP.has(a.id)` → 0 → sorts first) ensures new foods appear at the top automatically.

**Example:**
```typescript
async function handleQuickCreate() {
  // validate, build foodItem, then:
  await ItemService.saveFood(foodItem);
  handleAddFood(foodItem.id);                         // D-07: auto-add to slot
  const userFoods = await ItemService.getFoods();     // re-fetch combined list
  setAllFoods(userFoods);                             // triggers filteredFoods recompute
  setPickerMode("list");                              // D-08: return to list
  resetDraft();
}
```

Note: `ItemService.getFoods()` returns `[...FOODS, ...cached]` — the full combined list. Assign directly to `setAllFoods`.

### Pattern 4: ID Generation for New Foods

**What:** `FoodManager.tsx` uses `food_${Date.now()}` for new food IDs. This pattern ensures user-created food IDs are distinguishable from static catalog IDs (which follow `oatmeal_50g`, `chicken_breast_711` etc. naming). The resolver's user-food fallback at `resolver.ts:74` reads `wellness_foods_catalog` from localStorage and works for any ID that is absent from `FOOD_MAP` and `SUPPLEMENT_MAP`.

**Example:**
```typescript
const foodItem: FoodItem = {
  id: `food_${Date.now()}`,
  type: "food",
  name: draft.name.trim(),
  serving: draft.serving.trim(),
  cal: parseFloat(draft.cal) || 0,
  protein: parseFloat(draft.protein) || 0,
  fat: parseFloat(draft.fat) || 0,
  carbs: parseFloat(draft.carbs) || 0,
  sugar: undefined,
  sodium: 0,
  source: "",
  tags: undefined,
};
```

### Anti-Patterns to Avoid

- **Using `crypto.randomUUID()` for food ID:** MenuEditor uses it for menu IDs but `FoodManager.tsx` uses `food_${Date.now()}` for foods — keep consistent with existing food ID convention.
- **Calling `setAllFoods([...FOODS, ...userFoods])` manually:** `ItemService.getFoods()` already returns `[...FOODS, ...cached]`, so just `setAllFoods(await ItemService.getFoods())` is correct.
- **Opening the picker without resetting pickerMode:** `closePicker()` must reset `pickerMode` to `"list"` to avoid re-opening in create mode.
- **Validating inside `useEffect`:** Validate on submit only (same pattern as `FoodManager.tsx`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Food persistence | Custom localStorage write | `ItemService.saveFood(food)` | Handles upsert, background Sheets sync, cache key management |
| Refreshing food list | Manual localStorage read | `ItemService.getFoods()` | Returns correct merged array `[...FOODS, ...cached]` |
| User-food-first sort | Custom comparator | Existing `filteredFoods` sort (`!FOOD_MAP.has(a.id)` → 0) | Already implemented; new foods have non-FOOD_MAP IDs, sort to top automatically |
| Resolver support | Patching resolver.ts | Nothing needed | Phase 14 already added user-food fallback in `resolveItem()` (resolver.ts:74) |

---

## Common Pitfalls

### Pitfall 1: pickerMode Not Reset on Panel Close

**What goes wrong:** User opens picker, taps "快速新增食物", sees form. Closes panel without submitting. Opens picker for a different slot — form appears again instead of the food list.

**Why it happens:** `pickerMode` is scoped to `MenuEditor` (not per-slot), so it persists across picker open/close cycles unless explicitly reset.

**How to avoid:** Always reset `pickerMode("list")` inside `closePicker()` and also when `activeSlotIdx` is set to null via backdrop click.

**Warning signs:** "Close" button or backdrop doesn't reset `pickerMode`.

### Pitfall 2: allFoods Not Refreshed After Creation

**What goes wrong:** New food is saved to localStorage, auto-added to slot (FOOD-07), but does NOT appear in the picker food list (FOOD-09 fails). The user would have to navigate away and back.

**Why it happens:** `allFoods` is state initialized via `useEffect` on mount. Saving to ItemService updates localStorage but does not trigger a re-render unless state is explicitly updated.

**How to avoid:** After `ItemService.saveFood()`, call `ItemService.getFoods()` and call `setAllFoods()` with the result.

**Warning signs:** TypeScript build passes, food is added to slot, but list still doesn't show new item.

### Pitfall 3: FoodItem Requires `sodium` and `source` Fields

**What goes wrong:** TypeScript error — `FoodItem` interface has `sodium: number` and `source: string` as required (non-optional) fields. The quick-create form has no sodium or source inputs (D-05).

**Why it happens:** Phase 16 form omits optional details by design, but `FoodItem` type enforces presence.

**How to avoid:** Set defaults on save: `sodium: 0, source: ""`. These defaults satisfy the type without exposing fields in the UI. Confirmed in `FoodItem` interface at `src/data/types.ts:135-151`.

**Warning signs:** TypeScript error "Property 'sodium' is missing in type..."

### Pitfall 4: Duplicate ID on Rapid Taps

**What goes wrong:** User taps save twice quickly, generating two foods with `food_${Date.now()}` — if `Date.now()` returns same millisecond, the second save upserts over the first (acceptable) but two items may be added to the slot (not acceptable).

**Why it happens:** `handleAddFood` is called before the async `saveFood` resolves and the button is not disabled.

**How to avoid:** Disable the save button or set a `saving: boolean` state guard during the async operation.

### Pitfall 5: Panel Height Overflow with Form

**What goes wrong:** Form content overflows the `max-h-[70vh]` panel. The FoodPickerPanel uses `flex flex-col` with `flex-1 overflow-y-auto` on the food list. When `pickerMode === "create"`, the form should replace the scrollable list area.

**Why it happens:** If the form renders outside the `flex-1 overflow-y-auto` container, it pushes content below the panel edge.

**How to avoid:** Render the quick-create form inside the same `flex-1 overflow-y-auto` div that currently holds the food list. It's a conditional render, not an addition.

---

## Code Examples

### Current FoodPickerPanel scrollable area (MyMenu.tsx:328)

```tsx
{/* Scrollable food list */}
<div className="flex-1 overflow-y-auto px-4 pb-4">
  {/* pickerMode === "create" → render form here instead */}
  {/* pickerMode === "list" → render filteredFoods buttons */}
</div>
```

### Integration of "快速新增食物" button

Per D-02, the button appears at the top of the food list, above items:

```tsx
{/* pickerMode === "list" */}
<button
  onClick={() => setPickerMode("create")}
  className="w-full py-2.5 mb-3 rounded-lg border border-dashed border-blue-600 text-blue-400 hover:text-blue-300 hover:border-blue-400 text-sm transition"
>
  + 快速新增食物
</button>
{filteredFoods.map((food) => (...))}
```

### handleQuickCreate skeleton

```typescript
async function handleQuickCreate() {
  // Validation
  if (!draft.name.trim() || !draft.serving.trim()) return;

  const foodItem: FoodItem = {
    id: `food_${Date.now()}`,
    type: "food",
    name: draft.name.trim(),
    serving: draft.serving.trim(),
    cal: parseFloat(draft.cal) || 0,
    protein: parseFloat(draft.protein) || 0,
    fat: parseFloat(draft.fat) || 0,
    carbs: parseFloat(draft.carbs) || 0,
    sodium: 0,
    source: "",
  };

  await ItemService.saveFood(foodItem);         // persist (D-09)
  const updated = await ItemService.getFoods(); // refresh list (FOOD-09)
  setAllFoods(updated);
  handleAddFood(foodItem.id);                   // auto-add to slot (D-07)
  setPickerMode("list");                        // return to list (D-08)
  setDraft({ name: "", serving: "", cal: "0", protein: "0", fat: "0", carbs: "0" });
}
```

### Numeric field layout (2-column grid, per FoodManager.tsx pattern)

```tsx
<div className="grid grid-cols-2 gap-3 mb-3">
  {/* cal, protein, fat, carbs */}
</div>
```

---

## Runtime State Inventory

> Omitted — this is a greenfield feature phase, not a rename/refactor/migration.

---

## Environment Availability

> Skipped — phase is purely code changes to an existing static SPA; no external tools, CLIs, or services beyond the existing project stack are required.

---

## Open Questions

1. **Whether to add a success toast after creation**
   - What we know: Claude's Discretion allows a brief success flash
   - What's unclear: The project currently has no toast/notification component or pattern
   - Recommendation: Skip toast for now; the food appearing at top of the picker list and auto-adding to the slot provides sufficient feedback. Can add toast in a future quick task if users want confirmation.

2. **Back button behavior in create mode**
   - What we know: D-02/D-08 specify mode switch but not whether panel header shows a back/cancel affordance in create mode
   - What's unclear: Should the "關閉" button in picker header (MyMenu.tsx:291) close the whole panel, or should it return to list when in create mode?
   - Recommendation: Add a "← 返回" button at the top of the create form (matching FoodManager.tsx pattern) that sets `pickerMode("list")` without closing the panel. The existing "關閉" button continues to close the whole panel.

---

## Sources

### Primary (HIGH confidence)

- `src/pages/MyMenu.tsx` — Complete FoodPickerPanel implementation, ViewState machine, handleAddFood, allFoods/filteredFoods, sort logic
- `src/lib/item-service.ts` — ItemService.saveFood() (line 133), getFoods() (line 117), localStorage key `wellness_foods_catalog`
- `src/data/types.ts` — FoodItem interface (line 135): required fields `sodium: number` and `source: string`
- `src/data/resolver.ts` — User-food localStorage fallback (line 74): reads `wellness_foods_catalog` directly
- `src/pages/FoodManager.tsx` — FoodFormDraft interface (line 56), NutritionLabelForm, `food_${Date.now()}` ID pattern (line 125), 2-col numeric grid layout (line 183)
- `.planning/phases/16-inline-food-creation/16-CONTEXT.md` — All locked decisions D-01 through D-09

### Secondary (MEDIUM confidence)

- None — all findings verified directly against project source code

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project; no new dependencies
- Architecture: HIGH — patterns directly observed in FoodManager.tsx and MyMenu.tsx source
- Pitfalls: HIGH — derived from reading actual interfaces and state management in source; sodium/source type requirement confirmed from types.ts

**Research date:** 2026-04-08
**Valid until:** Stable — internal codebase reference; valid until MyMenu.tsx or ItemService is refactored
