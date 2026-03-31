# Phase 6: ItemService + GAS id-keyed Operations - Research

**Researched:** 2026-03-31
**Domain:** TypeScript service layer + Google Apps Script backend extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**ItemService Design**
- D-01: `ItemService` is a singleton plain object. Exported as `export const ItemService = { ... }` from `src/lib/item-service.ts`.
- D-02: Methods: `getFoods(): Promise<FoodItem[]>`, `saveFood(food: FoodItem): Promise<void>`, `deleteFood(id: string): Promise<void>`, `getSupplements(): Promise<SupplementItem[]>`, `saveSupplement(supp: SupplementItem): Promise<void>`, `deleteSupplement(id: string): Promise<void>`, `getInventory(supplementId?: string): Promise<InventoryEntry[]>`, `upsertInventory(entry: InventoryEntry): Promise<void>`.
- D-03: Offline-first pattern identical to existing DataService: read from localStorage immediately, fire-and-forget background Sheets sync. Save writes to localStorage first, then async Sheets upsert. Delete removes from localStorage first, then async Sheets delete.
- D-04: `saveFood` and `saveSupplement` handle both create and update — if the item ID already exists in the cached array, replace it; otherwise append. Single method, not separate create/update.

**ID Generation**
- D-05: New items get timestamp-based IDs: `food_{Date.now()}` for foods, `supp_{Date.now()}` for supplements. Assigned by the caller (UI page), not by ItemService.
- D-06: Existing hardcoded items (from `foods.ts`, `supplements.ts`) retain their existing string IDs. ItemService merges hardcoded catalog with user-saved items.

**Cache Strategy**
- D-07: Cache keys: `"foods_catalog"` for user-saved foods, `"supplements_catalog"` for user-saved supplements, `"inventory"` for inventory entries. Uses existing `CACHE_PREFIX` (`"wellness_"`) from DataService pattern.
- D-08: `getFoods()` returns merged array: hardcoded `FOODS` + user-saved foods from localStorage. Same for `getSupplements()`. No deduplication needed — ID namespaces are structurally distinct.

**GAS Backend Changes**
- D-09: Add `upsertById` action to GAS `doPost()` — same logic as `upsertByDate` but searches the `id` column.
- D-10: Add `deleteById` action to GAS `doPost()` — same logic as `deleteByDate` but searches by `id` column. Returns `{ success: true, action: "deleted" }` or `{ success: false, action: "not_found" }`.
- D-11: Keep existing date-keyed operations (`upsert`, `delete`) unchanged.

**SheetsAPI Client Changes**
- D-12: Add `upsertById(sheet: string, data: SheetRow): Promise<ApiResponse>` to SheetsAPI — posts `{ action: "upsertById", sheet, data }`. Data must include `id` field.
- D-13: Add `deleteById(sheet: string, id: string): Promise<ApiResponse>` to SheetsAPI — posts `{ action: "deleteById", sheet, data: { id } }`.

### Claude's Discretion
- Whether `item-service.ts` imports from `data-service.ts` (to reuse `cacheGet`/`cacheSet`) or duplicates the cache helpers. Sharing is preferred if the helpers are already exported.
- Error handling granularity — current pattern is silent `.catch(() => {})` for background sync.
- Whether to add a `rowToSupplement()` converter in ItemService for when Sheets data is pulled.
- Internal helper organization within `item-service.ts`.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GAS-01 | Google Apps Script supports id-keyed upsert (not just date-keyed) for catalog CRUD operations | GAS `upsertById` function added to `doPost()` switch, mirrors `upsertByDate` pattern exactly |
| GAS-02 | Google Apps Script supports id-keyed delete for catalog items | GAS `deleteById` function added to `doPost()` switch, mirrors `deleteByDate` pattern exactly |

</phase_requirements>

---

## Summary

Phase 6 is a pure service/backend layer — no UI. It creates `src/lib/item-service.ts` (new file), extends `src/lib/sheets-api.ts` (two new methods), and extends `scripts/gas-api.js` (two new GAS functions + two new switch cases).

The codebase already has a complete, working offline-first pattern in `DataService`. `ItemService` must replicate that pattern exactly: localStorage reads are synchronous and immediate, background Sheets sync fires without awaiting. The key deviation from `DataService` is that reads return a **merged** result (hardcoded static catalog + user-saved items from localStorage) rather than one or the other.

