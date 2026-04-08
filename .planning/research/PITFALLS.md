# Pitfalls Research

**Domain:** Menu composition + inline food creation — adding edit/build flows to an existing React meal planning SPA
**Researched:** 2026-04-08
**Confidence:** HIGH (direct codebase audit + verified patterns)
**Scope:** v4.0 — adding menu editing, menu creation from scratch, and inline food creation to the existing system. Previous milestone pitfalls (iOS scroll lock, stale checked IDs, monolithic component, bottom nav padding) remain valid and are not repeated here. This file covers only pitfalls introduced by the v4.0 feature set.

---

## Critical Pitfalls

Mistakes that force rewrites, create silent data corruption, or break the user flow irreparably.

---

### Pitfall 1: Menu Stores Food IDs That Resolve to Nothing

**What goes wrong:**
`MenuPreset.foodItemIds` stores string IDs. When those IDs are fed to `reconstructSlots()`, each ID is passed to `resolveItem()`, which looks up only `FOOD_MAP` (hardcoded static catalog) and `SUPPLEMENT_MAP` (also static). User-created foods live in `localStorage` under `wellness_foods_catalog` and are never in `FOOD_MAP`. Result: every user-created food in a saved menu silently resolves to `null`, is filtered out, and the menu loads as a truncated plan with no error.

**Why it happens:**
`resolveItem()` in `src/data/resolver.ts` only reads static compile-time maps. `ItemService.getFoods()` is async and returns a merged list (`[...FOODS, ...cached]`), but `reconstructSlots()` calls the synchronous `resolveItem()` directly. The resolver has no access to the runtime localStorage catalog.

**How to avoid:**
Before the menu composition feature is built, extend the resolution path so user-created foods are resolvable. Two concrete options:

1. **Preferred — async reconstructSlots:** Make `reconstructSlots` async and supply the full food list from `ItemService.getFoods()`. Pass the food list to reconstruction rather than relying on the global `FOOD_MAP`.
2. **Alternative — populate FOOD_MAP at startup:** On app init, read `ItemService.getFoods()` and merge the result into a runtime map used by `resolveItem()`. Requires changing the resolver to accept a runtime catalog, which is a larger refactor.

Option 1 is the safer, smaller change. The menu load call in `MyMenu.tsx` becomes async and waits for foods to load before calling `reconstructSlots`.

**Warning signs:**
- A menu containing user-created food IDs loads with fewer items than were saved
- No console error, no UI error — items just disappear
- `resolveItem()` called with `food_${timestamp}` style IDs (user-created ID format from `FoodManager.tsx` line 124: `` id: `food_${Date.now()}` ``)

**Phase to address:** Menu editing phase — before any menu loading code is written. Audit `reconstructSlots` and fix the resolution gap first.

---

### Pitfall 2: Inline Food Creation Navigates Away and Loses Menu Draft State

**What goes wrong:**
The user is composing a new menu (selecting food items slot by slot). They realise a needed food does not exist. They tap "新增食材" to create it inline. If inline creation is implemented as a route change (`navigate('/foods')`, then `navigate(-1)`), the entire menu composition state is lost — all slots built so far are gone because the `/menu` route unmounts and its `useState` resets.

**Why it happens:**
React Router's `<Routes>` unmounts the exiting component on every navigation. No global state store exists in this app. The menu composition form is page-level `useState`. Navigating away destroys it.

**How to avoid:**
Implement inline food creation as an in-page view transition, not a route change. The `FoodManager` component already uses a `ViewState = "list" | "add" | "edit" | "compose"` pattern where `view === "add"` renders the form without leaving the route. Apply the same pattern to `MyMenu`: add a local `view` state to `MyMenu` such as `"list" | "compose-menu" | "add-food"`. When `view === "add-food"`, render a food creation form inline within the `/menu` route. The menu draft state survives because the page never unmounts.

