# Phase 13: My Menu - Research

**Researched:** 2026-04-07
**Domain:** React localStorage CRUD — named meal preset save/browse/load
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Create a `MenuService` singleton following the existing `ItemService`/`DataService` pattern. Uses `crypto.randomUUID()` for IDs (per ROADMAP v3.0 decision). localStorage-only — no Sheets sync.
- **D-02:** Menu preset interface: `{ id: string, name: string, createdAt: string, foodItemIds: string[][] }` — where `foodItemIds` is a 2D array matching the slot structure (array of slot arrays, each containing the resolved food item IDs for that slot). This preserves which items belong to which time slot.
- **D-03:** Presets store exact resolved food item IDs, not pool references. The user saves a specific combination they liked — loading replays those exact items.
- **D-04:** A "儲存為菜單" button appears on the UnifiedPlan page, near the regenerate button in the header/action area. Only enabled when a food plan exists (not on empty state).
- **D-05:** Tapping the save button opens a headlessui Dialog (reusing the existing `@headlessui/react` dependency from Phase 10) with a text input for the menu name and Save/Cancel buttons.
- **D-06:** If the user doesn't enter a name, auto-generate one from the date (e.g., "4月7日 菜單").
- **D-07:** Replace `MenuPlaceholder.tsx` with a full `MyMenu.tsx` page. The page shows a simple list of saved menu presets — each row displays the menu name, item count summary, and creation date.
- **D-08:** Empty state shows a message prompting the user to save a menu from today's plan (e.g., "尚無菜單，從今日方案儲存你的第一份菜單").
- **D-09:** Each menu row has edit (rename) and delete actions. Delete shows a confirmation before removing. Edit opens an inline input or small dialog for renaming.
- **D-10:** Tapping a menu row loads it as today's food plan and navigates to `/plan`.
- **D-11:** Loading a menu preset replaces today's food slots entirely. Checked state is cleared (all items unchecked). Supplement routine is unaffected (it's independently computed).
- **D-12:** If today's plan has checked items (locked state), show a confirmation dialog before replacing: "目前已有已勾選項目，載入菜單將清除紀錄。確定要載入嗎？"
- **D-13:** After loading, the `TodayPlanRecord` is updated with the new food slots, empty checkedIds, and today's date — then persisted via `saveTodayPlan()`.

### Claude's Discretion

- Visual styling of menu list items (card vs flat row — should match existing app patterns)
- Whether to show a food item preview/summary in each menu row or just the count
- Animation/transition when saving or loading
- Whether the save dialog pre-fills with a suggested name or starts empty
- Sort order of menu list (newest first vs alphabetical)

### Deferred Ideas (OUT OF SCOPE)

- **MENU-04:** Menu presets sync to Google Sheets — deferred to future milestone (explicit in REQUIREMENTS.md)
- Menu sharing/export — not in scope
- Menu scheduling (auto-load on specific days) — not in scope
- Menu templates with partial randomization — not in scope; presets store exact items
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MENU-01 | User can save current meal plan as a named menu preset | MenuService.saveMenu() writes preset to localStorage; save dialog in UnifiedPlan |
| MENU-02 | User can browse and load saved menu presets | MyMenu.tsx page replaces MenuPlaceholder; load reconstructs GeneratedSlot[] via resolveItem() and writes TodayPlanRecord |
| MENU-03 | User can edit and delete saved menu presets | MenuService.renameMenu() and deleteMenu() with optimistic localStorage update; confirmation dialog for delete |
</phase_requirements>

---

## Summary

Phase 13 adds a named meal preset system: save today's food plan, browse presets on `/menu`, load a preset as today's plan, and rename or delete presets. All state is localStorage-only (MENU-04 Sheets sync is deferred). The technical work is four discrete pieces: a new `MenuService` module, a save dialog added to `UnifiedPlan.tsx`, a new `MyMenu.tsx` page replacing `MenuPlaceholder.tsx`, and a load path that reconstructs `GeneratedSlot[]` from stored food IDs.

