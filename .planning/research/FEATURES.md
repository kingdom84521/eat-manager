# Feature Research

**Domain:** Menu composition and inline food creation — meal planning SPA (v4.0)
**Researched:** 2026-04-08
**Confidence:** HIGH (based on direct codebase analysis + domain reasoning from established meal planning app patterns)

---

## Context: What Already Exists

Before mapping new features, the relevant existing infrastructure:

- `MenuPreset` stores `foodItemIds: string[][]` (slot-indexed array of food IDs)
- `MenuService` has `getAll / save / rename / delete` — no `update` method for composition edits
- `MyMenu` page: browse, load (with conflict guard), rename, delete. No composition UI.
- `FoodManager` page: 4-view state machine (`list / add / edit / compose`). `NutritionLabelForm` and `ComposeForm` sub-components already exist with full field sets and validation.
- `ItemService.saveFood()` handles upsert to localStorage + background Sheets sync.
- `IngredientRow` sub-component in FoodManager has typeahead search over atomic foods — reusable pattern.
- `SCHEDULE` is exported as `[]` from `src/data/schedule.ts` (populated at runtime from Sheets); `reconstructSlots()` in MyMenu maps `foodItemIds[slotIdx]` back to `GeneratedSlot[]`.

The gap: users can only create menus by saving the current day's plan. They cannot build or edit a menu's food composition directly.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that make the menu composition flow feel complete. Missing any of these makes the feature feel broken or unusable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Create blank menu | Any list-management UI has a "New" button | LOW | Name input prompt + empty `foodItemIds[][]` scaffold. Slot count derived from `SCHEDULE.length` if populated, otherwise a hardcoded fallback. |
| Add food to a slot in a menu | Core of composition — without this the editor is useless | MEDIUM | Typeahead search over `ItemService.getFoods()`. Same pattern as `IngredientRow` in FoodManager. |
| Remove food from a slot | Users correct mistakes | LOW | Filter the ID out of `foodItemIds[slotIdx]` and re-render |
| Save edited menu | Edits are lost without explicit save | LOW | `MenuService` needs an `update(id, preset)` method — currently only has `rename` |
| Food name + cal visible in editor | Users need to know what they are adding and what is already in the slot | LOW | `resolveItem()` already returns `name`, `cal`, `dose`; call synchronously from a loaded food Map |
| Slot labels visible in editor | Context for which slot is breakfast vs dinner | LOW | `SCHEDULE[slotIdx].label` when populated; fallback to generic labels ("時段 1", "時段 2") when SCHEDULE is empty |
| Entry point to edit existing menus | Without this, the edit flow is unreachable | LOW | "編輯" button on each menu card in the list view |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Inline food creation from menu editor | User discovers a missing food while building a menu and does not lose their work mid-flow | MEDIUM | Modal layered over the menu editor. `NutritionLabelForm` already exists but is defined inside `FoodManager.tsx` — must be extracted first. Newly created food immediately appears in the search dropdown. |
| Nutritional totals preview while composing | Users see calorie/macro sum update as they add foods | LOW | Sum `cal/protein/fat/carbs` over all resolved foods in the menu. Same arithmetic used in UnifiedPlan. Requires foods loaded as a Map in editor state. |
| Duplicate existing menu as starting point | Common pattern: "I want today's preset but with one change" | LOW | Copy `MenuPreset` with new ID + auto-name "(副本)". Calls `MenuService.save()` which already exists. |
| Per-slot nutritional breakdown | Power users want macro distribution across meals, not just totals | MEDIUM | Collapsible row per slot; requires resolved foods per slot. Valuable but non-essential for launch. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Drag-and-drop between slots | Polished feel | Requires a touch-drag library (e.g., dnd-kit), adds bundle size, complex with scroll conflicts on mobile. Benefit is low — users can remove-and-add instead. | Remove + Add in target slot |
| Free-form slot creation | "Let me define my own meal times" | Contradicts the fixed SCHEDULE structure that `reconstructSlots()` depends on. Custom slots would break plan loading. | Keep slots fixed to SCHEDULE; slot labels are editable separately in a future milestone |
| Real-time Open Food Facts search in menu editor | Searching OFX while composing feels seamless | OFX is slow and unreliable — existing warning in FoodManager: "不穩定時可能需要幾秒". Creates bad UX mid-composition. | OFX search stays in FoodManager (standalone food management); inline creation uses local `NutritionLabelForm` only |
| Auto-save drafts | Prevents data loss | localStorage writes on every keystroke; race conditions with service reads; no undo mechanism. | Explicit "儲存" button with a dirty-state indicator if the user tries to navigate away |
| Reorder foods within a slot | "I want oatmeal before eggs" | Display order has no semantic meaning in `MenuPreset`; foods within a slot are unordered. Adds sort complexity for zero functional benefit. | Do not implement; order is irrelevant |

