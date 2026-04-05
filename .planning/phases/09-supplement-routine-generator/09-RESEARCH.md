# Phase 9: Supplement Routine Generator - Research

**Researched:** 2026-04-05
**Domain:** React SPA — daily supplement routine checklist, deterministic scheduling, conflict resolution, event-sourced inventory deduction
**Confidence:** HIGH (all findings grounded in direct codebase inspection of canonical source files)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Redesign `SupplementSchedule.tsx` — replace the current catalog-browse view with a daily routine checklist grouped by timing slot.
- **D-02:** Five timing slot sections displayed vertically: 空腹 → 餐前 → 餐中 → 餐後 → 睡前 (matching `SupplementTiming` values). Each section is a card with the timing label as header.
- **D-03:** Each supplement within a slot shows: name, dosage (e.g., "2顆 500mg"), health tag badges, and taken/skipped status indicator.
- **D-04:** Deterministic routine — the same date always produces the same routine. No randomness. All active + in-stock supplements appear every day in their assigned timing slot(s).
- **D-05:** Empty timing slots (no supplements assigned to that time) are hidden, not shown as empty cards.
- **D-06:** When two supplements have a declared interaction (via `interactions[]` field) AND share the same timing slot, one is moved to the next available slot. The moved supplement shows a warning badge: "⚠ 避開 [name]".
- **D-07:** Conflict resolution is deterministic — supplements are sorted by ID, and the second one (alphabetically by ID) is the one that gets moved. This ensures the same routine every day.
- **D-08:** If no alternative slot can accommodate a conflicting supplement (all slots have conflicts), it is listed in a separate "未排入" (Unscheduled) section at the bottom with an explanation of which conflicts prevented scheduling. This satisfies RTN-06.
- **D-09:** Synergies are informational only — synergistic supplements in the same slot show a green "✓ 與 [name] 協同" note but synergies don't affect slot assignment.
- **D-10:** Each supplement row is a tap-to-toggle checklist item. Three states: untouched (default), taken (green check ✓), skipped (gray strikethrough).
- **D-11:** Tap once → taken. Long-press (or second tap on taken) → skipped. Tap on skipped → back to untouched.
- **D-12:** Marking "taken" immediately deducts `unitsPerDose` from inventory via a new `ConsumptionEvent` record. Uses event-sourced pattern: `ItemService.logConsumption({ supplementId, date, units })`.
- **D-13:** Marking "skipped" does NOT deduct from inventory. Skipped items are recorded in the daily log for tracking purposes only.
- **D-14:** Taken/skipped state persists for the current day via `SupplementLogEntry` in localStorage (key: today's date). Refreshing the page restores the state.
- **D-15:** Today's date displayed at top of page. No date navigation — routine always shows today.
- **D-16:** Reuses the existing `/schedule` route and 🗓️ 時程 tab. No new tab added.
- **D-17:** Supplements with zero remaining inventory are excluded from the routine.
- **D-18:** Remaining inventory calculated as: `sum(purchasedUnits) - sum(consumedUnits)` where consumedUnits come from ConsumptionEvent records.
- **D-19:** A new `ItemService.logConsumption()` method appends a ConsumptionEvent to localStorage and syncs to Sheets.
- **D-20:** A new `ItemService.getConsumption(supplementId?)` method reads ConsumptionEvent records from localStorage.
- **D-21:** At top of page, show a daily progress summary: "今日進度: X/Y 已服用".
- **D-22:** Timing slot headers also show per-slot progress: "空腹 (2/3)".

### Claude's Discretion

- Internal component decomposition within SupplementSchedule.tsx
- Exact Tailwind styling for taken/skipped states
- Whether to show a "全部完成" (all done) celebration state
- Exact long-press detection implementation (timeout-based or pointer events)
- Whether to add a ConsumptionEvent sheet name constant or reuse existing patterns

### Deferred Ideas (OUT OF SCOPE)

- Historical routine views (past days) — future feature
- Supplement effectiveness tracking over time → v3.0 (SUPP-07)
- Auto-reorder reminders when critically low → v3.0 (SUPP-08)
- Notification/reminder at scheduled times — requires PWA service worker, out of scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RTN-01 | App generates a deterministic daily supplement routine grouped by timing slots (not random) | `generateRoutine()` function sorts supplements by ID and assigns to timing slots based on `supplement.timing[]`; same input always produces same output |
| RTN-02 | Routine ensures all active, in-stock supplements appear in the daily plan | Filter pipeline: `isActive === true` AND `remainingUnits > 0` before slot assignment |
| RTN-03 | Routine respects supplement interaction warnings (conflicting supplements separated by timing) | Conflict resolution algorithm detailed in Architecture Patterns section |
| RTN-04 | User can mark supplements as taken or skipped in the daily routine | Three-state toggle with `SupplementLogEntry` persisted to localStorage |
| RTN-05 | Marking a supplement as taken deducts from inventory | `ItemService.logConsumption()` appends `ConsumptionEvent`; `calcRemainingUnits()` in SupplementManager updated to subtract consumed |
| RTN-06 | Routine displays unsatisfied supplements explicitly when timing conflicts prevent scheduling all items | "未排入" section at page bottom; lists supplement name + which interactions blocked it |
</phase_requirements>

---

## Summary

Phase 9 is a complete rewrite of `SupplementSchedule.tsx` (the `/schedule` route) from a static catalog-browse view into an interactive daily checklist. All data types are already defined in `src/data/types.ts` — `SupplementTiming`, `SupplementLogEntry`, `ConsumptionEvent`, `InventoryEntry` are ready to use. The core new work is: (1) the routine generation algorithm, (2) two new `ItemService` methods, (3) the checklist UI with three-state toggles, and (4) updating `SupplementManager.tsx`'s inventory calculation to subtract consumption events.

The existing codebase provides strong reusable patterns: `TagBadge` from DailyPlan, bidirectional interaction resolution from SupplementManager (`resolveInteractions()`), card-based slot UI from DailyPlan's `GeneratedSlot` rendering, and the append-only event-sourcing pattern already used for `InventoryEntry`. This phase integrates all prior phases without touching `App.tsx`, routes, or the GAS backend schema (a new "consumption" sheet is all that's needed).

