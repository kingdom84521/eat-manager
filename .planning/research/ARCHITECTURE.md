# Architecture Patterns

**Domain:** Offline-first React SPA — Item Management & Supplement Routines integration
**Researched:** 2026-03-30
**Milestone:** v2.0 (supersedes v1.0 research from 2026-03-29)

---

## Context: Existing Architecture Snapshot (v1.0 complete)

What is already built and must not regress:

- `src/data/types.ts` — `FoodItem`, `RemedyItem`, `BehaviorItem`, `ScheduleSlot`, `ItemPool`, `DailyPlan`, `NutritionEntry`, `WeightEntry`, `SupplementLogEntry`, `UserProfile`, `BMRResult`, `GuidelinePreset`, `MacroGrams`
- `src/data/foods.ts` — `FOODS = []`, `FOOD_MAP`, `searchFoods()`, `getFoodsByTag()` (empty arrays, data comes from Sheets)
- `src/data/remedies.ts` — `SUPPLEMENTS = []`, `NATURAL_REMEDIES = []`, `BEHAVIORS = []`, `REMEDY_MAP`, query helpers (empty arrays)
- `src/data/schedule.ts` — `SCHEDULE = []` (empty, data comes from Sheets)
- `src/data/resolver.ts` — `resolveItem(id)`, `resolveItems(ids)`, `resolveAndGroup(ids)` — adapter from heterogeneous types to `ResolvedItem`
- `src/data/bmr.ts` — pure BMR/TDEE functions (Mifflin-St Jeor)
- `src/data/dietary-guidelines.ts` — static `GUIDELINES` catalog with `GUIDELINE_MAP`
- `src/lib/data-service.ts` — `DataService` singleton: offline-first CRUD for `DailyPlan`, `NutritionEntry`, `WeightEntry`, `SupplementEntry`; key prefix `wellness_`
- `src/lib/sheets-api.ts` — `SheetsAPI` with `readAll`, `readRange`, `append`, `upsert`, `deleteByDate`; GAS URL resolved at call time from `SettingsService`
- `src/lib/settings-service.ts` — `SettingsService`: versioned settings schema v2 at key `eat_manager_settings`; `getUserProfile()`, `getActiveGuidelineId()`, `getSheetsConfig()`, `getComputedTargets()`
- `src/lib/utils.ts` — utility functions
- 5 pages: `DailyPlan`, `NutritionTracker`, `SupplementSchedule`, `WeightLog`, `Settings`
- 5 routes: `/plan`, `/track`, `/schedule`, `/weight`, `/settings`
- `scripts/gas-api.js` — GAS backend: `readSheet`, `readRange`, `appendRow`, `upsertByDate`, `deleteByDate`; key column is `date` for all upsert operations

**Current GAS upsert constraint:** `upsertByDate` in `gas-api.js` keys on the `date` column. Items like foods and supplements are not date-keyed — the GAS layer needs new CRUD operations keyed on `id`.

---

## Data Model Restructure

### What Changes

The v1.0 model mixed food-as-catalog (nutrition labels) and remedies (supplements + dietary remedies + behaviors) in two separate tables. v2.0 simplifies to two explicit categories and adds rich metadata.

#### Remove

- `BehaviorItem` interface (remove from `types.ts`)
- `type: "behavior"` from `ItemType` union
- `BEHAVIORS` array from `remedies.ts`
- `behavior` branch in `resolveItem()` in `resolver.ts`
- `behavior` filter in `SupplementSchedule.tsx`

#### Rename

- `RemedyItem` → `SupplementItem` — covers both capsule supplements and food-therapy remedies; keep `type: "supplement" | "remedy"` distinction within it
- `ScheduleSlot` stays as-is but represents supplement/food timing slots (no behavior slots)

#### Modify FoodItem — Add Composition Fields

