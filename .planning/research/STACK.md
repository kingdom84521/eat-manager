# Stack Research

**Domain:** React SPA — Menu Composition UI, Inline Food Creation, Food Picker
**Researched:** 2026-04-08
**Confidence:** HIGH (all dependencies already installed and in use; no new packages required)

---

## Scope

This research covers ONLY what is new for milestone v4.0. The full fixed stack
(React 19.1, TypeScript ~5.8, Vite 6.3, Tailwind v4, React Router DOM 7.13,
@headlessui/react 2.2.9, HashRouter, localStorage + Google Sheets sync via GAS,
ItemService, MenuService, DataService, SettingsService) is validated from prior
milestones and NOT re-evaluated here.

---

## Core Decision: Sub-page Routing vs In-page View State Machine

**Recommendation: Extend the existing `ViewState` string-union state machine inside `MyMenu.tsx`, NOT new React Router routes.**

### Options Evaluated

| Approach | Router Impact | URL Changes | Back Button | Complexity | Verdict |
|----------|--------------|-------------|-------------|------------|---------|
| In-page `ViewState` (existing FoodManager pattern) | None | No | Not applicable | Low — mirrors existing code | **USE** |
| Sub-routes under `/menu/:action` | New `<Route>` entries | Yes (HashRouter) | Browser back works | Medium — requires URL state marshaling | Skip |
| Modal/Dialog over the list | Headlessui Dialog already in project | No | Dialog Escape | Low — less screen real estate | Skip for editor; use for food picker |
| Separate top-level route `/menu/edit/:id` | New `<Route>` + `useParams` | Yes | Browser back works | Medium | Skip |

**Why `ViewState` wins:**

FoodManager already uses `type ViewState = "list" | "add" | "edit" | "compose"` with a single `view` state variable controlling which sub-component renders. This is the established codebase pattern for multi-step flows within a single page. Menu editing (show food picker, add/remove items, confirm) maps exactly to this pattern:

```typescript
type MenuViewState = "list" | "new" | "edit";
```

- `"list"` — current MyMenu grid with create/load/rename/delete
- `"new"` — blank food picker + name input for building a menu from scratch
- `"edit"` — food picker pre-populated with an existing preset's items

No new routes, no URL parameters to unmarshal, no `useNavigate` calls needed inside the component, no back-button state management to implement.

**Why sub-routes are skipped:**

HashRouter URLs are `/#/menu`, `/#/menu/edit/:id`, etc. React Router v7 `<Route>` with `useParams` works, but it requires serializing menu ID into the URL, reading it back on render, and handling the "no menu found" case if the ID is stale. The `ViewState` pattern avoids all of this at no readability cost since the editor is a transient UI state, not a shareable/bookmarkable URL.

---

## Core Decision: Inline Food Creation — Slide-in Panel vs Modal

**Recommendation: Headlessui `Dialog` as a full-screen slide-in panel (bottom-up on mobile), reusing the existing Dialog import already in `MyMenu.tsx`.**

### Options Evaluated

| Option | Interaction Model | Screen Coverage | Depth | Verdict |
|--------|------------------|-----------------|-------|---------|
| Full-screen `Dialog` panel (slide up from bottom) | Covers menu editor, user perceives "new screen" | 100% | 2 levels deep | **USE** |
| Inline `ViewState` nesting (menu editor → food form) | Same page, nested views | 100% | 3 levels deep | Acceptable but adds view state complexity |
| Small-height `Dialog` (centered modal) | Overlays menu editor | ~60% | 2 levels deep | Loses too much screen context for a multi-field form |

**Why full-screen Dialog panel:**

The inline food creation form (NutritionLabelForm from FoodManager) is a multi-field form (~10 inputs). Rendering it in a small centered modal creates scrolling issues on mobile. A full-screen slide-up panel:

- Uses the `@headlessui/react Dialog` already imported in `MyMenu.tsx` — zero new code surface
- Drives the slide animation via `data-[closed]:translate-y-full` on `DialogPanel` — pure Tailwind, same pattern as SidebarDrawer
- Communicates depth to the user (they are now inside food creation, not menu editing)
- On cancel or save, `Dialog.onClose()` triggers, returns user to menu editor

**Integration point:** Extract `NutritionLabelForm` from `FoodManager.tsx` into `src/components/NutritionLabelForm.tsx` (or `src/components/FoodFormPanel.tsx`) so `MyMenu.tsx` can import it directly without coupling to `FoodManager`.

---

## Core Decision: Food Picker Component

**Recommendation: Inline search + scrollable list rendered directly in the menu editor view — NO new library needed.**

### What "Food Picker" Needs

1. Text input filtering `ItemService.getFoods()` results by `f.name.includes(query)` — identical to the existing FoodManager list filter at line 811
2. A scrollable list of matching foods with tap-to-add
3. A selected-foods area showing currently chosen items with tap-to-remove
4. Calorie total derived from selected items

All four are achievable with existing React `useState` + `useMemo` + Tailwind. No combobox library (Downshift, React Select, Headlessui Combobox) is needed because:

- The list items are simple name strings, not multi-attribute records
- No async typeahead is needed — the full food list is already in localStorage and loaded synchronously by `ItemService.getFoods()`
- The existing pattern (`const filteredFoods = searchTerm ? foods.filter(f => f.name.includes(searchTerm)) : foods`) is already in use twice in the codebase and is sufficient

---

## Recommended Stack Additions for v4.0

**Zero new dependencies.** Every v4.0 feature is buildable with the existing package.json.

