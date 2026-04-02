# Phase 8: Supplement Manager + Inventory - Research

**Researched:** 2026-04-02
**Domain:** React SPA — CRUD page with state machine, form management, inventory tracking, cross-reference display
**Confidence:** HIGH

## Summary

Phase 8 implements `SupplementManager.tsx`, a new page for managing the supplement catalog with full metadata and inventory tracking. The phase is a close mirror of the already-completed `FoodManager.tsx` (Phase 7), with two key additions: (1) supplement-specific fields (timing, dosage, interactions, synergies, isActive toggle) and (2) an inventory section in the edit view (record purchases, display remaining units + days estimate).

All backend infrastructure is already in place. `ItemService` in `src/lib/item-service.ts` exposes `getSupplements`, `saveSupplement`, `deleteSupplement`, `getInventory`, and `upsertInventory` — no new service layer work needed. `SupplementItem` and `InventoryEntry` types are fully defined in `src/data/types.ts`. The primary work is UI: build the page, wire form state to `ItemService`, and add the new tab to `App.tsx`.

The main complexity delta over FoodManager is: multi-select chip UI for `timing[]` (SupplementTiming values), a cross-reference searchable selector for `interactions[]` and `synergies[]`, an inventory section with purchase-history list, and bidirectional interaction resolution at render time (no data duplication required).

**Primary recommendation:** Mirror FoodManager patterns exactly for shared concerns (state machine, INPUT_CLASS, tag chips, confirmation delete) and layer supplement-specific sections on top. Do not deviate from established conventions.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Navigation & Routing**
- D-01: Add "補品" (Supplements) tab to bottom nav in `App.tsx` with 💊 icon at position 4 (after 食材, before 時程). Path: `/supplements`. This makes 7 tabs total.
- D-02: Supplement Manager is a single page component `src/pages/SupplementManager.tsx` — default export. Mirrors FoodManager's single-page pattern with view state machine.
- D-03: Page states: `"list"` (default), `"add"`, `"edit"`. No separate "compose" state. Controlled by `useState<"list" | "add" | "edit">`.

**Supplement List View**
- D-04: Scrollable list of supplement cards. Each card shows: name, brand, dosage per unit, timing badges, health tags, inventory status bar.
- D-05: Inventory status bar: green (>14 days), amber (7-14 days), red (<7 days), gray (no inventory). Shows "剩餘 X 顆 · 約 Y 天" text.
- D-06: Days remaining: `remaining_units / (unitsPerDose * dosesPerDay)`. Remaining units = `sum(purchased) - sum(consumed)` from InventoryEntry records.
- D-07: Search/filter bar — text filter by name + dropdown filter by timing slot.
- D-08: "新增補品" button — FAB or header button. Switches to add view.
- D-09: Tap a card → switch to edit view pre-filled with data + show inventory section.

**Supplement Form (Add/Edit)**
- D-10: Form fields: name (required), brand (optional), dosagePerUnit (required), unitsPerDose (required, default 1), dosesPerDay (required, default 1), timing (multi-select chips), tags (multi-select chips), isActive (toggle, default true), mechanism (textarea), caution (textarea).
- D-11: Save generates ID as `supp_{Date.now()}`, calls `ItemService.saveSupplement()`, returns to list. Edit reuses form with existing ID.

**Interactions & Synergies**
- D-12: Interactions: searchable multi-select showing existing supplement names. Stored as ID array. Displayed as red-tinted chips: "⚠ 與 [name] 衝突".
- D-13: Synergies: same UI pattern, green-tinted chips: "✓ 與 [name] 協同".
- D-14: Bidirectional display only — computed at render time, no data duplication. If A lists B as interaction, show the conflict on B's view as well by checking other supplements' arrays.

