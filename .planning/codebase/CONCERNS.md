# Codebase Concerns

**Analysis Date:** 2026-03-29

## Tech Debt

**NutritionTracker is a stub/placeholder:**
- Issue: The entire page (`src/pages/NutritionTracker.tsx`) is non-functional. The "quick add" button hardcodes a single item ("tea egg") instead of providing real food search/entry. TODOs in the file describe the intended features: food database search, photo input, manual entry, and integration with `DataService.logMeal()`.
- Files: `src/pages/NutritionTracker.tsx`
- Impact: One of the four main app tabs is essentially non-functional. Users cannot track actual daily nutrition intake.
- Fix approach: Implement food search against `FOODS` data, wire up `DataService.logMeal()`, add manual entry form, persist meals across sessions.

**Hardcoded personal health targets:**
- Issue: Nutrition targets (`DAILY_TARGET = { cal: [1600, 1800], protein: [120, 130] }`) and weight targets (`TARGET_KG = 80`, `START_KG = 104`) are hardcoded constants, not configurable by the user.
- Files: `src/pages/NutritionTracker.tsx` (line 13), `src/pages/WeightLog.tsx` (lines 4-5)
- Impact: The app only works for one specific person with these exact goals. Any other user or goal change requires code edits.
- Fix approach: Add a settings/profile page or store targets in localStorage/Sheets. Reference them from a shared config.

**Duplicate type definitions between `types.ts` and `data-service.ts`:**
- Issue: `DailyPlan`, `NutritionEntry`, `WeightEntry` are defined in both `src/data/types.ts` and `src/lib/data-service.ts` with different shapes. For example, `types.ts` has `WeightEntry.weightKg` while `data-service.ts` has `WeightEntry.weight_kg`. `types.ts` `DailyPlan` has `selectedIds: string[]` while `data-service.ts` has `items_json: string`.
- Files: `src/data/types.ts` (lines 174-209), `src/lib/data-service.ts` (lines 16-44)
- Impact: Confusing which interface to import. The page components (`WeightLog.tsx`) import from `data-service.ts`, making the `types.ts` versions dead code. Type mismatches could cause runtime bugs silently.
- Fix approach: Consolidate to a single source of truth in `src/data/types.ts`. Have `data-service.ts` import from there. Decide on camelCase vs snake_case and stick with one.

**`any` type usage in SupplementSchedule:**
- Issue: The `Section` component uses `items: any[]` and `item: any` instead of proper types.
- Files: `src/pages/SupplementSchedule.tsx` (lines 92-101)
- Impact: Loses type safety for the entire rendering pipeline of supplement items.
- Fix approach: Use `(RemedyItem | BehaviorItem)[]` from `src/data/types.ts`.

## Known Bugs

**Background sync never updates UI:**
- Symptoms: `DataService.getFoods()`, `getRemedies()`, `getDailyPlans()`, etc. all fire background `SheetsAPI` calls but the resolved data is only written to `localStorage` -- the calling component never re-renders with the fresh data.
- Files: `src/lib/data-service.ts` (lines 156-188, 192-204, 224-232, 248-256)
- Trigger: Open the app with stale cache; background sync completes but UI still shows old data until next page load.
- Workaround: Manually refresh the page to pick up newly cached data.

**Randomization bias in `pickFromPool`:**
- Symptoms: `Math.random() - 0.5` used as a sort comparator produces non-uniform shuffling (known bias in JS sort-based shuffles).
- Files: `src/pages/DailyPlan.tsx` (line 16)
- Trigger: Some items in pools may be selected more frequently than others.
- Workaround: Use Fisher-Yates shuffle instead.

**`DailyPlan.generate` parses history with wrong field:**
- Symptoms: In `DailyPlan.tsx` line 88, it does `JSON.parse(h.items_json as string)` but `data-service.ts` returns `DailyPlan` objects with `items_json` as a string field. If the cached data came from Sheets and was already parsed, or if types drift, this silently fails (caught by empty `catch {}`).
- Files: `src/pages/DailyPlan.tsx` (line 88)
- Trigger: Edge case when cached data structure drifts from expected format.

## Security Considerations

**Google Apps Script API is completely unauthenticated:**
- Risk: The GAS Web App is deployed with "Anyone" access. Anyone who discovers the `VITE_GAS_URL` can read all data, append fake entries, upsert arbitrary rows, or delete data.
- Files: `scripts/gas-api.js` (line 9 comment: "Who has access: Anyone"), `src/lib/sheets-api.ts`
- Current mitigation: The URL is stored in env vars and not committed to git. However, it is embedded in the built JS bundle served from GitHub Pages and can be extracted by anyone viewing the site.
- Recommendations: Add a shared secret/API key check in the GAS `doGet`/`doPost` handlers. Consider using Google OAuth or at minimum a bearer token passed as a header/parameter.

**GAS URL exposed in client-side bundle:**
- Risk: `VITE_GAS_URL` is a `VITE_` prefixed env var, meaning Vite injects it into the client-side bundle. Anyone can extract it from the deployed site's JS files.
- Files: `src/lib/sheets-api.ts` (line 6), `.env.example`
- Current mitigation: None.
- Recommendations: If the data is personal/sensitive, consider proxying through a backend or adding auth to the GAS endpoint.

