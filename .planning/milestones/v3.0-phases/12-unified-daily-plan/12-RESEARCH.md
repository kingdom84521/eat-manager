# Phase 12: Unified Daily Plan - Research

**Researched:** 2026-04-06
**Domain:** React SPA — page merge, localStorage schema, checkbox-driven logging, debounce, sub-component decomposition
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `TodayPlanRecord` interface in a single localStorage key (`today_plan`). Fields: `date: string`, `foodSlots: GeneratedSlot[]`, `supplementRoutine: RoutineResult`, `checkedIds: Set<string>` (serialized as array). Atomic unit of plan state.
- **D-02:** Plan generation (food + supplement) is computed together and stored atomically. Stale = date mismatch → regenerate.
- **D-03:** `checkedIds` is one flat Set covering food item IDs and supplement IDs. Type distinguished by lookup.
- **D-04:** Supplement three-state toggle (untouched → taken → skipped) preserved. Food items use two-state (unchecked → checked). `skippedSupplementIds` stored separately in the record.
- **D-05:** Checking a food item adds ID to `checkedIds` and logs nutrition entry. Unchecking removes from `checkedIds` and removes log entry from localStorage and Sheets.
- **D-06:** Checking a supplement (taken): add to `checkedIds`, deduct inventory via `ItemService.logConsumption()`. Skip: add to `skippedSupplementIds`, no deduction.
- **D-07:** Debounce 300ms on localStorage/Sheets writes. Local state (`checkedIds`) updates immediately.
- **D-08:** `DataService.removeMealEntry(date, itemId)` — new method. For Sheets: `SheetsAPI.delete()` with matching criteria. For localStorage: filter out entry.
- **D-09:** Macro totals derived at render time from `checkedIds` ∩ food items (cal, protein, carbs, fat from FoodItem). Not stored.
- **D-10:** Bar shows consumed kcal / TDEE target, consumed protein / protein target. Targets from `SettingsService.getComputedTargets()`. If null, show absolute values only.
- **D-11:** Bar visually matches existing NutritionTracker budget bar style (progress fill, emerald → amber → red).
- **D-12:** `locked` is derived: `checkedIds.size > 0` at render time. Not a stored flag. Locked → "重新產生" button disabled with visual indication.
- **D-13:** Single-item re-random (🔄) available only on unchecked items. Button hidden/disabled on checked items.
- **D-14:** Supplement items have no re-random — routine is deterministic.
- **D-15:** Three sub-components inline in `src/pages/UnifiedPlan.tsx`: `FoodPlanSection`, `NutritionBudgetBar`, `SupplementRoutineSection`.
- **D-16:** `ItemCard` and `TagBadge` from DailyPlan.tsx reused. `RoutineRow`, `TimingSlotCard` from SupplementSchedule.tsx absorbed.
- **D-17:** `DailyPlan.tsx` deleted and replaced by `UnifiedPlan.tsx`. Route `/plan` → `UnifiedPlan`.
- **D-18:** `SupplementSchedule.tsx` deleted. Route `/supplements` redirects to `/plan`.
- **D-19:** `NutritionTracker.tsx` deleted. Route `/track` redirects to `/plan`.
- **D-20:** On mount, read `TodayPlanRecord` from localStorage. Restore if date matches today; else show empty state with generate button.
- **D-21:** Every state mutation writes the full `TodayPlanRecord` back to localStorage atomically.

### Claude's Discretion

- Visual layout: food sections first, supplements after (or interleaved by time)
- Scroll-to-supplement behavior when navigating from sidebar "營養補充"
- Animation/transition for check/uncheck state
- Whether to show an "all done" summary state
- Exact debounce timing (300ms suggested, adjustable)

### Deferred Ideas (OUT OF SCOPE)