```typescript
export interface FoodItem {
  id: string;
  type: "food";
  name: string;
  serving: string;
  cal: number;
  protein: number;
  fat: number;
  carbs: number;
  sugar?: number;
  sodium: number;
  source: string;
  tags?: HealthTag[];
  // v2.0 additions:
  /** "label" = entered directly from nutrition label; "composed" = calculated from ingredients */
  inputMethod: "label" | "composed";
  /** Only present when inputMethod === "composed" */
  ingredients?: FoodIngredient[];
}

export interface FoodIngredient {
  /** Display name of the ingredient (may be a local name or a db lookup result) */
  name: string;
  /** Grams of this ingredient in one serving */
  grams: number;
  /** kcal per 100g */
  calPer100g: number;
  /** protein g per 100g */
  proteinPer100g: number;
  /** fat g per 100g */
  fatPer100g: number;
  /** carbs g per 100g */
  carbsPer100g: number;
  /** sodium mg per 100g */
  sodiumPer100g: number;
  /** Optional: reference to a public nutrition DB entry */
  dbRef?: string;
}
```

When `inputMethod === "composed"`, `cal`, `protein`, `fat`, `carbs`, `sodium` are always derived from `ingredients` — never stored as independent values in the composed path. The save function recomputes them before persisting.

#### New SupplementItem — Rich Metadata + Inventory

Replace `RemedyItem` with `SupplementItem`. Keep `id`, `type`, `name`, `dose`, `cal`, `tags`, `mechanism`, `tcm`, `caution`, `timing`, `isCore`. Add:

```typescript
export interface SupplementItem {
  id: string;
  type: "supplement" | "remedy";
  name: string;
  dose: string;
  cal?: number;
  tags: HealthTag[];
  mechanism: string;
  tcm?: TCMInfo;
  caution?: string;
  timing?: string;
  isCore?: boolean;
  // v2.0 additions:
  /** Interactions with other supplements (e.g. "不與鐵質同服") */
  interactions?: string[];
  /** Synergies that enhance effect (e.g. "與維生素D3協同") */
  synergies?: string[];
  /** Recommended daily dose in natural language */
  dailyDose?: string;
  /** Maximum safe daily dose */
  maxDose?: string;
  /** Units for inventory tracking (e.g. "顆", "ml", "包") */
  inventoryUnit?: string;
}
```

#### New InventoryEntry — Supplement Stock Tracking

```typescript
export interface InventoryEntry {
  supplementId: string;
  /** Quantity purchased/added in one batch */
  purchasedQty: number;
  /** ISO date of purchase */
  purchasedDate: string;
  /** Quantity consumed per day (from routine) — used for remaining calculation */
  dailyConsumption: number;
  /** Running remaining count — updated on routine completion */
  remainingQty: number;
  /** Free-form notes (brand, expiry, etc.) */
  notes?: string;
}
```

Remaining is computed: `remainingQty - (daysSinceLastUpdate * dailyConsumption)`. The service stores the last-computed `remainingQty` and the date it was computed; callers recompute the displayed value for the current date.

#### New SupplementRoutine — Daily Supplement Plan

```typescript
export interface SupplementRoutine {
  date: string;
  /** Deterministically generated list of supplement IDs for today */
  supplementIds: string[];
  /** Which have been marked as taken */
  takenIds: string[];
  /** Which have been explicitly skipped */
  skippedIds?: string[];
  notes?: string;
}
```

#### Updated ItemType

```typescript
export type ItemType = "food" | "supplement" | "remedy";
// Remove: "behavior"
```

---

## Component Architecture

### New and Modified Source Files

```
src/
  data/
    types.ts              MODIFY — add FoodIngredient, SupplementItem, InventoryEntry,
                                   SupplementRoutine; remove BehaviorItem; update ItemType
    foods.ts              MODIFY — minor: FOOD_MAP stays, add getFoodById()
    remedies.ts           MODIFY — rename exports, remove BEHAVIORS; add SUPPLEMENT_MAP
    resolver.ts           MODIFY — remove behavior branch; update raw type refs
    schedule.ts           MODIFY — ScheduleSlot fixedIds can reference supplement IDs only

  lib/
    data-service.ts       MODIFY — add food CRUD, supplement CRUD, inventory CRUD,
                                   routine generation; remove BehaviorItem refs
    item-service.ts       NEW — CRUD operations keyed by item id (not date)
    routine-service.ts    NEW — deterministic routine generation algorithm
    nutrition-db.ts       NEW — public nutrition database lookup (thin wrapper)
    sheets-api.ts         NO CHANGE — add upsertById action to GAS (schema addition only)

  pages/
    FoodManager.tsx       NEW — food CRUD page (/foods)
    SupplementManager.tsx NEW — supplement CRUD page (/supplements)
    SupplementSchedule.tsx MODIFY — replace behavior filter, wire to live supplement data,
                                    add inventory status badges
    DailyPlan.tsx         MODIFY — remove behavior rendering path; update resolver calls

  App.tsx                 MODIFY — add /foods and /supplements routes;
                                   update bottom nav (may need horizontal scroll or icon-only)

scripts/
  gas-api.js              MODIFY — add upsertById(), deleteById() alongside existing upsertByDate()
```