**Inventory Section (Edit View only)**
- D-15: Inventory section appears in edit view only (not add view).
- D-16: "記錄購入" form: quantity (number), purchase date (date, defaults today). Calls `ItemService.upsertInventory({ supplementId, purchasedUnits, purchaseDate })`.
- D-17: Purchase history list below form, sorted date descending. Each entry: date, quantity. Display only, no delete.
- D-18: Remaining units and days shown at top of inventory section with same color coding as D-05.

**Consumption Tracking**
- D-19: ConsumptionEvent tracking NOT implemented in Phase 8. `remaining = sum(purchasedUnits)` only. Phase 9 adds consumption deductions.
- D-20: Days formula: `sum(purchasedUnits) / (unitsPerDose * dosesPerDay)` — estimate based on total purchased.

**Delete Behavior**
- D-21: Delete shows `window.confirm()`. Calls `ItemService.deleteSupplement(id)`. Immediate removal from list.
- D-22: No reference guard needed. Dangling interaction/synergy references are gracefully filtered out at render time.

**Low Inventory Warnings**
- D-23: Card-level inventory bar color: green >14d, amber 7-14d, red <7d.
- D-24: List header shows "⚠ X 項補品即將耗盡" in amber text when any supplement has <14 days supply.

### Claude's Discretion
- Internal component decomposition within SupplementManager.tsx
- Exact Tailwind classes for form inputs (follow FoodManager patterns)
- Whether to show TCM info fields in the form (tcm is optional and complex — may defer to edit-only or skip entirely)
- Empty state design when no supplements exist
- Whether the SupplementSchedule.tsx page should be updated or left as-is (Phase 9 will redesign it)

### Deferred Ideas (OUT OF SCOPE)
- ConsumptionEvent tracking and actual remaining calculation → Phase 9
- SupplementSchedule.tsx redesign → Phase 9
- TCM info editing (complex nested object) → Claude's Discretion, can be minimal or deferred
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SUPP-01 | User can add a supplement with name, brand, dosage per capsule/tablet, health tags, recommended timing | D-10/D-11: SupplementForm with SupplementItem fields; ItemService.saveSupplement() ready |
| SUPP-02 | User can add interaction warnings for a supplement | D-12: searchable multi-select for interactions[], stored as ID array in SupplementItem |
| SUPP-03 | User can add synergy notes for a supplement | D-13: same UI as interactions but green-tinted; stored in synergies[] |
| SUPP-04 | User can edit an existing supplement | D-03/D-09/D-11: edit view pre-fills form; same save handler with existing ID |
| SUPP-05 | User can delete a supplement | D-21: window.confirm() then ItemService.deleteSupplement(id) |
| SUPP-06 | Supplement list page accessible from navigation, showing all supplements with key metadata | D-01/D-04: /supplements route, 7th nav tab, SupplementCard with metadata |
| INV-01 | User can record a supplement purchase (quantity, purchase date) | D-16: "記錄購入" form in edit view, calls ItemService.upsertInventory() |
| INV-02 | App tracks remaining quantity based on actual consumption events | D-19: Phase 8 defers consumption events; remaining = sum(purchasedUnits) only. INV-02 is partially met — purchases tracked, consumption deductions in Phase 9 |
| INV-03 | User can see remaining quantity and estimated days of supply | D-05/D-18: "剩餘 X 顆 · 約 Y 天" display on cards and in edit view |
| INV-04 | Low inventory warning when estimated days remaining drops below threshold | D-23/D-24: card bar color + header count banner |
</phase_requirements>

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.1.0 | UI rendering, useState/useEffect/useMemo | Already in project |
| TypeScript | ~5.8.3 | Type safety | Project language |
| Tailwind CSS v4 | ^4.1.7 | Styling via utility classes | Project CSS framework |
| React Router DOM | ^7.6.0 | `/supplements` route, NavLink in App.tsx | Already in project |

No new dependencies required. Phase 8 is purely UI work on top of existing infrastructure.

**Installation:** None needed.

## Architecture Patterns

### Recommended File Structure for Phase 8

