# Codebase Concerns

**Analysis Date:** 2026-03-29

## Tech Debt

**NutritionTracker is a stub/placeholder:**
- Issue: The entire page is non-functional. The "quick add" button hardcodes a single item ("tea egg") instead of providing real food search/entry. TODOs in the file describe the intended features: food database search, photo input, manual entry, and integration with `DataService.logMeal()`.
- Files: `src/pages/NutritionTracker.tsx`
- Impact: One of the four main app tabs is essentially non-functional. Users cannot track actual daily nutrition intake.
- Fix approach: Implement food search against `FOODS` data (using `searchFoods()` from `src/data/foods.ts`), wire up `DataService.logMeal()`, add manual entry form, persist meals across sessions.

**Hardcoded personal health targets:**
- Issue: Nutrition targets and weight targets are hardcoded constants, not configurable by the user:
  - `DAILY_TARGET = { cal: [1600, 1800], protein: [120, 130] }` in `src/pages/NutritionTracker.tsx` line 13
  - `TARGET_KG = 80`, `START_KG = 104` in `src/pages/WeightLog.tsx` lines 4-5
  - "目標 80kg by 2026 年底" hardcoded in WeightLog UI (line 33)
  - "胰島素阻抗 + 慢性發炎 + 去濕" subtitle hardcoded in DailyPlan (line 129)
- Files: `src/pages/NutritionTracker.tsx`, `src/pages/WeightLog.tsx`, `src/pages/DailyPlan.tsx`
- Impact: The app only works for one specific person with these exact goals. Any other user or goal change requires code edits.
- Fix approach: Add a settings/profile page or store targets in localStorage/Sheets. Reference them from a shared config.

**Duplicate type definitions between `types.ts` and `data-service.ts`:**
- Issue: `DailyPlan`, `NutritionEntry`, `WeightEntry` are defined in both files with different shapes. For example, `types.ts` has `WeightEntry.weightKg` (camelCase) while `data-service.ts` has `WeightEntry.weight_kg` (snake_case). `types.ts` `DailyPlan` has `selectedIds: string[]` while `data-service.ts` has `items_json: string`.
- Files: `src/data/types.ts` (lines 174-209), `src/lib/data-service.ts` (lines 16-44)
- Impact: Confusing which interface to import. The page components import from `data-service.ts`, making the `types.ts` versions dead code. Type mismatches could cause runtime bugs silently.
- Fix approach: Consolidate to a single source of truth in `src/data/types.ts`. Have `data-service.ts` import from there. Add serialization helpers for the Sheets format.

**`any` type usage in SupplementSchedule:**
- Issue: The `Section` component uses `items: any[]` and `item: any` instead of proper types.
- Files: `src/pages/SupplementSchedule.tsx` (lines 94, 101)
- Impact: No type safety for item rendering. Could silently break if item shape changes.
- Fix approach: Type `items` as `(RemedyItem | BehaviorItem)[]` from `src/data/types.ts`.

**`as any` casts in tag filtering:**
- Issue: `getFoodsByTag()` and `getRemediesByTag()` cast the tag parameter with `as any` instead of properly typing it as `HealthTag`.
- Files: `src/data/foods.ts` (line 286), `src/data/remedies.ts` (line 401)
- Impact: No compile-time validation that valid tags are passed.
- Fix approach: Change parameter type from `string` to `HealthTag`.

**SupplementSchedule has no logging/tracking:**
- Issue: The supplement schedule page is read-only (browse/filter items). There is no way to mark supplements as "taken" for the day, despite `SupplementEntry` and `DataService.logSupplements()` being defined.
- Files: `src/pages/SupplementSchedule.tsx`, `src/lib/data-service.ts` (lines 274-279)
- Impact: Cannot track supplement adherence, which is a core use case for a wellness tracker.
- Fix approach: Add checkboxes per item and wire to `DataService.logSupplements()`.

## Known Bugs

**Background sync never updates UI:**
- Symptoms: `DataService.getFoods()`, `getRemedies()`, `getDailyPlans()`, etc. fire background `SheetsAPI` calls but the resolved data is only written to localStorage. The calling component never re-renders with the fresh data.
- Files: `src/lib/data-service.ts` (lines 156-188, 192-204, 224-232, 248-256)
- Trigger: Open the app with stale cache; background sync completes but UI still shows old data until next page load.
- Workaround: Manually refresh the page to pick up newly cached data.