---

## Feature Dependencies

```
[Edit Menu Composition]
    └──requires──> [MenuService.update()]       (new method — currently missing)
    └──requires──> [Food typeahead in editor]   (reuse IngredientRow pattern from FoodManager)
    └──requires──> [Slot scaffold]              (SCHEDULE-based or fallback fixed count)
    └──requires──> [Foods loaded as Map]        (async load on editor mount for name/cal lookup)

[Create Blank Menu]
    └──requires──> [Slot scaffold]
    └──enhances──> [Edit Menu Composition]      (same editor component, different entry point)

[Inline Food Creation]
    └──requires──> [NutritionLabelForm extracted to shared component]
                       (currently defined inside FoodManager.tsx — not importable elsewhere)
    └──requires──> [ItemService.saveFood()]     (already exists)
    └──enhances──> [Food typeahead in editor]   (newly saved food immediately appears in dropdown)

[Nutritional Totals Preview]
    └──requires──> [Foods loaded as Map]        (need resolved foods to sum macros)
    └──enhances──> [Edit Menu Composition]      (informational overlay on the editor)

[Duplicate Menu]
    └──requires──> [MenuService.save()]         (already exists)
    └──enhances──> [Create Blank Menu]          (alternative "start from existing" entry point)
```

### Dependency Notes

- **Edit Menu Composition requires MenuService.update():** `MenuService` currently has only `rename(id, name)`. It needs an `update(id, preset)` or `updateFoodIds(id, foodItemIds)` method that replaces the full `foodItemIds` array. This is a one-method addition to the existing service.

- **Slot scaffold depends on SCHEDULE population:** `SCHEDULE` is `[]` at compile time and gets populated from Sheets at runtime. `reconstructSlots()` in MyMenu maps over `SCHEDULE` — if SCHEDULE is empty, the result is an empty array. The menu editor must handle this. Options: (a) read SCHEDULE after Sheets data loads (requires async coordination), or (b) derive slot count from existing `MenuPreset.foodItemIds.length` when editing an existing preset. For new blank menus, a hardcoded slot count (e.g., 5) is the pragmatic fallback.

- **Inline Food Creation requires NutritionLabelForm extraction:** The component is defined as a local function (`function NutritionLabelForm(...)`) inside `FoodManager.tsx`. It cannot be imported by the menu editor in its current location. Extracting it to `src/components/NutritionLabelForm.tsx` is a prerequisite step before the inline creation modal can be built. The component's props API (`food`, `allFoods`, `onSave`, `onCancel`) is already clean and well-suited for reuse.

- **Foods loaded as Map is a shared requirement:** Both "food typeahead in editor" and "nutritional totals preview" need resolved food data. The editor component should call `ItemService.getFoods()` on mount, build a `Map<string, FoodItem>` from the result, and hold it in state. This is async (localStorage read + background Sheets sync) but effectively instant for the localStorage portion.

---

## MVP Definition

### Launch With (v4.0)

Minimum feature set that delivers the milestone goal: users can build and edit menus without leaving the menu flow.

- [ ] **MenuService.update()** — new service method to replace `foodItemIds` on an existing preset; without this no composition edits can be persisted
- [ ] **Extract NutritionLabelForm** — move from `FoodManager.tsx` to `src/components/NutritionLabelForm.tsx`; prerequisite for inline food creation
- [ ] **Create blank menu** — "新增菜單" button on MyMenu list view; prompts for name; creates empty preset with slot scaffold
- [ ] **Menu composition editor** — open a preset in edit mode; per-slot food typeahead search; add/remove food items; explicit save button
- [ ] **Slot scaffold with SCHEDULE fallback** — load SCHEDULE and food catalog on editor mount; handle empty SCHEDULE with fallback labels and configurable slot count
- [ ] **Inline food creation modal** — from within the menu editor's food search, a "新增食材" trigger opens a headlessui Dialog with `NutritionLabelForm`; on save, the new food is persisted and pre-selected in the current slot