**Primary recommendation:** Decompose into two plans — (1) service layer: add `logConsumption`/`getConsumption` to `ItemService`, update `calcRemainingUnits` in SupplementManager; (2) page rewrite: routine generation algorithm + checklist UI + state persistence.

---

## Standard Stack

### Core (already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.1.0 | UI rendering, useState/useEffect/useCallback | Already in project |
| TypeScript | ~5.8.3 | Type safety, strict mode | Already in project |
| Tailwind CSS | ^4.1.7 | Utility-first styling, dark theme tokens | Already in project |

### No New Dependencies

This phase requires zero new npm packages. All needed types, patterns, and utilities are already present.

**Verification:** No install step needed.

---

## Architecture Patterns

### Recommended File Structure Changes

```
src/
├── lib/
│   └── item-service.ts          # Add logConsumption(), getConsumption() methods
├── pages/
│   ├── SupplementSchedule.tsx   # Complete rewrite (routine checklist)
│   └── SupplementManager.tsx    # Update calcRemainingUnits() to subtract consumption
```

No new files needed beyond the above.

### Pattern 1: Routine Generation Algorithm

**What:** Pure function `generateRoutine(supplements, inventory, consumption, date)` → `{ slots: RoutineSlot[], unscheduled: UnscheduledItem[] }`

**When to use:** Called on component mount, rebuilds same result for same inputs.

**Algorithm:**

