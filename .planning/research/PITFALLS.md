# Domain Pitfalls

**Domain:** Food/supplement CRUD, ingredient composition, supplement inventory tracking, and routine generation — React SPA backed by Google Sheets via Apps Script
**Researched:** 2026-03-30
**Scope:** Adding item management features to an existing offline-first static SPA. Focused on integration pitfalls specific to the Google Sheets backend, public nutrition APIs called from a browser, supplement interaction modelling, and deterministic routine generation.

---

## Critical Pitfalls

Mistakes that cause rewrites, silent data corruption, or security holes that must be addressed before they are designed around.

---

### Pitfall 1: Nutrition API Key Embedded in Client-Side Bundle Is Publicly Accessible

**What goes wrong:**
USDA FoodData Central requires an API key with every request and explicitly states the key holder is responsible for preventing public exposure. If the key is placed in a Vite `.env` file as `VITE_FDC_API_KEY`, Vite's build pipeline inlines it into the JavaScript bundle — which is served statically from GitHub Pages and is trivially extractable from any browser DevTools or by crawling the source. The FoodData Central API enforces a **1,000 requests/hour per IP** rate limit; a leaked key redirects that quota to arbitrary users.

**Why it happens:**
Vite's `VITE_` prefix is a convenience for making env vars available in the browser, but that convenience is indistinguishable from publication. There is no server-side proxy in this architecture to shield the key.

**Consequences:**
- Leaked key exhausts your hourly quota, breaking ingredient lookup for the actual user
- USDA can revoke the key if misuse is detected, requiring a new key and a rebuild
- API key exposure at scale has been documented in 3,000+ production GitHub Pages sites

**Prevention:**
Two viable approaches for a static SPA:
1. **Route through the existing GAS proxy** — add a `nutrition_lookup` action to `gas-api.js` that holds the FDC API key server-side in Apps Script's `PropertiesService`. The browser calls the GAS endpoint with a food name; GAS calls FDC with the key. The GAS URL is already a user-configured secret, so this adds no new exposure surface.
2. **Use Open Food Facts instead of USDA FDC** — Open Food Facts is a read-only, no-key-required API. Product lookups (`https://world.openfoodfacts.org/api/v2/product/{barcode}`) and search endpoints work without authentication and support CORS for browser requests. Rate limit is 100 req/min for product GETs, 10 req/min for search — well within normal usage.

**Warning signs:**
- `VITE_FDC_API_KEY` appears in `src/` files — it will be in the built bundle
- `/dist/assets/*.js` is grep-searchable for the key after `npm run build`

**Phase:** Must be decided before any nutrition API code is written. Architecture decision shapes the integration phase.

---

### Pitfall 2: USDA FoodData Central Does Not Reliably Support CORS from Browser Fetch

**What goes wrong:**
USDA's official API guide does not document CORS headers for browser-based requests. A documented GitHub issue (`USDA/USDA-APIs#79`) shows the API has at times returned `Access-Control-Allow-Origin: http://localhost:3000, *` — a malformed header with two values that browsers reject as a CORS violation. From a GitHub Pages origin (`https://your-name.github.io`), this fails silently in fetch with a generic CORS error and no useful diagnostic.

**Why it happens:**
USDA FDC is designed for server-to-server use. Browser direct-call is an afterthought. CORS configuration bugs in federal APIs are rarely prioritised.

**Consequences:**
An integration that works in server-side Node.js tests (no CORS enforcement) fails entirely in the browser. If this is discovered late, the entire ingredient lookup feature must be re-architected.

**Prevention:**
- Do not rely on USDA FDC for browser-direct calls. Use the GAS proxy approach (see Pitfall 1) or substitute Open Food Facts, which explicitly supports browser access.
- If FDC must be used directly, verify CORS headers with `curl -I 'https://api.nal.usda.gov/fdc/v1/foods/search?query=apple&api_key=...'` and inspect for a clean `Access-Control-Allow-Origin: *` before committing to the integration.

**Warning signs:**
- `fetch()` call to `api.nal.usda.gov` throws `TypeError: Failed to fetch` in the browser even though the same URL works via curl
- DevTools console shows a CORS preflight failure (OPTIONS request blocked)

**Phase:** Feasibility must be verified in the first integration spike. Build a single working `fetch()` call in the browser before writing any ingredient lookup UI.

---

### Pitfall 3: Apps Script Cold Starts Cause 3–10 Second Response Latency on First Call