```
src/
├── pages/
│   └── SupplementManager.tsx   # NEW — single page, all sub-components inline
├── App.tsx                     # EDIT — add /supplements tab + Route
└── (all other files unchanged)
```

### Pattern 1: View State Machine (mirror FoodManager exactly)

**What:** The page holds a `useState<"list" | "add" | "edit">` that drives which top-level JSX to render. No router nesting.

**When to use:** All view transitions in SupplementManager.

**Example (from FoodManager.tsx):**
```typescript
// Source: src/pages/FoodManager.tsx lines 779–860
const [view, setView] = useState<ViewState>("list");
const [editTarget, setEditTarget] = useState<SupplementItem | null>(null);

if (view === "add") return <SupplementForm onSave={handleSave} onCancel={() => setView("list")} />;
if (view === "edit" && editTarget) return <SupplementForm supp={editTarget} onSave={handleSave} onCancel={() => setView("list")} />;
// else render list view
```

### Pattern 2: String Draft State for Numeric Inputs

**What:** Form numeric fields use `string` draft state (not `number`), parsed with `parseFloat` on submit.

**When to use:** All numeric inputs in SupplementForm (`unitsPerDose`, `dosesPerDay`).

**Example (from FoodManager.tsx / Phase 7 decision 07-02):**
```typescript
// From STATE.md accumulated context:
// "NutritionLabelForm uses string draft state for all numeric inputs (not number type)
//  — allows empty/partial entry during typing, parseFloat on submit"
interface SupplementFormDraft {
  name: string;
  brand: string;
  dosagePerUnit: string;
  unitsPerDose: string;  // string, not number
  dosesPerDay: string;   // string, not number
  timing: SupplementTiming[];
  tags: HealthTag[];
  isActive: boolean;
  mechanism: string;
  caution: string;
}
```

### Pattern 3: Tag/Chip Multi-Select (inline style for selected, className for unselected)

**What:** Dynamic hex color applied via `style` prop for selected state, Tailwind className for unselected. Used for both HealthTag and SupplementTiming chips.

**When to use:** `timing[]` and `tags[]` multi-select in SupplementForm.

**Example (from FoodManager.tsx lines 256–277):**
```typescript
// Source: src/pages/FoodManager.tsx
// From STATE.md: "Tag chips use inline style prop for selected color (dynamic hex from
//  HEALTH_TAG_COLORS), className for unselected — matches DailyPlan.tsx pattern"
<button
  onClick={() => toggleTag(tag)}
  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
    selected ? "" : "bg-slate-700/50 text-slate-300"
  }`}
  style={
    selected
      ? { backgroundColor: color + "30", color, borderWidth: 1, borderColor: color + "60" }
      : {}
  }
>
  {HEALTH_TAG_LABELS[tag]}