- NutritionTracker `/track` redirect is confirmed: redirect once unified plan ships (this phase)
- My Menu save from unified plan — Phase 13 scope
- MENU-04: Menu presets sync to Google Sheets — future milestone
- Global state management — explicitly out of scope per REQUIREMENTS.md
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAN-01 | Today's plan shows food items + supplement routine in one unified view | UnifiedPlan.tsx merges GeneratedSlot[] and RoutineResult into one page; sub-component decomposition pattern confirmed in existing code |
| PLAN-02 | User can check/uncheck items with debounce; check logs consumption, confirmed uncheck removes log from localStorage and Sheets | `DataService.removeMealEntry()` new method; debounce via setTimeout/clearTimeout; existing `DataService.saveDailyPlan()` and `ItemService.getDailyLog()/saveDailyLog()` patterns apply |
| PLAN-03 | Full-page re-random is locked when any item is checked | Derived boolean from `checkedIds.size > 0`; disabled button with Tailwind `opacity-50 cursor-not-allowed` |
| PLAN-04 | User can re-random a single unchecked item | `swapItem()` from DailyPlan.tsx reused with lock guard; button absent/disabled on checked items |
| PLAN-05 | Supplement routine integrated into daily plan (no separate page) | Route `/supplements` → `<Navigate to="/plan" replace />`; SupplementSchedule.tsx content absorbed |
</phase_requirements>

---

## Summary

Phase 12 merges three existing pages (`DailyPlan`, `SupplementSchedule`, `NutritionTracker`) into a single `UnifiedPlan` page. The technical work is primarily page consolidation and schema introduction — no new library dependencies are required. The architectural patterns are already established in the codebase (useState/useCallback/useEffect, localStorage via cacheGet/cacheSet, debounced Sheets writes, computed-at-render-time derived values).

The most load-bearing new work is the `TodayPlanRecord` localStorage schema (one atomic write per state mutation) and the `DataService.removeMealEntry()` method, which requires filtering an array in localStorage and calling a new Sheets delete. Both are straightforward extensions of existing patterns.

A critical finding: both `SCHEDULE` and `FOODS` are empty arrays — all food/schedule data is user-managed via Google Sheets and loaded into localStorage from Sheets. The `generatePlan()` function in the current `DailyPlan.tsx` calls `resolveItem()` against `FOOD_MAP`, which is populated from the empty `FOODS` array. This means the food plan generation relies on Sheets-backed data being present in localStorage cache — there is no hardcoded fallback catalog.

**Primary recommendation:** Build `UnifiedPlan.tsx` by extracting and extending the three existing pages' logic into the three mandated sub-components, with the `TodayPlanRecord` schema as the single source of truth written atomically on every mutation.

---

## Standard Stack

### Core (no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.1.0 | UI rendering, useState/useCallback/useEffect | Already in use |
| TypeScript | ~5.8.3 | Type safety for TodayPlanRecord interface | Already in use |
| Tailwind CSS | ^4.1.7 | Styling, progress bar colors, disabled states | Already in use |
| react-router-dom | ^7.6.0 | `<Navigate>` for retired routes | Already in use |

No new npm packages required for this phase.

**Installation:** None needed.

---

## Architecture Patterns

### TodayPlanRecord Interface

```typescript
// New interface — add to src/lib/data-service.ts or src/data/types.ts
export interface TodayPlanRecord {
  date: string;                        // todayStr() ISO YYYY-MM-DD
  foodSlots: GeneratedSlot[];          // from generatePlan()
  supplementRoutine: RoutineResult;    // from generateRoutine()
  checkedIds: string[];                // serialized Set — food + supplement IDs
  skippedSupplementIds: string[];      // supplement skip state
}
```

Note: `RoutineResult` references `SupplementItem[]` which are runtime-loaded from Sheets, not hardcoded. Serializing a `Map<SupplementTiming, RoutineEntry[]>` to JSON requires converting to a plain object or array. The `slots` field of `RoutineResult` is a `Map` — it CANNOT be JSON.stringify'd directly. This must be addressed in the plan.

### RoutineResult Serialization Problem (CRITICAL)

`RoutineResult.slots` is typed as `Map<SupplementTiming, RoutineEntry[]>`. `JSON.stringify(map)` returns `{}`. The plan must address this with one of:
- Serialize as array: `Array.from(map.entries())` on write, reconstruct on read
- Store the raw inputs instead (supplements[], inventory[], consumption[] in the record) and re-run `generateRoutine()` on load — this avoids serializing the Map entirely and matches the "computed at render time" pattern from Phase 9

**Recommendation:** Store the routine inputs (`supplementIds`, `inventorySnapshot`, `consumptionSnapshot` at generation time) rather than the `RoutineResult` itself, and re-run `generateRoutine()` on mount. This is cleaner, avoids Map serialization, and aligns with the established render-time derivation pattern. The plan should decide: store result or store inputs?

### Atomic localStorage Write Pattern