**What goes wrong:**
Apps Script Web Apps have a cold start penalty of several seconds when the script instance has been idle. For CRUD operations on food and supplement items, this means the first operation in a session — save new food item, fetch item list — appears to hang. The existing codebase swallows all Sheets errors with `.catch(() => {})`, so there is no user feedback during the wait.

**Why it happens:**
Apps Script runs on shared Google infrastructure. Instances are not kept warm between requests. The effect is consistently observed in community reports and Google's own issue tracker.

**Consequences:**
- Users believe the save action failed and submit the form twice, creating duplicate records in the Sheet
- The first `readAll()` for the item catalog appears to return nothing (cache is stale), then updates silently in the background — the user sees a blank list, then a populated one 5+ seconds later
- Form double-submission is especially dangerous for inventory tracking where quantity changes must be idempotent

**Prevention:**
- For all write operations (create/update/delete), optimistically update localStorage first and show a success state immediately. The Sheets sync is background-only. This is the existing pattern for weight and nutrition logging and must be extended to item CRUD.
- Add a visible loading indicator for the initial data fetch — do not show an empty list as if there are no items.
- Make GAS write handlers idempotent: supplement and food upsert must key on a stable ID, not append blindly. The existing `upsert` action in `gas-api.js` already uses date as the key — replace with the item ID for catalog data.

**Warning signs:**
- POST to GAS takes 5+ seconds in DevTools Network tab on first call after page load
- Network tab shows two identical POST requests within seconds of each other (user double-submit)

**Phase:** Phase covering food CRUD. Update `gas-api.js` to support ID-keyed upsert for catalog items.

---

### Pitfall 4: Ingredient Composition Allows Circular References — Infinite Recalculation Loop

**What goes wrong:**
If "food composed from ingredients" allows any food to be used as an ingredient in another food, it is possible to create a cycle: FoodA contains FoodB, FoodB contains FoodA. Any recursive calorie recalculation will loop infinitely, eventually crashing the browser tab.

**Why it happens:**
Ingredient composition is naturally modelled as a directed graph. Developers implement the graph traversal without adding cycle detection because cycles "seem impossible in practice". One user interaction later, they are not.

**Consequences:**
Browser tab hangs or crashes. If the cyclic data is persisted to localStorage and the recalculation runs on page load, the app becomes permanently unresponsive for that user.

**Prevention:**
- Enforce a shallow composition model: ingredients must be **atomic** items (nutrition-label foods with no sub-ingredients). Composed foods cannot be used as ingredients in other composed foods.
- Implement this constraint at the data layer: when selecting ingredients, filter out any food whose `source` is `"composed"`.
- If deep nesting is ever required, add a depth limit (max 2 levels) and a visited-set cycle check before persisting.

**Warning signs:**
- Ingredient selection UI does not filter out composed foods
- Calorie recalculation function is recursive without a visited-set parameter

**Phase:** Food composition implementation phase, before the ingredient selector UI is built.

---

### Pitfall 5: Supplement Inventory Quantity Drifts from Actual Consumption — No Deduction Event Log

**What goes wrong:**
The naive inventory model is: `remaining = purchased - (dailyDose * daysSincePurchase)`. This drifts immediately when the user skips doses, changes doses, or purchases additional stock mid-cycle. After a few weeks the displayed "14 days remaining" is meaningless.

**Why it happens:**
Event-sourced inventory (deduct on each actual consumption log) is the correct model but requires more data structure. The estimate-based model is simpler and appears correct on day one.

**Consequences:**
Users run out of supplements unexpectedly or over-purchase. The inventory feature loses trust and is ignored.

**Prevention:**
- Model inventory as two components: `purchasedUnits` (manually entered on purchase) and a deduction log (one entry per day the routine is completed).
- `remaining = purchasedUnits - sum(deduction_log.units)` — derived, never stored directly.
- The routine completion action (user marks "took today's supplements") writes a deduction event. Never mutate `purchasedUnits` on routine completion.
- This means supplement logs (the existing `supplement_log` sheet) must record consumed units per item per day, not just a free-text notes field.

**Warning signs:**
- `remaining` is stored as a field on the supplement record (it will silently become stale)
- Inventory calculation uses `daysSincePurchase` arithmetic rather than an actual consumption log

**Phase:** Supplement inventory design phase. Data model must be correct before any UI is built.

---

