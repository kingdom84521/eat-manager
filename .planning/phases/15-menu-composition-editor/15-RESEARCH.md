# Phase 15: Menu Composition Editor - Research

**Researched:** 2026-04-08
**Domain:** React in-page ViewState machine, localStorage CRUD, slide-up panel, live nutritional totals
**Confidence:** HIGH

## Summary

Phase 15 delivers the full menu composition editor within the existing `/menu` route. All required infrastructure is already present in the codebase: `MenuService` for persistence, `ItemService.getFoods()` for user-created foods, `resolveItem()` (now fixed in Phase 14 to handle user-created food IDs), and `SCHEDULE` for slot structure. The FoodManager page provides a battle-tested reference implementation for the ViewState machine and data-derived tag filter chips.

The only net-new service method needed is `MenuService.update()`. Everything else — state management, food picker pattern, tag filter pattern, nutritional totals calculation, slide-up panel mechanics — can be directly modeled on existing code in this codebase. No new dependencies are required.

The critical constraint is the food picker panel: it MUST be a plain `div` with CSS `translate-y` transition, not a headlessui `Dialog`, because `SidebarDrawer` already occupies the headlessui Dialog stack and nested Dialogs conflict.

**Primary recommendation:** Model `MyMenu.tsx` ViewState machine on `FoodManager.tsx`'s pattern; build `FoodPickerPanel` as `fixed inset-x-0 bottom-0` div with controlled `translate-y`; add `MenuService.update()` as a simple upsert-by-id.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Editor shows all time slots (from SCHEDULE). User taps a slot to expand it and see current food items assigned to that slot.
- **D-02:** Each expanded slot shows its food list with remove buttons per item, plus a "+" button that opens the food picker panel scoped to that slot.
- **D-03:** When user selects a food from the picker, it's added to the currently-active slot's food list. Picker closes after selection (tap-to-add, not multi-select).
- **D-04:** Food picker is a manual slide-up panel (`fixed inset-x-0 bottom-0` with `translate-y` transition) — NOT a headlessui Dialog. Nested Dialog conflicts with the existing sidebar drawer.
- **D-05:** Panel shows a combined list of static catalog foods (FOODS array from `foods.ts`) and user-created foods (from ItemService.getFoods()). User-created foods appear first.
- **D-06:** Text search field at top of picker filters the combined food list by name (case-insensitive substring match).
- **D-07:** Tag filter chips below the search field, derived from actual data tags (never hardcoded — per established feedback). Multiple tags can be active simultaneously (AND filter).
- **D-08:** Sticky summary bar at the top of the editor view showing total calories, protein, fat, and carbs across all slots.
- **D-09:** Totals update live as items are added or removed. Values computed from FoodItem macro fields (cal, protein, fat, carbs).
- **D-10:** MyMenu page gets a "新增菜單" (create new) button that opens the editor with empty slots.
- **D-11:** Each existing menu card gets an edit icon button that opens the editor pre-populated with the menu's saved food assignments.
- **D-12:** Editor is an in-page view within the existing `/menu` route, using ViewState machine pattern (`"list" | "editor" | "picker"`). No new routes needed — mirrors the FoodManager approach from v2.0.
- **D-13:** Add `update(preset: MenuPreset): void` method to MenuService. Accepts a full MenuPreset and upserts by id in the `wellness_menu_presets` localStorage key.
- **D-14:** Per-slot structure preserved: `MenuPreset.foodItemIds` remains `string[][]` (array of slots, each slot an array of food IDs). Do not flatten.

### Claude's Discretion

- Animation/transition details for the slide-up food picker panel
- Exact slot expansion/collapse animation behavior
- Empty slot placeholder text and styling
- How to handle the edge case where SCHEDULE is empty (no slots loaded yet)
- Whether the "create new" flow prompts for a name upfront or after composition

### Deferred Ideas (OUT OF SCOPE)