Following `ItemService.saveDailyLog()` and `DataService.saveDailyPlan()`:

```typescript
const CACHE_KEY = "today_plan";

function saveTodayPlan(record: TodayPlanRecord): void {
  try {
    localStorage.setItem("wellness_" + CACHE_KEY, JSON.stringify(record));
  } catch {
    console.warn("localStorage write failed for today_plan");
  }
}

function loadTodayPlan(): TodayPlanRecord | null {
  try {
    const raw = localStorage.getItem("wellness_" + CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
```

### Debounce Pattern (D-07)

No external debounce library. Use the project's preferred `setTimeout`/`clearTimeout` approach:

```typescript
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

function debouncedSheetSync(entry: NutritionEntry) {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => {
    DataService.logMeal(entry).catch(() => {});
  }, 300);
}
```

The ref approach requires `useRef` — already used in the project via App.tsx patterns.

### DataService.removeMealEntry() — New Method

```typescript
// Signature to add in data-service.ts
async removeMealEntry(date: string, itemId: string): Promise<void> {
  const cacheKey = `${SHEETS.NUTRITION}_${date}`;
  const existing = cacheGet<NutritionEntry[]>(cacheKey) ?? [];
  // NutritionEntry.items is an array of sub-items — filter by foodId match
  const filtered = existing.filter(
    (entry) => !entry.items.some((i) => i.foodId === itemId)
  );
  cacheSet(cacheKey, filtered);
  // Sheets delete — requires GAS to support delete by date+itemId criteria
  SheetsAPI.deleteByDate(SHEETS.NUTRITION, date).catch(() => {});
}
```

**Critical finding:** `SheetsAPI.deleteByDate()` deletes ALL entries for a date, not a specific item within a date. The current GAS API does not have per-item delete for nutrition log. The plan must decide: (a) implement per-item delete in GAS (requires `gas-api.js` change + API_VERSION bump), or (b) use a re-upsert approach (delete all for date, re-append filtered set), or (c) keep localStorage accurate and accept Sheets may drift. Given the existing `SheetsAPI.upsert()` uses date as key, option (b) — replace all nutrition entries for the date — is the safest without GAS changes.

### Lock Mechanic (D-12)

```typescript
// Derived at render time — no state
const locked = checkedIds.size > 0;

// Disabled button pattern (existing Tailwind patterns)
<button
  onClick={locked ? undefined : generate}
  disabled={locked}
  className={`... ${locked ? "opacity-50 cursor-not-allowed" : "active:scale-95"}`}
>
  🎲 重新產生
</button>
```

### Route Updates in App.tsx

```typescript
// Replace DailyPlan import with UnifiedPlan
import UnifiedPlan from "./pages/UnifiedPlan";

// Routes: replace and add redirects
<Route path="/plan" element={<UnifiedPlan />} />
<Route path="/track" element={<Navigate to="/plan" replace />} />
<Route path="/supplements" element={<Navigate to="/plan" replace />} />
// Note: /supplements currently maps to SupplementManager, not SupplementSchedule
// /items currently maps to SupplementSchedule — this also redirects to /plan
```

**App.tsx routing audit (current state):**
- `/plan` → `DailyPlan` — replace with `UnifiedPlan`
- `/track` → `NutritionTracker` — replace with `Navigate to="/plan"`
- `/supplements` → `SupplementManager` — this is the supplement item CRUD manager, NOT the schedule; keep as-is
- `/items` → `SupplementSchedule` — replace with `Navigate to="/plan"`

**This is critical:** The sidebar "營養補充" nav item links to `/supplements` which currently goes to `SupplementManager` (the CRUD list), NOT `SupplementSchedule`. D-18 says "Route `/supplements` redirects to `/plan`" but that would break the supplement item manager. The plan must address this ambiguity. Most likely D-18 intended that `/items` (the schedule route) redirects to `/plan`, and the sidebar "營養補充" nav item should be updated to link to `/plan` instead of `/supplements`.

### SidebarDrawer Nav Update

The "營養補充" nav item in `SidebarDrawer.tsx` currently points to `/supplements` (SupplementManager). Per D-18 intent, it should be updated to `/plan` for the supplement routine section, or kept as `/supplements` for item management. This needs plan-level decision.

### Sub-Component Structure