### Pitfall 6: Google Sheets Row-per-Item Catalog Becomes Read-Bottleneck as Items Grow

**What goes wrong:**
The existing `SheetsAPI.readAll(sheet)` pattern returns every row in a sheet on every call. For the foods catalog, this is currently bounded by the hardcoded dataset size. Once users can add their own foods and supplements, the sheets grow without bound. Apps Script reads the entire sheet into memory (1 `getValues()` call), serialises it to JSON, and returns it in a single HTTP response. At ~500 rows per sheet, this begins to cause noticeable latency; at ~2,000 rows the 6-minute execution limit becomes a risk under load.

**Why it happens:**
`getDataRange().getValues()` is the standard Apps Script pattern. It is fast for small sheets. There is no pagination mechanism in the existing GAS API.

**Consequences:**
- Initial load time grows proportionally with catalog size
- Users with large supplement collections (50+ items) see slow initial renders
- Background sync fires on every page load — multiplied across tabs, this generates redundant GAS executions

**Prevention:**
- Add a `updatedAfter` filter parameter to the GAS `read` action so the client can fetch only items modified since its last sync timestamp. Store a `last_synced_at` value in localStorage and include it in catalog fetch requests.
- Cache catalog data aggressively: only invalidate on explicit user CRUD, not on every page load. The current pattern fires `SheetsAPI.readAll()` in the background on every `getFoods()` and `getRemedies()` call — acceptable for read-only logs, wasteful for a catalog that changes rarely.
- Set a soft limit of 500 items per catalog sheet with a UI warning, not a silent failure.

**Warning signs:**
- `SheetsAPI.readAll()` is called on every page mount without a staleness check
- No `updatedAt` field on food/supplement records

**Phase:** Data model phase. Add `updatedAt` and `last_synced_at` before building CRUD UI.

---

## Moderate Pitfalls

---

### Pitfall 7: Open Food Facts Search Returns Asian Food Data as Sparse or Missing

**What goes wrong:**
Open Food Facts is crowd-sourced. Coverage for Western packaged foods is excellent. Coverage for Taiwanese and East Asian foods — particularly traditional ingredients like 燕麥 (oats), 豆腐 (tofu), 山藥 (yam), and 小米 (millet) — is sparse and often missing calorie data. Returning an empty result or a result with `null` nutrients silently produces 0-calorie foods.

**Why it happens:**
Open Food Facts relies on contributor uploads. Taiwan's food market has fewer contributors than the US/EU.

**Consequences:**
Users search for common local ingredients and find nothing, or find records with incomplete nutritional data. The ingredient lookup feature feels broken for the target audience.

**Prevention:**
- Treat the public API as a **supplement** to a curated local fallback, not as the primary source. Maintain a hardcoded seed list of common Taiwanese ingredients with verified nutrition data.
- When an API result has `null` for energy/calories, surface this clearly: "營養資料不完整，請手動輸入熱量" rather than defaulting to 0.
- Allow manual calorie entry as a fallback path — the API lookup path should never be the only way to add a food.

**Warning signs:**
- No fallback UI for `cal: null` from API results
- Taiwanese staples (米飯, 地瓜, 豆類) are not in the seed catalog

**Phase:** Nutrition API integration phase.

---

### Pitfall 8: Supplement Interaction Data Encoded as Pairwise Flat List Becomes Unmanageable

**What goes wrong:**
Supplement interactions are naturally modelled as a graph (node = supplement, edge = interaction). A flat list of pairs (`{ a: "magnesium", b: "calcium", type: "reduces_absorption" }`) seems simple for 5 supplements. At 20 supplements there are up to 190 unique pairs. Querying "what does zinc interact with?" requires scanning every pair. Adding a new supplement requires manually defining pairs with every existing supplement.

**Why it happens:**
Pairwise flat lists are the first instinct for interaction data. The complexity growth (O(n²)) is not felt during initial implementation.

**Consequences:**
- The interaction lookup function runs through hundreds of entries for each routine generation call
- Maintaining the interaction list becomes a data entry burden that is silently abandoned, leaving the feature presenting incomplete data
- Conflicting guidance: calcium reduces magnesium absorption, but the interaction direction matters (take separately vs. avoid entirely)