- **Inline food creation (Phase 16):** Quick-create food from within the picker — explicitly out of scope here; picker only shows existing foods
- **Menu duplication (MENU-10):** Duplicate an existing menu as a new preset — deferred to future release
- **Menu Sheets sync (MENU-04):** Sync presets to Google Sheets — deferred; localStorage-only for v4.0
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MENU-05 | User can create a new menu from scratch by selecting food items per time slot | D-10, D-01 through D-03: "新增菜單" button opens editor with empty slots; SCHEDULE drives slot list |
| MENU-06 | User can open an existing menu and add/remove food items per slot | D-11: edit icon on each card opens editor pre-populated via `reconstructSlots()`-like logic |
| MENU-07 | User can search and filter the food list when picking items for a menu slot | D-06, D-07: search field + data-derived tag chips in FoodPickerPanel |
| MENU-08 | Menu editor shows nutritional totals (calories, protein, fat, carbs) for the composed menu | D-08, D-09: sticky summary bar computing live totals from FoodItem.cal/protein/fat/carbs |
| MENU-09 | Changes to a menu's food items are saved via MenuService.update() | D-13: new `update()` method upserts by id in localStorage |
</phase_requirements>

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.1.0 | UI state management (`useState`, `useEffect`, `useMemo`) | Project framework |
| TypeScript | ~5.8.3 | Type safety | Project language |
| Tailwind CSS | ^4.1.7 | Utility classes for panel, sticky bar, slot cards | Project styling |

### No New Dependencies Required

All functionality is achievable with existing React hooks and CSS utilities. The slide-up panel uses native CSS `transform: translateY` via Tailwind's `translate-y-full` / `translate-y-0` classes. No animation library needed.

**Installation:** None — zero new packages.

---

## Architecture Patterns

### ViewState Machine (established pattern — follow exactly)

`FoodManager.tsx` uses:
```typescript
type ViewState = "list" | "add" | "edit" | "compose";
const [view, setView] = useState<ViewState>("list");

// Non-list views rendered as full-page replacements:
if (view === "add") return <NutritionLabelForm ... />;
if (view === "compose") return <ComposeForm ... />;

// List view returned at bottom of render
return <div>...</div>;
```

`MyMenu.tsx` should extend this pattern:
```typescript
type ViewState = "list" | "editor";
// picker is a panel overlay, not a view — controlled by activeSlotIdx state
```

The picker panel is NOT a separate ViewState — it overlays the editor view. A separate `activeSlotIdx: number | null` controls which slot's picker is open.

### Recommended Component Structure (in MyMenu.tsx)

```
MyMenu (default export)
├── ViewState: "list" → existing list UI + "新增菜單" button + edit icons on cards
└── ViewState: "editor" → MenuEditor (inline sub-component or same file)
    ├── StickyTotalsBar (sticky top, shows live cal/protein/fat/carbs)
    ├── SlotList
    │   └── SlotCard (per SCHEDULE slot, expandable)
    │       ├── FoodChip × N (assigned foods, each with remove button)
    │       └── AddButton → sets activeSlotIdx → opens FoodPickerPanel
    └── FoodPickerPanel (fixed overlay, shown when activeSlotIdx !== null)
        ├── SearchInput
        ├── TagFilterChips (derived from actual food data)
        └── FoodList (scrollable, filtered by search + tags)
```

### Slot-to-foodItemIds Mapping

`MenuPreset.foodItemIds` is `string[][]` indexed by SCHEDULE index:
```typescript
// foodItemIds[slotIdx][itemIdx] = food ID
// SCHEDULE.length slots, each an array of food IDs
```

Editor working state mirrors this shape:
```typescript
// Draft state during editing — initialize from preset or empty arrays
const [slotFoodIds, setSlotFoodIds] = useState<string[][]>(
  () => SCHEDULE.map((_, idx) => preset?.foodItemIds[idx] ?? [])
);
```

On save: build updated `MenuPreset` from `slotFoodIds` and call `MenuService.update()` (or `MenuService.save()` for new menus with a fresh `crypto.randomUUID()` id).

### Live Nutritional Totals Calculation

Model from `ComposeForm`'s `calcTotals()` in `FoodManager.tsx`. For the menu editor, totals span all slots:

```typescript
// Source: FoodManager.tsx calcTotals() pattern
const totals = useMemo(() => {
  const allIds = slotFoodIds.flat();
  return allIds.reduce(
    (acc, id) => {
      const food = foodMap.get(id);
      if (!food) return acc;
      return {
        cal: acc.cal + food.cal,
        protein: acc.protein + food.protein,
        fat: acc.fat + food.fat,
        carbs: acc.carbs + food.carbs,
      };
    },
    { cal: 0, protein: 0, fat: 0, carbs: 0 }
  );
}, [slotFoodIds, foodMap]);
```

`foodMap` built as `useMemo(() => new Map(allFoods.map(f => [f.id, f])), [allFoods])` where `allFoods` merges static FOODS + user foods from ItemService.

