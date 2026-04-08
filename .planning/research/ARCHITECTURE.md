# Architecture Research

**Domain:** Menu composition and inline food creation — React SPA with flat HashRouter (v4.0)
**Researched:** 2026-04-08
**Confidence:** HIGH — all decisions derived from direct codebase analysis of current source files

> **Note:** This file supersedes v3.0 research (2026-04-06) for the v4.0 milestone.
> v3.0 research remains valid as historical context — the v3.0 component architecture
> described there is now the "existing" baseline that v4.0 builds on.

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                            │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────────────┐  │
│  │UnifiedPlan│  │FoodManager│ │       MyMenu (MODIFIED)          │  │
│  │  /plan   │  │  /foods  │  │            /menu                 │  │
│  └──────────┘  └──────────┘  │                                  │  │
│                               │  ┌────────────────────────────┐ │  │
│  ┌──────────┐  ┌──────────┐  │  │  view state machine        │ │  │
│  │Supplement│  │  Profile │  │  │  "list" | "compose" |      │ │  │
│  │  /supp.  │  │ /profile │  │  │  "pick-food"               │ │  │
│  └──────────┘  └──────────┘  └──────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────┐  ┌──────────────────────────────────┐  │
│  │  FoodPickerPanel (NEW) │  │    QuickFoodCreate (NEW)         │  │
│  │  src/components/       │  │    src/components/               │  │
│  │  searchable list,      │  │    headlessui Dialog over panel  │  │
│  │  multi-select, add btn │  │    minimal nutrition form        │  │
│  └────────────────────────┘  └──────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                         Service Layer                                │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐    │
│  │  MenuService   │  │  ItemService   │  │   DataService      │    │
│  │  + update()    │  │ (unchanged)    │  │  (unchanged)       │    │
│  │  (EXTENDED)    │  │                │  │                    │    │
│  └────────────────┘  └────────────────┘  └────────────────────┘    │
├─────────────────────────────────────────────────────────────────────┤
│                          Data Layer                                  │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐      │
│  │ localStorage │  │ Google Sheets│  │  Hardcoded Catalogs  │      │
│  │  (primary)   │  │  (async bg)  │  │  (FOODS, SUPPLEMENTS)│      │
│  └──────────────┘  └──────────────┘  └──────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Where |
|-----------|----------------|-------|
| `MyMenu` (modified) | View-state router: list / compose / pick-food modes. List, rename, delete, load, edit, create menus. | `src/pages/MyMenu.tsx` |
| `FoodPickerPanel` (new) | Searchable food grid with multi-select. Hosts "新增食材" button. Slides up over content area. | `src/components/FoodPickerPanel.tsx` |
| `QuickFoodCreate` (new) | Minimal nutrition form as headlessui Dialog. Opens over FoodPickerPanel. | `src/components/QuickFoodCreate.tsx` |
| `FoodManager` (unchanged) | Full food CRUD — canonical add/edit/compose flows. Not involved in menu composition. | `src/pages/FoodManager.tsx` |
| `SidebarDrawer` (label change only) | "我的食材" → "我的食物" string change in `NAV_ITEMS`. No structural change. | `src/components/SidebarDrawer.tsx` |
| `MenuService` (extended) | Gains `update(id, patch)` for editing existing preset's `name` and `foodItemIds`. | `src/lib/menu-service.ts` |

---

## Recommended Project Structure

```
src/
├── pages/
│   ├── MyMenu.tsx              # MODIFIED: gains compose + create-from-scratch modes
│   └── FoodManager.tsx         # UNCHANGED
├── components/
│   ├── SidebarDrawer.tsx       # MODIFIED: label change only
│   ├── FoodPickerPanel.tsx     # NEW: shared food picker used by MyMenu
│   └── QuickFoodCreate.tsx     # NEW: inline food creation modal
└── lib/
    └── menu-service.ts         # MODIFIED: add update() method
```

All other files are **unchanged** in this milestone.

### Structure Rationale