### Component Boundaries

| Component | Responsibility | Reads From | Writes To |
|-----------|---------------|------------|-----------|
| `src/data/types.ts` | All shared type definitions | — (type-only) | — |
| `src/data/foods.ts` | Static food catalog exports, lookup maps | `types.ts` | — |
| `src/data/remedies.ts` | Static supplement catalog exports, lookup maps | `types.ts` | — |
| `src/data/resolver.ts` | Adapts `FoodItem`/`SupplementItem` to `ResolvedItem` for rendering | `FOOD_MAP`, `SUPPLEMENT_MAP` | — |
| `src/lib/item-service.ts` | CRUD for food and supplement catalog items (keyed by `id`) | `localStorage`, Sheets via `SheetsAPI` | `localStorage`, Sheets |
| `src/lib/routine-service.ts` | Deterministic daily routine generation, routine persistence | `ItemService`, `localStorage` | `localStorage`, Sheets |
| `src/lib/nutrition-db.ts` | Public nutrition DB lookup for ingredient composition | external API (USDA FDC) | — (read-only, no local writes) |
| `src/lib/data-service.ts` (modified) | Daily meal plans, nutrition log, weight log (unchanged); remove supplement log to `RoutineService` | `localStorage`, Sheets | `localStorage`, Sheets |
| `src/pages/FoodManager.tsx` | Food CRUD: list, add via label or ingredient composition, edit, delete | `ItemService`, `NutritionDB` | `ItemService` |
| `src/pages/SupplementManager.tsx` | Supplement CRUD: list, add with metadata, inventory management | `ItemService`, `RoutineService` | `ItemService`, `RoutineService` |
| `src/pages/SupplementSchedule.tsx` (modified) | Display schedule grouped by time; show inventory status; mark taken/skipped | `RoutineService`, `ItemService` | `RoutineService` |
| `src/pages/DailyPlan.tsx` (modified) | Remove behavior rendering; keep food/supplement plan generation | `resolver.ts`, `DataService` | `DataService` |
| `scripts/gas-api.js` (modified) | Add `upsertById` and `deleteById` for non-date-keyed sheets | Google Sheets API | Google Sheets |

---

## Data Flow

### Food CRUD — Label Input Path

```
FoodManager.tsx (form submit — label mode)
  → ItemService.saveFood({
      inputMethod: "label",
      id: generateId(),
      cal, protein, fat, carbs, sodium, ...
    })
    → localStorage.setItem("wellness_foods", [...existing, newFood])  [immediate]
    → SheetsAPI.upsertById("foods", newFood)                          [async, fire-and-forget]
```

### Food CRUD — Composed Ingredient Path

```
FoodManager.tsx (ingredient lookup)
  → NutritionDB.search(query)              [async, USDA FDC API]
    → returns NutritionDBResult[]

FoodManager.tsx (form submit — composed mode)
  → computeMacrosFromIngredients(ingredients)   [pure, in-component or lib]
    → returns { cal, protein, fat, carbs, sodium }
  → ItemService.saveFood({
      inputMethod: "composed",
      ingredients: [...],
      cal, protein, fat, carbs, sodium   // pre-computed
    })
    → localStorage + SheetsAPI (same as label path)
```

### Supplement CRUD

```
SupplementManager.tsx (form submit)
  → ItemService.saveSupplement({
      id: generateId(),
      type: "supplement" | "remedy",
      name, dose, tags, mechanism, timing,
      interactions, synergies, dailyDose, inventoryUnit, ...
    })
    → localStorage.setItem("wellness_supplements", [...])  [immediate]
    → SheetsAPI.upsertById("supplements", supplement)      [async]
```

### Inventory Management