| Feature | Mechanism | Existing Code to Reuse |
|---------|-----------|------------------------|
| Menu view state machine | `type MenuViewState = "list" \| "new" \| "edit"` in `MyMenu.tsx` | `ViewState` pattern in `FoodManager.tsx` |
| Food picker search | `useState` + `useMemo` filter | Lines 801–813 in `FoodManager.tsx` |
| Inline food creation panel | `@headlessui/react Dialog` with `data-[closed]:translate-y-full` | Dialog already imported in `MyMenu.tsx` |
| Food form in panel | Extract `NutritionLabelForm` to shared component | Lines 48–400 in `FoodManager.tsx` |
| Menu item collection (add/remove) | `useState<string[]>` for selected food IDs | `ingredients` state in FoodManager compose view |
| Rename sidebar label | String change in `SidebarDrawer.tsx` | No logic change |
| `MenuService.update()` | New method mirroring existing `rename()` pattern | `MenuService` in `menu-service.ts` |

---

## Component Extraction Required

The one structural change needed is extracting `NutritionLabelForm` out of `FoodManager.tsx` into a shared location so both `FoodManager` and the inline panel in `MyMenu` can use it without duplicating 350+ lines.

**Target location:** `src/components/NutritionLabelForm.tsx`

**Interface stays the same:**

```typescript
interface NutritionLabelFormProps {
  food?: FoodItem;
  allFoods: FoodItem[];
  onSave: (food: FoodItem) => void;
  onCancel: () => void;
}
```

`FoodManager.tsx` imports from `../components/NutritionLabelForm`.
`MyMenu.tsx` imports from `../components/NutritionLabelForm` and wraps it in a `Dialog`.

---

## MenuService Changes Required

`MenuService` currently has: `getAll`, `save`, `rename`, `delete`.

v4.0 needs `update` (replace a preset's `foodItemIds` after editing):

```typescript
update(id: string, foodItemIds: string[][]): void {
  const updated = this.getAll().map((p) =>
    p.id === id ? { ...p, foodItemIds } : p
  );
  cacheSet(MENU_KEY, updated);
}
```

This follows the exact same pattern as `rename`. No schema migration needed — `MenuPreset.foodItemIds` is already `string[][]`.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@headlessui/react Combobox` | Combobox is for autocomplete selection UX; simple filter-list is sufficient and already present in the codebase | `useState` + `useMemo` filter on `ItemService.getFoods()` |
| `react-select` / `downshift` | External combobox libraries; adds bundle weight and styling conflicts with Tailwind v4 dark theme | Native `<input>` + filtered `<ul>` |
| New React Router routes for menu editing | URL state marshaling adds complexity for a transient editor UI; HashRouter SPA URLs are not shareable anyway | `ViewState` in-page state machine |
| `motion/react` (framer-motion) | 34 kb gzip; single `translate-y` slide is handled by Tailwind `data-[closed]:translate-y-full` for free | Tailwind CSS transitions on `DialogPanel` |
| Global state (Context, Zustand, Jotai) | No cross-page state sharing needed; food list loaded from `ItemService` per render; menu list from `MenuService` per render | `useState` + service singletons |
| Separate `FoodPickerModal` component library pattern | Over-engineering; the picker is a ~60-line view state inside `MyMenu` | Inline render in `MenuViewState = "new" \| "edit"` |

---

## Integration Map

```
MyMenu.tsx
├── MenuViewState = "list"  → existing preset grid + new "建立菜單" button
├── MenuViewState = "new"   → FoodPicker (inline) + name input
│   └── "新增食物" button   → Dialog open → NutritionLabelForm (extracted component)
└── MenuViewState = "edit"  → FoodPicker pre-populated with preset.foodItemIds.flat()
    └── "新增食物" button   → Dialog open → NutritionLabelForm (extracted component)

src/components/
└── NutritionLabelForm.tsx  (extracted from FoodManager.tsx)
    └── used by: FoodManager.tsx (existing), MyMenu.tsx (new)

src/lib/menu-service.ts
└── add: update(id, foodItemIds)  (new method, same pattern as rename)
```

---

## Version Compatibility

All versions already installed and in active use. No compatibility research needed.

| Package | Installed Version | Status |
|---------|------------------|--------|
| `@headlessui/react` | 2.2.9 | Dialog used in `MyMenu.tsx`, `SidebarDrawer.tsx` |
| `react` | 19.1.0 | Active |
| `react-router-dom` | 7.13.2 | HashRouter, `useNavigate` in `MyMenu.tsx` |
| `tailwindcss` | 4.1.7 | `data-[closed]:` variants confirmed working |

---

## Sources

- `/home/ubuntu/works/eat-manager/src/pages/FoodManager.tsx` — ViewState pattern, NutritionLabelForm component boundary, search filter implementation (lines 34, 801–813)
- `/home/ubuntu/works/eat-manager/src/pages/MyMenu.tsx` — existing Dialog imports, MenuPreset data shape, headlessui usage pattern
- `/home/ubuntu/works/eat-manager/src/lib/menu-service.ts` — MenuPreset interface, existing CRUD methods
- `/home/ubuntu/works/eat-manager/src/App.tsx` — route registry, confirms no sub-routes exist under `/menu`
- `/home/ubuntu/works/eat-manager/package.json` — confirmed zero new dependencies needed

---
*Stack research for: Eat Manager v4.0 — Menu Composition & Inline Food Creation*
*Researched: 2026-04-08*
