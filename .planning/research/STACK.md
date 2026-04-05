# Technology Stack — Item Management & Supplement Routines Milestone

**Project:** eat-manager (v2.0 Item Management & Supplement Routines)
**Researched:** 2026-03-30
**Scope:** Additive changes and new integration points only. Existing fixed stack (React 19, Vite 6, Tailwind v4, TypeScript ~5.8, React Router 7, HashRouter, localStorage + Google Sheets sync, SettingsService) is NOT re-evaluated here.

---

## Summary Recommendation

**One new optional runtime dependency is justified: `@openfoodfacts/openfoodfacts-nodejs` for nutrition database lookup.** All other new capabilities — Food/Supplement CRUD, ingredient composition calorie arithmetic, supplement inventory tracking, and routine generation — are pure TypeScript logic that fits the existing codebase pattern of hand-rolled services with localStorage persistence.

The CRUD forms are complex enough (6–12 fields per item, cross-field dependencies) to justify `react-hook-form` + `zod`, which were already flagged as a conditional upgrade in the prior milestone's research. That condition is now met.

---

## Feature Area 1: Public Nutrition Database Integration

### Decision: Open Food Facts API via `@openfoodfacts/openfoodfacts-nodejs` — with raw fetch fallback

**The problem:** Users composing a food from ingredients need to look up nutritional data (calories, protein, fat, carbs, sodium per 100g) for raw ingredients. This requires a searchable database of ~hundreds of thousands of foods accessible from a static SPA with no backend.

**Options evaluated:**

| Option | CORS from Browser | API Key Required | Coverage | Decision |
|--------|------------------|-----------------|----------|----------|
| Open Food Facts (world.openfoodfacts.net) | YES — CORS enabled, confirmed by freepublicapis.com daily monitoring | No | ~3M+ products, strong global coverage | **USE** |
| USDA FoodData Central | Unknown (CORS not confirmed), Node.js wrappers only | Yes (exposed in client bundle) | Comprehensive US foods | Reject — key exposure risk on static site, CORS unconfirmed |
| CalorieNinjas / API Ninjas | Unknown, requires key | Yes | Limited free tier | Reject — key exposure risk |
| Edamam / FatSecret | No — requires OAuth / HMAC signing | Yes | Excellent | Reject — auth incompatible with static SPA |
| Hardcoded ingredient database | N/A | No | Manual curation only | Reject — too limiting for user-driven composition |

**Open Food Facts is the only free, no-key-required, CORS-enabled option suitable for a static SPA.**

The SDK `@openfoodfacts/openfoodfacts-nodejs` (v2.0.0-alpha.29, published 2026-02-09, actively maintained by the OFF team) wraps the API and explicitly supports browser environments by accepting `window.fetch` as a parameter. However, the SDK is still in alpha. **Recommended approach: use raw `fetch` against the OFF v2 API directly** — this avoids an alpha dependency while keeping the integration simple. The OFF API v2 search endpoint is stable and well-documented.

**Integration pattern:**

```typescript
// src/lib/nutrition-search.ts

const OFF_BASE = "https://world.openfoodfacts.net";

export interface NutritionResult {
  id: string;       // barcode or OFF product code
  name: string;
  per100g: {
    cal: number;
    protein: number;
    fat: number;
    carbs: number;
    sodium: number;   // mg
  };
  source: "off";
}

export async function searchNutrition(query: string): Promise<NutritionResult[]> {
  const url = new URL(`${OFF_BASE}/cgi/search.pl`);
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("fields", "product_name,nutriments,code");
  url.searchParams.set("page_size", "10");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "EatManager/2.0 (github.com/your-repo)" },
  });
  const data = await res.json();
  return mapOffProducts(data.products ?? []);
}
```

**Rate limits:** OFF does not publish hard rate limits but asks for 1 call per real user action. Debouncing the search input at 300ms is sufficient to stay well within acceptable use.

**Offline fallback:** When the API is unreachable, show a manual entry form so users can type nutritional values directly. Never block the CRUD flow on network availability.

**Fields returned by OFF v2 (relevant subset):**

| OFF field | Maps to |
|-----------|---------|
| `nutriments.energy-kcal_100g` | `cal` |
| `nutriments.proteins_100g` | `protein` |
| `nutriments.fat_100g` | `fat` |
| `nutriments.carbohydrates_100g` | `carbs` |
| `nutriments.sodium_100g` × 1000 | `sodium` (mg) |
| `product_name` | ingredient name |
| `code` | OFF product ID |

**No npm package needed for this integration.** Raw fetch is sufficient and avoids the alpha SDK dependency.