**Randomization bias in `pickFromPool`:**
- Symptoms: `Math.random() - 0.5` used as a sort comparator produces non-uniform shuffling (known bias in JS sort-based shuffles).
- Files: `src/pages/DailyPlan.tsx` (line 16)
- Trigger: Some items in pools may be selected more frequently than others over many uses.
- Workaround: Use Fisher-Yates shuffle instead of sort-based shuffle.

**History parsing can silently fail:**
- Symptoms: In `DailyPlan.tsx` line 88, `JSON.parse(h.items_json as string)` is wrapped in an empty `try/catch {}`. If the cached data format drifts or Sheets returns unexpected data, history-based deduplication silently breaks and recent items may repeat.
- Files: `src/pages/DailyPlan.tsx` (line 88)
- Trigger: Edge case when cached data structure drifts from expected format.

## Security Considerations

**Google Apps Script API is completely unauthenticated:**
- Risk: The GAS Web App is deployed with "Anyone" access (per `scripts/gas-api.js` line 9 comment). Anyone who discovers the `VITE_GAS_URL` can read all data, append fake entries, upsert arbitrary rows, or delete data.
- Files: `scripts/gas-api.js`, `src/lib/sheets-api.ts`
- Current mitigation: The URL is stored in env vars and not committed to git. However, it is embedded in the built JS bundle served from GitHub Pages and can be extracted by anyone viewing the site.
- Recommendations: Add a shared secret/API key check in the GAS `doGet`/`doPost` handlers. Consider using Google OAuth or a bearer token.

**VITE_GAS_URL exposed in client-side bundle:**
- Risk: `VITE_GAS_URL` is a `VITE_`-prefixed env var, meaning Vite injects it into the client-side bundle at build time. Anyone can extract it from the deployed site's JS files.
- Files: `src/lib/sheets-api.ts` (line 6), `.env.example`
- Current mitigation: None.
- Recommendations: Accept as inherent to SPA architecture, but add API key validation server-side in GAS.

**No input sanitization on GAS API:**
- Risk: The `doPost` handler directly parses and uses `e.postData.contents` without validation. Arbitrary sheet names or data shapes can be sent. Spreadsheet injection is possible via cell values starting with `=`, `+`, `-`, or `@`.
- Files: `scripts/gas-api.js` (line 37)
- Current mitigation: None.
- Recommendations: Validate `sheet` parameter against an allowlist of known sheet names. Validate `data` shape before writing. Prefix cell values to prevent formula injection.

## Performance Bottlenecks

**Full sheet reads on every page load:**
- Problem: `DataService.getFoods()` and `getRemedies()` call `SheetsAPI.readAll()` which reads the entire sheet on every invocation. For reference data that rarely changes, this is wasteful.
- Files: `src/lib/data-service.ts` (lines 161-168, 179-186)
- Cause: No cache invalidation strategy, no TTL, no request deduplication. Background sync fires unconditionally on every call.
- Improvement path: Add a TTL to cached data (e.g., only sync if cache is older than 1 hour). Use a simple timestamp check. Consider `AbortController` for in-flight request cancellation.

**localStorage unbounded growth:**
- Problem: Nutrition log entries are cached per-date (`nutrition_log_YYYY-MM-DD`), creating a new localStorage key for every date viewed. No cleanup mechanism exists.
- Files: `src/lib/data-service.ts` (lines 224-243)
- Cause: Each date creates a separate cache key; old keys are never pruned.
- Improvement path: Implement a cache eviction strategy (e.g., keep last 30 days). Daily plan cache already trims to 30 entries (line 213) but other caches do not.

## Fragile Areas