**Prevention:**
- Model interactions as a map keyed by supplement ID: `{ [supId]: { conflicts: string[], synergies: string[], separateBy: number } }`. Each supplement stores its own interaction profile.
- Enforce unidirectional consistency: if supplement A conflicts with B, both A's and B's records must list the conflict. Write a validation function that checks bidirectional consistency on save.
- Keep the interaction data small and explicit: do not attempt to model every known supplement interaction. Cover only the interactions relevant to the user's actual supplement list.
- Source: real interactions documented at medical grade include calcium/magnesium (absorption competition), zinc/copper (depletes copper), fat-soluble vitamins requiring dietary fat (A, D, E, K), and iron/vitamin C (enhancer, not conflict).

**Warning signs:**
- Interaction data stored as a flat array of `{ a, b, type }` objects
- No validation that A→B and B→A relationships are consistent
- Interaction lookup requires `Array.find()` scanning all pairs rather than `O(1)` map lookup

**Phase:** Supplement data model phase.

---

### Pitfall 9: Routine Generator Produces No-Schedule Result When Interactions Are Over-Constrained

**What goes wrong:**
A greedy constraint-satisfaction routine generator schedules supplements into time slots (morning/midday/evening/night) while satisfying timing rules (with food, on empty stomach) and avoiding co-administration of conflicting supplements. If the user's supplement list has enough conflicts and timing constraints, the scheduler exhausts all valid slot assignments and returns an empty or partial plan — with no explanation.

**Why it happens:**
Greedy algorithms work from the most-constrained item first. If two highly-constrained supplements both require morning/empty-stomach, the second one cannot be placed and the scheduler silently skips it or returns null.

**Consequences:**
User's supplement routine silently omits items. User believes they are taking all their supplements but is not. This is a health-critical silent failure.

**Prevention:**
- The routine generator must never silently omit supplements. If a supplement cannot be scheduled within the constraints, report it explicitly: "無法排入今日計劃，時間衝突: [名稱]".
- Relax constraints in order of priority: timing preference (prefer morning) is soft; absorption conflict (take separately) is hard. Implement two passes — first with all constraints, then with soft constraints removed — and surface what was relaxed.
- At reasonable supplement counts (5–15 items), a greedy approach is fast enough. Only switch to backtracking search if the greedy pass fails.

**Warning signs:**
- Routine generator function returns a schedule object without a list of unscheduled items
- No UI element shows "items not scheduled today" when conflicts prevent full coverage

**Phase:** Routine generator implementation phase.

---

### Pitfall 10: localStorage Size Limit Exceeded When Storing Full Food Composition Data

**What goes wrong:**
The existing codebase stores JSON-stringified arrays in localStorage. A composed food record includes an array of ingredients, each with full nutritional data. A supplement record includes interaction maps, timing metadata, dosage history, and purchase logs. At 100+ food items and 30+ supplements, the total localStorage footprint exceeds the browser's typical 5–10 MB quota. Writes silently fail (the existing `cacheSet` already catches this with `console.warn`), and the stale version of the data is served forever.

**Why it happens:**
localStorage is designed for small user preferences, not catalog data. The current app's data volume is low because data is hardcoded. User-added CRUD removes that ceiling.

**Consequences:**
- A user who adds many items reaches the storage limit silently
- Subsequent writes fail without user notification (current code logs `console.warn` only)
- The catalog shown in the UI is frozen at the last successfully cached state

**Prevention:**
- Store the item catalog in localStorage with a size budget: cap food catalog at 200 items and supplement catalog at 50 items with a visible count in the management UI.
- Do not embed full nutritional data inline in the composition record. Store ingredient references by ID and look up nutrition from the catalog at computation time.
- For inventory logs (deduction events), store only the last 365 entries per supplement; older entries can be in Sheets only.
- Surface the storage warning when the write fails — replace the silent `console.warn` with an in-app notification in the item management context.

**Warning signs:**
- `cacheSet` silently catches `QuotaExceededError` in the existing code — this error path will be hit under real data loads
- Full nutritional data objects embedded inside composition records rather than referenced by ID

**Phase:** Data model phase. Establish storage budget and ID-reference pattern before building CRUD.

---

### Pitfall 11: Item ID Namespace Collision Between Hardcoded Catalog and User-Created Items

**What goes wrong:**
The existing hardcoded data uses manually assigned string IDs like `"chicken_breast_711"`, `"mung_barley_soup"`, `"acv_water"`. User-created items need unique IDs. If user-created item IDs can collide with hardcoded IDs (e.g., a user creates a food and the system assigns an ID that matches a hardcoded item), the resolver returns the wrong item for plans that reference the old ID.