The primary complexity is the load path. A `MenuPreset` stores `foodItemIds: string[][]` — a 2D array where `foodItemIds[slotIdx][itemIdx]` is a food ID. When loading, each slot must be reconstructed as a `GeneratedSlot` by matching it back against the `SCHEDULE` template and calling `resolveItem()` on each ID. The `GeneratedSlot` shape (with `slot`, `fixed`, `selected`) must be preserved so `FoodPlanSection` renders it identically to a freshly generated plan. Items that no longer exist (deleted from catalog) should be silently dropped rather than crashing.

The second notable area is the headlessui `Dialog` usage — already installed and proven in `SidebarDrawer.tsx`. The save dialog and delete confirmation dialog follow the same `Dialog` / `DialogBackdrop` / `DialogPanel` pattern already in the codebase. No new dependencies are needed.

**Primary recommendation:** Build `MenuService` as a pure localStorage singleton (no async), reconstruct `GeneratedSlot[]` on load using `SCHEDULE` slots + `resolveItem()`, and reuse the headlessui Dialog pattern from `SidebarDrawer.tsx` for all dialogs.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@headlessui/react` | ^2.2.9 (installed) | Save/confirm dialogs | Already installed, provides focus trap, Escape-to-close, ARIA |
| `react-router-dom` | ^7.6.0 (installed) | Navigate to `/plan` after load | Already used throughout app |

No new dependencies required for this phase. All needed libraries are already installed.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| headlessui Dialog | Custom modal div | headlessui provides focus trap and Escape-close; custom would need manual ARIA and keyboard handling |
| localStorage (sync) | DataService async pattern | MenuService is local-only per D-01; no async needed, keeps service simple |

**Installation:** No new packages needed.

---

## Architecture Patterns

### New File: `src/lib/menu-service.ts`

Pattern mirrors `src/lib/item-service.ts` exactly: a plain object singleton, `cacheGet`/`cacheSet` private helpers, `wellness_` prefix for localStorage keys.

```typescript
// Pattern from item-service.ts
const CACHE_PREFIX = "wellness_";

function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function cacheSet(key: string, data: unknown): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  } catch {
    console.warn("localStorage write failed for", key);
  }
}
```

### MenuPreset Interface

From D-02:
```typescript
export interface MenuPreset {
  id: string;          // crypto.randomUUID()
  name: string;        // user-entered or auto-generated
  createdAt: string;   // todayStr() format: "YYYY-MM-DD"
  foodItemIds: string[][];  // [slotIdx][itemIdx] → food ID
}
```

### Extracting foodItemIds from GeneratedSlot[]

When saving, extract IDs from the current `plan: GeneratedSlot[]`:

```typescript
// Convert GeneratedSlot[] → string[][] for storage
function extractFoodIds(slots: GeneratedSlot[]): string[][] {
  return slots.map((g) => {
    const fixedIds = g.fixed.map((item) => item.id);
    const selectedIds = g.selected.flatMap((sel) => sel.items.map((item) => item.id));
    return [...fixedIds, ...selectedIds];
  });
}
```

### Reconstructing GeneratedSlot[] from Stored IDs (Load Path)

This is the critical logic. When loading a preset, reconstruct `GeneratedSlot[]` matching the `SCHEDULE` template shape:

```typescript
import { SCHEDULE } from "../data/schedule";
import { resolveItem } from "../data/resolver";
import type { GeneratedSlot } from "../lib/data-service";