- **`FoodPickerPanel` in `components/`:** The food picker is a reusable display widget — not a page. It has no route of its own. Placing it in `components/` is consistent with `SidebarDrawer` and `WeightSection`, which are the existing non-page components.
- **`QuickFoodCreate` in `components/`:** It wraps a stripped-down nutrition form. Keeping it in `components/` avoids importing across page boundaries and makes the dependency clear: `FoodPickerPanel` uses `QuickFoodCreate`, `MyMenu` uses `FoodPickerPanel`.
- **No new routes:** All new UI lives inside `/menu` via in-page view state. New routes would require serialising draft state to URL params and would break the drawer's auto-close-on-navigate behaviour (see Anti-Patterns below).

---

## Architectural Patterns

### Pattern 1: In-Page View State Machine (recommended for MyMenu)

**What:** `MyMenu` adds a `MenuViewState` discriminated union to switch between `list`, `compose`, and `pick-food` modes without creating new routes. The same pattern already exists in `FoodManager` (`type ViewState = "list" | "add" | "edit" | "compose"`).

**When to use:** Sub-views that are not bookmarkable, that belong conceptually to one page, and where the in-progress data context (the menu being composed) must survive without URL params or global state.

**Trade-offs:** Simple, zero router changes, consistent with the codebase. Cannot deep-link to "edit menu X" directly — acceptable for a personal single-user app.

**Example:**
```typescript
type MenuViewState =
  | { mode: "list" }
  | { mode: "compose"; presetId: string | null }   // null = new menu
  | { mode: "pick-food"; presetId: string | null }; // opens FoodPickerPanel

// MyMenu.tsx
const [view, setView] = useState<MenuViewState>({ mode: "list" });
const [draft, setDraft] = useState<{ name: string; foodItemIds: string[][] }>({
  name: "",
  foodItemIds: SCHEDULE.map(() => []),
});
```

### Pattern 2: headlessui Dialog for QuickFoodCreate

**What:** When the user taps "新增食材" inside `FoodPickerPanel`, a `headlessui Dialog` opens over the picker. On save, the dialog calls `ItemService.saveFood()`, the picker re-reads the food list, auto-selects the new item, and the dialog closes.

**When to use:** When the sub-task (food creation) is short, self-contained, and must not discard the parent context (the menu composition draft).

**Trade-offs:** headlessui `Dialog` provides focus trap + Escape-to-close already used in the project. Two UI layers (`FoodPickerPanel` at `z-30`, `QuickFoodCreate` Dialog at `z-50`) require care. The project already uses `z-50` for all confirmation dialogs in `MyMenu` — keep that convention for `QuickFoodCreate`.

**Example:**
```typescript
// Inside FoodPickerPanel.tsx
const [quickCreateOpen, setQuickCreateOpen] = useState(false);

async function handleQuickSave(food: FoodItem) {
  await ItemService.saveFood(food);
  setFoods(await ItemService.getFoods()); // reload so new item appears
  setSelected((prev) => new Set([...prev, food.id])); // auto-select
  setQuickCreateOpen(false);
}
```

### Pattern 3: Slide-up Panel (not Dialog) for FoodPickerPanel

**What:** `FoodPickerPanel` renders as a `position: fixed` bottom-anchored panel inside the page content area — not as a headlessui `Dialog`. It is conditionally shown with a CSS transition on `transform: translateY`.

**When to use:** The picker is a large scrollable list that covers most of the screen. It should feel like a drawer sliding up, not a blocking modal. Using a full `Dialog` here would create headlessui focus-trap conflicts when `QuickFoodCreate` (also a Dialog) needs to open on top.

**Trade-offs:** Manual focus management is required if accessibility is critical (not a current constraint for this single-user app). The panel does not get a headlessui focus trap, but it has its own close button and captures clicks via the backdrop.

**Implementation:**
```tsx
// FoodPickerPanel.tsx — positioning
<div className={`fixed inset-x-0 bottom-0 top-10 z-30 flex flex-col
  bg-slate-900 border-t border-slate-700
  transition-transform duration-300
  ${isOpen ? "translate-y-0" : "translate-y-full"}`}>
  {/* search bar, food grid, confirm button */}
</div>
{/* backdrop */}
{isOpen && (
  <div className="fixed inset-0 z-20 bg-black/40" onClick={onClose} />
)}
```