```
SupplementManager.tsx (inventory update)
  → ItemService.upsertInventory({
      supplementId,
      purchasedQty,
      purchasedDate,
      dailyConsumption,
      remainingQty
    })
    → localStorage.setItem("wellness_inventory", [...])    [immediate]
    → SheetsAPI.upsertById("supplement_inventory", entry) [async]

SupplementManager.tsx / SupplementSchedule.tsx (display remaining)
  → ItemService.getInventory()                             [localStorage sync read]
    → for each entry: remainingQty - daysSincePurchase * dailyConsumption
    → returns computed remaining at today's date
```

### Routine Generation

```
SupplementSchedule.tsx (on mount or "重新生成" button)
  → RoutineService.getOrGenerateRoutine(date)
    → check localStorage for existing routine for date
    → if exists: return cached
    → if not:
        → ItemService.getSupplements()                    [localStorage read]
        → generateDailyRoutine(supplements, userGoals)   [deterministic, pure]
          → group by isCore (always include) + tag coverage (fill goals)
          → sort by timing (空腹 → 餐前 → 餐中 → 餐後 → 睡前)
        → save to localStorage + SheetsAPI

SupplementSchedule.tsx (mark taken)
  → RoutineService.markTaken(date, supplementId)
    → update routine.takenIds in localStorage            [immediate]
    → SheetsAPI.upsertById("supplement_routines", routine) [async]
    → ItemService.decrementInventory(supplementId)       [optional: immediate deduct]
```

### Data Load on Page Mount (read path)

```
FoodManager / SupplementManager (useEffect on mount)
  → ItemService.getFoods() / getSupplements()
    → return localStorage cache immediately
    → trigger background SheetsAPI.readAll("foods") / ("supplements")
      → on success: cacheSet() + re-render via setState

SupplementSchedule (useEffect on mount)
  → RoutineService.getOrGenerateRoutine(todayStr())
    → LocalStorage hit → immediate render
    → SheetsAPI background sync for routine history
```

---

## New Service Modules

### `src/lib/item-service.ts`

Singleton, mirrors `DataService` pattern. Manages foods and supplements as catalog items (not date-keyed logs).

```typescript
export const ItemService = {
  // Foods
  async getFoods(): Promise<FoodItem[]>,
  async saveFood(food: FoodItem): Promise<void>,        // upsert by id
  async deleteFood(id: string): Promise<void>,

  // Supplements
  async getSupplements(): Promise<SupplementItem[]>,
  async saveSupplement(s: SupplementItem): Promise<void>,  // upsert by id
  async deleteSupplement(id: string): Promise<void>,

  // Inventory
  async getInventory(): Promise<InventoryEntry[]>,
  async upsertInventory(entry: InventoryEntry): Promise<void>,
  computeRemaining(entry: InventoryEntry): number,       // pure, sync
};
```

LocalStorage keys (under `wellness_` prefix):
- `wellness_foods` — `FoodItem[]` (already used by `DataService`, take ownership)
- `wellness_supplements` — `SupplementItem[]` (replaces `wellness_remedies`)
- `wellness_inventory` — `InventoryEntry[]`

The `wellness_remedies` key used by the old `DataService.getRemedies()` is replaced by `wellness_supplements`. If a migration is needed (users with v1.0 data), run it in `ItemService` initialization: if `wellness_remedies` exists and `wellness_supplements` does not, copy and transform the data.

### `src/lib/routine-service.ts`

Singleton. Encapsulates all logic for generating and persisting daily supplement routines.

```typescript
export const RoutineService = {
  async getOrGenerateRoutine(date: string): Promise<SupplementRoutine>,
  async markTaken(date: string, supplementId: string): Promise<void>,
  async markSkipped(date: string, supplementId: string): Promise<void>,
  async getRoutineHistory(days?: number): Promise<SupplementRoutine[]>,
};

// Pure generation function — deterministic given same inputs
export function generateDailyRoutine(
  supplements: SupplementItem[],
  date: string,            // used as deterministic seed, not randomness
): SupplementRoutine;
```

Routine generation algorithm (deterministic, not random):
1. Always include all `isCore === true` supplements
2. Group remaining supplements by `tags`
3. Cover all unique health goals present in the user's supplement catalog
4. Where multiple supplements target the same tag, rotate daily using `date` as the rotation seed — same date always yields same selection
5. Sort result by timing order: `空腹` → `餐前` → `餐中` → `餐後` → `睡前` → undefined

LocalStorage keys:
- `wellness_supplement_routines` — `SupplementRoutine[]` (last 30 days)