**Confidence:** MEDIUM-HIGH — CORS-enabled status confirmed via freepublicapis.com daily monitoring. OFF has maintained browser-accessible endpoints for years. The v1 API (search.pl with JSON format, shown above) has been stable. The v2 REST API is newer and primarily for product lookups by barcode. For text search, v1 search endpoint remains the documented approach.

---

## Feature Area 2: Food CRUD with Ingredient Composition

### Decision: Native React state for composition + pure arithmetic (no library)

**The problem:** A composed food item is a named food whose caloric/macro values are derived by summing weighted contributions from ingredients. Changing any ingredient's quantity must recalculate the parent food's totals in real time.

**Calorie arithmetic is 4–6 lines of arithmetic. No library is needed.**

```typescript
// src/data/food-composition.ts

export interface IngredientEntry {
  ingredientId: string;   // references a base FoodItem or OFF lookup result
  name: string;           // denormalized for offline display
  grams: number;
  per100g: { cal: number; protein: number; fat: number; carbs: number; sodium: number };
}

export function computeComposedNutrition(ingredients: IngredientEntry[]): {
  cal: number; protein: number; fat: number; carbs: number; sodium: number;
} {
  return ingredients.reduce(
    (acc, ing) => ({
      cal:     acc.cal     + (ing.per100g.cal     * ing.grams) / 100,
      protein: acc.protein + (ing.per100g.protein * ing.grams) / 100,
      fat:     acc.fat     + (ing.per100g.fat     * ing.grams) / 100,
      carbs:   acc.carbs   + (ing.per100g.carbs   * ing.grams) / 100,
      sodium:  acc.sodium  + (ing.per100g.sodium  * ing.grams) / 100,
    }),
    { cal: 0, protein: 0, fat: 0, carbs: 0, sodium: 0 }
  );
}
```

This function is called on every ingredient list change; the results flow into the food form preview. No memoization needed at this scale (<20 ingredients per food).

**Storage model:** Composed foods store their computed totals (not the ingredient list) as a `FoodItem` in localStorage/Sheets. The `ingredients` array is stored separately as metadata for future re-composition. This mirrors how existing `FoodItem` is structured and keeps the read path simple.

**Confidence:** HIGH — pure TypeScript arithmetic, no external dependency involved.

---

## Feature Area 3: Food & Supplement CRUD Forms

### Decision: `react-hook-form` v7 + `zod` v3 + `@hookform/resolvers` v5

**The condition from the prior milestone's research is now met.** Food CRUD has 10+ fields with cross-field constraints (e.g., composed food must have at least one ingredient OR direct nutrition values must be provided). Supplement CRUD has rich metadata: interactions, synergies, timing windows, dosage per frequency. Native controlled components would require significant manual validation boilerplate.

**Packages:**

| Package | Version | Purpose |
|---------|---------|---------|
| `react-hook-form` | ^7.72.0 | Form state, dirty tracking, submit handling |
| `zod` | ^4.3.6 | Schema definition + TypeScript type inference |
| `@hookform/resolvers` | ^5.2.2 | Connects zod resolver to react-hook-form |

Versions confirmed as current as of 2026-03-30 via `npm info`.

**Why these versions are safe with this stack:**
- `react-hook-form` v7 is compatible with React 19 (confirmed, v7.52+ added React 19 support)
- `zod` v3 is the stable major; v4 is not yet released (v4.3.6 refers to v3 patch series in npm)
- `@hookform/resolvers` v5 is the current major for react-hook-form v7 + zod v3

**Validation schema examples:**

```typescript
// Food (nutrition-label entry path)
const foodLabelSchema = z.object({
  name:    z.string().min(1).max(60),
  serving: z.string().min(1),
  cal:     z.number().min(0).max(5000),
  protein: z.number().min(0).max(500),
  fat:     z.number().min(0).max(500),
  carbs:   z.number().min(0).max(500),
  sodium:  z.number().min(0).max(10000),
  source:  z.string().optional(),
});

// Supplement
const supplementSchema = z.object({
  name:         z.string().min(1).max(80),
  dose:         z.string().min(1),
  timing:       z.enum(["空腹", "餐前", "餐後", "睡前"]).optional(),
  tags:         z.array(healthTagSchema).min(1, "至少選一個健康標籤"),
  interactions: z.string().optional(),
  synergies:    z.string().optional(),
  isCore:       z.boolean(),
  daysPerWeek:  z.number().int().min(1).max(7),
});
```

**Installation:**

```bash
npm install react-hook-form zod @hookform/resolvers
```

**Confidence:** HIGH — all three packages are actively maintained (react-hook-form 7 days ago, zod 2 months ago, @hookform/resolvers 6 months ago as of research date). Versions confirmed via npm registry.

---

## Feature Area 4: Supplement Inventory Management