**Why it happens:**
ID generation for user data is an afterthought when the system starts with hardcoded data. Sequential integers (`food_001`) can collide with domain-name IDs.

**Consequences:**
A user's custom food silently shadows a hardcoded food with the same ID. Daily plans referencing the old ID now display the wrong item.

**Prevention:**
- Use a namespaced ID scheme for user-created items: `"user_food_<timestamp>"` or `"uf_<uuid>"`. Never use the same namespace as hardcoded items.
- The resolver lookup order must be explicit: check user catalog first, then hardcoded catalog, and log a warning on ID collision rather than silently preferring one.
- Before shipping CRUD, audit all existing hardcoded IDs for the pattern they use and ensure the user ID generator cannot produce the same pattern.

**Warning signs:**
- User-created item IDs are numeric integers or short strings that could match hardcoded patterns
- `resolveItem()` does not distinguish between hardcoded and user-created sources

**Phase:** Data model restructure phase.

---

### Pitfall 12: React Router Navigation Discards Unsaved CRUD Form State

**What goes wrong:**
React Router DOM v7's `HashRouter` does not trigger the browser's native `beforeunload` dialog. A user filling in a long food composition form (name, serving size, 6 macro fields, ingredient list) who taps the bottom navigation bar loses all entered data instantly. There is no native SPA guard.

**Why it happens:**
SPA navigation bypasses browser history events. React Router v7 provides `useBlocker` for this purpose but it must be explicitly wired to every form.

**Consequences:**
Users lose work. CRUD forms for composed foods with many ingredients are particularly painful to re-enter.

**Prevention:**
- Use React Router v7's `useBlocker` hook on the food/supplement creation and edit forms. Block navigation when the form has unsaved changes (`formState.isDirty`).
- Trigger the blocker on bottom-nav tab clicks (which are React Router links) and on browser back button.
- Show a zh-TW confirmation dialog: "資料尚未儲存，確定要離開？"

**Warning signs:**
- CRUD forms do not import `useBlocker` from `react-router-dom`
- Tapping bottom nav during form entry silently discards data with no warning

**Phase:** Food CRUD UI phase.

---

## Minor Pitfalls

---

### Pitfall 13: Apps Script doPost Responds 302 Redirect Instead of JSON After Re-deployment

**What goes wrong:**
When an Apps Script Web App is redeployed (new version), the `/exec` URL may temporarily redirect to a new deployment URL. `fetch()` follows the redirect, but Apps Script's CORS headers are not reliably included on the redirect response. The browser blocks the redirected response, and the app receives an opaque network error rather than a meaningful API error.

**Prevention:**
- After every Apps Script redeployment, test the Web App URL directly in the browser and verify it returns JSON (not an HTML redirect page).
- Pin the deployment to "Execute as: me" + "Anyone can access" and use a stable versioned deployment URL rather than the `/dev` URL.

**Phase:** Initial GAS setup phase.

---

### Pitfall 14: Open Food Facts Search Returns Multiple Products for the Same Ingredient — User Must Choose

**What goes wrong:**
A search for "豆腐 (tofu)" returns 40+ results with wildly different calorie values (30 kcal/100g to 120 kcal/100g) depending on firmness, brand, and country of origin. If the app auto-selects the first result, the nutrition data is arbitrary. If the app presents all results, the UI becomes a disambiguation exercise that slows ingredient entry.

**Prevention:**
- Search returns a ranked list; the user selects the specific product.
- Show serving size and calorie density prominently in search results to enable quick disambiguation.
- Once a user selects a result, save the FDC/OFF product ID alongside the nutritional values so the same lookup is not repeated and the source is auditable.

**Phase:** Nutrition API integration phase.

---

### Pitfall 15: Supplement Routine Determinism Breaks When System Date Changes

**What goes wrong:**
If the routine generator uses the current date as a seed for any pseudo-random selection (e.g., rotating which supplement to take on which day of a cycling protocol), the "deterministic" plan changes at midnight. A user who generates the routine at 11:58 PM and refers to it at 12:05 AM sees a different plan.

**Prevention:**
- Persist the generated routine for the day with its generation date. Re-generate only when the user explicitly requests it or when the day advances past the stored date (not at the moment of midnight).
- If cycling protocols are needed (take supplement A Mon/Wed/Fri, supplement B Tue/Thu/Sat), express the cycle as explicit day-of-week assignments, not date-arithmetic, so the schedule is stable.

