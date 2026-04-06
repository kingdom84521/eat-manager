# Pitfalls Research

**Domain:** Sidebar drawer navigation + multi-page consolidation + checkbox-based logging — React mobile-first SPA (React 19, Tailwind v4, HashRouter, localStorage-first)
**Researched:** 2026-04-06
**Confidence:** HIGH (based on direct codebase audit + verified community patterns)
**Scope:** Adding sidebar drawer to replace bottom tab nav, merging DailyPlan + NutritionTracker + SupplementSchedule into a unified view, adding checkbox-based logging with lock/re-random mechanics, and introducing My Menu as a new data type. Previous milestone pitfalls (CRUD, API, inventory) remain valid and are not repeated here.

---

## Critical Pitfalls

Mistakes that force rewrites, create silent data corruption, or permanently break mobile UX.

---

### Pitfall 1: Drawer Overlay Does Not Lock Body Scroll on iOS Safari

**What goes wrong:**
When the sidebar drawer opens, the body behind the overlay continues to scroll on iOS Safari. The user intends to scroll the drawer's nav links but instead scrolls the page content behind it. This is a decade-old iOS Safari behaviour: `overflow: hidden` on `<body>` does not prevent scroll on iOS when touch events are active.

**Why it happens:**
iOS Safari applies a "rubber-band" overscroll to the document scroll container independently of `overflow` CSS. The standard desktop fix (`document.body.style.overflow = 'hidden'`) has no effect on iOS. This is intentional Apple behaviour, not a bug, so it will not be fixed by the browser vendor.

**How to avoid:**
When the drawer opens, add `position: fixed; width: 100%; top: -${scrollY}px` to the body (capture `window.scrollY` before applying). When the drawer closes, remove `position: fixed`, restore `top: 0`, and manually set `window.scrollTo(0, savedScrollY)`. This is the only reliable pure-CSS/JS solution confirmed across iOS 15–17. Alternatively, use the `overscroll-behavior: contain` CSS property on the drawer's scroll container — this is now supported in Safari 16+ and prevents scroll chaining from the drawer to the body.

**Warning signs:**
- Page content scrolls while the drawer is open on a real iPhone
- `document.body.style.overflow = 'hidden'` is the only scroll lock applied
- No `savedScrollY` variable before applying body `position: fixed`

**Phase to address:** Sidebar drawer implementation phase (first phase of this milestone). Verify on real device or BrowserStack iOS before marking done.

---

### Pitfall 2: Drawer State Is Local to App.tsx — Navigation Collapses Between Page Transitions

**What goes wrong:**
If the drawer `isOpen` state is kept in a component that unmounts during navigation (e.g., inside a page component rather than `App.tsx`), the drawer closes on every route change. Alternatively, if the drawer is in `App.tsx` but its open/close state is passed as props through the router tree, every route change triggers a re-render of every page due to changed props, causing visible flicker.

More subtly: with HashRouter, navigating from `/plan` to `/menu` is a full route replacement. If the unified "today" page mounts fresh on each visit, all generated plan state (the randomised food slots, checked items) is lost. The user opens the drawer, navigates to settings, returns to `/plan`, and finds an empty unchecked plan.

**Why it happens:**
React Router's `<Routes>` unmounts the exiting route component and mounts the new one. Any `useState` inside that component resets to initial state. The app currently uses no global state, relying on localStorage reads on each mount — which works for persistent data but loses ephemeral in-session state (which items are checked, the generated plan for today).

**How to avoid:**
- Keep drawer `isOpen` state in `App.tsx` (the persistent shell), not in any page component.
- For the unified today page: on mount, read today's plan from localStorage (previously generated plan persisted by date key). If no plan for today exists, generate one. This way navigation away and back restores the plan and checked state — provided checked state is also persisted. Checked items must be written to localStorage on every toggle, not held only in component state.
- Do not pass drawer-open state as props into routed page components. Use a `DrawerContext` or a top-level state in `App.tsx` that page components can access via a shared hook if needed.