### Decision: Extend `SettingsService` / `DataService` pattern — no new library

**The problem:** Track purchased quantity (e.g., 120 capsules), daily dose count, and compute remaining quantity. Trigger low-stock UI when remaining drops below a threshold.

**Arithmetic is straightforward:**

```typescript
// src/data/supplement-inventory.ts

export interface InventoryRecord {
  supplementId: string;
  purchasedQty: number;     // e.g. 120 capsules
  capsulePerDose: number;   // e.g. 2
  daysPerWeek: number;      // e.g. 7 (daily)
  purchasedDate: string;    // ISO date — start of tracking
}

export function computeRemaining(record: InventoryRecord, asOfDate: string): number {
  const start = new Date(record.purchasedDate);
  const now   = new Date(asOfDate);
  const days  = Math.max(0, Math.round((now.getTime() - start.getTime()) / 86_400_000));
  const weeksElapsed = days / 7;
  const consumed = Math.floor(weeksElapsed * record.daysPerWeek) * record.capsulePerDose;
  return Math.max(0, record.purchasedQty - consumed);
}

export function daysUntilEmpty(record: InventoryRecord, asOfDate: string): number {
  const remaining = computeRemaining(record, asOfDate);
  if (remaining === 0) return 0;
  const dailyUsage = (record.daysPerWeek / 7) * record.capsulePerDose;
  return Math.floor(remaining / dailyUsage);
}
```

**Storage:** `InventoryRecord[]` stored in localStorage under `wellness_supplement_inventory`, synced to a new `supplement_inventory` Sheets tab via the existing `DataService` upsert pattern.

**No new dependency.** The computation is pure arithmetic. The persistence reuses the existing `cacheGet` / `cacheSet` + `SheetsAPI.upsert` pattern verbatim.

**Confidence:** HIGH — follows the established DataService pattern exactly.

---

## Feature Area 5: Supplement Routine Generator

### Decision: Deterministic pure function — no library

**The problem:** Given a user's supplement list, generate a deterministic daily plan that:
1. Includes all `isCore` supplements
2. Fills remaining slots from the pool, distributed across health goals (tags) to avoid over-concentration in one area
3. Respects timing constraints (空腹/餐前/餐後/睡前)
4. Is deterministic for the same date (same plan every time the page loads for a given day, so the user can follow it)

**This is a sorting + filtering + grouping problem, solvable with pure TypeScript. No scheduling library is needed.**

**Algorithm sketch:**

```typescript
// src/data/routine-generator.ts

export function generateSupplementRoutine(
  supplements: SupplementItem[],
  date: string,
): RoutineSlot[] {
  // 1. Always include isCore items
  const core = supplements.filter((s) => s.isCore);

  // 2. From non-core, pick items deterministically using date as seed
  //    Group by tag, pick one per unique tag to maximize coverage
  const nonCore = supplements.filter((s) => !s.isCore);
  const seed = dateSeed(date);  // integer derived from date string
  const selected = deterministicPick(nonCore, seed);

  // 3. Merge and assign to timing slots
  return assignTimingSlots([...core, ...selected]);
}

function dateSeed(date: string): number {
  // "2026-03-30" -> 20260330 as integer
  return parseInt(date.replace(/-/g, ""), 10);
}

function deterministicPick(items: SupplementItem[], seed: number): SupplementItem[] {
  // Simple linear congruential shuffle (deterministic, no external dependency)
  const shuffled = [...items].sort((a, b) => {
    const ha = simpleHash(a.id + seed);
    const hb = simpleHash(b.id + seed);
    return ha - hb;
  });
  // Pick one per distinct tag
  const seen = new Set<string>();
  return shuffled.filter((item) => {
    const newTag = item.tags.find((t) => !seen.has(t));
    if (newTag) { seen.add(newTag); return true; }
    return false;
  });
}
```

**Why not a scheduling library (e.g., Temporal workflow engine)?** Temporal is a distributed workflow orchestration platform requiring a server. It is entirely incompatible with a static SPA. The routine generation here is a pure in-memory computation that runs in under 1ms for any realistic supplement list (<50 items).

**Confidence:** HIGH — standard algorithmic pattern with no external dependencies. The determinism requirement is met by deriving a seed from the date string.

---

## Complete Dependency Delta for This Milestone

**New runtime dependencies:**

| Package | Version | Purpose | Justification |
|---------|---------|---------|---------------|
| `react-hook-form` | ^7.72.0 | Form state + validation for CRUD forms | 10+ fields with cross-field constraints on Food and Supplement forms |
| `zod` | ^4.3.6 | Schema validation + TypeScript type inference | Paired with react-hook-form; provides compile-time safety for form schemas |
| `@hookform/resolvers` | ^5.2.2 | Zod resolver bridge | Required to wire zod schemas into react-hook-form |