Sheets tab: `supplement_routines`

### `src/lib/nutrition-db.ts`

Thin wrapper around USDA FoodData Central API. Only used in the food composition flow. Does not persist to localStorage — results are ephemeral search results that the user selects from.

```typescript
export interface NutritionDBResult {
  name: string;
  dbRef: string;         // FDC ID
  calPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
  sodiumPer100g: number;
}

export const NutritionDB = {
  async search(query: string): Promise<NutritionDBResult[]>,
};
```

USDA FDC API is free, no authentication required for basic search (`https://api.nal.usda.gov/fdc/v1/foods/search?query=...&api_key=DEMO_KEY`). `DEMO_KEY` has rate limits (30 req/hr); a real key can be obtained for free. The API key should be stored in `SettingsService` as an optional field alongside `sheetsConfig`, or fall back to `DEMO_KEY` with a graceful rate-limit error message.

---

## Google Sheets Schema Changes

### New/Modified Tabs

| Tab Name | Key Column | Purpose | GAS Operation |
|----------|-----------|---------|---------------|
| `foods` | `id` | Food catalog with nutrition data | `upsertById`, `deleteById`, `read` |
| `supplements` | `id` | Supplement catalog with metadata | `upsertById`, `deleteById`, `read` |
| `supplement_inventory` | `supplementId` | Stock levels | `upsertById` (by `supplementId`), `read` |
| `supplement_routines` | `date` | Daily routine records | `upsertByDate` (existing), `readRange` |
| `daily_plans` | `date` | Existing — no change | `upsertByDate` (existing) |
| `nutrition_log` | `date` | Existing — no change | `append` (existing) |
| `weight_log` | `date` | Existing — no change | `upsertByDate` (existing) |

### GAS `gas-api.js` Changes

Add two new actions alongside existing `upsertByDate` and `deleteByDate`:

```javascript
// New: upsert by 'id' column instead of 'date'
case "upsertById":
  return jsonResponse(upsertById(sheet, data));

// New: delete by 'id' column
case "deleteById":
  return jsonResponse(deleteById(sheet, data.id));
```

`upsertById(sheetName, data)` — same logic as `upsertByDate` but searches the `id` column instead of `date`. The existing `upsertByDate` remains unchanged; no existing functionality regresses.

### Foods Sheet Columns

`id | name | serving | cal | protein | fat | carbs | sugar | sodium | source | tags | inputMethod | ingredients_json`

`ingredients_json` is a JSON-stringified `FoodIngredient[]`. The `rowToFood()` converter in `item-service.ts` parses it.

### Supplements Sheet Columns

`id | type | name | dose | cal | tags | mechanism | timing | caution | isCore | interactions_json | synergies_json | dailyDose | maxDose | inventoryUnit | tcm_effect | tcm_nature`

### Supplement Inventory Sheet Columns

`supplementId | purchasedQty | purchasedDate | dailyConsumption | remainingQty | notes`

---

## GAS Upsert Key Strategy

The existing `upsertByDate` in `gas-api.js` assumes every sheet is date-keyed. Food and supplement catalog rows are keyed by `id`. Two approaches:

**Approach A (recommended):** Add a new `upsertById` function in GAS that searches the `id` column. The SheetsAPI client adds `upsertById(sheet, data)` and `deleteById(sheet, id)` methods. Clean separation.

**Approach B:** Make `upsert` generic — accept a `keyField` parameter. Cleaner long-term but requires changing the existing `upsert` action signature and the GAS `upsertByDate` function. Risk of regression.

Use Approach A. It is additive, not modifying existing code.

---

## Updated LocalStorage Key Map

| Key | Owner | Format | Status |
|-----|-------|--------|--------|
| `wellness_foods` | `ItemService` (takes over from `DataService`) | `FoodItem[]` JSON | Modified |
| `wellness_supplements` | `ItemService` | `SupplementItem[]` JSON | New (replaces `wellness_remedies`) |
| `wellness_inventory` | `ItemService` | `InventoryEntry[]` JSON | New |
| `wellness_supplement_routines` | `RoutineService` | `SupplementRoutine[]` JSON | New |
| `wellness_daily_plans_recent` | `DataService` | `DailyPlan[]` JSON | Unchanged |
| `wellness_nutrition_log_{date}` | `DataService` | `NutritionEntry[]` JSON | Unchanged |
| `wellness_weight_recent` | `DataService` | `WeightEntry[]` JSON | Unchanged |
| `eat_manager_settings` | `SettingsService` | `AppSettings` JSON (v2 schema) | Unchanged |
| `wellness_remedies` | Deprecated | Old `RemedyItem[]` — migrate to `wellness_supplements` | Remove after migration |