**Warning signs:**
- `isOpen` state lives inside a page component file
- Navigating away from `/plan` and returning shows an empty plan
- Checked checkboxes reset after drawer navigation

**Phase to address:** Sidebar drawer implementation phase. Establish drawer state placement before any page work begins.

---

### Pitfall 3: Merging Three Pages Causes a Single Monolithic Component That Is Unmaintainable

**What goes wrong:**
DailyPlan (~160 LOC), NutritionTracker (~120 LOC), and SupplementSchedule (~200 LOC) are each substantial components. Naively merging them into a single `TodayPage` component produces a 500+ LOC file with interleaved concerns: plan generation state, nutrition budget state, supplement timing state, checkbox log state, and lock/re-random mechanics. This becomes unmaintainable within the first phase and forces a refactor before the second.

**Why it happens:**
"Merge the three pages" sounds like a single task. The path of least resistance is to copy all three components' JSX and state into one file. The complexity of the interactions between the three subsystems (checking a food item updates the nutrition budget; checking a supplement updates inventory) is only visible after the merge is complete.

**How to avoid:**
Decompose the unified page into sub-components with well-defined interfaces before writing any merging code:
- `<FoodPlanSection>` — generates and displays food slots, emits check/uncheck events
- `<NutritionBudgetBar>` — receives `checkedItems[]` as props, computes and displays budget
- `<SupplementRoutineSection>` — displays supplement timing groups, emits check/skip events
- `<TodayPage>` — orchestrates shared state (checked item IDs, lock flag), delegates rendering

State that crosses sub-components (which items are checked) lives in `TodayPage`; UI state that does not cross boundaries (which accordion is expanded) lives in the sub-component. This decomposition must be designed before writing code, not extracted after.

**Warning signs:**
- A single file exceeds 350 LOC during the merge phase
- `useState` calls for food plan, nutrition, and supplement state all appear at the top of the same component function
- Sub-component boundaries are not defined in the design doc before coding begins

**Phase to address:** Design sub-component boundaries as an explicit deliverable at the start of the page consolidation phase, before any code is written.

---

### Pitfall 4: Checkbox State and Generated Plan Stored Separately — Stale Combination Bug

**What goes wrong:**
The plan is generated (random item selection) and the checked state (which items were consumed) are stored as two separate localStorage entries. If the plan is regenerated (user taps "全部重新隨機") after items have been checked, the stale checked IDs no longer correspond to the new plan's item IDs. The next load reads the old check IDs against the new plan items — some items appear pre-checked that were never consumed, while newly generated items appear unchecked even if they match previously consumed items from earlier in the day.

**Why it happens:**
Developers store generated plan and checked state independently because they seem like separate concerns. The dependency — checks only make sense relative to a specific plan generation — is invisible until a re-random event happens.

**How to avoid:**
Store the checked state as part of the same persisted plan record:
```ts
interface TodayPlanRecord {
  date: string;
  generatedAt: number;    // unix timestamp of generation
  slots: GeneratedSlot[]; // the plan output, serialised
  checkedIds: string[];   // IDs confirmed consumed in this plan instance
}
```
When the plan is regenerated, a new `TodayPlanRecord` is written with an empty `checkedIds`. The previous record is overwritten. There is no possibility of stale checked IDs crossing plan generations because they share a single atomic record.

**Warning signs:**
- `daily_plan` and `checked_items` are stored under two separate localStorage keys for the same date
- Re-randomising the plan does not clear the checked state

**Phase to address:** Data model design for the unified today page — before any checkbox or re-random logic is implemented.

---

### Pitfall 5: Full Re-Random Lock Uses Boolean Flag That Resets on Refresh

**What goes wrong:**
The lock mechanic ("cannot do full re-random when any item is checked") is gated on whether `checkedIds.length > 0`. If `checkedIds` is stored only in `useState` and not persisted, the lock state disappears on page refresh. The user checks an item, refreshes (or navigates away and back), then is able to re-random the full plan — even though they have already consumed items from it.

**Why it happens:**
The lock logic is implemented as a derived boolean from component state. It works in-session but has no persistence, so it does not survive navigation.