**No input sanitization on GAS API:**
- Risk: The `doPost` handler in `scripts/gas-api.js` directly parses and uses `e.postData.contents` without validation. Arbitrary sheet names or data shapes can be sent.
- Files: `scripts/gas-api.js` (line 37)
- Current mitigation: None.
- Recommendations: Validate `sheet` parameter against an allowlist. Validate `data` shape before writing.

## Performance Bottlenecks

**Full sheet reads on every page load:**
- Problem: `DataService.getFoods()` and `getRemedies()` call `SheetsAPI.readAll()` which reads the entire sheet every time. For reference data that changes rarely, this is wasteful.
- Files: `src/lib/data-service.ts` (lines 161-168, 179-186)
- Cause: No cache invalidation strategy or TTL. Background sync fires unconditionally on every call.
- Improvement path: Add a TTL to cached data (e.g., only sync if cache is older than 1 hour). Or use an ETag/version check.

**localStorage unbounded growth:**
- Problem: Nutrition log entries are cached per-date (`nutrition_log_YYYY-MM-DD`), creating a new localStorage key for every date viewed. No cleanup mechanism exists.
- Files: `src/lib/data-service.ts` (lines 224-243)
- Cause: Each date creates a separate cache key; old keys are never pruned.
- Improvement path: Implement a cache eviction strategy (e.g., keep last 30 days, or use a single key with rolling window).

## Fragile Areas

**Schedule/data coupling via string IDs:**
- Files: `src/data/schedule.ts`, `src/data/foods.ts`, `src/data/remedies.ts`, `src/data/resolver.ts`
- Why fragile: `schedule.ts` references items by string ID (e.g., `"berberine"`, `"oatmeal_50g"`). If an ID is renamed or removed in `foods.ts` or `remedies.ts`, the schedule silently breaks -- `resolveItem` returns `null` and the item is filtered out without error.
- Safe modification: When changing item IDs, search all files for the old ID string. Consider using an enum or constant for IDs.
- Test coverage: No tests exist to validate that all IDs referenced in `schedule.ts` resolve successfully.

**Silent error swallowing throughout data layer:**
- Files: `src/lib/data-service.ts` (lines 167, 185, 200, 219, 229, 241, 267, 278)
- Why fragile: Every Sheets API call has `.catch(() => {})` -- errors are completely silenced. If the GAS endpoint goes down, changes configuration, or returns errors, the user gets no feedback and data loss occurs silently (writes that fail are never retried).
- Safe modification: Add error logging at minimum. Consider a retry queue for failed writes.
- Test coverage: None.

## Scaling Limits

**Static data arrays in JS bundle:**
- Current capacity: ~40 food items, ~25 remedies, ~2 behaviors hardcoded in source files.
- Limit: As the food database grows (hundreds of items), the JS bundle size grows linearly. All data is loaded on every page, even pages that do not use it.
- Scaling path: Move food/remedy data entirely to Google Sheets (already partially supported). Use `DataService.getFoods()` with Sheets as the primary source and local arrays only as initial fallback.

**Google Sheets as a database:**
- Current capacity: Fine for a single user with a few hundred rows.
- Limit: Google Sheets API has rate limits (read: 300/min, write: 60/min per user). If multiple users or automated processes hit the endpoint, it will throttle.
- Scaling path: For multi-user, migrate to a real database (Supabase, Firebase, etc.).

## Dependencies at Risk

**No pinned dependency versions in CI:**
- Risk: `package.json` uses caret ranges (`^19.1.0`, `^4.1.7`, etc.). While `package-lock.json` exists and `npm ci` is used in CI, local development with `npm install` can pull different versions.
- Impact: Potential build inconsistencies between developers.
- Migration plan: This is minor -- `npm ci` in CI mitigates the risk. Consider using exact versions if stability is critical.

## Missing Critical Features

**No offline write queue:**
- Problem: The app claims "offline-first" design but writes to Sheets are fire-and-forget. If the user is offline when saving (daily plan, weight log, nutrition), the write silently fails and data is only in localStorage.
- Blocks: Reliable data persistence. If the user clears browser data, all unsynced entries are lost permanently.

**No data export or backup:**
- Problem: All data lives in localStorage + Google Sheets. No way to export data as CSV/JSON from the app itself.
- Blocks: Data portability, migration to a different backend.

**No error feedback to users:**
- Problem: No toast/notification system exists. All API errors are silently caught. Users have no way to know if their data was saved successfully to Sheets or not.
- Blocks: User trust in data persistence.

## Test Coverage Gaps

**No tests exist:**
- What's not tested: The entire codebase -- zero test files, no test framework configured, no test runner in `package.json` scripts.
- Files: All files under `src/`
- Risk: Any refactoring (especially to the data layer, resolver, or type consolidation) could introduce regressions with no safety net. The ID-based coupling between `schedule.ts` and `foods.ts`/`remedies.ts` is particularly risky without validation tests.
- Priority: High -- at minimum, add tests for `resolveItem()` in `src/data/resolver.ts` (ensure all schedule IDs resolve) and data conversion functions in `src/lib/data-service.ts` (`rowToFood`, `rowToRemedy`).

---

*Concerns audit: 2026-03-29*