### Pattern 4: MenuComposer as Sub-View Inside MyMenu

**What:** When `view.mode === "compose"`, `MyMenu` renders a "compose" sub-view inline (not in a modal, not a new route). This sub-view shows: a menu name input, a list of time slots (from `SCHEDULE`), food chips per slot with remove buttons, and "新增食物" buttons that trigger `pick-food` mode.

**When to use:** The compose view is the primary feature of this page. It needs the full content area.

**Trade-offs:** `MyMenu.tsx` will grow to ~250-300 LOC — within the established convention (existing pages are 80-160 LOC each, but `FoodManager` already exceeds 400 LOC with its state machine). Consider extracting `MenuComposerView` as a file-local sub-component when the file exceeds 300 LOC.

---

## Data Flow

### Menu Composition Flow

```
User taps "建立新菜單"
    ↓
MyMenu: setView({ mode: "compose", presetId: null })
        setDraft({ name: "", foodItemIds: SCHEDULE.map(() => []) })
    ↓
Compose sub-view renders: name input + slot rows + "新增食物" per slot
    ↓
User taps "新增食物" on slot N
    ↓
MyMenu: setView({ mode: "pick-food", presetId: null })
        FoodPickerPanel receives slotIdx = N
    ↓
FoodPickerPanel: ItemService.getFoods() on mount → display list
    ↓
User selects food(s) → taps "確認"
    ↓
FoodPickerPanel: onConfirm(slotIdx, selectedIds)
    ↓
MyMenu: draft.foodItemIds[slotIdx] = selectedIds
        setView({ mode: "compose", presetId: null })
    ↓
User taps "儲存"
    ↓
presetId === null:
  MenuService.save({ id: crypto.randomUUID(), name, foodItemIds, createdAt })
presetId !== null:
  MenuService.update(presetId, { name, foodItemIds })
    ↓
MyMenu: setView({ mode: "list" })
        setMenus(MenuService.getAll())
```

### Inline Food Creation Flow

```
User taps "新增食材" inside FoodPickerPanel
    ↓
FoodPickerPanel: setQuickCreateOpen(true)
    ↓
QuickFoodCreate Dialog opens (z-50, above panel at z-30)
    ↓
User fills: name, serving, cal, protein, fat, carbs, sodium
    ↓
QuickFoodCreate: await ItemService.saveFood(food)
    ↓
FoodPickerPanel callback: reload foods, auto-select new item id
    ↓
Dialog closes — picker panel visible with new item highlighted/selected
```

### Edit Existing Menu Flow

```
User taps "編輯" on menu card in list view
    ↓
MyMenu: setView({ mode: "compose", presetId: preset.id })
        setDraft({ name: preset.name, foodItemIds: preset.foodItemIds })
    ↓
Compose sub-view renders pre-populated with existing items
    ↓
... same composition flow as above ...
    ↓
User taps "儲存" → MenuService.update(presetId, { name, foodItemIds })
```

### State Management

```
No global state. Read-on-render from services.

MyMenu local state:
  view: MenuViewState              — which sub-view is active
  draft: { name, foodItemIds[][] } — menu being composed (in-memory only)
  menus: MenuPreset[]              — from MenuService.getAll() on mount + after mutations

FoodPickerPanel local state:
  foods: FoodItem[]                — from ItemService.getFoods() on mount
  selected: Set<string>           — food IDs selected in this session
  search: string                   — filter input
  quickCreateOpen: boolean         — whether QuickFoodCreate Dialog is open
```

---

## Integration Points

### Modified Files

| File | Change | Risk |
|------|--------|------|
| `src/pages/MyMenu.tsx` | Add `MenuViewState`, draft state, compose/pick-food sub-views. Add "建立菜單" button and "編輯" button on cards. | Medium — replaces simple list render with mode router. Existing list + rename + delete + load logic is unchanged. |
| `src/components/SidebarDrawer.tsx` | Change `label` string `"我的食材"` → `"我的食物"` in `NAV_ITEMS`. Nothing else. | Trivial |
| `src/lib/menu-service.ts` | Add `update(id, patch)` method. | Minimal — additive only, no existing callers change. |