**Schedule/data coupling via string IDs:**
- Files: `src/data/schedule.ts`, `src/data/foods.ts`, `src/data/remedies.ts`, `src/data/resolver.ts`
- Why fragile: `schedule.ts` references items by string ID (e.g., `"berberine"`, `"oatmeal_50g"`). If an ID is renamed or removed in `foods.ts` or `remedies.ts`, the schedule silently breaks -- `resolveItem()` returns `null` and the item is filtered out with only a `console.warn`.
- Safe modification: When changing item IDs, search all files for the old ID string. Consider adding a build-time validation script that checks all schedule IDs resolve.
- Test coverage: No tests exist to validate that all IDs referenced in `schedule.ts` resolve successfully.

**Silent error swallowing throughout data layer:**
- Files: `src/lib/data-service.ts` (9 instances of `.catch(() => {})`)
- Why fragile: Every Sheets API call silently swallows errors. If the GAS endpoint goes down, the user gets no feedback and writes are permanently lost (no retry queue, no pending-sync indicator).
- Safe modification: Add error logging at minimum. Consider a toast/notification system for write failures. Add a retry queue for failed writes.
- Test coverage: None.

**Dense swap logic in DailyPlan:**
- Files: `src/pages/DailyPlan.tsx` (lines 102-120)
- Why fragile: The `swapItem` function creates shallow copies of deeply nested arrays with multiple `.map()` calls and conditionals. Easy to introduce stale-state bugs.
- Safe modification: Extract to a pure function with explicit input/output types. Add unit tests.
- Test coverage: None.

## Scaling Limits

**Static data arrays in JS bundle:**
- Current capacity: ~40 food items, ~25 remedies, ~2 behaviors hardcoded in source files.
- Limit: As the food database grows, the JS bundle size grows linearly. All data is loaded on every page.
- Scaling path: Move food/remedy data entirely to Google Sheets. Use `DataService.getFoods()` as primary source, local arrays only as initial fallback seed.

**Google Sheets as a database:**
- Current capacity: Fine for a single user with a few hundred rows.
- Limit: Google Sheets API has rate limits (read: 300/min, write: 60/min per project). GAS execution time limit is 6 minutes per call.
- Scaling path: For multi-user, migrate to a real database (Supabase, Firebase, etc.).

## Dependencies at Risk

**No pinned dependency versions:**
- Risk: `package.json` uses caret ranges (`^19.1.0`, `^4.1.7`, etc.). While `package-lock.json` exists and `npm ci` is used in CI, local `npm install` can pull different versions.
- Impact: Minor -- `npm ci` in CI mitigates the risk. Lockfile is committed.
- Migration plan: Consider exact versions if stability is critical.

## Missing Critical Features

**No test suite:**
- Problem: Zero test files exist. No test framework configured. No test script in `package.json`.
- Blocks: Cannot verify correctness of data transformations, resolver logic, or cache behavior. Any refactoring is risky.

**No offline write queue:**
- Problem: The app claims "offline-first" design but writes to Sheets are fire-and-forget. If the user is offline when saving, the write silently fails and data is only in localStorage.
- Blocks: Reliable data persistence. If the user clears browser data, all unsynced entries are permanently lost.

**No data export or backup:**
- Problem: All data lives in localStorage + Google Sheets. No way to export data as CSV/JSON from the app.
- Blocks: Data portability, disaster recovery.

**No error feedback to users:**
- Problem: No toast/notification system. All API errors are silently caught. Users cannot distinguish "no data yet" from "backend is broken."
- Blocks: User trust in data persistence.

## Test Coverage Gaps

**No tests exist:**
- What's not tested: The entire codebase -- zero test files, no test framework, no test runner.
- Files: All files under `src/`
- Risk: Any refactoring (especially to the data layer, resolver, or type consolidation) could introduce regressions with no safety net. The ID-based coupling between `schedule.ts` and `foods.ts`/`remedies.ts` is particularly risky without validation tests.
- Priority: High. At minimum, add tests for:
  1. `resolveItem()` in `src/data/resolver.ts` -- ensure all IDs in `src/data/schedule.ts` resolve
  2. `rowToFood()` and `rowToRemedy()` in `src/lib/data-service.ts` -- data conversion correctness
  3. `todayStr()` and `daysAgo()` in `src/lib/data-service.ts` -- date formatting
  4. Plan generation logic in `src/pages/DailyPlan.tsx` -- deduplication and pool selection

---

*Concerns audit: 2026-03-29*