### FoodPickerPanel — Manual Slide-Up

Do NOT use headlessui Dialog. The SidebarDrawer already uses headlessui Dialog at `z-50`. The picker panel should use `z-40` or a higher value that doesn't conflict (verify against existing z-index usage — sidebar is `z-50`, so picker at `z-40` is safe since sidebar opens on top, OR use `z-60` if picker must cover sidebar backdrop).

```typescript
// Controlled visibility via CSS transform — no Dialog
<div
  className={`fixed inset-x-0 bottom-0 z-40 bg-slate-900 border-t border-slate-700
    transition-transform duration-300 ease-in-out max-h-[70vh] flex flex-col
    ${activeSlotIdx !== null ? "translate-y-0" : "translate-y-full"}`}
>
  {/* Drag handle */}
  <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mt-3 mb-2" />
  {/* Search */}
  <input ... />
  {/* Tag chips */}
  ...
  {/* Food list — scrollable */}
  <div className="flex-1 overflow-y-auto px-4 pb-4">
    {filteredFoods.map(food => <button onClick={() => handlePickFood(food)} />)}
  </div>
</div>
```

Backdrop for panel: a plain `div` with `fixed inset-0 bg-black/30 z-30` shown when `activeSlotIdx !== null`, tap closes picker.

### Tag Filter Chips — Data-Derived (mandatory pattern)

Per established project feedback, tags MUST be derived from actual food data, never hardcoded:

```typescript
// Derive from combined food list
const availableTags = useMemo(() => {
  const tagSet = new Set<HealthTag>();
  allFoods.forEach(f => (f.tags ?? []).forEach(t => tagSet.add(t)));
  return [...tagSet].sort();
}, [allFoods]);
```

Multiple active tags = AND filter (all selected tags must be present):
```typescript
const filteredFoods = useMemo(() => {
  let result = allFoods;
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    result = result.filter(f => f.name.toLowerCase().includes(q));
  }
  if (activeTags.length > 0) {
    result = result.filter(f =>
      activeTags.every(tag => f.tags?.includes(tag))
    );
  }
  return result;
}, [allFoods, searchQuery, activeTags]);
```

### MenuService.update() Implementation

Simple upsert-by-id — mirrors existing `rename()` pattern:

```typescript
/** 依 id 更新菜單預設的完整內容 */
update(preset: MenuPreset): void {
  const existing = this.getAll();
  const idx = existing.findIndex(p => p.id === preset.id);
  if (idx >= 0) {
    existing[idx] = preset;
  } else {
    existing.unshift(preset); // fallback: add if not found
  }
  cacheSet(MENU_KEY, existing);
},
```

Note: CONTEXT.md D-13 says key is `wellness_menu_presets`, but the actual storage key in `menu-service.ts` is `MENU_KEY = "menu_presets"` with `CACHE_PREFIX = "wellness_"`, so the full localStorage key is `wellness_menu_presets`. These are consistent.

### Create vs Edit Entry Flow

**Create new menu:**
- User taps "新增菜單" button in list view
- Open editor with `editingPreset = null`, `slotFoodIds = SCHEDULE.map(() => [])`
- Name: either prompt inline at top of editor (recommended — avoids extra modal), or prompt on save
- On save: call `MenuService.save({ id: crypto.randomUUID(), name, createdAt: todayStr(), foodItemIds: slotFoodIds })`

**Edit existing menu:**
- User taps edit icon on a menu card
- Open editor with `editingPreset = preset`, `slotFoodIds = SCHEDULE.map((_, i) => preset.foodItemIds[i] ?? [])`
- On save: call `MenuService.update({ ...editingPreset, name, foodItemIds: slotFoodIds })`

### Anti-Patterns to Avoid

- **Do not use headlessui Dialog for the food picker.** SidebarDrawer uses Dialog at z-50; a nested Dialog causes focus trap conflicts.
- **Do not hardcode tag lists.** Always derive from actual food data in the combined list.
- **Do not flatten foodItemIds.** Keep `string[][]` structure — slot index must be preserved for `reconstructSlots()` compatibility.
- **Do not make resolveItem() async.** It was deliberately kept synchronous in Phase 14 to avoid breaking `.map(resolveItem)` call sites.
- **Do not import from `@/*` path alias.** Codebase uses relative paths throughout despite alias being configured.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Nutritional totals calculation | Custom formula | Pattern from `calcTotals()` in FoodManager.tsx | Already validated, handles missing foods |
| Food search/filter | New search logic | `f.name.toLowerCase().includes(q)` pattern from FoodManager | Established pattern, case-insensitive |
| Tag filter chips | New component | Copy tag chip pattern from FoodManager.tsx `availableTags` + toggle | Same data-derived pattern required |
| localStorage upsert | Custom merge logic | Model on existing `rename()` / `delete()` in MenuService | Same cacheGet/cacheSet helper, same pattern |
| Slide-up animation | CSS animation library | Tailwind `translate-y-full` / `translate-y-0` + `transition-transform` | No new dependency needed |