---

## Routing and Navigation

Current 5 tabs: 方案 / 飲食 / 時程 / 體重 / 設定

Adding 2 management pages adds routes but not necessarily tabs. Options:

**Option A (recommended):** Keep 5 bottom tabs. Add `/foods` and `/supplements` as routes accessible only from within the `/schedule` tab via "管理" button. `SupplementSchedule.tsx` gets a top-right "管理" button that navigates to `/supplements`. `NutritionTracker.tsx` or `DailyPlan.tsx` links to `/foods`. No nav tab change needed.

**Option B:** Add 2 more tabs (7 total) — too wide for mobile.

**Option C:** Replace `/schedule` tab with a "清單" tab that houses both food and supplement management, and move today's supplement timing into `DailyPlan`. More disruptive restructure, not recommended for this milestone.

Use Option A. Management pages are utility flows, not primary navigation destinations.

App.tsx changes:
```typescript
<Route path="/foods" element={<FoodManager />} />
<Route path="/supplements" element={<SupplementManager />} />
```

No changes to the 5 tab definitions in the `tabs` array.

---

## Resolver Module Update

`resolver.ts` must be updated to handle `SupplementItem` (replacing `RemedyItem | BehaviorItem`):

1. Remove `behavior` branch entirely
2. Replace `REMEDY_MAP` import with `SUPPLEMENT_MAP` from updated `remedies.ts`
3. `resolveAndGroup()` return type removes `behaviors: ResolvedItem[]`
4. `ResolvedItem.raw` type becomes `FoodItem | SupplementItem`
5. `ResolvedItem.type` becomes `"food" | "supplement" | "remedy"`

All existing callers of `resolveItem()` in `DailyPlan.tsx` that render `behavior` type items (currently `TYPE_STYLES.behavior`) need the behavior case removed. Currently, the `SCHEDULE` is empty (`[]`), so there are no actual behavior items rendered — the removal is safe and the impact is zero at runtime.

---

## Build Order (Phase Dependencies)

Dependencies flow strictly downward. Each phase must be complete before the next can begin.

### Phase 1: Data Model Restructure

Modify `src/data/types.ts`:
- Add `FoodIngredient`, `SupplementItem`, `InventoryEntry`, `SupplementRoutine`
- Remove `BehaviorItem`, update `ItemType` union
- Rename `RemedyItem` to `SupplementItem` (or keep both during transition with deprecation)

Modify `src/data/remedies.ts`:
- Remove `BEHAVIORS`, rename `REMEDY_MAP` to `SUPPLEMENT_MAP`
- Export type alias `SupplementItem` pointing to updated type

Modify `src/data/resolver.ts`:
- Remove behavior branch
- Update type refs

Modify `src/pages/SupplementSchedule.tsx` and `DailyPlan.tsx`:
- Remove behavior filter and rendering

**Gate:** TypeScript compiles with zero errors before proceeding.

**Produces:** Clean type foundation; all existing pages still compile and render correctly (with empty data, behavior of `SCHEDULE = []` is unchanged)

### Phase 2: ItemService + GAS upsertById

Build `src/lib/item-service.ts` with food and supplement CRUD (localStorage + Sheets).

Modify `scripts/gas-api.js` to add `upsertById` and `deleteById` actions.

Add `SheetsAPI.upsertById()` and `SheetsAPI.deleteById()` to `src/lib/sheets-api.ts`.

**Produces:** Persistent food/supplement catalog CRUD; GAS supports id-keyed writes

### Phase 3: Food Manager Page

Build `src/pages/FoodManager.tsx`:
- List view of foods from `ItemService`
- Add via nutrition label form
- Build `src/lib/nutrition-db.ts` for USDA FDC ingredient search
- Add via ingredient composition form with dynamic calorie recalculation
- Edit and delete

Add `/foods` route to `App.tsx`. Add navigation link from `DailyPlan.tsx` or `NutritionTracker.tsx`.

