# Phase 8: Supplement Manager + Inventory - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Full supplement catalog CRUD page with rich metadata (timing, dosage, interactions, synergies, TCM info) and inventory tracking. Users can add/edit/delete supplements, record purchases, and see remaining supply with low-inventory warnings. New page accessible from bottom navigation. Uses ItemService from Phase 6. Mirrors FoodManager (Phase 7) patterns but with supplement-specific fields and inventory system.

</domain>

<decisions>
## Implementation Decisions

### Navigation & Routing
- **D-01:** Add "補品" (Supplements) tab to bottom nav in `App.tsx` with 💊 icon at position 4 (after 食材, before 時程). Path: `/supplements`. This makes 7 tabs total.
- **D-02:** Supplement Manager is a single page component `src/pages/SupplementManager.tsx` — default export. Mirrors FoodManager's single-page pattern with view state machine.
- **D-03:** Page states: `"list"` (default), `"add"`, `"edit"`. No separate "compose" state (supplements don't have ingredient composition). Controlled by `useState<"list" | "add" | "edit">`.

### Supplement List View
- **D-04:** Scrollable list of supplement cards. Each card shows: name, brand, dosage per unit, timing badges (using `SUPPLEMENT_TIMING_LABELS`), health tags, and an inventory status bar.
- **D-05:** Inventory status bar on each card: green (>14 days supply), amber (7-14 days), red (<7 days), gray (no inventory recorded). Shows "剩餘 X 顆 · 約 Y 天" text.
- **D-06:** Days remaining calculation: `remaining_units / (unitsPerDose * dosesPerDay)`. Remaining units = `sum(purchased) - sum(consumed)` from InventoryEntry and ConsumptionEvent records.
- **D-07:** Search/filter bar at top — text input filters supplements by name (client-side). Additional filter by timing slot (dropdown with SupplementTiming values).
- **D-08:** "新增補品" (Add Supplement) button — either FAB or header button. Switches to add view.
- **D-09:** Tap a supplement card → switch to edit view pre-filled with that supplement's data + show inventory section.

### Supplement Form (Add/Edit)
- **D-10:** Form fields matching `SupplementItem` interface:
  - name (required), brand (optional)
  - dosagePerUnit (required, text — e.g., "500mg")
  - unitsPerDose (required, number, default 1)
  - dosesPerDay (required, number, default 1)
  - timing (required, multi-select chips from SupplementTiming values)
  - tags (optional, multi-select chips from HealthTag values — reuse pattern from FoodManager)
  - isActive (toggle switch, default true)
  - mechanism (optional textarea)
  - caution (optional textarea)
- **D-11:** Save generates ID as `supp_{Date.now()}` (per Phase 6 D-05), calls `ItemService.saveSupplement()`, returns to list view. Edit reuses same form with existing ID.

### Interactions & Synergies
- **D-12:** Interactions field: searchable multi-select showing existing supplement names. Selected supplements stored as ID array in `interactions: string[]`. Displayed as red-tinted chips: "⚠ 與 [name] 衝突".
- **D-13:** Synergies field: same UI pattern as interactions but green-tinted chips: "✓ 與 [name] 協同".
- **D-14:** Both interactions and synergies are bidirectional in display only — if A lists B as interaction, B's card should also show the conflict. Implementation: when rendering a supplement's conflicts, check both its own `interactions` array AND other supplements that reference it. No data duplication — computed at render time.

### Inventory Section (in Edit View)
- **D-15:** Inventory section appears below the form fields in edit view only (not in add view — can't have inventory before the supplement exists).
- **D-16:** "記錄購入" (Record Purchase) form: quantity (number input), purchase date (date input, defaults to today). Calls `ItemService.upsertInventory({ supplementId, purchasedUnits, purchaseDate })`.
- **D-17:** Purchase history list below the form: shows all InventoryEntry records for this supplement, sorted by date descending. Each entry shows: date, quantity. Simple display, no edit/delete of purchase records.
- **D-18:** Remaining units and days displayed at top of inventory section with the same color coding as D-05.

### Consumption Tracking
- **D-19:** ConsumptionEvent tracking is NOT implemented in Phase 8. The `remaining` calculation uses only purchased units for now. Phase 9 (Routine Generator) will add consumption events when users mark supplements as "taken". For now, `remaining = sum(purchased)` — no deductions.
- **D-20:** The days-remaining calculation still works: `sum(purchasedUnits) / (unitsPerDose * dosesPerDay)`. It shows how many days the total purchased supply would last at the recommended daily rate. This is an estimate, not actual tracking.

### Delete Behavior
- **D-21:** Delete shows `window.confirm()` confirmation. Calls `ItemService.deleteSupplement(id)`. Supplement disappears from list immediately.
- **D-22:** No reference guard needed (unlike FoodManager D-23). Supplements reference each other via interactions/synergies, but deleting a supplement doesn't break anything — the remaining supplements just lose the reference (no cascading error). The interaction/synergy display gracefully handles missing IDs by filtering them out.

### Low Inventory Warnings
- **D-23:** Card-level: inventory bar color matches D-05 thresholds (green >14d, amber 7-14d, red <7d).
- **D-24:** List header: show count of supplements with low inventory — "⚠ X 項補品即將耗盡" in amber text if any exist.

### Claude's Discretion
- Internal component decomposition within SupplementManager.tsx
- Exact Tailwind classes for form inputs (follow FoodManager patterns)
- Whether to show TCM info fields in the form (tcm is optional and complex — may defer to edit-only or skip entirely)
- Empty state design when no supplements exist
- Whether the SupplementSchedule.tsx page should be updated or left as-is (Phase 9 will redesign it)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Types & Services
- `src/data/types.ts` — SupplementItem, SupplementTiming, InventoryEntry, ConsumptionEvent, HealthTag interfaces + label/color maps
- `src/lib/item-service.ts` — ItemService.getSupplements/saveSupplement/deleteSupplement/getInventory/upsertInventory methods
- `src/data/supplements.ts` — SUPPLEMENTS array (hardcoded catalog, currently empty), SUPPLEMENT_MAP

### Existing UI Patterns (from Phase 7)
- `src/pages/FoodManager.tsx` — View state machine, FoodCard, NutritionLabelForm, ComposeForm patterns to mirror
- `src/App.tsx` — Router, tabs array (currently 6 tabs), page layout

### Existing Supplement Page
- `src/pages/SupplementSchedule.tsx` — Current supplement display page (read-only, uses hardcoded SUPPLEMENTS). Phase 9 will redesign this.

### Styling
- `src/styles/index.css` — Custom theme tokens
- `src/pages/DailyPlan.tsx` — TagBadge component, TYPE_STYLES

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TagBadge` pattern from DailyPlan.tsx — renders HealthTag badges
- `HEALTH_TAG_LABELS` / `HEALTH_TAG_COLORS` / `SUPPLEMENT_TIMING_LABELS` in types.ts
- FoodManager's NutritionLabelForm pattern — form with validation, tag multi-select
- FoodManager's view state machine pattern — "list" | "add" | "edit" with back navigation

### Established Patterns
- Single-page with inline sub-components
- Cards: `bg-slate-800/50 rounded-lg border-l-3` with type-colored left border
- Forms: dark inputs, validation, chip-style multi-selects
- Offline-first: `ItemService.getX()` on mount via useEffect

### Integration Points
- `App.tsx` tabs array — add /supplements entry
- `App.tsx` Routes — add Route for SupplementManager
- ItemService — already has all supplement + inventory methods
- Phase 9 will consume supplements + inventory data from this page's ItemService calls

</code_context>

<specifics>
## Specific Ideas

- 7 tabs in bottom nav is getting crowded. The icons + short zh-TW labels should still fit but may feel tight on small screens. Consider whether Phase 9 should repurpose the existing "時程" tab instead of adding another.
- Interactions and synergies are supplement-to-supplement references by ID. The UI should resolve IDs to names for display. Handle gracefully if a referenced supplement was deleted (skip/hide the reference).
- ConsumptionEvent deductions deferred to Phase 9 — inventory shows total purchased as "remaining" for now.

</specifics>

<deferred>
## Deferred Ideas

- ConsumptionEvent tracking and actual remaining calculation → Phase 9
- SupplementSchedule.tsx redesign → Phase 9
- TCM info editing (complex nested object) → Claude's Discretion, can be minimal or deferred

</deferred>

---

*Phase: 08-supplement-manager-inventory*
*Context gathered: 2026-04-01*