### New Files

| File | Exports | Depends On |
|------|---------|------------|
| `src/components/FoodPickerPanel.tsx` | `FoodPickerPanel` component | `ItemService`, `QuickFoodCreate` |
| `src/components/QuickFoodCreate.tsx` | `QuickFoodCreate` component | `ItemService`, headlessui `Dialog` |

### MenuService.update() Signature

```typescript
// Add to menu-service.ts alongside rename() and delete()
update(id: string, patch: Partial<Pick<MenuPreset, "name" | "foodItemIds">>): void {
  const updated = this.getAll().map((p) =>
    p.id === id ? { ...p, ...patch } : p
  );
  cacheSet(MENU_KEY, updated);
},
```

### NutritionLabelForm: Duplicate vs Extract

`NutritionLabelForm` is currently a file-local sub-component inside `FoodManager.tsx` (~120 LOC). `QuickFoodCreate` needs a smaller version. Two options:

**Option A — Extract to `src/components/NutritionLabelForm.tsx`:** Clean reuse. Requires touching the working `FoodManager.tsx`.

**Option B — Write a stripped-down form in `QuickFoodCreate.tsx`:** Quicker, no refactor risk. The quick-create form intentionally omits tags, source, ingredients — it is not just a smaller version of the full form, it is a different interaction.

**Recommendation: Option B.** The forms diverge in intent. The quick-create form needs only: name, serving, cal, protein, fat, carbs, sodium — all on one screen, no sub-views, no Open Food Facts search. Add `// TODO: consolidate with NutritionLabelForm in FoodManager if forms converge` as a comment.

---

## Anti-Patterns

### Anti-Pattern 1: New Routes for Menu Composition Sub-Views

**What people do:** Add `/menu/compose` and `/menu/compose/:id` as HashRouter routes, use `useParams` to load the preset.

**Why it's wrong for this project:**
- `App.tsx` contains `useEffect([location.pathname]) → setDrawerOpen(false)`. Adding sub-routes under `/menu` would not trigger this (pathname stays `/menu/compose`), creating silent inconsistency.
- Draft state (the menu being built) cannot survive a route change without URL serialisation or global state — neither exists in this codebase.
- The existing `FoodManager` page handles its own four sub-views (`list`, `add`, `edit`, `compose`) via local state with zero router involvement. Consistency matters.

**Do this instead:** View state machine inside `MyMenu` — `type MenuViewState = "list" | "compose" | "pick-food"`.

### Anti-Pattern 2: Loading All Foods on MyMenu Mount (List View)

**What people do:** Call `ItemService.getFoods()` in `MyMenu`'s top-level `useEffect` to have foods ready.

**Why it's wrong:** `ItemService.getFoods()` merges the hardcoded catalog + localStorage and fires a background Sheets fetch. The list view shows no foods — loading them wastes a Sheets call and ~100+ item merge on every visit to the menu list.

**Do this instead:** Load foods only inside `FoodPickerPanel`'s own `useEffect` — triggered only when the picker mounts (i.e., when the user enters pick-food mode).

### Anti-Pattern 3: Opening FoodPickerPanel as a headlessui Dialog

**What people do:** Use `headlessui Dialog` for the picker panel, same as the confirmation dialogs already in `MyMenu`.

**Why it's wrong:** `QuickFoodCreate` also needs to be a Dialog (it needs focus trap and Escape handling). Two nested headlessui Dialogs cause stacking and focus-trap conflicts. headlessui's focus trap attaches to the outermost open Dialog.

**Do this instead:** `FoodPickerPanel` as a manually animated `position: fixed` panel with a backdrop `div`. Only `QuickFoodCreate` uses headlessui `Dialog`. Z-index: backdrop `z-20`, panel `z-30`, Dialog `z-50`.

### Anti-Pattern 4: Storing Draft `foodItemIds` in localStorage

**What people do:** Persist the in-progress menu draft to localStorage so it survives accidental navigation.