```
Step 1: Filter
  eligible = supplements
    .filter(s => s.isActive)
    .filter(s => remainingUnits(s.id, inventory, consumption) > 0)

Step 2: Sort for determinism (alphabetical by ID)
  eligible.sort((a, b) => a.id.localeCompare(b.id))

Step 3: Build slot assignment map
  slotMap: Map<SupplementTiming, SupplementItem[]> = new Map()
  TIMING_ORDER = ["empty_stomach", "before_meal", "with_meal", "after_meal", "bedtime"]

Step 4: Assign each supplement to its first preferred timing slot
  for each supp in eligible:
    for each preferred timing in supp.timing:
      if no conflict in slotMap[timing]:
        assign supp to slotMap[timing]
        break
      else (conflict exists):
        try next timing slot from supp.timing
    if no slot worked:
      try ALL TIMING_ORDER slots (not just supp.timing)
        if no conflict:
          assign here (moved, show warning badge)
          break
    if still no slot:
      add to unscheduled with conflict explanation

Step 5: Conflict check definition
  two supps A and B conflict if:
    A.interactions.includes(B.id) || B.interactions.includes(A.id)
    (bidirectional, same as resolveInteractions() in SupplementManager)
```

**Key insight:** The algorithm is O(n²) in the worst case but supplement counts are small (typically < 20) so this is irrelevant.

### Pattern 2: Conflict Detection (Bidirectional)

The project already has `resolveInteractions()` in `SupplementManager.tsx`. The routine generator needs the same logic. Extract as a shared helper or duplicate inline:

```typescript
// Check if supplement A conflicts with B (bidirectional)
function hasConflict(a: SupplementItem, b: SupplementItem): boolean {
  return a.interactions.includes(b.id) || b.interactions.includes(a.id);
}

// Check if a supplement can be placed in a slot without conflict
function slotHasConflict(
  candidate: SupplementItem,
  slotOccupants: SupplementItem[]
): boolean {
  return slotOccupants.some((occ) => hasConflict(candidate, occ));
}
```

**Source:** Verified against `resolveInteractions()` in `src/pages/SupplementManager.tsx` lines 70-80.

### Pattern 3: Three-State Toggle with Long-Press

**What:** Each supplement row has three states: `"untouched" | "taken" | "skipped"`.

**State transitions (D-11):**
- `untouched` → tap → `taken`
- `taken` → tap (or long-press) → `skipped`
- `skipped` → tap → `untouched`