**Phase:** Routine generator phase.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Nutrition API selection | API key exposure in bundle (Pitfall 1) | Use GAS proxy or Open Food Facts (no-key) |
| Nutrition API integration | USDA FDC CORS failure in browser (Pitfall 2) | Verify with browser fetch before committing |
| Food CRUD implementation | Apps Script cold start causes double-submit (Pitfall 3) | Optimistic localStorage write + idempotent GAS upsert |
| Food composition model | Circular ingredient references (Pitfall 4) | Flat (atomic-only) ingredient model |
| Supplement inventory design | Drift from estimate-based quantity (Pitfall 5) | Event-sourced deduction log, not calculated remaining |
| Catalog data model | Sheets read bottleneck as items grow (Pitfall 6) | Add `updatedAt` + incremental sync |
| Local ingredient coverage | Open Food Facts missing Asian foods (Pitfall 7) | Curated Taiwanese seed catalog as fallback |
| Supplement interaction model | O(n²) flat pair list becomes unmaintainable (Pitfall 8) | Per-supplement interaction map |
| Routine generator | Over-constrained inputs produce silent empty plan (Pitfall 9) | Explicit unscheduled-item report |
| localStorage growth | Quota exceeded on large catalogs (Pitfall 10) | ID-reference model, size budget, visible warning |
| ID namespace | User items collide with hardcoded IDs (Pitfall 11) | Namespaced `uf_` / `us_` prefix |
| CRUD form UX | Unsaved form state lost on nav (Pitfall 12) | React Router v7 `useBlocker` |
| GAS redeployment | Redirect loses CORS headers (Pitfall 13) | Test after every redeployment |
| Routine stability | Date-boundary plan change (Pitfall 15) | Persist generated plan, re-generate on explicit request only |

---

## Sources

- USDA FoodData Central API documentation: [https://fdc.nal.usda.gov/api-guide/](https://fdc.nal.usda.gov/api-guide/) — rate limits, key requirement; HIGH confidence
- USDA API CORS issue: [GitHub USDA/USDA-APIs#79](https://github.com/USDA/USDA-APIs/issues/79) — malformed CORS header documented; MEDIUM confidence
- Open Food Facts API documentation: [https://openfoodfacts.github.io/openfoodfacts-server/api/](https://openfoodfacts.github.io/openfoodfacts-server/api/) — rate limits, no-auth reads; HIGH confidence
- Open Food Facts rate limits: [GitHub issue #8818](https://github.com/openfoodfacts/openfoodfacts-server/issues/8818) — 100/10/2 req/min limits; MEDIUM confidence
- API key exposure in static sites: [Sourcery vulnerability database](https://www.sourcery.ai/vulnerabilities/hardcoded-api-keys-javascript); [Wiz Blog mass exposure research](https://www.wiz.io/blog/exposed-moltbook-database-reveals-millions-of-api-keys) — HIGH confidence
- Apps Script quotas: [https://developers.google.com/apps-script/guides/services/quotas](https://developers.google.com/apps-script/guides/services/quotas) — execution time 6 min, URL fetch 20K/day; HIGH confidence
- Apps Script performance issues: [Google Apps Script Community](https://groups.google.com/g/google-apps-script-community/c/7mBvElBwvnc) — cold start and shared infrastructure slowness; MEDIUM confidence
- Apps Script best practices: [https://developers.google.com/apps-script/guides/support/best-practices](https://developers.google.com/apps-script/guides/support/best-practices) — batch reads/writes; HIGH confidence
- Supplement interaction knowledge: [Supplements-AI interaction guide](https://supplements-ai.com/blog/guides/supplement-interactions) — calcium/magnesium, zinc/copper documented interactions; MEDIUM confidence
- React Router v7 useBlocker: documentation verified against React Router DOM v7.6.0 (installed version); HIGH confidence
- localStorage size limits and quota errors: [RxDB localStorage article](https://rxdb.info/articles/localstorage.html) — 5–10 MB quota, QuotaExceededError; MEDIUM confidence
- Greedy scheduling limitations: [GeeksforGeeks scheduling in greedy algorithms](https://www.geeksforgeeks.org/dsa/scheduling-in-greedy-algorithms/) — sequential infeasibility at end of greedy pass; MEDIUM confidence
- Existing codebase analysis: `src/lib/sheets-api.ts`, `src/lib/data-service.ts` — direct code audit; HIGH confidence