---

## Common Pitfalls

### Pitfall 1: SCHEDULE is empty at render time

**What goes wrong:** `SCHEDULE` in `src/data/schedule.ts` is currently an empty array (`export const SCHEDULE: ScheduleSlot[] = []`). Editor that maps over SCHEDULE will render zero slots.

**Why it happens:** SCHEDULE is populated from Google Sheets via background sync. On first load or offline, it's empty.

**How to avoid:** Editor should show a graceful empty state ("尚無時段，請先設定排程") when `SCHEDULE.length === 0`. Do not hard-crash or render a broken UI. The planner must handle this edge case explicitly.

**Warning signs:** Editor shows no slot cards at all.

### Pitfall 2: FOODS static array is also empty

**What goes wrong:** `FOODS` in `src/data/foods.ts` is also `export const FOODS: FoodItem[] = []`. The food picker's "static catalog" will be empty unless user-created foods exist.

**Why it happens:** Same pattern as SCHEDULE — data comes from Sheets, not hardcoded.

**How to avoid:** Food picker must rely primarily on `ItemService.getFoods()` (returns user-created foods from localStorage + merged FOODS). Display only the localStorage-sourced user foods when static catalog is empty. This is the correct behavior per D-05 ("user-created foods appear first").

**Warning signs:** Food picker shows empty list even though user has saved foods.

### Pitfall 3: resolveItem() for macro extraction

**What goes wrong:** The editor needs raw `FoodItem` macros (cal, protein, fat, carbs) for totals calculation. `resolveItem()` returns a `ResolvedItem` with only `cal` — not protein/fat/carbs. Using `resolveItem()` for totals will give incomplete data.

**Why it happens:** `ResolvedItem` is designed for rendering, not nutritional calculation.

**How to avoid:** Build a `foodMap: Map<string, FoodItem>` from the combined food list for macro lookups. Do NOT use `resolveItem()` for totals computation — use the raw `FoodItem` directly. The `raw` field on `ResolvedItem` does contain the full `FoodItem`, but it's cleaner to maintain a separate map.

**Warning signs:** Totals show only calories, protein/fat/carbs are zero.

### Pitfall 4: z-index conflicts with SidebarDrawer

**What goes wrong:** SidebarDrawer renders at `z-50`. A food picker panel at the same z-index will conflict visually.

**Why it happens:** Both fixed-position overlays, same z-level.

**How to avoid:** Use `z-40` for the picker panel backdrop and `z-50` for the panel itself (same as sidebar), OR use a higher value like `z-[60]`. Since the sidebar is opened by user intent and the picker is within the menu page, z-40/z-50 for the picker is acceptable — the sidebar won't be open at the same time as the picker in normal usage. Verify against all existing `z-*` classes in the codebase if in doubt.

### Pitfall 5: TypeScript strict mode — unused variables

**What goes wrong:** `noUnusedLocals` and `noUnusedParameters` are enabled. Build fails if any variable or parameter is declared but not used.

**Why it happens:** Strict TypeScript config in `tsconfig.json`.

**How to avoid:** Prefix intentionally unused params with `_` (e.g., `_slot` in slot-mapping callbacks). Remove any intermediate variables that end up unused.

---

## Code Examples

### MenuService.update() (new method to add)
```typescript
// Source: pattern from rename() in src/lib/menu-service.ts
update(preset: MenuPreset): void {
  const existing = this.getAll();
  const idx = existing.findIndex((p) => p.id === preset.id);
  if (idx >= 0) {
    existing[idx] = preset;
  } else {
    existing.unshift(preset);
  }
  cacheSet(MENU_KEY, existing);
},
```