**How to avoid:**
The lock is not a separate flag — it is derived at render time from the persisted `checkedIds` field in the `TodayPlanRecord`. If `checkedIds.length > 0` after reading from localStorage on mount, the full re-random button is disabled. No additional state is needed; persistence of `checkedIds` (addressed in Pitfall 4) automatically provides persistence of the lock.

**Warning signs:**
- A `isLocked` boolean state exists independently of `checkedIds`
- Refreshing the page re-enables the full re-random button even when items were checked

**Phase to address:** Same phase as Pitfall 4 — lock is a UI property of the persistent record, not a separate feature.

---

### Pitfall 6: Single-Item Re-Random Swaps the Item Out of the Slot But Does Not Update Nutrition Budget

**What goes wrong:**
Each food item in the plan carries calorie and macro data. The nutrition budget bar (remaining calories, protein, etc.) is derived from checked items. When a single item is re-randomised and swapped for a different item, the new item has different calorie/macro values. If the slot was already checked (consumed), the budget display still reflects the old item's values because the checked record stores the old item ID — the ID that was swapped out.

**Why it happens:**
Single-item re-random is implemented as a visual swap (update the displayed item) without considering whether the old item was already checked. The checked ID becomes orphaned: it points to an item no longer in the plan.

**How to avoid:**
Define the invariant: a single-item re-random is only allowed on unchecked items. Disable the swap button on items that are checked. If this restriction is not acceptable (the user wants to swap a checked item), uncheck the item automatically on swap, remove its contribution from the nutrition budget, and require the user to re-check the new item. Document this behaviour explicitly in the design.

**Warning signs:**
- The swap button is visible and active on checked items
- `checkedIds` can contain IDs that no longer exist in the current plan's slot list
- The nutrition budget is not recalculated after a single-item swap

**Phase to address:** Single-item re-random implementation. Enforce the unchecked-only swap invariant before building the swap UI.

---

### Pitfall 7: Bottom Nav `pb-20` Padding Remains After Removing the Bottom Nav

**What goes wrong:**
The current `App.tsx` wraps all content in `<div className="... pb-20 ...">` to prevent the bottom nav from overlapping content. When the bottom nav is removed and replaced with a sidebar drawer, this padding remains. The result is 80px of empty space at the bottom of every page, which is especially noticeable on the unified today page (long scroll list). The fix seems trivial but requires auditing every page for hardcoded bottom padding.

**Why it happens:**
Bottom nav padding is applied at the shell level (`App.tsx`) and in some page components as additional `pb-*` classes. It becomes invisible once the nav is gone — the space is just empty rather than causing a visible bug — so it is easy to miss in a review.

**How to avoid:**
- Remove `pb-20` from `App.tsx`'s outer div at the same time the bottom nav markup is removed — same commit, not later.
- Search for `pb-16`, `pb-20`, `pb-24` across all page components and remove or convert them to a standard bottom safe-area inset (`pb-safe` or `env(safe-area-inset-bottom)`).
- The new sidebar layout likely needs a header bar for the hamburger icon — add `pt-14` or equivalent to account for the fixed header, not `pb-` anything.

**Warning signs:**
- `pb-20` present in `App.tsx` after bottom nav markup is removed
- Empty whitespace at the bottom of every page visible in DevTools box model