### Add After Validation (v4.x)

- [ ] **Nutritional totals preview** — sum cal/protein/fat/carbs across all slots as foods are added; display in editor header bar
- [ ] **Duplicate menu** — copy button on menu card creates "(副本)" clone

### Future Consideration (v5+)

- [ ] **Per-slot nutritional breakdown** — collapsible macro row per slot; meaningful only when users have 5+ items per slot
- [ ] **Menu sync to Google Sheets** — already deferred as MENU-04 in PROJECT.md

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| MenuService.update() | HIGH | LOW | P1 |
| Extract NutritionLabelForm | HIGH (enabler) | LOW | P1 |
| Create blank menu | HIGH | LOW | P1 |
| Menu composition editor (add/remove foods per slot) | HIGH | MEDIUM | P1 |
| Slot scaffold with SCHEDULE fallback | HIGH (correctness blocker) | LOW | P1 |
| Inline food creation modal | HIGH | MEDIUM | P1 |
| Nutritional totals preview | MEDIUM | LOW | P2 |
| Duplicate menu | MEDIUM | LOW | P2 |
| Per-slot nutritional breakdown | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v4.0 launch
- P2: Add when P1 items are stable and validated
- P3: Future milestone

---

## Implementation Notes for Roadmap

### View State Machine Pattern (Follow FoodManager)

The menu editor should be a new view state inside `MyMenu`'s local state, not a separate route. FoodManager uses `type ViewState = "list" | "add" | "edit" | "compose"` — the same pattern applies here:

```
MyMenu ViewState: "list" | "edit"
```

"edit" view receives a `MenuPreset | null` (null = new blank menu). This avoids URL routing complexity for an ephemeral editing session and keeps the food-catalog load in the same component tree.

### Inline Food Creation UX Pattern

Standard pattern in meal planning apps (Cronometer, MacroFactor, MyFitnessPal) for inline food creation during meal logging:

1. User types a food name in the search box
2. "找不到？新增食材" option appears at the bottom of the dropdown (or in the empty-results state)
3. A modal (headlessui `Dialog`) opens with `NutritionLabelForm`, pre-filled with the search query as the name
4. On save, the food is persisted via `ItemService.saveFood()` and the modal closes
5. The search dropdown refreshes with the new food available and pre-selects it in the current slot

The typeahead in `IngredientRow` already uses an `onMouseDown` + `onBlur` pattern that can accommodate an extra "New" list item without breaking the blur-to-close logic.

### SCHEDULE Empty-Array Problem

This is a latent correctness issue that affects the new editor. If a user opens the editor before Sheets data loads, `SCHEDULE.length === 0` and the slot scaffold produces no slots. Mitigation for the editor:

- When editing an existing preset: derive slot count from `preset.foodItemIds.length` (slots already exist in stored data)
- When creating a new blank menu: use a constant `DEFAULT_SLOT_COUNT = 5` as fallback, with slot labels "時段 1" through "時段 5"
- Slot labels come from `SCHEDULE[idx]?.label ?? \`時段 ${idx + 1}\``

### Sidebar Rename (我的食材 → 我的食物)

Per PROJECT.md v4.0 target, the sidebar nav item label needs updating. This is a string change in `App.tsx` sidebar config. Trivial — 1 line, but should be in the first phase of the milestone so all subsequent testing uses the correct name.

---

## Sources

- Direct codebase analysis: `src/pages/MyMenu.tsx`, `src/pages/FoodManager.tsx`, `src/lib/menu-service.ts`, `src/lib/item-service.ts`, `src/data/types.ts`, `src/data/schedule.ts`
- Domain patterns: standard inline food creation flows in Cronometer, MacroFactor, MyFitnessPal
- Project constraints: `.planning/PROJECT.md` v4.0 milestone target features

---
*Feature research for: menu composition and inline food creation (v4.0)*
*Researched: 2026-04-08*