```typescript
// src/pages/UnifiedPlan.tsx — file structure
function NutritionBudgetBar({ checkedFoodIds, foodMap }: ...) { ... }
function FoodPlanSection({ slots, checkedIds, locked, onCheck, onSwap }: ...) { ... }
function SupplementRoutineSection({ routine, takenStates, onToggle }: ...) { ... }

export default function UnifiedPlan() {
  // State
  const [record, setRecord] = useState<TodayPlanRecord | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [skippedSupplementIds, setSkippedSupplementIds] = useState<Set<string>>(new Set());
  // Supplement data (needed for generateRoutine)
  const [supplements, setSupplements] = useState<SupplementItem[]>([]);
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [consumption, setConsumption] = useState<ConsumptionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Derived
  const locked = checkedIds.size > 0;
  const routine = generateRoutine(supplements, inventory, consumption); // render-time
  const targets = SettingsService.getComputedTargets();

  // ...
}
```

### Recommended Project Structure

No new directories. All new code in:
```
src/
├── pages/
│   └── UnifiedPlan.tsx     # New (replaces DailyPlan.tsx)
├── lib/
│   └── data-service.ts     # Add removeMealEntry() method
```

Deleted:
- `src/pages/DailyPlan.tsx`
- `src/pages/SupplementSchedule.tsx`
- `src/pages/NutritionTracker.tsx`

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debounce | Custom debounce utility | `setTimeout`/`clearTimeout` with `useRef` | Established project pattern; no library needed for single-use case |
| Map serialization | Custom Map serializer | Re-run `generateRoutine()` on load from stored inputs | Matches Phase 9 "computed at render time" pattern; avoids serialization bug |
| State management | Context API or Zustand | `useState` + prop passing | Explicitly out of scope per REQUIREMENTS.md |

**Key insight:** The project convention of "computed values derived at render time" (established in Phase 9 for `generateRoutine()`) is the correct approach for the supplement routine — re-compute from stored data rather than serialize the routine result.

---

## Common Pitfalls

### Pitfall 1: RoutineResult Map Serialization
**What goes wrong:** `JSON.stringify({ slots: routineResult.slots })` produces `{"slots":{}}` because `Map` serializes as empty object.
**Why it happens:** `JSON.stringify` ignores Map entries.
**How to avoid:** Never store `RoutineResult` directly. Store the inputs (supplement IDs + inventory/consumption snapshots) and re-run `generateRoutine()` on load, or convert the Map to an array before storing.
**Warning signs:** Supplement section is empty after page reload despite items being checked.

### Pitfall 2: `/supplements` Route Collision
**What goes wrong:** Changing `/supplements` to redirect `/plan` breaks the SupplementManager (item CRUD list).
**Why it happens:** In `App.tsx`, `/supplements` → `SupplementManager` (not `SupplementSchedule`). The `SupplementSchedule` is at `/items`.
**How to avoid:** Redirect `/items` → `/plan`, not `/supplements`. Update the sidebar "營養補充" nav item destination separately.
**Warning signs:** Users can no longer access the supplement item list.

### Pitfall 3: Sheets Nutrition Delete Granularity
**What goes wrong:** Calling `SheetsAPI.deleteByDate()` on uncheck removes ALL nutrition entries for the day, not just the unchecked item.
**Why it happens:** Current GAS API has no per-item delete for nutrition log; `deleteByDate` is date-keyed.
**How to avoid:** Use re-upsert strategy: on uncheck, read existing entries for date from cache, filter out the item, then re-write the entire date's entries to Sheets via `upsert`. This requires only localStorage changes without GAS version bump.
**Warning signs:** Unchecking one item wipes all logged meals for the day.

### Pitfall 4: Checked State Surviving Plan Regeneration
**What goes wrong:** `checkedIds` still contains IDs from the previous day's plan after regeneration.
**Why it happens:** If `checkedIds` is stored separately from the plan, stale IDs persist.
**How to avoid:** Always store `checkedIds` atomically with the plan in `TodayPlanRecord`. On generate, always initialize `checkedIds` and `skippedSupplementIds` to empty.