### ViewState machine in MyMenu
```typescript
// Source: pattern from src/pages/FoodManager.tsx
type ViewState = "list" | "editor";
const [view, setView] = useState<ViewState>("list");
const [editingPreset, setEditingPreset] = useState<MenuPreset | null>(null);

// In render:
if (view === "editor") {
  return (
    <MenuEditor
      preset={editingPreset}
      onSave={() => { setMenus(MenuService.getAll()); setView("list"); }}
      onCancel={() => setView("list")}
    />
  );
}
// ... list view below
```

### Data-derived tag chips
```typescript
// Source: pattern from NutritionLabelForm in src/pages/FoodManager.tsx
const availableTags = useMemo(() => {
  const tagSet = new Set<HealthTag>();
  allFoods.forEach((f) => (f.tags ?? []).forEach((t) => tagSet.add(t)));
  return [...tagSet].sort();
}, [allFoods]);

// Toggle with AND semantics:
const [activeTags, setActiveTags] = useState<HealthTag[]>([]);
function toggleTag(tag: HealthTag) {
  setActiveTags((prev) =>
    prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
  );
}
```

### Initialize editor slot state from preset
```typescript
// For create: empty arrays per slot
const [slotFoodIds, setSlotFoodIds] = useState<string[][]>(
  () => SCHEDULE.map(() => [])
);

// For edit: load from preset, padded with empty arrays for any missing slots
const [slotFoodIds, setSlotFoodIds] = useState<string[][]>(
  () => SCHEDULE.map((_, idx) => preset.foodItemIds[idx] ?? [])
);
```

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified — this phase is code/config changes only, no new CLIs, runtimes, or services required).

---

## Open Questions

1. **Name prompt timing for new menus**
   - What we know: D-10 says "新增菜單" opens editor with empty slots; D-12 uses ViewState machine
   - What's unclear: Should the user be prompted for a name before entering the editor, or at save time? (Claude's discretion per CONTEXT.md)
   - Recommendation: Prompt for name inline at the top of the editor view (a simple text input pre-filled with a default like "新菜單"). This avoids an extra modal step and keeps the flow linear. If the user leaves the name empty at save time, auto-generate a name like `菜單 {createdAt}`.

2. **SCHEDULE empty edge case behavior**
   - What we know: SCHEDULE is runtime-loaded from Sheets, currently empty in source code
   - What's unclear: Should the editor block creation entirely, or show a message and let the user save an empty menu?
   - Recommendation: Show a non-blocking message in the editor ("尚無時段排程") and still allow saving (the resulting menu will have empty `foodItemIds: []`). This is better UX than a hard block.

3. **z-index layering for picker vs sidebar**
   - What we know: SidebarDrawer is `z-50`; picker must not conflict
   - What's unclear: exact z-index to use for picker panel
   - Recommendation: Use `z-40` for the dimming backdrop and `z-50` for the picker panel itself. Since the sidebar and picker are never open simultaneously in normal usage, this is safe.

---

## Sources

### Primary (HIGH confidence)
- Direct source read: `src/lib/menu-service.ts` — MenuPreset interface, all existing service methods, MENU_KEY constant
- Direct source read: `src/pages/MyMenu.tsx` — existing list view, reconstructSlots(), headlessui Dialog usage
- Direct source read: `src/pages/FoodManager.tsx` — ViewState machine, NutritionLabelForm, ComposeForm (calcTotals), tag chip pattern
- Direct source read: `src/data/foods.ts` — FOODS array is empty; searchFoods() for reference
- Direct source read: `src/data/schedule.ts` — SCHEDULE array is empty (runtime-loaded)
- Direct source read: `src/data/types.ts` — FoodItem, ScheduleSlot, HealthTag interfaces
- Direct source read: `src/data/resolver.ts` — resolveItem() Phase 14 fix confirmed present
- Direct source read: `src/lib/item-service.ts` — getFoods() returns merged FOODS + localStorage
- Direct source read: `src/components/SidebarDrawer.tsx` — uses headlessui Dialog at z-50

### Secondary (MEDIUM confidence)
- CLAUDE.md — conventions, naming patterns, component patterns, import organization
- `.planning/phases/15-menu-composition-editor/15-CONTEXT.md` — all locked decisions D-01 through D-14

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — codebase uses React/TypeScript/Tailwind exclusively; zero new packages needed
- Architecture: HIGH — all patterns directly verified from existing source files in this repo
- Pitfalls: HIGH — SCHEDULE/FOODS being empty arrays verified by reading source; z-index and TypeScript strict constraints verified from config

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable codebase, no fast-moving dependencies)