function reconstructSlots(foodItemIds: string[][]): GeneratedSlot[] {
  return SCHEDULE.map((slot, slotIdx) => {
    const ids = foodItemIds[slotIdx] ?? [];
    const items = ids
      .map(resolveItem)
      .filter((x): x is ResolvedItem => x !== null);

    // Reconstruct as a single "selected" pool with no fixed items
    // (the saved plan had specific items, not pool logic)
    return {
      slot,
      fixed: [],
      selected: [{ poolName: "", items }],
    };
  });
}
```

**Key insight:** The reconstructed `GeneratedSlot[]` doesn't need to exactly match the original `fixed`/`selected` split — `FoodPlanSection` renders both interchangeably. Simplest approach: put all items in `selected[0]` with empty `poolName`. Items that `resolveItem()` returns `null` for are silently dropped (handles deleted foods).

### Recommended Project Structure (new file)

```
src/
├── lib/
│   ├── menu-service.ts   ← NEW: MenuPreset CRUD (localStorage-only)
│   ├── item-service.ts   ← unchanged
│   └── data-service.ts   ← unchanged (saveTodayPlan/loadTodayPlan used by load path)
├── pages/
│   ├── MyMenu.tsx        ← NEW: replaces MenuPlaceholder.tsx
│   └── UnifiedPlan.tsx   ← MODIFIED: add save button + save dialog
└── App.tsx               ← MODIFIED: swap MenuPlaceholder import for MyMenu
```

### Dialog Pattern (from SidebarDrawer.tsx)

```typescript
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";

// Usage pattern (already proven in SidebarDrawer)
<Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} className="relative z-50">
  <DialogBackdrop
    transition
    className="fixed inset-0 bg-black/50 transition duration-200 data-[closed]:opacity-0"
  />
  <div className="fixed inset-0 flex items-center justify-center p-4">
    <DialogPanel
      transition
      className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl p-5 transition duration-300 data-[closed]:scale-95 data-[closed]:opacity-0"
    >
      {/* dialog content */}
    </DialogPanel>
  </div>
</Dialog>
```

Note: `SidebarDrawer` uses `data-[closed]:-translate-x-full` for slide-in. For centered dialogs (save/confirm), use `data-[closed]:scale-95 data-[closed]:opacity-0` instead — standard modal fade/scale pattern.

### UnifiedPlan Save Button Placement

The save button goes into the existing button row at line 945-955 of `UnifiedPlan.tsx`:

```tsx
<div className="flex gap-2 justify-center mb-4">
  <button onClick={generate} disabled={locked} ...>
    🎲 {plan ? "重新產生" : "產生今日方案"}
  </button>
  {/* ADD: save button, only when plan exists */}
  {plan && (
    <button
      onClick={() => setSaveDialogOpen(true)}
      className="px-4 py-2.5 rounded-lg bg-slate-700 text-slate-200 font-bold text-sm"
    >
      📋 儲存為菜單
    </button>
  )}
