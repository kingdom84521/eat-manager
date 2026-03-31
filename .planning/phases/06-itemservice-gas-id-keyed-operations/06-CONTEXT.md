# Phase 6: ItemService + GAS id-keyed Operations - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Working persistence layer for food and supplement catalog CRUD. `ItemService` singleton provides get/save/delete methods for foods and supplements, with localStorage as primary store and Google Sheets background sync. GAS backend gains id-keyed upsert and delete actions (currently only date-keyed). No new UI pages — pure service/backend layer consumed by Phases 7-9.

</domain>

<decisions>
## Implementation Decisions

### ItemService Design
- **D-01:** `ItemService` is a singleton plain object (matches `DataService` and `SheetsAPI` pattern — not a class). Exported as `export const ItemService = { ... }` from `src/lib/item-service.ts`.
- **D-02:** Methods: `getFoods(): Promise<FoodItem[]>`, `saveFood(food: FoodItem): Promise<void>`, `deleteFood(id: string): Promise<void>`, `getSupplements(): Promise<SupplementItem[]>`, `saveSupplement(supp: SupplementItem): Promise<void>`, `deleteSupplement(id: string): Promise<void>`, `getInventory(supplementId?: string): Promise<InventoryEntry[]>`, `upsertInventory(entry: InventoryEntry): Promise<void>`.
- **D-03:** Offline-first pattern identical to existing DataService: read from localStorage immediately, fire-and-forget background Sheets sync. Save writes to localStorage first, then async Sheets upsert. Delete removes from localStorage first, then async Sheets delete.
- **D-04:** `saveFood` and `saveSupplement` handle both create and update — if the item ID already exists in the cached array, replace it; otherwise append. Single method, not separate create/update.

### ID Generation
- **D-05:** New items get timestamp-based IDs: `food_{Date.now()}` for foods, `supp_{Date.now()}` for supplements. Single-user app, no collision risk. IDs are assigned at creation time by the caller (UI page in Phase 7/8), not by ItemService.
- **D-06:** Existing hardcoded items (from `foods.ts`, `supplements.ts`) retain their existing string IDs. ItemService merges hardcoded catalog with user-saved items.

### Cache Strategy
- **D-07:** Cache keys: `"foods_catalog"` for user-saved foods, `"supplements_catalog"` for user-saved supplements, `"inventory"` for inventory entries. Uses existing `CACHE_PREFIX` (`"wellness_"`) from DataService pattern.
- **D-08:** `getFoods()` returns merged array: hardcoded `FOODS` from `foods.ts` + user-saved foods from localStorage. Same for `getSupplements()` with `SUPPLEMENTS`. User-saved items appear after hardcoded items. No deduplication needed — IDs are structurally distinct (hardcoded use descriptive IDs like `"oatmeal_50g"`, user-created use timestamp IDs).

### GAS Backend Changes
- **D-09:** Add `upsertById` action to GAS `doPost()` — same logic as existing `upsertByDate` but searches the `id` column instead of `date` column. Reuses the same overwrite-or-append pattern.
- **D-10:** Add `deleteById` action to GAS `doPost()` — same logic as existing `deleteByDate` but searches by `id` column. Returns `{ success: true, action: "deleted" }` or `{ success: false, action: "not_found" }`.
- **D-11:** Keep existing date-keyed operations (`upsert`, `delete`) unchanged — they're still used by DailyPlan, WeightLog, NutritionTracker. New id-keyed operations are additive.

### SheetsAPI Client Changes
- **D-12:** Add `upsertById(sheet: string, data: SheetRow): Promise<ApiResponse>` to SheetsAPI — posts `{ action: "upsertById", sheet, data }`. Data must include `id` field.
- **D-13:** Add `deleteById(sheet: string, id: string): Promise<ApiResponse>` to SheetsAPI — posts `{ action: "deleteById", sheet, data: { id } }`.

### Claude's Discretion
- Whether `item-service.ts` imports from `data-service.ts` (to reuse `cacheGet`/`cacheSet`) or duplicates the cache helpers. Sharing is preferred if the helpers are already exported.
- Error handling granularity — current pattern is silent `.catch(() => {})` for background sync, which is fine for this phase.
- Whether to add a `rowToSupplement()` converter in ItemService (mirrors `rowToFood()` in DataService) for when Sheets data is pulled.
- Internal helper organization within item-service.ts.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Types (from Phase 5)
- `src/data/types.ts` — FoodItem, SupplementItem, InventoryEntry, ConsumptionEvent interfaces
- `src/data/supplements.ts` — SUPPLEMENTS array, SUPPLEMENT_MAP
- `src/data/foods.ts` — FOODS array, FOOD_MAP

### Existing Service Layer
- `src/lib/data-service.ts` — DataService singleton pattern, cache helpers, sheet constants, offline-first pattern
- `src/lib/sheets-api.ts` — SheetsAPI singleton, gasGet/gasPost helpers, current upsert/deleteByDate methods

### GAS Backend
- `scripts/gas-api.js` — Server-side handlers, upsertByDate/deleteByDate implementations to extend

### Phase 5 Context
- `.planning/phases/05-data-model-restructure/05-CONTEXT.md` — Type decisions D-05 through D-11 (SupplementItem fields, InventoryEntry shape)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `cacheGet<T>(key)` / `cacheSet(key, data)` in `data-service.ts` — localStorage helpers with try/catch fallback. Can be imported or duplicated.
- `rowToFood(row: SheetRow): FoodItem` in `data-service.ts` — Sheets row converter for foods. Needs equivalent for supplements.
- `gasGet()` / `gasPost()` in `sheets-api.ts` — Low-level HTTP helpers, already generic.

### Established Patterns
- Singleton objects exported as `const ServiceName = { ... }` — not classes
- Offline-first: cache read → return cached → background Sheets sync → update cache
- Silent catch on background sync: `.catch(() => {})`
- Sheet name constants in `SHEETS` object
- `as unknown as SheetRow` type assertions for Sheets writes

### Integration Points
- Phase 7 (Food Manager UI) will import `ItemService.getFoods/saveFood/deleteFood`
- Phase 8 (Supplement Manager UI) will import `ItemService.getSupplements/saveSupplement/deleteSupplement/getInventory/upsertInventory`
- Phase 9 (Routine Generator) will import `ItemService.getSupplements` + `getInventory`
- GAS backend is deployed separately — user must redeploy after changes to `scripts/gas-api.js`

</code_context>

<specifics>
## Specific Ideas

- Sheet names for catalog storage: `FOODS: "foods"` (already exists) and `SUPPLEMENTS_CATALOG: "supplements"` (already added in Phase 5)
- Inventory entries could use their own sheet: `"inventory"` — separate from supplement catalog
- Consumption events could use: `"consumption_log"` — separate from inventory purchases

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-itemservice-gas-id-keyed-operations*
*Context gathered: 2026-03-31*