Do not use a `headlessui Dialog` (modal) for the inline creation form. The creation form is a full nutrition label form with 8+ input fields across a 2-column grid — it does not fit in a `max-w-sm` dialog on mobile without heavy scrolling inside the modal, which causes z-index and iOS scroll interference. A sub-page view transition is the correct pattern here.

**Warning signs:**
- "新增食材" button calls `navigate('/foods')`
- Menu composition state is in component-level `useState`, and a route navigation is involved in the food creation path
- After food creation, the user is back on the menu list (not the composition form)

**Phase to address:** Inline food creation phase — define the in-page view transition approach in the design before writing any navigation code.

---

### Pitfall 3: Modal Stacking — Dialog on Top of Sidebar Drawer

**What goes wrong:**
The sidebar drawer uses `headlessui Dialog` at `z-50`. The confirmation dialogs in `MyMenu` (delete confirm, load-with-checked confirm) also use `headlessui Dialog` at `z-50`. If a new inline creation dialog is added at the same z-level, opening the sidebar drawer while a dialog is open produces two overlapping focus traps. `headlessui` provides a focus trap portal, but two concurrent dialogs fighting for focus can leave keyboard focus in an indeterminate state and cause the Escape key to close the wrong dialog.

**Why it happens:**
The drawer and the confirmation dialogs are both `headlessui Dialog` components. headlessui uses a single global focus trap manager. When two Dialog components are open simultaneously (e.g., drawer open + confirm dialog open), the library's focus trap priority is first-opened, which may not be the outermost visible overlay.

**How to avoid:**
Close the sidebar drawer before any confirmation dialog is triggered. In `MyMenu.tsx`, the delete and confirm dialogs are triggered by user action within the page — the drawer is already closed when the user is on the page. Do not add `Dialog` for inline food creation (see Pitfall 2 — use in-page view transition instead). If a `Dialog` is genuinely needed (e.g., a lightweight "quick add" panel, not the full form), assign it `z-60` so it visually stacks above the `z-50` drawer backdrop, and use headlessui's recommended pattern of rendering all dialogs inside a `DialogProvider` to control stacking order.

**Warning signs:**
- Multiple `<Dialog open={...}>` components can be `open={true}` simultaneously
- Pressing Escape closes the drawer instead of the foreground dialog
- A `Dialog` for food creation is nested inside a component that itself renders inside another `Dialog`

**Phase to address:** Inline food creation phase — verify z-index and focus trap strategy before adding any new dialog.

---

### Pitfall 4: Menu Draft State Not Synced to localStorage — Lost on Accidental Navigation

**What goes wrong:**
Menu composition (selecting 8–15 food items across multiple meal slots) is a multi-step task that takes 2–5 minutes. If the user accidentally taps the hamburger icon, the drawer opens and they navigate away — the entire draft is discarded. With no auto-save or draft persistence, the user must start from scratch. This is a significant UX regression from the existing experience where daily plan state is auto-saved.