</div>
```

### Auto-generated Name (D-06)

```typescript
// todayStr() returns "YYYY-MM-DD"; parse month and day for Chinese format
function autoMenuName(): string {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日 菜單`;
}
```

### Load Path in MyMenu.tsx

When user taps a menu row to load:
1. Check if current plan has checked items — if yes, show confirm dialog (D-12)
2. Reconstruct `GeneratedSlot[]` from `preset.foodItemIds` using `reconstructSlots()`
3. Build `TodayPlanRecord` with reconstructed slots, empty `checkedIds`, empty `skippedSupplementIds`, today's date
4. Call `saveTodayPlan(record)` to persist
5. Navigate to `/plan` via `useNavigate()`

`UnifiedPlan.tsx` reads `loadTodayPlan()` on mount and will pick up the newly written record automatically.

**Checking for locked state from MyMenu:** `MyMenu.tsx` does not have direct access to `UnifiedPlan`'s `checkedIds` state. It must read `loadTodayPlan()` to inspect `checkedIds` — if `checkedIds.length > 0` AND `record.date === todayStr()`, the plan is locked and the confirmation dialog should appear.

### Anti-Patterns to Avoid

- **Storing GeneratedSlot[] directly in MenuPreset:** `GeneratedSlot` contains `ResolvedItem` objects with `raw: FoodItem | SupplementItem`. These are large, redundant, and will drift if item data changes. Store IDs only.
- **Async MenuService methods:** localStorage is synchronous. Wrapping in `async` adds overhead for no benefit. Follow the synchronous `getDailyLog`/`saveDailyLog` pattern from `item-service.ts`, not the async `getFoods` pattern.
- **Using `useNavigate` inside a non-Router component:** `MyMenu.tsx` is a page component rendered inside `<Routes>`, so `useNavigate()` works fine.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Focus trap in dialogs | Custom `onKeyDown` listener | headlessui `Dialog` | Already handles focus trap, Escape-to-close, ARIA role="dialog" |
| ID generation | Timestamp or Math.random | `crypto.randomUUID()` | Globally unique, no collision risk, already decided in ROADMAP |
| Date formatting | Custom format function | `todayStr()` from `data-service.ts` | Already exported and used throughout |

---

## Common Pitfalls

### Pitfall 1: GeneratedSlot Reconstruction Slot Count Mismatch
**What goes wrong:** `SCHEDULE` has N slots; `foodItemIds` has M stored slot arrays. If `SCHEDULE` changes between save and load, `foodItemIds[slotIdx]` is `undefined` for new slots.
**Why it happens:** The preset was saved when `SCHEDULE` had fewer slots, then a code change added a slot.
**How to avoid:** Use `?? []` fallback: `const ids = foodItemIds[slotIdx] ?? [];`. Empty slots render with no items, which is acceptable.
**Warning signs:** `Cannot read properties of undefined (reading 'map')` errors at load time.

### Pitfall 2: resolveItem Returns null for User-Created Foods
**What goes wrong:** `resolveItem()` in `resolver.ts` only queries `FOOD_MAP` (hardcoded) and `SUPPLEMENT_MAP` (hardcoded). User-created foods stored in localStorage are NOT in these maps.
**Why it happens:** `resolver.ts` does not read from ItemService/localStorage — it uses the static compile-time maps.
**How to avoid:** For the load path, the reconstructed slots only need to render correctly in `FoodPlanSection`. Since user-created food items won't resolve via `resolveItem()`, they will silently drop (null-filtered). This is the current behavior for unknown IDs in the existing plan system — acceptable per project error-handling pattern (`console.warn` + return null).
**Warning signs:** User saves a preset containing their custom food items, loads it later, and sees fewer items than saved.
**Mitigation if needed (Claude's discretion):** Could display a note like "部分食材已無法找到" if item count differs — but this adds complexity; the silent drop behavior matches existing app conventions.

### Pitfall 3: Checked Items State Not Cleared on Load
**What goes wrong:** User loads a preset; old `checkedIds` from the current day persist, making items appear checked that don't belong to the new plan.
**Why it happens:** `checkedIds` in `UnifiedPlan.tsx` state is independent of plan slots.
**How to avoid:** When writing the `TodayPlanRecord` during load, always set `checkedIds: []` and `skippedSupplementIds: []` per D-11 and D-13. `UnifiedPlan` reads `stored.checkedIds` on mount and will get an empty set.

### Pitfall 4: Dialog z-index Collision
**What goes wrong:** Save dialog or confirm dialog appears behind the header bar (`z-40`) or the sidebar drawer (`z-50`).
**Why it happens:** The `Dialog` wrapper needs `z-50` or higher.
**How to avoid:** Use `className="relative z-50"` on the `Dialog` root, matching `SidebarDrawer`'s pattern exactly.

### Pitfall 5: `noUnusedLocals` / `noUnusedParameters` TypeScript Errors
**What goes wrong:** Build fails with TypeScript strict mode errors if any imported type or variable is declared but not used.
**Why it happens:** `tsconfig.json` has `noUnusedLocals: true` and `noUnusedParameters: true`.
**How to avoid:** Import only what is used. In `MyMenu.tsx`, if `GeneratedSlot` is used only for type annotation in a helper, use `import type { GeneratedSlot }`.

---

## Code Examples

### MenuService Skeleton
```typescript
// src/lib/menu-service.ts
const CACHE_PREFIX = "wellness_";
const MENU_KEY = "menu_presets";

export interface MenuPreset {
  id: string;
  name: string;
  createdAt: string;
  foodItemIds: string[][];
}

function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function cacheSet(key: string, data: unknown): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  } catch {
    console.warn("localStorage write failed for", key);
  }
}

export const MenuService = {
  getAll(): MenuPreset[] {
    return cacheGet<MenuPreset[]>(MENU_KEY) ?? [];
  },

  save(preset: MenuPreset): void {
    const existing = this.getAll();
    existing.unshift(preset);
    cacheSet(MENU_KEY, existing);
  },

  rename(id: string, name: string): void {
    const all = this.getAll().map((p) =>
      p.id === id ? { ...p, name } : p
    );
    cacheSet(MENU_KEY, all);
  },

  delete(id: string): void {
    cacheSet(MENU_KEY, this.getAll().filter((p) => p.id !== id));
  },
};
```

### Save Dialog State in UnifiedPlan
```typescript
// State additions in UnifiedPlan
const [saveDialogOpen, setSaveDialogOpen] = useState(false);
const [menuName, setMenuName] = useState("");

function handleSaveMenu() {
  if (!plan) return;
  const name = menuName.trim() || autoMenuName();
  const foodItemIds = plan.map((g) => {
    const fixedIds = g.fixed.map((i) => i.id);
    const selectedIds = g.selected.flatMap((s) => s.items.map((i) => i.id));
    return [...fixedIds, ...selectedIds];
  });
  MenuService.save({
    id: crypto.randomUUID(),
    name,
    createdAt: todayStr(),
    foodItemIds,
  });
  setMenuName("");
  setSaveDialogOpen(false);
}
```

### Load Preset in MyMenu (core logic)
```typescript
// In MyMenu.tsx
import { useNavigate } from "react-router-dom";
import { SCHEDULE } from "../data/schedule";
import { resolveItem, type ResolvedItem } from "../data/resolver";
import { saveTodayPlan, loadTodayPlan, todayStr } from "../lib/data-service";
import type { GeneratedSlot } from "../lib/data-service";
import { MenuService, type MenuPreset } from "../lib/menu-service";

function reconstructSlots(foodItemIds: string[][]): GeneratedSlot[] {
  return SCHEDULE.map((slot, idx) => {
    const ids = foodItemIds[idx] ?? [];
    const items = ids.map(resolveItem).filter((x): x is ResolvedItem => x !== null);
    return {
      slot,
      fixed: [],
      selected: [{ poolName: "", items }],
    };
  });
}

// In component:
const navigate = useNavigate();
const [confirmPreset, setConfirmPreset] = useState<MenuPreset | null>(null);

function loadPreset(preset: MenuPreset) {
  const current = loadTodayPlan();
  const isLocked = current?.date === todayStr() && (current.checkedIds.length > 0);
  if (isLocked) {
    setConfirmPreset(preset);
    return;
  }
  applyPreset(preset);
}

function applyPreset(preset: MenuPreset) {
  const foodSlots = reconstructSlots(preset.foodItemIds);
  saveTodayPlan({
    date: todayStr(),
    foodSlots,
    checkedIds: [],
    skippedSupplementIds: [],
  });
  navigate("/plan");
}
```

---

## Environment Availability

Step 2.6: SKIPPED — This phase is code/config changes only. No external tools, services, or CLIs are required beyond the existing project stack (Node.js, npm, browser). All dependencies (`@headlessui/react`, `react-router-dom`) are already installed.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| headlessui v1 `Transition` wrapper | headlessui v2 `transition` prop + Tailwind `data-[closed]:` | headlessui v2 | Project already uses v2 pattern (SidebarDrawer) — use same syntax |
| Class components | Functional components + hooks | React 16+ | Project uses functional only; no change |

---

## Open Questions

1. **resolveItem() limitation for user-created foods**
   - What we know: `resolver.ts` uses static compile-time `FOOD_MAP` — user-added foods in localStorage are not in this map
   - What's unclear: Do any existing saved plans contain user-created food IDs that would fail to resolve? Does this matter for presets?
   - Recommendation: Accept silent drop behavior for now (consistent with existing `console.warn` + null-filter pattern). Note in plan tasks that items saved to a preset from user-created foods will silently disappear on load. If this is a concern, plan a future task to pass the live food list into `reconstructSlots()`.

2. **Newest-first vs alphabetical sort in menu list**
   - What we know: Marked as Claude's discretion
   - Recommendation: Sort newest-first (`sort((a, b) => b.createdAt.localeCompare(a.createdAt))`). Users most recently saved a preset because they liked it — newest first means it's immediately at the top for quick re-use.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 13 |
|-----------|-------------------|
| Static SPA only — no SSR, no server | MenuService must be localStorage-only (already decided per D-01) |
| All user-facing text in Traditional Chinese | All button labels, dialog text, empty states, confirmation messages in zh-TW |
| Tailwind CSS v4 with existing dark theme tokens | Use `bg-slate-800/50` cards, `border-slate-700`, `text-slate-400` secondary text; no `tailwind.config.js` |
| Functional components only | No class components in MyMenu.tsx |
| No global state — page-level useState | MyMenu reads MenuService on mount/render; no Context/Redux |
| Singleton service objects (plain objects, not classes) | `MenuService` is `export const MenuService = { ... }` |
| `wellness_` prefix for all localStorage keys | `menu_presets` key stored as `wellness_menu_presets` |
| `crypto.randomUUID()` for IDs | No uuid package; use browser built-in |
| `noUnusedLocals`, `noUnusedParameters` strict TypeScript | All imports must be used; use `import type` for type-only imports |
| Named exports for non-page modules | `export const MenuService`, `export interface MenuPreset` |
| Default exports for page components | `export default function MyMenu()` |
| Section dividers using `// ── Section Name ──` pattern | Apply in `menu-service.ts` |
| File-level block comment on new modules | Add JSDoc block at top of `menu-service.ts` |
| `@headlessui/react` already installed — reuse existing Dialog pattern | No new dependencies; follow SidebarDrawer.tsx pattern |

---

## Sources

### Primary (HIGH confidence)
- Direct source code read: `src/lib/item-service.ts` — singleton service pattern with cacheGet/cacheSet
- Direct source code read: `src/lib/data-service.ts` — TodayPlanRecord, GeneratedSlot, saveTodayPlan/loadTodayPlan signatures
- Direct source code read: `src/components/SidebarDrawer.tsx` — headlessui Dialog/DialogBackdrop/DialogPanel usage
- Direct source code read: `src/pages/UnifiedPlan.tsx` — full render structure, state shape, generate button location
- Direct source code read: `src/data/resolver.ts` — resolveItem() behavior (static maps only)
- Direct source code read: `src/App.tsx` — MenuPlaceholder import, route `/menu`
- Direct source code read: `src/pages/MenuPlaceholder.tsx` — placeholder to be replaced
- Direct source code read: `.planning/phases/13-my-menu/13-CONTEXT.md` — all locked decisions D-01 through D-13

### Secondary (MEDIUM confidence)
- `package.json` dependencies verified: `@headlessui/react: ^2.2.9` installed
- `CLAUDE.md` project constraints: naming conventions, service patterns, localStorage prefix

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from package.json and source code; no new dependencies
- Architecture: HIGH — all patterns directly observed in existing codebase
- Pitfalls: HIGH — derived from direct source code analysis (resolver.ts static maps, TypeScript strict config)

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable dependencies, no fast-moving ecosystem concerns)