**Gate:** Foods can be added, listed, and deleted; data persists across page reload; Sheets sync fires in background.

**Produces:** Working food management

### Phase 4: Supplement Manager Page + Inventory

Build `src/pages/SupplementManager.tsx`:
- List view of supplements
- Add/edit/delete with full metadata form
- Inventory section: purchased quantity, daily consumption, remaining calculation

**Gate:** Supplements can be managed; inventory remaining computed correctly per day.

**Produces:** Working supplement management with inventory tracking

### Phase 5: Routine Generation + SupplementSchedule Overhaul

Build `src/lib/routine-service.ts` with deterministic generation algorithm.

Modify `src/pages/SupplementSchedule.tsx`:
- Replace static array rendering with live routine from `RoutineService`
- Add taken/skipped marking
- Show inventory status badges (remaining count, low stock warning)
- Add "管理補品" button navigating to `/supplements`

**Gate:** Daily routine generates deterministically; same date always shows same supplements; taken marking persists.

**Produces:** Complete supplement routine feature — milestone deliverable

---

## File Change Impact Matrix

| File | Change Type | Risk | Notes |
|------|-------------|------|-------|
| `src/data/types.ts` | Modify — add types, remove `BehaviorItem` | Low | `BehaviorItem` has no runtime instances (empty arrays); TypeScript will flag all call sites |
| `src/data/foods.ts` | Modify — minor additions | Low | Add `getFoodById()`, keep existing exports |
| `src/data/remedies.ts` | Modify — remove BEHAVIORS, rename map | Low | `BEHAVIORS` is empty; rename `REMEDY_MAP` → `SUPPLEMENT_MAP` requires updating `resolver.ts` import |
| `src/data/resolver.ts` | Modify — remove behavior branch, update types | Low | Behavior branch is dead code (empty arrays); TypeScript safety net |
| `src/data/schedule.ts` | No change needed | None | Still `SCHEDULE = []`; `ScheduleSlot` type unchanged |
| `src/lib/data-service.ts` | Modify — transfer food ownership to ItemService; remove remedy/behavior refs | Low | Existing `getFoods()` + `getRemedies()` move to `ItemService`; old callers updated |
| `src/lib/item-service.ts` | New file | None | No existing consumers |
| `src/lib/routine-service.ts` | New file | None | No existing consumers |
| `src/lib/nutrition-db.ts` | New file | None | External API only; no local side effects |
| `src/lib/sheets-api.ts` | Modify — add `upsertById`, `deleteById` | Low | Additive; existing methods unchanged |
| `src/pages/FoodManager.tsx` | New file | None | New route |
| `src/pages/SupplementManager.tsx` | New file | None | New route |
| `src/pages/SupplementSchedule.tsx` | Modify — wire live data, remove behavior | Medium | Behavior filter removal is safe; live data wiring is new functionality |
| `src/pages/DailyPlan.tsx` | Modify — remove behavior rendering | Low | Dead code removal only; empty SCHEDULE means no behavior items existed |
| `src/App.tsx` | Modify — add 2 routes | Low | Additive; existing routes unchanged |
| `scripts/gas-api.js` | Modify — add `upsertById`, `deleteById` | Low | Additive; existing `upsertByDate` unchanged |

---

## Patterns to Follow

### Pattern 1: ItemService mirrors DataService

`ItemService` should be a plain object singleton (not a class), following the exact same pattern as `DataService`:
- Cache-first read
- Sync write to localStorage
- Async fire-and-forget write to Sheets
- Silent `.catch(() => {})` on all Sheets calls
- `cacheGet` / `cacheSet` helpers with `wellness_` prefix

### Pattern 2: Computed fields never stored independently

When `inputMethod === "composed"`, `cal`, `protein`, `fat`, `carbs`, `sodium` on `FoodItem` are always the computed sum of `ingredients`. The save function recalculates them before storing. This is the same principle as `SettingsService` not storing derived TDEE.

### Pattern 3: Deterministic routine generation (not random)

`generateDailyRoutine(supplements, date)` must be a **pure function** — given the same supplements list and date, it always returns the same routine. Use `date` as a rotation index for tag-coverage rotation (e.g., `dayOfYear(date) % alternatives.length`). This is critical for predictability: if the user closes and reopens the app, the same routine appears without requiring a stored state.