</button>
```

For `SupplementTiming` chips, there is no color map — use a fixed accent color (e.g., `bg-blue-600/30 text-blue-300 border-blue-600/60` for selected, `bg-slate-700/50 text-slate-300` for unselected).

### Pattern 4: Searchable Multi-Select (Interactions & Synergies)

**What:** A text input that filters existing supplement names, shows a dropdown, and adds selected items as chips. Close analogue to `IngredientRow` in FoodManager.

**When to use:** `interactions[]` and `synergies[]` fields in SupplementForm (edit view).

**Key pattern from IngredientRow (FoodManager.tsx lines 348–415):**
```typescript
// Adapted approach for supplement cross-reference:
// - query state: string (search text)
// - showDropdown state: boolean
// - onBlur uses setTimeout(() => setShowDropdown(false), 150) to allow click
// - matches: allSupplements.filter(s => s.name.includes(query) && !selected.includes(s.id))
// - onMouseDown (not onClick) for dropdown items to beat the blur event
```

Interaction chips should show with a red-tint style; synergy chips with green-tint:
```typescript
// Interaction chip: backgroundColor: "#ef444430", color: "#ef4444", border: "1px solid #ef444460"
// Synergy chip:     backgroundColor: "#22c55e30", color: "#22c55e", border: "1px solid #22c55e60"
```

### Pattern 5: Bidirectional Interaction Display

**What:** If supplement A lists supplement B in `interactions[]`, B's view should also show the conflict. Computed at render time, not stored.

**When to use:** Render logic in SupplementCard and edit view conflict display.

**Implementation:**
```typescript
// When rendering supplement `s`'s interactions for display:
function resolveInteractions(s: SupplementItem, allSupps: SupplementItem[]): SupplementItem[] {
  const direct = s.interactions
    .map(id => allSupps.find(x => x.id === id))
    .filter((x): x is SupplementItem => x !== undefined);
  const indirect = allSupps.filter(
    other => other.id !== s.id && other.interactions.includes(s.id)
  );
  // Deduplicate
  const seen = new Set(direct.map(x => x.id));
  return [...direct, ...indirect.filter(x => !seen.has(x.id))];
}
// Same pattern for synergies
```

### Pattern 6: Inventory Calculation

**What:** `remaining = sum(purchasedUnits)` (Phase 8 — no consumption deductions yet). `daysLeft = remaining / (unitsPerDose * dosesPerDay)`.

**When to use:** Card inventory bar, edit view inventory header.

**Color thresholds (D-05):**
```typescript
function inventoryColor(daysLeft: number | null): "green" | "amber" | "red" | "gray" {
  if (daysLeft === null) return "gray";   // no purchases recorded
  if (daysLeft > 14) return "green";
  if (daysLeft >= 7) return "amber";
  return "red";
}
// Tailwind classes per color:
// green:  "bg-emerald-500/20 text-emerald-400"
// amber:  "bg-amber-500/20 text-amber-400"
// red:    "bg-red-500/20 text-red-400"
// gray:   "bg-slate-700/50 text-slate-500"
```

### Pattern 7: Offline-First Data Load

**What:** `useEffect` on mount calls `ItemService.getSupplements()` and `ItemService.getInventory()`. Results stored in `useState`. Background Sheets sync is transparent.

**When to use:** Top-level `SupplementManager` component.

**Example (from FoodManager.tsx lines 786–788):**
```typescript
useEffect(() => {
  ItemService.getSupplements().then(setSupplements).catch(() => {});
  ItemService.getInventory().then(setInventory).catch(() => {});
}, []);
```

### Pattern 8: isActive Toggle

**What:** A toggle switch for `SupplementItem.isActive`. No Tailwind component exists — implement as a styled checkbox or a button that toggles boolean draft state.

**Recommendation:** Implement as a `<button>` pill toggle (2-state visual), consistent with the dark theme:
```typescript
<button
  onClick={() => setField("isActive", !draft.isActive)}
  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
    draft.isActive ? "bg-blue-600" : "bg-slate-700"
  }`}
>
  <span className={`inline-block h-4 w-4 rounded-full bg-white transform transition-transform ${
    draft.isActive ? "translate-x-6" : "translate-x-1"
  }`} />
</button>
```

### Pattern 9: Tab Addition in App.tsx

**What:** Insert a new entry into the `tabs` array in `App.tsx` at position index 3 (after `/foods`, before `/schedule`), add an `import` and a `<Route>`.

**When to use:** App.tsx edit (one task).

**Current tabs (6):**
```
{ path: "/plan",     icon: "🎲", label: "方案" },
{ path: "/foods",    icon: "🍽️", label: "食材" },
{ path: "/track",    icon: "📊", label: "飲食" },
{ path: "/schedule", icon: "💊", label: "時程" },
{ path: "/weight",   icon: "⚖️", label: "體重" },
{ path: "/settings", icon: "⚙️", label: "設定" },
```

