# Phase 12: Unified Daily Plan - Context

**Gathered:** 2026-04-07 (auto mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

Merge the food daily plan and supplement routine into a single unified `/plan` page with checkbox-driven consumption logging. Users check items to log them, uncheck to remove logs. Full re-random is locked when any item is checked. Single-item re-random available on unchecked items. Nutrition macro bar updates in real-time from checked food items. The standalone NutritionTracker (`/track`) and SupplementSchedule are absorbed — their content merges into the unified plan.

</domain>

<decisions>
## Implementation Decisions

### TodayPlanRecord Schema
- **D-01:** Create a `TodayPlanRecord` interface stored in a single localStorage key (`today_plan`). Fields: `date: string`, `foodSlots: GeneratedSlot[]` (the food plan), `supplementRoutine: RoutineResult` (the supplement routine), `checkedIds: Set<string>` (serialized as array). This is the atomic unit of today's plan state.
- **D-02:** On plan generation, food slots and supplement routine are computed together and stored atomically. If the stored date doesn't match today, the plan is stale and should be regenerated.
- **D-03:** `checkedIds` covers both food items and supplement IDs in one flat Set. The type of item is distinguishable by lookup (food items in FOOD_MAP, supplements in ItemService).
- **D-04:** Supplement three-state toggle (untouched → taken → skipped) is preserved for supplements. Food items use two-state (unchecked → checked). Store `skippedSupplementIds` separately in the record.

### Check/Uncheck Logging Flow
- **D-05:** Checking a food item: add ID to `checkedIds`, log nutrition entry to localStorage (and debounced Sheets sync). Unchecking: remove from `checkedIds`, remove log entry from localStorage and Sheets.
- **D-06:** Checking a supplement (taken): add to `checkedIds`, deduct inventory via `ItemService.logConsumption()`. Supplement skip: add to `skippedSupplementIds`, no inventory deduction.
- **D-07:** Debounce: 300ms on the localStorage/Sheets write, not on the local state update. Local state (checkedIds) updates immediately for responsive UI. Uses a simple `setTimeout`/`clearTimeout` pattern — no library needed.
- **D-08:** `DataService.removeMealEntry(date, itemId)` — new method that removes a specific nutrition log entry by date+itemId. For Sheets: uses `SheetsAPI.delete()` with matching criteria. For localStorage: filters out the entry from cached array.

### Nutrition Macro Bar
- **D-09:** Macro totals derived at render time from `checkedIds` intersected with food items' nutritional data (cal, protein, carbs, fat from ResolvedItem or FoodItem). Not stored — computed on every render per established pattern.
- **D-10:** Bar shows: consumed kcal / TDEE target, consumed protein / protein target. Targets from `SettingsService.getComputedTargets()`. If no targets configured, bar shows absolute values only (no percentages).
- **D-11:** Bar visually matches existing NutritionTracker budget bar style: progress fill with color transition (emerald → amber → red as approaching/exceeding target).

### Lock Mechanic
- **D-12:** `locked` is derived: `checkedIds.size > 0` at render time — not a separate stored flag (per ROADMAP decision). When locked, the "重新產生" full re-random button is disabled with visual indication.
- **D-13:** Single-item re-random (🔄 button on each food card) remains available on unchecked items. The button is hidden/disabled on checked items.
- **D-14:** Supplement items do not have re-random — their routine is deterministic and not swappable.

### Sub-Component Decomposition
- **D-15:** Three sub-components defined as inline functions within a new `src/pages/UnifiedPlan.tsx` (replaces DailyPlan.tsx):
  - `FoodPlanSection` — renders food time slots with ItemCard, re-random buttons, checkbox state
  - `NutritionBudgetBar` — renders the macro progress bar from checked item totals
  - `SupplementRoutineSection` — renders supplement timing slots with RoutineRow, three-state toggle
- **D-16:** The existing `ItemCard` and `TagBadge` sub-components from DailyPlan.tsx are reused. `RoutineRow`, `TimingSlotCard` from SupplementSchedule.tsx are absorbed into the new file.
- **D-17:** `DailyPlan.tsx` is deleted and replaced by `UnifiedPlan.tsx`. Route `/plan` points to `UnifiedPlan`.
- **D-18:** `SupplementSchedule.tsx` is deleted. Route `/supplements` redirects to `/plan` (supplement section is now part of unified plan). The sidebar nav item "營養補充" still navigates to `/plan` but could optionally scroll to the supplement section.
- **D-19:** `NutritionTracker.tsx` is deleted. Route `/track` redirects to `/plan`.

### Persistence and Reload Survival
- **D-20:** On mount, `UnifiedPlan` reads `TodayPlanRecord` from localStorage. If date matches today and plan exists, restore it with checkedIds. If stale or missing, show empty state with generate button.
- **D-21:** Every state mutation (check, uncheck, re-random, generate) writes the full `TodayPlanRecord` back to localStorage atomically.

### Claude's Discretion
- Visual layout of how food and supplement sections are ordered (food first, supplements after — or interleaved by time)
- Scroll-to-supplement-section behavior when navigating from sidebar "營養補充"
- Animation/transition for check/uncheck state changes
- Whether to show a summary "all done" state when everything is checked
- Exact debounce timing (300ms suggested, can adjust)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Plan requirements
- `.planning/REQUIREMENTS.md` §Unified Daily Plan — PLAN-01 through PLAN-05 acceptance criteria
- `.planning/ROADMAP.md` §Phase 12 — Success criteria and phase goal

### Current implementation (to be merged/replaced)
- `src/pages/DailyPlan.tsx` — Current food-only daily plan page (162 lines) — to be replaced by UnifiedPlan
- `src/pages/SupplementSchedule.tsx` — Supplement routine page (430 lines) — content absorbed into UnifiedPlan
- `src/pages/NutritionTracker.tsx` — Nutrition tracking page — to be retired, macro bar absorbed
- `src/data/resolver.ts` — ResolvedItem type and resolveItem/resolveAndGroup functions
- `src/data/schedule.ts` — SCHEDULE constant defining food plan time slots
- `src/lib/data-service.ts` — DailyPlan interface, getDailyPlans, saveDailyPlan, getNutritionLog
- `src/lib/item-service.ts` — getDailyLog, saveDailyLog, logConsumption, getSupplements, getInventory, getConsumption
- `src/data/types.ts` — DailyPlan, SupplementLogEntry, ScheduleSlot, ItemPool, SupplementTiming types

### Architecture decisions
- `.planning/STATE.md` §Decisions — TodayPlanRecord schema, locked derivation, debounce, sub-component mandate
- `.planning/ROADMAP.md` §v3.0 decisions — Locked decisions on unified plan design

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `generatePlan()` in DailyPlan.tsx: Food plan generation logic — reuse directly in UnifiedPlan
- `generateRoutine()` in SupplementSchedule.tsx: Supplement routine generation — reuse directly
- `ItemCard`, `TagBadge` in DailyPlan.tsx: Food item display components — reuse with checkbox addition
- `RoutineRow`, `TimingSlotCard`, `ProgressHeader` in SupplementSchedule.tsx: Supplement display — absorb
- `swapItem()` in DailyPlan.tsx: Single-item re-random logic — reuse with lock guard
- `handleToggle()` in SupplementSchedule.tsx: Three-state supplement toggle with inventory deduction — adapt
- `SettingsService.getComputedTargets()`: TDEE and macro targets for nutrition bar

### Established Patterns
- State via `useState`/`useEffect`/`useCallback` — no global state
- Computed values derived at render time (not stored) — generateRoutine, calcRemainingUnits
- `todayStr()` for date key consistency
- `ItemService.getDailyLog()`/`saveDailyLog()` for supplement state persistence (localStorage-only)
- `DataService.saveDailyPlan()` for food plan persistence (localStorage + Sheets)
- Dark theme: `bg-slate-800/50` cards, `border-l-3` color coding, progress bars

### Integration Points
- `src/App.tsx`: Route `/plan` currently renders DailyPlan — update to UnifiedPlan; add redirects for `/track` and `/supplements`
- `src/components/SidebarDrawer.tsx`: "營養補充" nav item currently links to `/supplements` — update to `/plan` or add scroll anchor
- `src/lib/data-service.ts`: Add `removeMealEntry()` method for uncheck flow
- `src/lib/item-service.ts`: Existing getDailyLog/saveDailyLog for supplement state

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The unified plan should feel like one cohesive daily routine view where food and supplements are naturally grouped, with the nutrition bar providing live feedback as items are checked off.

</specifics>

<deferred>
## Deferred Ideas

- NutritionTracker `/track` redirect timing — confirmed: redirect once unified plan ships (this phase)
- My Menu save from unified plan — Phase 13 scope
- MENU-04: Menu presets sync to Google Sheets — deferred to future milestone
- Global state management — explicitly out of scope per REQUIREMENTS.md

</deferred>

---

*Phase: 12-unified-daily-plan*
*Context gathered: 2026-04-07*