### Pitfall 5: SCHEDULE and FOODS are Empty Arrays
**What goes wrong:** Food plan generates 0 slots and 0 items.
**Why it happens:** `SCHEDULE` and `FOODS` in `src/data/schedule.ts` and `src/data/foods.ts` are empty arrays — all data is user-managed via Sheets and loaded into localStorage cache. The current `DailyPlan.tsx` `generatePlan()` relies on `FOOD_MAP` which is populated from `FOODS` (empty). `SupplementSchedule` uses `ItemService.getSupplements()` which correctly reads from Sheets-backed localStorage cache.
**How to avoid:** `UnifiedPlan` must load food data via `ItemService.getFoods()` (not from `FOOD_MAP`) before calling `generatePlan()`. The `generatePlan()` function will need to accept a `FoodItem[]` parameter or use a passed-in map.
**Warning signs:** Food section always shows empty state even with saved foods in Sheets.

### Pitfall 6: TypeScript strict — `noUnusedLocals`
**What goes wrong:** Build fails with `TS2304` or similar errors.
**Why it happens:** `tsc -b` runs before Vite build; strict mode with `noUnusedLocals: true`.
**How to avoid:** Ensure all imported types/values in `UnifiedPlan.tsx` are actually used. Clean up any remaining imports from deleted files in `App.tsx`.

---

## Code Examples

### NutritionBudgetBar Pattern (from NutritionTracker.tsx)

```typescript
// Source: src/pages/NutritionTracker.tsx (existing, to be absorbed)
function NutritionBudgetBar({ checkedFoodIds, foods }: {
  checkedFoodIds: Set<string>;
  foods: FoodItem[];
}) {
  const targets = SettingsService.getComputedTargets();
  const checked = foods.filter(f => checkedFoodIds.has(f.id));
  const totalCal = checked.reduce((s, f) => s + f.cal, 0);
  const totalProtein = checked.reduce((s, f) => s + f.protein, 0);

  if (!targets) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-3 mb-4 text-xs text-slate-500 text-center">
        {totalCal} kcal 已勾選（未設定目標）
      </div>
    );
  }

  const calPct = Math.min(100, (totalCal / targets.tdee) * 100);
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
      <div className="flex justify-between text-sm mb-2">
        <span>已用 {totalCal} kcal</span>
        <span className={calPct > 90 ? "text-red-400" : calPct > 70 ? "text-amber-400" : "text-emerald-400"}>
          剩餘 {Math.max(0, targets.tdee - totalCal)} kcal
        </span>
      </div>
      <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${calPct > 90 ? "bg-gradient-to-r from-amber-500 to-red-500" : "bg-gradient-to-r from-blue-500 to-violet-500"}`}
          style={{ width: `${calPct}%` }}
        />
      </div>
      <div className="text-xs text-slate-500 mt-2">
        蛋白質 {totalProtein}g / {targets.macros.protein}g
      </div>
    </div>
  );
}
```

### ItemCard with Checkbox Addition

```typescript
// Extend existing ItemCard from DailyPlan.tsx with checkbox support
function ItemCard({ item, onSwap, checked, onCheck }: {
  item: ResolvedItem;
  onSwap?: () => void;   // undefined when checked (lock guard)
  checked: boolean;
  onCheck: () => void;
}) {
  // ... existing border/ts logic ...
  return (
    <div className={`rounded-lg p-3 mb-1.5 border-l-3 bg-slate-800/50 ${border} ${checked ? "opacity-60" : ""}`}>
      <div className="flex justify-between items-start">
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onCheck(); }}
          className="mt-0.5 mr-2 shrink-0 w-5 h-5 rounded border border-slate-600 flex items-center justify-center"
        >
          {checked && <span className="text-emerald-400 text-sm">✓</span>}
        </button>
        {/* ... existing content ... */}
        {/* Swap button — only when not checked */}
        {onSwap && !checked && (
          <button onClick={(e) => { e.stopPropagation(); onSwap(); }}>🔄</button>
        )}
      </div>
    </div>
  );
}
```

### Debounce with useRef

```typescript
// Debounce pattern — no external library
const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