**Long-press implementation (Claude's discretion — recommend timeout-based):**

```typescript
// Timeout-based long-press — works on both mobile and desktop
function useLongPress(onLongPress: () => void, delay = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = () => {
    timerRef.current = setTimeout(onLongPress, delay);
  };
  const cancel = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
  };
}
```

**Why timeout-based over pointer events API:** Simpler, no browser compat issues, consistent with the project's "minimal complexity" philosophy.

### Pattern 4: SupplementLogEntry Persistence

**What:** Daily taken/skipped state persisted to localStorage under today's date key.

```typescript
// Cache key pattern (matches existing CACHE_PREFIX = "wellness_")
const LOG_CACHE_KEY = `supplement_log_${todayStr()}`; // e.g., "wellness_supplement_log_2026-04-05"

// Load on mount
const saved = cacheGet<SupplementLogEntry>(LOG_CACHE_KEY);
const takenIds = new Set(saved?.takenIds ?? []);
const skippedIds = new Set(saved?.skippedIds ?? []);

// Save after each toggle
function saveDailyLog(taken: Set<string>, skipped: Set<string>) {
  cacheSet(LOG_CACHE_KEY, {
    date: todayStr(),
    takenIds: [...taken],
    skippedIds: [...skipped],
  });
}
```

**Note:** `cacheGet`/`cacheSet` are private to `item-service.ts`. The page component should use its own identical helpers, OR the log persistence can be encapsulated as new `ItemService.getDailyLog(date)` / `ItemService.saveDailyLog(entry)` methods — recommend the latter for consistency.

### Pattern 5: ConsumptionEvent Service Methods (new in ItemService)

**What:** Two new methods on the `ItemService` singleton.

```typescript
// New SHEETS constant to add:
const SHEETS = {
  // ...existing...
  CONSUMPTION: "consumption",  // new Google Sheet tab
} as const;

// New CACHE_KEYS constant:
const CACHE_KEYS = {
  // ...existing...
  CONSUMPTION: "consumption_events",  // new localStorage key
} as const;

// New row converter:
function rowToConsumption(row: SheetRow): ConsumptionEvent {
  return {
    supplementId: String(row.supplementId),
    date: String(row.date),
    units: Number(row.units) || 0,
  };
}

// New ItemService methods:
async logConsumption(event: ConsumptionEvent): Promise<void> {
  const existing = cacheGet<ConsumptionEvent[]>(CACHE_KEYS.CONSUMPTION) ?? [];
  existing.push(event);
  cacheSet(CACHE_KEYS.CONSUMPTION, existing);
  SheetsAPI.append(SHEETS.CONSUMPTION, event as unknown as SheetRow).catch(() => {});
},

async getConsumption(supplementId?: string): Promise<ConsumptionEvent[]> {
  const cached = cacheGet<ConsumptionEvent[]>(CACHE_KEYS.CONSUMPTION) ?? [];

  SheetsAPI.readAll(SHEETS.CONSUMPTION)
    .then((rows) => {
      if (rows.length > 0) {
        cacheSet(CACHE_KEYS.CONSUMPTION, rows.map(rowToConsumption));
      }
    })
    .catch(() => {});

  if (supplementId) return cached.filter((e) => e.supplementId === supplementId);
  return cached;
},
```

### Pattern 6: Updated Inventory Calculation (SupplementManager)

**What:** `calcRemainingUnits()` in SupplementManager currently only sums purchases. Must now subtract consumption events.

```typescript
// CURRENT (Phase 8):
function calcRemainingUnits(suppId: string, inv: InventoryEntry[]): number {
  return inv.filter((e) => e.supplementId === suppId)
            .reduce((sum, e) => sum + e.purchasedUnits, 0);
}

// UPDATED (Phase 9):
function calcRemainingUnits(
  suppId: string,
  inv: InventoryEntry[],
  consumption: ConsumptionEvent[]
): number {
  const purchased = inv.filter((e) => e.supplementId === suppId)
                       .reduce((sum, e) => sum + e.purchasedUnits, 0);
  const consumed = consumption.filter((e) => e.supplementId === suppId)
                              .reduce((sum, e) => sum + e.units, 0);
  return Math.max(0, purchased - consumed);
}
```

**Impact:** All 3 call sites in SupplementManager.tsx (lines ~816, ~934-935, and the Days helper) must pass `consumption` as a new parameter. The `useEffect` on mount must also call `ItemService.getConsumption()` and store in state.

### Pattern 7: Synergy Display (Informational Only)

Synergistic supplements in the same slot show a green note. Use the same bidirectional resolution logic:

```typescript
function hassynergy(a: SupplementItem, b: SupplementItem): boolean {
  return a.synergies.includes(b.id) || b.synergies.includes(a.id);
}
```

Display as: `✓ 與 [name] 協同` in green (`text-emerald-400`) beneath the supplement name in the slot row.

### Recommended Component Decomposition (Claude's Discretion)

```typescript
// In SupplementSchedule.tsx (single file, consistent with codebase pattern):

// Sub-components (defined in same file, not exported):
RoutineRow       — one supplement in a slot: name, dose, tags, taken/skipped toggle
TimingSlotCard   — slot header (label + per-slot progress) + list of RoutineRow
UnscheduledCard  — "未排入" section at bottom
ProgressHeader   — "今日進度: X/Y 已服用" at top

// Pure functions (defined above component):
generateRoutine()  — deterministic slot assignment algorithm
calcRemaining()    — units remaining for one supplement
```

### Anti-Patterns to Avoid

- **Storing routine in state across days:** The routine is always regenerated from source data on mount. Only the taken/skipped log is persisted.
- **Using Math.random() in the routine algorithm:** All ordering must be deterministic (`Array.sort()` by ID string, not shuffle).
- **Global state / Context API:** Follow the existing pattern — each page manages its own state with `useState`/`useEffect`.
- **Modifying the GAS `doPost` handler:** The GAS backend already supports `append` which is all consumption events need. No backend changes required.
- **Extracting `cacheGet`/`cacheSet` to a shared module:** These helpers exist in both `data-service.ts` and `item-service.ts` as private copies — maintain this pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Long-press detection | Custom pointer/touch event state machine | Timeout-based `useLongPress` hook (20 lines) | Simpler, no edge cases with touch cancel |
| Bidirectional interaction check | New data structure or graph | `hasConflict(a, b)` using `a.interactions.includes(b.id) \|\| b.interactions.includes(a.id)` | Already proven in SupplementManager |
| Date formatting | Custom date utilities | `todayStr()` from `src/lib/data-service.ts` (already imported by other pages) | Project-standard utility |
| Tag badge rendering | Inline styles repeated | Copy `TagBadge` pattern from DailyPlan.tsx (or import if extracted) | Already tested, correct color formula |

**Key insight:** The project deliberately keeps all logic inline in page files — don't create new shared utility modules unless the pattern clearly crosses page boundaries.

---

## Common Pitfalls

### Pitfall 1: Marking "taken" twice creates double deduction

**What goes wrong:** User taps "taken", then taps again to go to "skipped". If deduction happens on every state change rather than only on the `untouched → taken` transition, two `ConsumptionEvent` records are written.

**Why it happens:** Toggle handler fires on every tap; naive implementation calls `logConsumption` whenever `isTaken` becomes true.

**How to avoid:** Only call `logConsumption` when transitioning from `"untouched"` to `"taken"`. Track previous state in the transition handler:

```typescript
function handleToggle(suppId: string, currentState: TakenState) {
  if (currentState === "untouched") {
    // transition to taken — deduct inventory
    ItemService.logConsumption({ supplementId: suppId, date: todayStr(), units: supp.unitsPerDose });
  }
  // ... update state machine
}
```

**Warning signs:** Inventory count decreases by more than `unitsPerDose` after a single session.

### Pitfall 2: `calcRemainingUnits` in SupplementManager not updated

**What goes wrong:** After Phase 9 ships, "marking taken" in the routine page deducts from consumption events, but SupplementManager still only reads `InventoryEntry` purchases — so the displayed remaining count is wrong.

**Why it happens:** SupplementManager and SupplementSchedule are separate components with independent data loading. Consumption events don't automatically propagate.

**How to avoid:** SupplementManager's `useEffect` on mount must call `ItemService.getConsumption()` and pass result into `calcRemainingUnits()`. Both pages must be updated in the same plan.

**Warning signs:** SupplementManager shows "50 顆" remaining even after taking 10 doses.

### Pitfall 3: Determinism broken by `Array.sort()` instability

**What goes wrong:** `Array.prototype.sort()` is not guaranteed stable in older environments, but modern V8 (Chrome 70+) uses TimSort which is stable. However, if supplements have identical IDs (impossible by design) or the sort comparator is wrong, routine order changes between renders.

**How to avoid:** Sort by `id` with explicit string comparison: `supplements.sort((a, b) => a.id.localeCompare(b.id))`. Test with at least 2 supplements that have interactions.

**Warning signs:** Opening the page twice shows different slot assignments.

### Pitfall 4: SupplementLogEntry scope — multi-supplement "taken" on same dose slot

**What goes wrong:** A supplement with `timing: ["before_meal", "after_meal"]` (multiple timings) might appear in two slots. Marking "taken" in slot 1 should not show "taken" in slot 2 for the same day (it's one dose, not two).

**Why it happens:** The routine generator assigns the supplement to exactly ONE slot (its first non-conflicting slot per D-04/D-07). A supplement with multiple preferred timings is not duplicated across slots.

**How to avoid:** Confirm the routine generator places each supplement in exactly one slot. The filter step in Step 4 of the algorithm uses `break` after the first successful assignment.

### Pitfall 5: Zero-inventory filter must use consumption-adjusted remaining

**What goes wrong:** Phase 8 `calcRemainingUnits` doesn't subtract consumption events — so a supplement with 0 actual units remaining might still appear in the routine because `purchasedUnits` is non-zero.

**Why it happens:** `ItemService.getConsumption()` does not exist until Phase 9.

**How to avoid:** The routine generator must call `getConsumption()` on mount and use the updated remaining-units calculation (Phase 9's version, not Phase 8's).

### Pitfall 6: TypeScript `noUnusedParameters` failures

**What goes wrong:** Adding `consumption: ConsumptionEvent[]` to `calcRemainingUnits()` signature but any call site that doesn't yet pass the parameter will cause a TS compile error (`noUnusedLocals`, `noUnusedParameters` are strict).

**How to avoid:** Update ALL call sites of `calcRemainingUnits` in the same commit as the signature change. There are 3 call sites in SupplementManager.tsx (lines ~816, ~934, ~935 area).

---

## Code Examples

Verified patterns from codebase inspection:

### Existing TagBadge Pattern (from DailyPlan.tsx)

```typescript
// Source: src/pages/DailyPlan.tsx lines 33-39
function TagBadge({ tag }: { tag: HealthTag }) {
  return (
    <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mr-0.5 mb-0.5"
      style={{
        backgroundColor: HEALTH_TAG_COLORS[tag] + "20",
        color: HEALTH_TAG_COLORS[tag],
        border: `1px solid ${HEALTH_TAG_COLORS[tag]}40`
      }}>
      {HEALTH_TAG_LABELS[tag]}
    </span>
  );
}
```

### Bidirectional Interaction Resolution (from SupplementManager.tsx)

```typescript
// Source: src/pages/SupplementManager.tsx lines 70-80
function resolveInteractions(s: SupplementItem, allSupps: SupplementItem[]): SupplementItem[] {
  const direct = s.interactions
    .map((id) => allSupps.find((x) => x.id === id))
    .filter((x): x is SupplementItem => x !== undefined);
  const indirect = allSupps.filter(
    (other) => other.id !== s.id && other.interactions.includes(s.id)
  );
  const seen = new Set(direct.map((x) => x.id));
  return [...direct, ...indirect.filter((x) => !seen.has(x.id))];
}
```

### Append-Only Event Sourcing Pattern (from ItemService.upsertInventory)

```typescript
// Source: src/lib/item-service.ts lines 191-198
async upsertInventory(entry: InventoryEntry): Promise<void> {
  // Append-only: each purchase is a new record (event-sourced)
  const existing = cacheGet<InventoryEntry[]>(CACHE_KEYS.INVENTORY) ?? [];
  existing.push(entry);
  cacheSet(CACHE_KEYS.INVENTORY, existing);
  SheetsAPI.append(SHEETS.INVENTORY, entry as unknown as SheetRow).catch(() => {});
},
```

### TIMING_ORDER for Slot Assignment

```typescript
// Source: src/data/types.ts lines 98-112
const TIMING_ORDER: SupplementTiming[] = [
  "empty_stomach",
  "before_meal",
  "with_meal",
  "after_meal",
  "bedtime",
];
```

### SupplementItem Interface (key fields for this phase)

```typescript
// Source: src/data/types.ts lines 152-179 (relevant fields only)
interface SupplementItem {
  id: string;
  timing: SupplementTiming[];   // preferred slot(s)
  interactions: string[];        // supplement IDs that conflict
  synergies: string[];           // supplement IDs that synergize
  unitsPerDose: number;          // units to deduct per "taken" event
  dosesPerDay: number;
  isActive: boolean;             // must be true to appear in routine
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| SupplementSchedule: static catalog browse | Daily checklist grouped by timing slot | Complete rewrite of the component |
| Inventory = only purchase events | Inventory = purchases minus consumption events | SupplementManager calculation must be updated |
| No consumption tracking | ConsumptionEvent append-only log (event sourced) | New SHEETS constant + CACHE_KEY needed |

---

## Open Questions

1. **Should `SupplementLogEntry` sync to Sheets?**
   - What we know: D-14 says persist to localStorage. D-12 says `logConsumption` syncs to Sheets.
   - What's unclear: The daily log (taken/skipped) is separate from the consumption event. Is the `SupplementLogEntry` (the "skipped" record) also synced to Sheets?
   - Recommendation: Follow D-13 literally — skipped is "recorded in the daily log for tracking purposes only." Use localStorage-only for `SupplementLogEntry`. Only `ConsumptionEvent` (taken events) goes to Sheets. This keeps the pattern simple and consistent.

2. **What is the sheet name for consumption?**
   - What we know: CONTEXT.md D-19 says "syncs to Sheets (same append-only pattern as `upsertInventory`)." The SHEETS constant needs a new key.
   - Recommendation: Use `"consumption"` as the sheet name. Add `SHEETS.CONSUMPTION = "consumption"` and `CACHE_KEYS.CONSUMPTION = "consumption_events"` to `item-service.ts`.

3. **What if a supplement has an empty `timing` array?**
   - What we know: `SupplementItem.timing` is typed as `SupplementTiming[]` — can be empty.
   - What's unclear: Should supplements with no preferred timing appear in the routine? D-02/D-04 say all active/in-stock supplements appear.
   - Recommendation: If `timing` is empty, default to `"with_meal"` (safe, no food interactions, mid-day visibility). Add this fallback in the routine generator.

---

## Environment Availability

Step 2.6: SKIPPED — phase is purely code changes to existing React SPA. No external tools, CLIs, databases, or runtimes beyond the project's existing stack.

---

## Validation Architecture

Skipped — `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`.

---

## Project Constraints (from CLAUDE.md)

All of the following apply to every task in this phase:

| Constraint | Directive |
|------------|-----------|
| Tech stack | Static SPA only — React + Vite + GitHub Pages. No SSR, no server |
| Language | All user-facing text in Traditional Chinese (zh-TW) |
| Styling | Tailwind CSS v4 with existing dark theme tokens. No `tailwind.config.js` |
| State | No global state library (no Redux, Zustand, Context API) — `useState`/`useEffect` only |
| Components | Functional components only; sub-components defined in same file as parent page |
| Routing | HashRouter, reuse existing `/schedule` route — no new routes or tabs |
| Exports | Default export for page component only; named exports for utilities |
| Constants | UPPER_SNAKE_CASE for constants, `_MAP` suffix for lookup maps |
| Event handlers | `handle` prefix for handlers, `on` prefix for callback props |
| TypeScript | Strict mode — `noUnusedLocals`, `noUnusedParameters` enforced; fix ALL call sites when changing function signatures |
| Error handling | Silent catch for background sync: `.catch(() => {})` |
| localStorage | `try/catch` with fallback for all read/write ops |
| Imports | Relative paths (not `@/*` alias), `import type` for type-only imports |
| Build | `npm run build` must pass (`tsc -b && vite build`) before any task is complete |

---

## Sources

### Primary (HIGH confidence)
- `src/data/types.ts` — verified: SupplementItem, SupplementTiming, SUPPLEMENT_TIMING_LABELS, ConsumptionEvent, SupplementLogEntry, InventoryEntry interfaces
- `src/lib/item-service.ts` — verified: ItemService singleton structure, SHEETS/CACHE_KEYS constants, append-only pattern, rowToInventory, getInventory, upsertInventory
- `src/pages/SupplementManager.tsx` — verified: resolveInteractions(), calcRemainingUnits(), calcDaysRemaining(), bidirectional resolution pattern
- `src/pages/SupplementSchedule.tsx` — verified: current catalog-browse view to be replaced
- `src/pages/DailyPlan.tsx` — verified: TagBadge pattern, card UI pattern
- `src/lib/sheets-api.ts` — verified: SheetsAPI.append() signature

### Secondary (MEDIUM confidence)
- `.planning/phases/09-supplement-routine-generator/09-CONTEXT.md` — user decisions D-01 through D-22, all implementation locked
- `.planning/REQUIREMENTS.md` — RTN-01 through RTN-06 requirement text

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all verified in project files
- Architecture: HIGH — algorithm derived directly from locked decisions and existing code patterns
- Pitfalls: HIGH — identified by tracing concrete code paths in SupplementManager and ItemService
- Open questions: MEDIUM — recommendations are well-reasoned but await planner confirmation

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable — no external dependencies)