**Why it happens:**
Menu drafts are held only in component `useState`. The `MenuService` only writes complete, named presets — there is no "in-progress draft" concept. The pattern of writing to localStorage on every meaningful change (established by the daily plan's `saveTodayPlan` on each checkbox toggle) is not applied to the menu draft.

**How to avoid:**
Persist menu drafts to localStorage under a key like `wellness_menu_draft`. Write on every slot change during composition. On mount, check for an existing draft and offer to restore it ("你有一份未儲存的草稿，要繼續嗎？"). Clear the draft key when the menu is saved or the user explicitly discards it. This follows the same pattern as `TodayPlanRecord` — ephemeral in-progress state that survives navigation.

Alternatively: accept draft loss and add a confirmation dialog before navigating away from an in-progress composition ("你的菜單草稿尚未儲存，確定要離開？"). This is simpler to implement but worse UX. Only acceptable for an MVP phase if the draft persistence is planned as a follow-up.

**Warning signs:**
- Menu composition state is in `useState` with no corresponding `localStorage.setItem` call
- No "unsaved changes" guard on the route or navigation
- The confirmation dialog approach is missing for discardable state

**Phase to address:** Menu creation/editing phase — design draft persistence before building the composition UI.

---

### Pitfall 5: Food Item IDs Are Not Stable — `food_${Date.now()}` Collides on Rapid Creation

**What goes wrong:**
User-created food items use `id: \`food_${Date.now()}\`` (see `FoodManager.tsx` line 124). `Date.now()` returns milliseconds. If a user creates two food items within the same millisecond (e.g., via keyboard shortcut or a double-tap), both items get the same ID. `ItemService.saveFood` performs an upsert by ID — the second save overwrites the first. The first food is silently lost.

More relevantly for inline creation: when a food is created inline from within the menu composition flow and immediately added as an ingredient, the ID must remain stable. If the ID generation is called twice (e.g., once in the form and once in the save handler), the IDs will differ and the menu's reference to the food breaks.

**Why it happens:**
`Date.now()` is not a UUID. It is a reasonable quick ID for development but produces collisions under concurrent or rapid use. The pattern is established in the existing code — it will be copy-pasted into the inline creation flow and inherited.

**How to avoid:**
Replace `food_${Date.now()}` with `crypto.randomUUID()` for all user-created food IDs. `crypto.randomUUID()` is available in all modern browsers and is already used in `MenuService` for menu preset IDs (`crypto.randomUUID()` is the documented approach in the `MenuPreset` interface comment). Apply consistently across both `FoodManager.tsx` and any new inline creation form.

**Warning signs:**
- `` id: `food_${Date.now()}` `` appears in new food creation code
- The same timestamp-based ID pattern is present in the inline creation form
- A unit test that creates two items in rapid succession (even manually) produces a collision

**Phase to address:** Inline food creation phase — use `crypto.randomUUID()` from the start; do not inherit the timestamp pattern.

---

### Pitfall 6: Full Food List Not Re-Fetched After Inline Creation — Stale Ingredient Picker

**What goes wrong:**
The menu composition form needs to display a list of available foods for the user to select. This list is fetched once on component mount. When the user creates a new food via the inline creation form (in-page view transition), returns to the composition form, and tries to add that new food to a slot, the new food does not appear in the picker — because the list was loaded before the food was created and is now stale.

**Why it happens:**
`useEffect(() => { ItemService.getFoods().then(setFoods) }, [])` runs once on mount. Adding a food via inline form writes to `localStorage` but does not trigger the effect to re-run. The in-memory `foods` state array in the parent component remains as it was when the component mounted.

**How to avoid:**
After inline food creation completes and the view returns to the composition form, refresh the foods list. Two approaches:

1. Pass a `onFoodCreated` callback from the composition form to the inline creation form. When `onFoodCreated` is called, re-run `ItemService.getFoods()` and update the `foods` state.
2. Pass a `refreshTrigger` counter that increments after creation; the `useEffect` has `refreshTrigger` as a dependency.

Option 1 is more explicit and matches the existing `onAddFromOff` callback pattern in `ComposeForm` (see `FoodManager.tsx` lines 529–530).

**Warning signs:**
- `useEffect` for food loading has an empty dependency array `[]` with no explicit refresh mechanism
- Inline creation exits to the composition form and the new food is not immediately selectable
- The food list state is not updated in the parent component after inline creation

**Phase to address:** Inline food creation phase — design the refresh callback before wiring up the view transition.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep `resolveItem()` static and only fix the MyMenu loading path | Smaller change scope | Every future consumer of `resolveItem()` with user-created IDs silently drops items | MVP only if the full resolver fix is planned as the next task |
| Use `food_${Date.now()}` IDs in inline creation form | No code change needed | ID collisions on rapid creation; breaks food references in menus | Never — `crypto.randomUUID()` is one-word change |
| Implement inline creation as `navigate('/foods')` + back button | Reuse existing FoodManager page | Menu draft state lost on every food creation | Never |
| Skip draft persistence for menu composition | Faster to ship | User frustration on accidental navigation during multi-step composition | MVP only if a "confirm leave" guard is added |
| Load food list once on mount with no refresh | Simple `useEffect` | New inline-created food not selectable in picker immediately | Never for inline creation — always wire the refresh callback |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `reconstructSlots` + user-created foods | Call synchronous `resolveItem()` which only reads static `FOOD_MAP` | Make `reconstructSlots` async, pass full food list from `ItemService.getFoods()` |
| Inline creation form + composition form state | Treat as two separate components with separate state | Parent component holds draft state; creation form is a child view that calls `onSave` and returns control |
| `headlessui Dialog` for creation + drawer `Dialog` | Two concurrent `Dialog` opens fight for focus trap | Use in-page view transition for creation, not a dialog; keep only one Dialog open at a time |
| `MenuService.save` + draft key | Save the preset but forget to clear the draft key | `MenuService.save` should also call `localStorage.removeItem('wellness_menu_draft')` or wrap both in a single commit function |
| `ItemService.saveFood` from inline creation + food picker in parent | Food saved to localStorage but parent `foods` state not updated | Call `onFoodCreated` callback after save completes; parent re-fetches and updates state |
| `food_${Date.now()}` IDs + `MenuPreset.foodItemIds` | IDs generated at form render time instead of at save time | Generate ID once at form submit in `handleSubmit`; do not call `Date.now()` in JSX render |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-fetching full food list on every slot change in composition | Slow UI on each food selection | Fetch once on mount + targeted refresh only after inline creation | At ~200+ food records in localStorage |
| Re-rendering the full slot list when one slot's food selection changes | Lag when switching food in a slot picker | `React.memo` on per-slot row component; pass stable `onChange` via `useCallback` | At ~10+ slots with complex cards |
| Persisting full menu draft on every keystroke in the name field | Excessive localStorage writes during name input | Debounce draft persistence by 300ms, or persist only on slot changes and on blur of name field | No breakage, but wasteful; noticeable on older devices |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| "新增食材" inside menu composition opens the full FoodManager with its FAB and compose/edit views | User is dropped into food management, loses context of menu composition | Inline creation shows only the NutritionLabelForm — no FAB, no food list, no compose form |
| Menu composition for a new menu starts empty with no guidance | User doesn't know how many slots to fill or what order to use | Default to the same slot structure as the daily plan (breakfast, lunch, dinner, snack); pre-populate with empty placeholders |
| Save button on menu composition visible without a name entered | User saves an unnamed menu; list becomes confusing | Disable save button until a non-empty name is entered; show placeholder text "菜單名稱" in red if save attempted without name |
| Food picker in slot shows all foods including the same food already in another slot | User accidentally adds the same food to two slots | This is acceptable; do not prevent it — adding the same food twice is a valid use case (e.g., chicken breast for both lunch and dinner) |
| Inline food creation sub-page has no back button visible | User is stuck in creation form with no obvious exit | Sub-page header must include a visible "‹ 返回" button that returns to the composition form without saving |

---

## "Looks Done But Isn't" Checklist

- [ ] **Menu loading with user-created foods:** Create a food via FoodManager, add it to a menu, save the menu. Reload the app. Load the menu from My Menu. Verify the user-created food appears in the loaded plan — not silently dropped.
- [ ] **Inline creation preserves draft:** Start building a menu (select 3+ foods across slots). Tap "新增食材". Create a food and return. Verify all previously selected foods are still in their slots.
- [ ] **Inline-created food is immediately selectable:** After returning from inline creation to the composition form, verify the new food appears in the food picker.
- [ ] **Draft persistence:** Start building a menu, open the sidebar drawer and navigate to another page, return to `/menu`. Verify draft is restored (or a "confirm leave" dialog prevented accidental navigation).
- [ ] **No stale IDs in saved menu:** Save a menu containing a user-created food. Rename that food in FoodManager (edit its name). Load the menu again. Verify the loaded plan uses the updated food name (data is resolved at load time from the live catalog, not stored as snapshots).
- [ ] **ID uniqueness:** Create two food items within 1 second. Verify they have different IDs and both appear in the food list.
- [ ] **z-index and focus trap:** Open a confirmation dialog within MyMenu. Try to open the sidebar drawer. Verify the drawer does not open while a dialog is active (or if it can, verify focus is in the correct dialog).
- [ ] **Empty menu slot handling:** Save a menu where some slots have no foods selected. Load it. Verify empty slots do not crash reconstruction and are represented as empty in the plan.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| User-created foods silently dropped on menu load | MEDIUM | Fix `reconstructSlots` to use async food list; add a migration that re-saves any menu with unresolvable IDs as a flagged "incomplete" entry |
| Menu draft lost on navigation (shipped without persistence) | LOW | Add draft persistence as a follow-up; no data migration needed (no existing drafts to migrate) |
| Timestamp ID collision discovered after foods created | MEDIUM | Migrate existing `food_${timestamp}` IDs to UUIDs; rewrite any `MenuPreset.foodItemIds` entries that reference the old IDs; one-time migration script |
| Focus trap conflict between drawer and creation dialog | LOW | Remove dialog; replace with in-page view transition; no data changes required |
| Stale food list in composition form (food not showing) | LOW | Add `onFoodCreated` callback and re-fetch — 5-line change |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Stale food IDs in menu (P1) | Menu editing phase — fix `reconstructSlots` first | Load a menu containing user-created foods; verify all items appear |
| Inline creation destroys draft (P2) | Inline food creation phase — design in-page view before coding | Create food inline; verify composition state intact on return |
| Modal stacking / z-index conflict (P3) | Inline food creation phase — verify Dialog strategy before adding new dialogs | Open creation form + existing confirm dialog simultaneously; verify one focus trap |
| Draft not persisted (P4) | Menu creation phase — add draft persistence or confirm-leave guard | Navigate away mid-composition; verify draft recoverable |
| Timestamp ID collisions (P5) | Inline food creation phase — use `crypto.randomUUID()` | Create two items rapidly; verify distinct IDs |
| Stale food list after inline creation (P6) | Inline food creation phase — wire `onFoodCreated` refresh | Create food inline, return to picker; verify new food selectable immediately |

---

## Sources

- Direct codebase audit: `src/pages/MyMenu.tsx`, `src/pages/FoodManager.tsx`, `src/lib/menu-service.ts`, `src/lib/item-service.ts`, `src/data/resolver.ts`, `src/App.tsx` — HIGH confidence
- `resolveItem()` static-only limitation confirmed by reading `src/data/resolver.ts` lines 38–75 — HIGH confidence
- `food_${Date.now()}` ID pattern confirmed at `src/pages/FoodManager.tsx` line 124 — HIGH confidence
- `crypto.randomUUID()` usage in `MenuPreset` interface confirmed at `src/lib/menu-service.ts` line 42 — HIGH confidence
- React Router route unmounting behaviour: established pattern from v3.0 pitfall research + `HashRouter` in `src/App.tsx` — HIGH confidence
- headlessui Dialog focus trap stacking: [headlessui Dialog docs — nested dialogs](https://headlessui.com/react/dialog) — MEDIUM confidence (official docs describe single-dialog-at-a-time as intended pattern)
- React `useEffect` stale closure / stale state after async operation: known React pattern, verified in existing codebase — HIGH confidence

---
*Pitfalls research for: Menu composition + inline food creation — Eat Manager v4.0*
*Researched: 2026-04-08*