**After edit (7 tabs — D-01):**
```
{ path: "/plan",        icon: "🎲", label: "方案" },
{ path: "/foods",       icon: "🍽️", label: "食材" },
{ path: "/track",       icon: "📊", label: "飲食" },
{ path: "/supplements", icon: "💊", label: "補品" },   // NEW at index 3
{ path: "/schedule",    icon: "💊", label: "時程" },
{ path: "/weight",      icon: "⚖️", label: "體重" },
{ path: "/settings",    icon: "⚙️", label: "設定" },
```

Note: `/schedule` currently uses 💊 icon too. Both tabs having 💊 is fine per decisions. If Claude's discretion applies, consider "🗓️" for schedule to differentiate, but this is not required.

### Anti-Patterns to Avoid

- **Storing computed interaction references:** D-14 is explicit — bidirectional display is computed at render time. Never write back to `interactions[]` or `synergies[]` to reflect indirect links.
- **ConsumptionEvent deduction in Phase 8:** D-19 defers this to Phase 9. `remaining = sum(purchasedUnits)` only.
- **Number state for numeric form inputs:** Use string state, parseFloat on submit (07-02 decision).
- **Using `@/*` path alias:** Although configured in tsconfig, it is not used in any source file. Use relative imports only (`../lib/item-service`, `../data/types`).
- **Inventory records in add view:** D-15 is firm — inventory section only appears in edit view after supplement has been saved and has an ID.
- **Cascading delete guard:** D-22 explicitly removes the reference guard. Do not add `isIngredientInUse`-style check for supplements.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Supplement CRUD persistence | Custom storage layer | `ItemService.saveSupplement()`, `ItemService.deleteSupplement()` | Already implements localStorage + Sheets sync |
| Inventory append | Custom inventory store | `ItemService.upsertInventory()` | Append-only event sourcing already implemented; uses `SheetsAPI.append` not upsertById |
| Supplement reading | Direct localStorage access | `ItemService.getSupplements()` | Merges hardcoded `SUPPLEMENTS` array with user-saved items |
| Inventory reading | Direct localStorage access | `ItemService.getInventory(supplementId?)` | Supports both full list and per-supplement filter |
| Type definitions | New interfaces | `SupplementItem`, `InventoryEntry` from `src/data/types.ts` | Fully defined, includes all required fields |
| Timing labels | New label map | `SUPPLEMENT_TIMING_LABELS` from `src/data/types.ts` | 5 values: empty_stomach, before_meal, with_meal, after_meal, bedtime |
| Health tag chips | New color/label system | `HEALTH_TAG_LABELS`, `HEALTH_TAG_COLORS` from `src/data/types.ts` | 11 tags, used by FoodManager already |

**Key insight:** All data model and service work was done in Phases 5–6. Phase 8 is 100% UI work. Any custom persistence or type logic is duplication.

---

## Common Pitfalls

### Pitfall 1: InventoryEntry Has No `id` Field — Use `append` Not `upsertById`

**What goes wrong:** Calling `SheetsAPI.upsertById()` for inventory entries throws a runtime error or corrupts data because `InventoryEntry` has no `id` field.

**Why it happens:** FoodItem and SupplementItem both have `id`; InventoryEntry does not. It's an event-sourced append-only log.

**How to avoid:** `ItemService.upsertInventory()` already uses `SheetsAPI.append()` — just call the service method and don't bypass it.

**Warning signs:** Any code path that constructs an InventoryEntry with an `id` field.

### Pitfall 2: `isActive` Sheet Row Comparison

**What goes wrong:** `row.isActive === true` always evaluates false because SheetRow values are strings or numbers, never booleans.

**Why it happens:** Google Sheets returns boolean cell values as the string `"true"` or the number `1`.

**How to avoid:** Already handled in `rowToSupplement()` in item-service.ts:
```typescript
isActive: row.isActive === "true" || row.isActive === 1,
```
No changes needed. This is existing correct code — don't override it.

### Pitfall 3: TypeScript `noUnusedLocals` / `noUnusedParameters`

**What goes wrong:** Build fails with `tsc -b` if any imported type, declared variable, or function parameter is unused.