### Pattern 4: ID generation

Food and supplement IDs should be stable, user-visible strings — not UUIDs. Pattern: `snake_case` matching existing items like `"chicken_breast_711"`, `"oatmeal_50g"`. For user-created items, use `food_{timestamp}` or `supp_{timestamp}` format so IDs are unique but traceable. Store the ID in Sheets as-is; the GAS `upsertById` function finds rows by `id` column match.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Adding behavior as a first-class category

**What goes wrong:** Behaviors (walking after meals, eating order) are habits, not food or supplements. They have no nutrition data, no inventory, and no routine scheduling semantics. Keeping them creates a confusing type union that every renderer must handle.
**Prevention:** Remove `BehaviorItem` entirely. If behavior tracking is needed in future, it belongs in a separate feature (habits tracker) with its own data model.

### Anti-Pattern 2: Storing computed macro totals in composed food

**What goes wrong:** If `cal`, `protein`, `fat`, `carbs` are editable independent of `ingredients`, they drift out of sync when the user edits an ingredient.
**Prevention:** In composed mode, macro fields are derived-only — always recomputed from `ingredients` on save. The form UI shows live recalculation but never exposes separate editable macro fields.

### Anti-Pattern 3: Routine randomness without seeding

**What goes wrong:** If routine generation uses `Math.random()`, reopening the app after closing regenerates a different routine for the same day. The user cannot predict what to take.
**Prevention:** Use `date` string as a deterministic rotation index. The algorithm is not random — it is a rotation across alternatives.

### Anti-Pattern 4: Inventory decrement on every page load

**What goes wrong:** Eagerly decrementing inventory on page load or on every "mark taken" tap creates double-counting. If a user closes the app mid-session, inventory is already wrong.
**Prevention:** Store `remainingQty` as the point-in-time value at `purchasedDate`. Display remaining = `storedRemaining - daysSincePurchase * dailyConsumption`. Only update `storedRemaining` in Sheets on explicit "補貨" (restock) actions. Daily consumption is a rate, not a transaction log.

### Anti-Pattern 5: Calling USDA FDC API for every keystroke

**What goes wrong:** The `DEMO_KEY` rate limit is 30 req/hr. Debouncing is not optional.
**Prevention:** Debounce ingredient search input by 400ms minimum. Show a spinner. Cache search results in component state for the session (not localStorage — search results are ephemeral). If rate-limited (HTTP 429), show a clear zh-TW error message pointing to getting a free API key.

### Anti-Pattern 6: Seven bottom nav tabs

**What goes wrong:** 7 tabs on a 375px mobile screen are 53px wide each — icons and labels don't fit, the UX breaks.
**Prevention:** Food and supplement management pages are utility flows reached from within the 5 existing tabs via "管理" buttons. They are not top-level navigation destinations.

---

## Scalability Considerations

| Concern | Current | After v2.0 |
|---------|---------|-----------|
| localStorage size | ~5-10 KB (logs + settings) | +food catalog + supplement catalog (~50-100 items = ~20 KB). Still well within 5 MB localStorage limit. |
| Sheets read volume | 6 sheets on page load | 8 sheets (add `supplements`, `supplement_inventory`). Still within GAS free tier. |
| GAS script size | ~160 lines | ~200 lines (add 2 functions). Well within 1 MB limit. |
| Routine generation time | N/A | O(n) over supplement count. At 100 supplements, ~0.1 ms. Not a concern. |
| USDA FDC rate limits | N/A | DEMO_KEY: 30 req/hr. With debounce, a normal user triggers ~5 searches per food add. Rarely hits limit. |

---

## Sources

- Existing codebase analysis: `src/data/types.ts`, `src/data/resolver.ts`, `src/lib/data-service.ts`, `src/lib/item-service.ts`, `src/lib/sheets-api.ts`, `scripts/gas-api.js`, all page components
- Project requirements: `.planning/PROJECT.md` (v2.0, 2026-03-30)
- USDA FoodData Central API: `https://fdc.nal.usda.gov/api-guide.html` — free, no-auth basic search with DEMO_KEY
- Confidence: HIGH — all integration decisions derived directly from reading the existing source files; no external research required for integration architecture. USDA FDC API choice is MEDIUM confidence (verified: free, available, correct data format; rate limits based on official docs).