function scheduleSheetSync(date: string, entries: NutritionEntry[]) {
  if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
  syncTimerRef.current = setTimeout(() => {
    // re-upsert all entries for the day
    entries.forEach(e => DataService.logMeal(e).catch(() => {}));
  }, 300);
}
```

### Restore from localStorage on Mount

```typescript
useEffect(() => {
  const stored = loadTodayPlan();
  const today = todayStr();
  if (stored && stored.date === today) {
    // Restore plan state
    setFoodSlots(stored.foodSlots);
    setCheckedIds(new Set(stored.checkedIds));
    setSkippedSupplementIds(new Set(stored.skippedSupplementIds));
  }
  // Always load supplement data (for routine)
  Promise.all([
    ItemService.getSupplements(),
    ItemService.getInventory(),
    ItemService.getConsumption(),
  ]).then(([supps, inv, cons]) => {
    setSupplements(supps);
    setInventory(inv);
    setConsumption(cons);
    setLoading(false);
  });
}, []);
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `DailyPlan.tsx` saves plan to Sheets on manual "儲存" button | `UnifiedPlan` saves `TodayPlanRecord` atomically to localStorage on every mutation (check, generate, swap) | Plan survives reload without manual save |
| Food plan and supplement routine are separate pages | Single unified page with sub-components | One page visit shows complete daily picture |
| NutritionTracker shows empty state (never had logging implemented) | `NutritionBudgetBar` derives totals from checked food items in real-time | Functional nutrition tracking via checkbox |

**Deprecated:**
- `DailyPlan.tsx`: replaced by `UnifiedPlan.tsx`
- `SupplementSchedule.tsx`: content absorbed into `SupplementRoutineSection` sub-component
- `NutritionTracker.tsx`: macro bar logic absorbed into `NutritionBudgetBar` sub-component

---

## Open Questions

1. **RoutineResult storage strategy**
   - What we know: `RoutineResult.slots` is a `Map` — not JSON-serializable
   - What's unclear: D-01 says store `supplementRoutine: RoutineResult` in `TodayPlanRecord`, but that's a Map
   - Recommendation: Store raw inputs (or just re-run `generateRoutine()` on mount from live supplement/inventory/consumption data) rather than storing the result. This matches Phase 9's established pattern.

2. **`/supplements` route disambiguation**
   - What we know: `/supplements` → `SupplementManager` (item CRUD list); `/items` → `SupplementSchedule` (routine)
   - What's unclear: D-18 says "Route `/supplements` redirects to `/plan`" — this would break supplement item management
   - Recommendation: Redirect `/items` → `/plan` (not `/supplements`). Update sidebar "營養補充" item to point to `/plan` and rename to match its new role (today's routine). Keep `/supplements` → `SupplementManager` intact.

3. **Food data availability for `generatePlan()`**
   - What we know: `FOOD_MAP` is empty; foods live in `ItemService.getFoods()` cache
   - What's unclear: Current `generatePlan()` in DailyPlan.tsx calls `resolveItem()` which reads from `FOOD_MAP` (always empty); this means food plan currently generates nothing
   - Recommendation: `UnifiedPlan` should call `ItemService.getFoods()` on mount, build a local map, and pass it into a refactored `generatePlan(foods: FoodItem[])`. This is a required fix for functional food plan generation.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code/config changes within an existing React SPA. No new external dependencies, CLIs, databases, or services beyond what is already installed.

---

## Sources

### Primary (HIGH confidence)
- Direct code reading: `src/pages/DailyPlan.tsx` — existing food plan patterns
- Direct code reading: `src/pages/SupplementSchedule.tsx` — existing supplement routine patterns
- Direct code reading: `src/pages/NutritionTracker.tsx` — existing macro bar patterns
- Direct code reading: `src/lib/data-service.ts` — localStorage + Sheets patterns
- Direct code reading: `src/lib/item-service.ts` — supplement data access, getDailyLog/saveDailyLog
- Direct code reading: `src/lib/sheets-api.ts` — Sheets API capabilities and limitations
- Direct code reading: `src/data/types.ts` — all relevant type definitions
- Direct code reading: `src/data/resolver.ts` — ResolvedItem, resolveItem
- Direct code reading: `src/data/schedule.ts`, `foods.ts`, `supplements.ts` — confirmed empty arrays
- Direct code reading: `src/App.tsx` — current route definitions
- Direct code reading: `src/components/SidebarDrawer.tsx` — current nav items
- Direct code reading: `src/lib/settings-service.ts` — getComputedTargets() return shape

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; existing stack fully understood from source
- Architecture: HIGH — all patterns verified from existing code; key pitfalls identified from direct code inspection
- Pitfalls: HIGH — all critical pitfalls found from direct code reading (Map serialization, route collision, Sheets delete granularity, empty data arrays)

**Research date:** 2026-04-06
**Valid until:** Stable — TypeScript/React/localStorage patterns don't change; valid until codebase changes