**Why it happens:** `tsconfig.json` has `noUnusedLocals: true` and `noUnusedParameters: true` enforced. `npm run build` runs `tsc -b && vite build`.

**How to avoid:** Import only what is used. Check with `npm run build` after implementing. Pay attention to: all imported types from `../data/types`, all interface fields defined in draft state.

**Warning signs:** TypeScript errors during `npm run build` referencing unused symbols.

### Pitfall 4: Interaction/Synergy IDs Referencing Deleted Supplements

**What goes wrong:** `interactions[]` contains an ID for a supplement that has been deleted. Rendering crashes or shows empty text if the code does `suppMap.get(id)` without null-checking.

**Why it happens:** D-22 — no reference guard on delete. The ID remains in the array.

**How to avoid:** Always filter when resolving IDs:
```typescript
const resolvedInteractions = supp.interactions
  .map(id => suppMap.get(id))
  .filter((s): s is SupplementItem => s !== undefined);
```

**Warning signs:** White card area or runtime error when a referenced supplement has been deleted.

### Pitfall 5: 7-Tab Bottom Nav on Small Screens

**What goes wrong:** 7 tabs crowd the bottom nav, especially on 320px-wide screens. Icons truncate or overlap.

**Why it happens:** `flex-1` divides the nav into equal columns — 7 columns at small widths leave ~45px per tab.

**How to avoid:** D-01 is locked — 7 tabs is the decision. Ensure label text is short (max 2 Chinese characters). "補品" (2 chars), "時程" (2 chars) both fit. Use `text-[10px]` or smaller if needed on label spans. The CONTEXT notes this as a known concern.

**Warning signs:** Label text wrapping or icon overlap in Chrome DevTools mobile view.

### Pitfall 6: `upsertInventory` Adds to Existing Cache Array (Append Semantics)

**What goes wrong:** After calling `ItemService.upsertInventory()`, if you re-call `ItemService.getInventory()` to refresh UI, the background Sheets sync may not have completed yet. The new entry is still in the cache.

**Why it happens:** `getInventory()` reads from localStorage cache first and fires a background Sheets sync. The cache was already updated by `upsertInventory()`.

**How to avoid:** After a purchase is recorded, update local `inventory` state directly (optimistic update) rather than re-calling `getInventory()`. Or re-call `getInventory()` with the understanding the new record is already in cache.

### Pitfall 7: `SUPPLEMENTS` Hardcoded Array Is Empty

**What goes wrong:** `ItemService.getSupplements()` merges `[...SUPPLEMENTS, ...cached]`. Since `SUPPLEMENTS = []` in `src/data/supplements.ts`, the result is just the cached items. This is correct and expected — all supplement data is user-generated. Do not populate `SUPPLEMENTS` with test data.

**Why it happens:** Design decision from Phase 5 — supplements are user-managed, not hardcoded.

**How to avoid:** No action needed; just understand the list will be empty until the user adds supplements via the new page.

---

## Code Examples

### Loading Supplements and Inventory on Mount

```typescript
// Source: mirrors FoodManager.tsx pattern + ItemService API
const [supplements, setSupplements] = useState<SupplementItem[]>([]);
const [inventory, setInventory] = useState<InventoryEntry[]>([]);

useEffect(() => {
  ItemService.getSupplements().then(setSupplements).catch(() => {});
  ItemService.getInventory().then(setInventory).catch(() => {});
}, []);
```

### Computing Days Remaining per Supplement

```typescript
// Source: D-20 formula, D-19 phase-8 scope
function calcDaysRemaining(
  suppId: string,
  unitsPerDose: number,
  dosesPerDay: number,
  inventory: InventoryEntry[]
): number | null {
  const entries = inventory.filter(e => e.supplementId === suppId);
  if (entries.length === 0) return null;
  const totalPurchased = entries.reduce((sum, e) => sum + e.purchasedUnits, 0);
  const dailyUsage = unitsPerDose * dosesPerDay;
  if (dailyUsage <= 0) return null;
  return totalPurchased / dailyUsage;
}
```