**Phase to address:** Sidebar drawer implementation phase. Handle nav removal and padding cleanup atomically.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Inline all three pages' state into TodayPage | Faster initial merge | 500+ LOC file, impossible to test sub-features independently | Never — decompose first |
| Store checked IDs in separate localStorage key from plan | Simpler per-concern code | Stale checked IDs after re-random (Pitfall 4) | Never |
| Implement drawer as a position:fixed div with no scroll lock | Works on desktop/Android | Body scrolls under drawer on iOS Safari (Pitfall 1) | Never for production |
| Hardcode bottom padding everywhere instead of using CSS variable | No abstraction needed yet | Must manually hunt 5+ files when nav layout changes | MVP only — add TODO comment |
| Implement "My Menu" as a flat array in localStorage without a schema version | Fast to ship | Impossible to migrate when fields change (existing lesson from SettingsService) | Never — use schema version from day one |
| Use a single `useEffect` for plan generation, check-restore, and budget calculation | Fewer hooks | Infinite re-render loops from interdependent deps arrays | Never — separate concerns into separate effects |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| SettingsService in merged TodayPage | Call `SettingsService.getComputedTargets()` in every sub-component separately | Call once in TodayPage, pass `targets` as a prop — avoids repeated localStorage reads |
| Supplement routine + checkbox log | Run routine generator and checkbox restore as separate effects that both write state, causing render-loop | Generate plan once on mount, restore checked state from same persisted record atomically |
| My Menu data type + existing DataService | Add menu CRUD directly to `data-service.ts` alongside weight/nutrition | Create `menu-service.ts` following the singleton object pattern — keeps data-service.ts focused |
| Drawer + React Router NavLink | NavLink `isActive` class applies correctly, but drawer does not close after tap | Add `onClick={() => setDrawerOpen(false)}` on each NavLink, or listen to `location` changes in a `useEffect` to close drawer |
| GAS version check in App.tsx + drawer shell | GAS check triggers `navigate('/settings')` which fires even on first render before drawer is set up | Keep existing GAS check; it navigates to `/settings`, which is already a valid route — no change needed |
| WeightLog (now in Profile page) | WeightLog reads `DataService` directly; moving it inside a Profile page component means its `useEffect` data fetch fires only when Profile is visited | This is correct behaviour — no action needed, but verify Profile route exists before removing `/weight` route |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-rendering all three merged sections on every checkbox toggle | Perceptible lag on checkbox tap on mid-range Android devices | `React.memo` on `NutritionBudgetBar`; pass stable callbacks via `useCallback` for check handlers | At ~20+ items in the list with frequent toggles |
| Generating the full plan on every render of TodayPage | Plan re-randomises unexpectedly on state updates | Generate plan once in a `useState` initializer (`useState(() => generatePlan(…))`) or in a single mount-only `useEffect` — never in render body | Immediately — any state change triggers visible re-random |
| Reading all supplement inventory from localStorage on every drawer open | Slow drawer animation while JS is synchronously reading | Load supplement data once on app init, not on drawer toggle | At ~30+ supplement records |
| Persisting checked state on every checkbox toggle with full plan serialisation | Sluggish checkbox response | Write only the `checkedIds` array on toggle, not the entire plan record | At ~50+ items in plan |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Drawer hamburger icon placed at top-left, thumb cannot reach on large phones | User must stretch thumb to open nav, abandons feature | Place hamburger in a bottom-left or bottom-right FAB, or use a swipe gesture (swipe right from left edge opens drawer) |
| Drawer does not indicate the currently active page | User cannot tell where they are after opening drawer | Use React Router `useLocation` to apply active styles (same pattern as existing bottom nav's NavLink) |
| Full page re-random confirmation is a JavaScript `window.confirm()` | Looks like a browser alert, breaks the app's visual language, and is blocked by some mobile browsers | Use an inline confirmation UI (a "確認重新隨機？" button that replaces the shuffle button for 2 seconds, then reverts) |
| Supplement check → "skipped" three-state toggle migrated into unified view confuses users who expect binary checked/unchecked | Users accidentally skip instead of check | In the unified view, use a long-press or swipe-to-skip gesture for "skipped" state; the primary tap is always "checked" (consumed) |
| My Menu save confirmation is silent (no visual feedback) | User unsure if save succeeded; taps save multiple times | Optimistic inline confirmation ("已儲存" label replaces save button for 1.5s) — matches existing app style |

---

## "Looks Done But Isn't" Checklist

- [ ] **Sidebar drawer:** Verify body scroll lock on a real iOS device — desktop browser DevTools mobile emulation does NOT reproduce this bug
- [ ] **Checkbox state persistence:** Navigate away from `/plan`, return, and confirm checked items are still checked
- [ ] **Full re-random lock:** Check an item, refresh the page (hard reload), confirm re-random button is still disabled
- [ ] **Single-item swap:** Swap an unchecked item and verify nutrition budget is unchanged; attempt to swap a checked item and verify the button is disabled
- [ ] **Nutrition budget:** Check three food items, verify the budget bar updates correctly; uncheck one, verify the bar decreases
- [ ] **Bottom padding:** Inspect every page in DevTools for unexpected empty space at the bottom after removing the bottom nav
- [ ] **My Menu schema version:** Write a menu entry, bump the schema version constant, reload, and confirm migration does not crash
- [ ] **Profile page WeightLog:** Confirm weight log data loads correctly when WeightLog is rendered inside the Profile page (not as a standalone route)
- [ ] **Drawer active state:** Open drawer on each page and confirm the correct nav item is highlighted
- [ ] **Drawer close on navigate:** Tap a drawer nav link and confirm the drawer closes before the new page renders

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| iOS scroll lock missing (shipped to production) | LOW | Add `position: fixed` body scroll lock in a hotfix; no data changes required |
| Stale checked IDs from separate storage keys | MEDIUM | Write a migration in `TodayPlanRecord` loader: if old keys found, merge into new unified record and delete old keys |
| Monolithic TodayPage (built as one 500-LOC component) | HIGH | Extract sub-components in a dedicated refactor phase; must rewrite state lifting and prop interfaces |
| Bottom nav padding left in (cosmetic only) | LOW | Single CSS class removal across 4 files |
| My Menu without schema version | MEDIUM | Add schema version + migration on first conflict; requires cache invalidation affecting all users |
| Lock not persisted (state only) | LOW | Move lock derivation to read from persisted `checkedIds` on mount — 3-line change |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| iOS body scroll lock (P1) | Sidebar drawer implementation | Test on real iOS device before phase complete |
| Drawer state placement (P2) | Sidebar drawer implementation, before page work | Navigate to settings and back; confirm plan still rendered |
| Monolithic component (P3) | Design sub-component boundaries before coding | Design doc lists sub-components with props interface before any TSX is written |
| Stale checked IDs from split storage (P4) | Data model design for TodayPage | Re-random after checking; confirm checked state clears |
| Lock reset on refresh (P5) | Same phase as P4 — unified plan record | Check item, hard refresh, confirm lock persists |
| Swap on checked item corrupts budget (P6) | Single-item re-random implementation | Attempt to swap a checked item; confirm button disabled |
| Bottom nav padding residue (P7) | Sidebar drawer implementation — remove nav and padding atomically | Inspect bottom of every page for whitespace |

---

## Sources

- Direct codebase audit: `src/App.tsx`, `src/pages/DailyPlan.tsx`, `src/pages/NutritionTracker.tsx`, `src/pages/SupplementSchedule.tsx`, `src/lib/data-service.ts` — HIGH confidence
- iOS Safari body scroll lock: [PQINA blog — prevent scrolling on iOS Safari 15](https://pqina.nl/blog/how-to-prevent-scrolling-the-page-on-ios-safari/) — HIGH confidence (cross-referenced with multiple community sources)
- iOS 100vh viewport units: [DEV Community — 100vh problem with iOS Safari](https://dev.to/maciejtrzcinski/100vh-problem-with-ios-safari-3ge9) — HIGH confidence
- React state persistence with localStorage: [Josh W. Comeau — Persisting React State in localStorage](https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/) — HIGH confidence
- React Context re-render pitfall: WebSearch — "main problem with merging all states under a single context provider" — MEDIUM confidence (multiple sources agree)
- React Router v7 route unmounting behaviour: Known React Router behaviour; verified against existing project's `HashRouter` usage — HIGH confidence
- Mobile navigation patterns: [Material Design 3 — Navigation drawer guidelines](https://m3.material.io/components/navigation-drawer/guidelines) — MEDIUM confidence (design guidance, not technical)

---
*Pitfalls research for: Sidebar drawer navigation + page consolidation — Eat Manager v3.0*
*Researched: 2026-04-06*