**Critical finding:** `cacheGet` and `cacheSet` in `data-service.ts` are NOT exported — they are module-private functions. `item-service.ts` must either duplicate these two small helpers locally (4 lines each) or the planner must note this as an explicit choice with a recommendation to duplicate (keeping modules independent is safer given the project's no-shared-state-library approach).

**Primary recommendation:** Implement in two sequential tasks — (1) GAS backend + SheetsAPI client changes, (2) ItemService module. Task 1 is self-contained and changes only the backend + one existing file. Task 2 depends on Task 1's SheetsAPI additions being in place.

---

## Standard Stack

### Core (already in project — no new installations)
| Library/API | Version | Purpose | Why Standard |
|-------------|---------|---------|--------------|
| TypeScript | ~5.8.3 | All source code | Project constraint |
| React | ^19.1.0 | (not used in this phase — service layer only) | — |
| localStorage API | Browser native | Primary data store | Project offline-first constraint |
| Google Apps Script | Runtime | Sheets proxy | Project backend constraint |

### No new dependencies
This phase adds zero new npm packages. All needed capabilities (TypeScript, localStorage, fetch) are already present.

---

## Architecture Patterns

### Recommended File Changes
```
src/lib/
├── item-service.ts    NEW — ItemService singleton
├── sheets-api.ts      MODIFY — add upsertById, deleteById methods
└── data-service.ts    READ ONLY — do not modify (reference for pattern)

scripts/
└── gas-api.js         MODIFY — add upsertById, deleteById functions + switch cases
```

### Pattern 1: Offline-First Read (getFoods / getSupplements)
**What:** Return merged array (hardcoded catalog + cached user items) immediately, fire background Sheets sync that updates cache only.
**When to use:** All `get*` methods in ItemService.

```typescript
// Verified from existing data-service.ts pattern
async getFoods(): Promise<FoodItem[]> {
  const cached = cacheGet<FoodItem[]>("foods_catalog") ?? [];

  // Background sync — does not block return
  SheetsAPI.readAll(SHEETS.FOODS)
    .then((rows) => {
      if (rows.length > 0) {
        cacheSet("foods_catalog", rows.map(rowToFood));
      }
    })
    .catch(() => {});

  // Merge: hardcoded catalog first, user-saved items after
  return [...FOODS, ...cached];
},
```

### Pattern 2: Offline-First Write (saveFood / saveSupplement)
**What:** Update localStorage cache immediately (upsert by ID), then fire background Sheets sync.
**When to use:** All `save*` methods in ItemService.

```typescript
// Verified from existing saveDailyPlan pattern in data-service.ts
async saveFood(food: FoodItem): Promise<void> {
  const existing = cacheGet<FoodItem[]>("foods_catalog") ?? [];
  const filtered = existing.filter((f) => f.id !== food.id); // replace if exists
  filtered.push(food);
  cacheSet("foods_catalog", filtered);

  // Async background sync
  SheetsAPI.upsertById(SHEETS.FOODS, food as unknown as SheetRow).catch(() => {});
},
```

### Pattern 3: Offline-First Delete (deleteFood / deleteSupplement)
**What:** Remove from localStorage cache immediately, then fire background Sheets delete.
**When to use:** All `delete*` methods in ItemService.

```typescript
async deleteFood(id: string): Promise<void> {
  const existing = cacheGet<FoodItem[]>("foods_catalog") ?? [];
  cacheSet("foods_catalog", existing.filter((f) => f.id !== id));

  SheetsAPI.deleteById(SHEETS.FOODS, id).catch(() => {});
},
```

### Pattern 4: GAS id-keyed Upsert
**What:** Exact copy of `upsertByDate` with `id` column instead of `date` column.
**Source:** `scripts/gas-api.js` — `upsertByDate` function (lines 102-136).

```javascript
// Extends existing gas-api.js pattern
function upsertById(sheetName, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(sheetName);
  if (!ws) return { error: `Sheet "${sheetName}" not found` };

  const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  const idColIdx = headers.indexOf("id");
  if (idColIdx === -1) return { error: "No 'id' column found" };

  const allData = ws.getDataRange().getValues();
  let rowIdx = -1;
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][idColIdx] === data.id) {
      rowIdx = i + 1; // 1-indexed
      break;
    }
  }

  const rowValues = headers.map((h) => {
    const val = data[h];
    if (typeof val === "object" && val !== null) return JSON.stringify(val);
    return val ?? "";
  });

  if (rowIdx > 0) {
    ws.getRange(rowIdx, 1, 1, rowValues.length).setValues([rowValues]);
    return { success: true, action: "updated", row: data };
  } else {
    ws.appendRow(rowValues);
    return { success: true, action: "created", row: data };
  }
}
```

### Pattern 5: GAS id-keyed Delete
**What:** Exact copy of `deleteByDate` with `id` column instead of `date` column.

```javascript
function deleteById(sheetName, id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(sheetName);
  if (!ws) return { error: `Sheet "${sheetName}" not found` };

  const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  const idColIdx = headers.indexOf("id");
  const allData = ws.getDataRange().getValues();

  for (let i = allData.length - 1; i >= 1; i--) {
    if (allData[i][idColIdx] === id) {
      ws.deleteRow(i + 1);
      return { success: true, action: "deleted" };
    }
  }
  return { success: false, action: "not_found" };
}
```

### Pattern 6: SheetsAPI Client Extensions
**What:** Two new methods on the existing `SheetsAPI` singleton object.

```typescript
// Extends existing sheets-api.ts
/** 以 id 為 key 更新或新增 */
async upsertById(sheet: string, data: SheetRow): Promise<ApiResponse> {
  return gasPost({ action: "upsertById", sheet, data });
},

/** 刪除指定 id 的資料 */
async deleteById(sheet: string, id: string): Promise<ApiResponse> {
  return gasPost({ action: "deleteById", sheet, data: { id } });
},
```

### Pattern 7: rowToSupplement Converter
**What:** Deserializes a Sheets row into `SupplementItem`. Required for background sync from Sheets.
**Note on arrays:** Fields `timing`, `tags`, `interactions`, `synergies` are stored as JSON in Sheets (mirroring how `upsertByDate` serializes objects — see `appendRow` in gas-api.js lines 92-95). Converter must `JSON.parse` these fields.

```typescript
function rowToSupplement(row: SheetRow): SupplementItem {
  return {
    id: String(row.id),
    type: "supplement",
    name: String(row.name),
    brand: row.brand ? String(row.brand) : undefined,
    dosagePerUnit: String(row.dosagePerUnit ?? ""),
    unitsPerDose: Number(row.unitsPerDose) || 1,
    dosesPerDay: Number(row.dosesPerDay) || 1,
    timing: row.timing ? JSON.parse(String(row.timing)) : [],
    tags: row.tags ? JSON.parse(String(row.tags)) : [],
    interactions: row.interactions ? JSON.parse(String(row.interactions)) : [],
    synergies: row.synergies ? JSON.parse(String(row.synergies)) : [],
    mechanism: row.mechanism ? String(row.mechanism) : undefined,
    caution: row.caution ? String(row.caution) : undefined,
    isActive: row.isActive === true || row.isActive === "true" || row.isActive === 1,
  };
}
```

### Anti-Patterns to Avoid
- **Awaiting background sync:** All `SheetsAPI.*` calls in `get*`/`save*`/`delete*` methods must be fire-and-forget (`.catch(() => {})`). Never `await` them — this blocks the UI.
- **Modifying hardcoded catalog:** `getFoods()` and `getSupplements()` read from `FOODS`/`SUPPLEMENTS` (empty arrays from Phase 5, populated by Sheets sync in DataService). `ItemService` must NOT mutate these arrays. User-saved items live only in `"foods_catalog"`/`"supplements_catalog"` cache keys.
- **Exporting cache helpers from data-service.ts:** `cacheGet` and `cacheSet` are NOT currently exported (confirmed by grep). Do not add exports to `data-service.ts` — duplicate the helpers locally in `item-service.ts`.
- **Using existing `upsert` (date-keyed) for catalog items:** The existing `SheetsAPI.upsert()` method searches by `date` column. Catalog items have `id` not `date`. Always use the new `upsertById` for `ItemService` operations.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON serialization of arrays to Sheets | Custom array serializer | `JSON.stringify` (already used by GAS `appendRow`) | The GAS `appendRow` function already serializes objects/arrays via `JSON.stringify` (gas-api.js lines 92-95). Converters must `JSON.parse` on read. |
| localStorage abstraction | New storage class | Duplicate `cacheGet`/`cacheSet` helpers | 8 lines of code, already proven pattern, no benefit to abstracting further |
| GAS HTTP client | New fetch wrapper | Existing `gasPost()` in `sheets-api.ts` | Already handles JSON, headers, error checking |
| ID collision prevention | UUID library | `Date.now()` prefix pattern (D-05) | Single-user app, no concurrent writes |

---

## Critical Finding: cacheGet/cacheSet Are Not Exported

**Confirmed by code inspection:** `cacheGet`, `cacheSet`, and `CACHE_PREFIX` in `src/lib/data-service.ts` are all module-private (no `export` keyword). `SHEETS` constant is also private.

**Implication for planner:** `item-service.ts` cannot import these helpers. The plan must explicitly direct the implementer to **duplicate** `cacheGet` and `cacheSet` locally in `item-service.ts`. This is a deliberate choice — the project uses no shared state library and each service module is self-contained.

**Recommended approach:** Copy both helpers verbatim (with same `CACHE_PREFIX = "wellness_"`) into `item-service.ts`. The 8 lines of duplication are better than coupling two service modules together or polluting `data-service.ts`'s exports.

---

## Critical Finding: InventoryEntry Keying

From `.planning/STATE.md`:
> "GAS `upsertById` should accept configurable `keyField` parameter — finalize in Phase 6 planning to handle inventory keyed by `supplementId`"

**Analysis:** `InventoryEntry` does NOT have an `id` field (it has `supplementId`). The `upsertById` GAS function as designed in D-09 hardcodes a search on the `"id"` column.

**Resolution options:**
1. Add an `id` field to `InventoryEntry` (synthetic UUID or timestamp) so it can use `upsertById` — but this changes the type from Phase 5.
2. Make `upsertById` accept a configurable `keyField` parameter (as STATE.md notes), so it can search `"supplementId"` for inventory, `"id"` for catalog items.
3. Use `append`-only for inventory (no update, only add new purchases) — matches the event-sourced model (D-11 in Phase 5: `ConsumptionEvent` is event-sourced, `InventoryEntry` is purchase records).

**Recommendation:** Use `append`-only for inventory entries (option 3). `InventoryEntry` represents purchase events — each purchase is a new record, never updated. This is consistent with the event-sourced design decision. The `upsertInventory` method name is misleading; the planner should implement it as `SheetsAPI.append` to the `"inventory"` sheet. This avoids type changes and avoids the `keyField` complexity.

If the planner decides to support true upsert-by-supplementId for inventory, implement `upsertById` with a `keyField` parameter:

```javascript
// Alternative: configurable keyField
function upsertByField(sheetName, data, keyField) {
  // same as upsertById but parameterized
  const colIdx = headers.indexOf(keyField);
  // ...match on data[keyField]
}
```

And in `doPost()`:
```javascript
case "upsertByField":
  return jsonResponse(upsertByField(sheet, data, body.keyField || "id"));
```

---

## Common Pitfalls

### Pitfall 1: Merged Array Includes Hardcoded Items in Cache
**What goes wrong:** `saveFood` writes user-saved items to `"foods_catalog"` cache. `getFoods` reads `"foods_catalog"` and merges with `FOODS`. If the caller accidentally saves a hardcoded item (same descriptive ID), it appears twice in the merged result.
**Why it happens:** No deduplication in the merge (D-08 states this is fine because ID namespaces are structurally distinct). But if Phase 5 catalog items get IDs that could collide with user IDs, there's a risk.
**How to avoid:** Phase 5 `FOODS`/`SUPPLEMENTS` are empty arrays — no hardcoded items exist. The merge is only a future concern if catalog items are seeded.
**Warning signs:** Duplicate items appearing in UI lists.

### Pitfall 2: GAS Deployment Not Refreshed After Gas Changes
**What goes wrong:** `scripts/gas-api.js` changes are committed to git but not redeployed to Google Apps Script. The `upsertById`/`deleteById` actions return "Unknown action" from the live endpoint.
**Why it happens:** GAS is deployed as a Web App independently from the git repo. Code changes in git do not auto-deploy.
**How to avoid:** Plan must include a manual step reminding the developer to redeploy GAS after modifying `scripts/gas-api.js`. This is noted in CONTEXT.md under Integration Points.
**Warning signs:** POST requests to `upsertById` return `{ error: "Unknown action" }`.

### Pitfall 3: Array Fields Not JSON-Serialized for Sheets Storage
**What goes wrong:** `saveFood` or `saveSupplement` passes a `SupplementItem` or `FoodItem` directly to `SheetsAPI.upsertById`. Fields like `timing: ["with_meal", "bedtime"]` and `tags: ["gut_health"]` are JavaScript arrays — when mapped to a Sheets row via `appendRow`'s header-mapping logic, the GAS `JSON.stringify` serialization in `appendRow` handles this automatically. The `rowToSupplement` converter must `JSON.parse` them back.
**Why it happens:** The `as unknown as SheetRow` cast hides the array type issue from TypeScript — it compiles fine but round-trip is broken if converters don't parse.
**How to avoid:** `rowToSupplement` must `JSON.parse` all array fields: `timing`, `tags`, `interactions`, `synergies`. Existing `rowToFood` does NOT parse arrays (food tags are stored as comma-separated strings). Supplement arrays must use JSON format for consistency with Phase 9 requirements.
**Warning signs:** `timing` reads back as `"[\"with_meal\"]"` (a JSON string) instead of `["with_meal"]` (array).

### Pitfall 4: isActive Field Roundtrip via Sheets
**What goes wrong:** `isActive: boolean` in `SupplementItem`. Sheets stores values as strings or numbers when read back (`"true"`, `"false"`, `1`, `0`). A naive `Boolean(row.isActive)` would make `"false"` truthy.
**Why it happens:** Sheets serialization coerces booleans.
**How to avoid:** In `rowToSupplement`, use explicit comparison: `row.isActive === true || row.isActive === "true" || row.isActive === 1`.
**Warning signs:** Supplements marked inactive (`isActive: false`) appear as active after a Sheets sync refresh.

### Pitfall 5: Background Sync Overwrites User's Unsaved Changes
**What goes wrong:** User saves a food via `saveFood` (writes to localStorage). Background sync fetches all foods from Sheets (which doesn't have this new food yet). Background sync overwrites `"foods_catalog"` cache, erasing the just-saved item.
**Why it happens:** The background sync in the read path (`getFoods`) always replaces the cache with whatever Sheets returns.
**How to avoid:** The background sync in `getFoods` should only update the cache with Sheets data — it doesn't know about items saved locally but not yet synced. Since `saveFood` fires an async `upsertById` to Sheets, there's a race window. Acceptable for this phase given the single-user, eventually-consistent design. The planner should document this as a known limitation.
**Warning signs:** Newly saved items disappear after a page refresh that triggers background sync before Sheets has the new row.

---

## Code Examples

### Complete SheetsAPI additions (src/lib/sheets-api.ts)
```typescript
// Source: verified from existing upsert/deleteByDate methods in sheets-api.ts
/** 以 id 為 key 更新或新增 */
async upsertById(sheet: string, data: SheetRow): Promise<ApiResponse> {
  return gasPost({ action: "upsertById", sheet, data });
},

/** 刪除指定 id 的資料 */
async deleteById(sheet: string, id: string): Promise<ApiResponse> {
  return gasPost({ action: "deleteById", sheet, data: { id } });
},
```

### doPost switch cases to add (scripts/gas-api.js)
```javascript
// Add to existing switch in doPost():
case "upsertById":
  return jsonResponse(upsertById(sheet, data));
case "deleteById":
  return jsonResponse(deleteById(sheet, data.id));
```

### item-service.ts skeleton
```typescript
/**
 * ItemService: Offline-first CRUD for food and supplement catalogs
 *
 * Mirrors DataService pattern:
 * 1. 讀取先從 localStorage 取 (instant)
 * 2. 背景同步 Sheets
 * 3. 寫入同時寫 localStorage + Sheets
 * 4. Sheets 掛了也不影響使用
 */

import { SheetsAPI, type SheetRow } from "./sheets-api";
import type { FoodItem, SupplementItem, InventoryEntry } from "../data/types";
import { FOODS } from "../data/foods";
import { SUPPLEMENTS } from "../data/supplements";

// ── Cache helpers (private to this module) ───────────────────────────

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

// ── Sheet name constants ────────────────────────────────────────────

const SHEETS = {
  FOODS: "foods",
  SUPPLEMENTS_CATALOG: "supplements",
  INVENTORY: "inventory",
} as const;

// ── Row → Type converters ───────────────────────────────────────────

function rowToFood(row: SheetRow): FoodItem { /* ... */ }
function rowToSupplement(row: SheetRow): SupplementItem { /* ... */ }

// ── ItemService ─────────────────────────────────────────────────────

export const ItemService = {
  async getFoods(): Promise<FoodItem[]> { /* ... */ },
  async saveFood(food: FoodItem): Promise<void> { /* ... */ },
  async deleteFood(id: string): Promise<void> { /* ... */ },
  async getSupplements(): Promise<SupplementItem[]> { /* ... */ },
  async saveSupplement(supp: SupplementItem): Promise<void> { /* ... */ },
  async deleteSupplement(id: string): Promise<void> { /* ... */ },
  async getInventory(supplementId?: string): Promise<InventoryEntry[]> { /* ... */ },
  async upsertInventory(entry: InventoryEntry): Promise<void> { /* ... */ },
};
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Date-keyed upsert only | Add id-keyed upsert/delete | Catalog items (foods, supplements) can now be reliably persisted and updated in Sheets |
| RemedyItem catalog | SupplementItem catalog (Phase 5 complete) | Item structure is richer — converter must handle all new fields |
| FOODS/SUPPLEMENTS empty arrays | Still empty (Phase 5 output) | getFoods/getSupplements must handle empty static catalogs gracefully; user data comes from localStorage exclusively at present |

---

## Open Questions

1. **InventoryEntry upsert semantics**
   - What we know: `upsertInventory` method is in the required API (D-02). `InventoryEntry` has no `id` field — only `supplementId` + `purchaseDate`.
   - What's unclear: Does "upsert" mean replace the existing entry for a supplement, or is each inventory entry a new purchase record?
   - Recommendation: Treat as `append`-only (each purchase is a new record, event-sourced). The planner should implement `upsertInventory` via `SheetsAPI.append` + local cache append, NOT `upsertById`. If the planner disagrees, they must add an `id` field to `InventoryEntry` or implement the `keyField` parameterization.

2. **SHEETS constant — `SUPPLEMENTS_CATALOG` vs `SUPPLEMENTS`**
   - What we know: `data-service.ts` already defines `SHEETS.SUPPLEMENTS_CATALOG = "supplements"` and `SHEETS.SUPPLEMENTS = "supplement_log"` (verified from source). STATE.md confirms this was added in Phase 5.
   - What's unclear: Should `item-service.ts` define its own SHEETS constant or import from `data-service.ts`?
   - Recommendation: Define a local SHEETS constant in `item-service.ts` (same pattern as `cacheGet`/`cacheSet` — no cross-module sharing). Use the same string values: `"foods"`, `"supplements"`, `"inventory"`.

---

## Environment Availability

Step 2.6: SKIPPED — This phase is purely code/config changes (TypeScript service file + GAS JS extension). No new external tools, runtimes, databases, or CLI utilities required beyond what already exists in the project. The GAS endpoint is a deployment concern, not an environment availability concern.

---

## Validation Architecture

Nyquist validation is explicitly disabled (`workflow.nyquist_validation: false` in `.planning/config.json`). Section skipped.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/lib/data-service.ts` — offline-first pattern, cache helpers, DataService singleton
- Direct code inspection: `src/lib/sheets-api.ts` — SheetsAPI methods, gasPost pattern
- Direct code inspection: `scripts/gas-api.js` — upsertByDate/deleteByDate implementation (lines 102-154)
- Direct code inspection: `src/data/types.ts` — FoodItem, SupplementItem, InventoryEntry interfaces
- Direct code inspection: `src/data/foods.ts`, `src/data/supplements.ts` — FOODS/SUPPLEMENTS arrays (empty)
- `.planning/phases/06-itemservice-gas-id-keyed-operations/06-CONTEXT.md` — All locked decisions

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — `keyField` note for InventoryEntry keying strategy

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all patterns verified from source
- Architecture: HIGH — ItemService mirrors DataService exactly (verified from source), GAS extensions mirror existing functions exactly
- Pitfalls: HIGH — most pitfalls derived from direct code inspection (serialization, cache helpers not exported, boolean roundtrip)
- InventoryEntry upsert semantics: MEDIUM — open question requires planner decision

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable TypeScript/GAS stack, no version concerns)