**Why it's wrong:** The compose flow is fast (< 2 minutes), single-session. Persisting draft state creates orphan data if the user navigates away intentionally and adds complexity for resume-draft logic.

**Do this instead:** Draft state is `useState` in `MyMenu`. If the user taps "取消" or navigates away, the draft is discarded. The menu list is unchanged until "儲存" is called.

### Anti-Pattern 5: Adding a "pick-food" Button to FoodManager's Compose View

**What people do:** Reuse `FoodManager`'s existing compose logic inside `MyMenu` by linking to `/foods?mode=compose`.

**Why it's wrong:** `FoodManager`'s compose mode is for building a single food item from ingredient foods (e.g., "自製便當 = 雞胸肉 + 白飯 + 青花菜"). `MyMenu`'s composition is for selecting which foods appear in a meal. They are different operations with different UX.

**Do this instead:** Build `FoodPickerPanel` as a separate component purpose-built for "pick foods for a menu slot."

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single user, offline-first (current) | `localStorage` as primary, Sheets optional. All state local to `MyMenu`. No changes needed. |
| If menus need Sheets sync | Add Sheets integration to `MenuService` following `ItemService` pattern: `SheetsAPI.upsertById("menus", preset)`. The `update()` method added in this milestone already has the right patch shape. No architectural change required. |
| If food picker becomes slow | The picker's search filter already reduces visible count. Virtual rendering only needed if catalog exceeds ~500 items. Use a simple `slice` + "載入更多" button before reaching for a virtualisation library. |
| If `MyMenu.tsx` grows too large | Extract `MenuComposerView` as a file-local sub-component (following the `TagBadge`, `ItemCard` inline convention in `DailyPlan.tsx` and `Section` in `SupplementSchedule.tsx`). Split to a separate file only if it exceeds ~500 LOC. |

---

## Build Order

Dependencies flow strictly downward. Each step must compile and render before the next begins.

| Step | Scope | Files Changed | Gate |
|------|-------|---------------|------|
| 1 | **SidebarDrawer label rename** | `SidebarDrawer.tsx` — 1 string | Sidebar shows "我的食物". Zero functional change. |
| 2 | **MenuService.update()** | `menu-service.ts` — add method | TypeScript compiles. No callers yet. |
| 3 | **QuickFoodCreate component** | `components/QuickFoodCreate.tsx` — new | Component renders, saves a food via `ItemService`, dialog opens/closes. Can test standalone. |
| 4 | **FoodPickerPanel component** | `components/FoodPickerPanel.tsx` — new | Panel slides up, shows searchable foods, multi-select works, "確認" fires `onConfirm`, "新增食材" opens QuickFoodCreate. |
| 5 | **MyMenu view state machine** | `pages/MyMenu.tsx` — modify | "建立菜單" opens compose view. Compose view shows slots + "新增食物". "新增食物" opens picker. Selection updates draft. "儲存" calls `MenuService.save`. Existing list/rename/delete/load is unchanged and still works. Edit flow calls `MenuService.update`. |

Step 3 can be tested in isolation before step 4 is built (render `QuickFoodCreate` directly). Step 4 can be wired into a test harness before step 5 is complete.

---

## Sources

- Direct inspection: `src/pages/MyMenu.tsx`, `src/pages/FoodManager.tsx`, `src/App.tsx`, `src/components/SidebarDrawer.tsx`, `src/lib/menu-service.ts`, `src/lib/item-service.ts`, `src/data/types.ts`, `src/data/schedule.ts`
- Pattern: `FoodManager` ViewState machine (`"list" | "add" | "edit" | "compose"`) — confirms this is the established pattern for in-page sub-views
- Pattern: headlessui Dialog usage in `MyMenu.tsx` (load-confirm dialog, delete-confirm dialog) — confirms Dialog is the right tool for QuickFoodCreate
- Prior architecture research: `.planning/research/ARCHITECTURE.md` (v3.0, 2026-04-06) — valid baseline, this file extends it for v4.0 scope

---
*Architecture research for: Eat Manager v4.0 — Menu Composition & Navigation Refinement*
*Researched: 2026-04-08*