### Low Inventory Banner (List Header — D-24)

```typescript
// Count supplements with <14 days supply
const lowInventoryCount = supplements.filter(s => {
  const days = calcDaysRemaining(s.id, s.unitsPerDose, s.dosesPerDay, inventory);
  return days !== null && days < 14;
}).length;

// Render:
{lowInventoryCount > 0 && (
  <p className="text-xs text-amber-400 mb-3">
    ⚠ {lowInventoryCount} 項補品即將耗盡
  </p>
)}
```

### Recording a Purchase

```typescript
// Source: D-16, ItemService.upsertInventory() signature from item-service.ts
async function handleRecordPurchase() {
  if (!editTarget) return;
  const entry: InventoryEntry = {
    supplementId: editTarget.id,
    purchasedUnits: parseInt(purchaseQty, 10),
    purchaseDate: purchaseDate, // ISO YYYY-MM-DD string
  };
  await ItemService.upsertInventory(entry);
  // Optimistic update: add to local state
  setInventory(prev => [...prev, entry]);
  // Reset form
  setPurchaseQty("");
  setPurchaseDate(todayStr());
}
```

### App.tsx Tab Array Edit

```typescript
// Source: src/App.tsx — add at index 3
import SupplementManager from "./pages/SupplementManager";

const tabs = [
  { path: "/plan",        icon: "🎲", label: "方案" },
  { path: "/foods",       icon: "🍽️", label: "食材" },
  { path: "/track",       icon: "📊", label: "飲食" },
  { path: "/supplements", icon: "💊", label: "補品" },  // NEW
  { path: "/schedule",    icon: "💊", label: "時程" },
  { path: "/weight",      icon: "⚖️", label: "體重" },
  { path: "/settings",    icon: "⚙️", label: "設定" },
];

// In Routes:
<Route path="/supplements" element={<SupplementManager />} />
```

### Supplement ID Generation (D-11)

```typescript
// Source: D-11, mirrors Phase 6 D-05 pattern
id: supp?.id ?? `supp_${Date.now()}`,
```

### Graceful Interaction Reference Resolution (D-22)

```typescript
// Build map once from loaded supplements
const suppMap = useMemo(
  () => new Map(supplements.map(s => [s.id, s])),
  [supplements]
);

// Safe resolution — filters deleted references
function resolveIds(ids: string[]): SupplementItem[] {
  return ids
    .map(id => suppMap.get(id))
    .filter((s): s is SupplementItem => s !== undefined);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `SUPPLEMENTS` hardcoded catalog | `SUPPLEMENTS = []` — all user-managed | Phase 5 | List starts empty; all supplements come from ItemService |
| No inventory model | `InventoryEntry` append-only event log | Phase 5 | Purchases are immutable records, no edit/delete |
| ConsumptionEvent deduction | Deferred to Phase 9 | Phase 8 decision | `remaining = sum(purchased)` only for now |
| `SheetsAPI.upsertById` for inventory | `SheetsAPI.append` | Phase 6 | Correct — InventoryEntry has no `id` field |
| SupplementSchedule reads hardcoded data | Will remain unchanged in Phase 8 | Phase 9 redesigns it | No changes to SupplementSchedule.tsx in this phase |

---

## Open Questions

1. **TCM info editing**
   - What we know: `SupplementItem.tcm?: TCMInfo` is defined with `effect: string` and `nature: TCMNature` (union of 5 Chinese characters). Claude's Discretion area.
   - What's unclear: Whether to expose a TCM edit UI in Phase 8 or defer entirely.
   - Recommendation: Skip TCM fields in the form entirely. `tcm` is optional; Phase 8 is already feature-complete without it. If data already has TCM, it will be preserved through `supp?.tcm` in the save object. Add a comment `// TODO: TCM editing deferred` in the form.