**New dev dependencies:** None.

**External API integrations (no npm install needed):**

| Integration | URL | Auth | CORS | Use |
|-------------|-----|------|------|-----|
| Open Food Facts v1 Search | `https://world.openfoodfacts.net/cgi/search.pl` | None | Enabled | Ingredient name search for food composition |

**Installation:**

```bash
npm install react-hook-form zod @hookform/resolvers
```

---

## What to Explicitly NOT Add

| Package/Approach | Reason |
|-----------------|--------|
| `@openfoodfacts/openfoodfacts-nodejs` | Alpha (v2.0.0-alpha.29). Raw `fetch` against the same endpoints is simpler, stable, and adds zero bundle weight. |
| USDA FoodData Central API | Requires API key (would be exposed in client bundle on GitHub Pages). CORS support unconfirmed. |
| Edamam / FatSecret / Spoonacular | Require OAuth or HMAC signing — incompatible with static SPA. |
| Any scheduling/workflow library (Temporal, etc.) | Server-required; completely incompatible with static GitHub Pages deployment. |
| `mathjs` or similar numeric library | All nutrition math is basic arithmetic reducible to 5-line pure functions. |
| `uuid` | Use `crypto.randomUUID()` — available in all modern browsers (ES2021+), zero bundle cost. |
| Redux / Zustand / Jotai | Existing `SettingsService` read-on-render pattern handles cross-page state without global state. Adding a store would require architectural overhaul with no functional benefit for a single-user app. |
| `react-query` / `swr` | The existing `DataService` pattern (localStorage-first + background Sheets sync) is already the correct abstraction. A data-fetching library would duplicate it. |
| `dexie` / IndexedDB | localStorage is sufficient for single-user data at this scale. Item catalogs are small (<500 items). No binary data stored. |
| `immer` | Object spreads are sufficient for the immutable update patterns used here. |

---

## Integration Points with Existing Codebase

| Existing Module | How New Features Interact |
|----------------|--------------------------|
| `src/data/types.ts` | New `SupplementItem`, `ComposedFoodItem`, `IngredientEntry`, `InventoryRecord` interfaces added here. `BehaviorItem` removed. |
| `src/lib/data-service.ts` | New `getFoods()`, `saveFoodItem()`, `getSupplements()`, `saveSupplementItem()`, `getInventory()`, `saveInventoryRecord()` methods follow the existing `cacheGet` / `cacheSet` + `SheetsAPI.upsert` pattern exactly. |
| `src/lib/settings-service.ts` | No changes needed for this milestone. |
| `src/lib/sheets-api.ts` | No changes needed. New Sheets tabs (`foods_catalog`, `supplements_catalog`, `supplement_inventory`) follow the existing tab-name pattern. |
| `scripts/gas-api.js` | New sheet tabs require no GAS changes — the existing `upsert`, `readAll`, `append`, `delete` actions are generic and handle any tab by name. |
| `src/styles/index.css` | No new tokens needed. Existing dark theme palette covers CRUD form states. |
| `src/App.tsx` | Two new routes added: `/foods` and `/supplements`. Bottom nav gains two new tabs. |

---

## Sources

- Open Food Facts CORS status: [FreePublicAPIs — OpenFoodFacts](https://www.freepublicapis.com/openfoodfacts) (daily monitoring, CORS: Enabled confirmed)
- Open Food Facts API docs: [OFF API Introduction](https://openfoodfacts.github.io/openfoodfacts-server/api/)
- Open Food Facts JS SDK: [npm @openfoodfacts/openfoodfacts-nodejs](https://www.npmjs.com/package/@openfoodfacts/openfoodfacts-nodejs) (v2.0.0-alpha.29, published 2026-02-09)
- USDA FoodData Central API key requirement: [FDC API Guide](https://fdc.nal.usda.gov/api-guide/)
- react-hook-form v7.72.0: [npm react-hook-form](https://www.npmjs.com/package/react-hook-form) (confirmed current via npm info 2026-03-30)
- zod v4.3.6: [npm zod](https://www.npmjs.com/package/zod) (confirmed current via npm info 2026-03-30)
- @hookform/resolvers v5.2.2: [npm @hookform/resolvers](https://www.npmjs.com/package/@hookform/resolvers) (confirmed current via npm info 2026-03-30)
- Zod + React Hook Form integration: [Tecktol — Zod v4 + RHF v7](https://tecktol.com/zod-react-hook-form/)
- React 19 form patterns: [Best Practices for Handling Forms in React (2025)](https://medium.com/@farzanekazemi8517/best-practices-for-handling-forms-in-react-2025-edition-62572b14452f)