2. **7-tab crowding on very small screens**
   - What we know: D-01 locks the 7-tab decision. The concern is noted in CONTEXT specifics.
   - What's unclear: Whether to reduce font size on nav labels only for Phase 8.
   - Recommendation: Use `text-[10px]` for all nav labels (down from `text-xs`) in the App.tsx nav to give each tab slightly more room. This is a minor tweak, not a redesign.

3. **INV-02 partial satisfaction**
   - What we know: INV-02 says "based on actual consumption events (event-sourced, not estimated)" but D-19 explicitly defers consumption deductions to Phase 9. The requirement text and Phase 8 decision are misaligned.
   - What's unclear: Whether to mark INV-02 as complete or partially complete after Phase 8.
   - Recommendation: INV-02 is architecturally event-sourced (InventoryEntry records are append-only log entries); consumption deduction is Phase 9's work. Mark INV-02 as "partial — purchase tracking complete, consumption deduction in Phase 9".

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified — phase is purely UI code changes with no new external tools, APIs, or services required. `ItemService` and `SheetsAPI` are already integrated.)

---

## Validation Architecture

Step 4: SKIPPED — `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`.

---

## Sources

### Primary (HIGH confidence)

- `src/lib/item-service.ts` — ItemService methods: getSupplements, saveSupplement, deleteSupplement, getInventory, upsertInventory; SheetRow converters; cache keys
- `src/data/types.ts` — SupplementItem, InventoryEntry, ConsumptionEvent, SupplementTiming, SUPPLEMENT_TIMING_LABELS, HealthTag, HEALTH_TAG_LABELS, HEALTH_TAG_COLORS interfaces
- `src/pages/FoodManager.tsx` — Reference implementation for all shared UI patterns
- `src/App.tsx` — Current tabs array structure (6 tabs), Route definitions
- `.planning/phases/08-supplement-manager-inventory/08-CONTEXT.md` — All locked decisions D-01 through D-24

### Secondary (MEDIUM confidence)

- `src/pages/SupplementSchedule.tsx` — Existing supplement display patterns (tag rendering, timing display); confirms this page is NOT changed in Phase 8
- `.planning/STATE.md` accumulated context — Phase 6 isActive boolean decision; Phase 7 string-draft-state and tag-chip decisions

### Tertiary (LOW confidence — none)

N/A — all findings are from direct source code inspection.

---

## Project Constraints (from CLAUDE.md)

| Directive | Constraint |
|-----------|------------|
| Static SPA only | No server-side logic; localStorage + Sheets only |
| Traditional Chinese UI | All user-facing text in zh-TW |
| Tailwind CSS v4 | `@import "tailwindcss"` syntax; no tailwind.config.js; `@tailwindcss/vite` plugin |
| Functional components only | No class components; useState/useEffect/useMemo |
| No global state | Each page manages its own state via hooks |
| TypeScript strict mode | noUnusedLocals, noUnusedParameters enforced — `npm run build` must pass |
| Relative imports only | No `@/*` alias in actual source files, despite tsconfig config |
| Default exports for pages | `export default function SupplementManager()` |
| Named exports for sub-components | Sub-components defined inline in same file, not default-exported |
| camelCase functions | `handleSave`, `handleDelete`, `calcDaysRemaining` |
| UPPER_SNAKE_CASE constants | `ALL_TIMING_VALUES`, `INPUT_CLASS` |
| ID generation pattern | `supp_${Date.now()}` per D-11 |
| Error handling | Silent `.catch(() => {})` for background ops; `console.warn` for recoverable issues |
| No animation libraries | Dark theme, minimal motion |
| Double quotes for strings | Consistent with codebase |
| 2-space indentation | Consistent with codebase |

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all existing and verified from source
- Architecture patterns: HIGH — all derived from direct source code reading of FoodManager.tsx and item-service.ts
- Pitfalls: HIGH — derived from TypeScript config inspection, existing code, and CONTEXT decisions

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable project, no external dependencies change)
