# Feature Research

**Domain:** Sidebar drawer navigation, unified checkbox daily plan, meal menu management, profile page — health/nutrition SPA
**Researched:** 2026-04-06
**Confidence:** HIGH (sidebar UX from Material Design + established mobile patterns; checkbox plan from nutrition app analysis; menu management from meal planner app survey; profile page from Material Design drawer spec)

---

## Existing Features (Do Not Rebuild)

These are already in production. Listed to define scope boundaries for v3.0.

| Existing Feature | Location | Note |
|-----------------|----------|-------|
| Bottom tab navigation (7 tabs) | `App.tsx` | Being replaced by sidebar drawer |
| Daily plan generator (random, swap) | `DailyPlan.tsx` | Being merged into unified plan |
| Nutrition tracker (manual log) | `NutritionTracker.tsx` | Being merged into unified plan |
| Supplement schedule (tap-to-toggle) | `SupplementSchedule.tsx` | Being merged into unified plan |
| Food CRUD with nutrition labels | `FoodManager.tsx` | Stays as-is |
| Supplement CRUD with inventory | `SupplementManager.tsx` | Stays as-is |
| Weight logging + chart | `WeightLog.tsx` | Moving to Profile page |
| Settings (BMR, guidelines, Sheets) | `Settings.tsx` | Stays, accessed via drawer icon |
| Offline-first localStorage + Sheets sync | `data-service.ts` | No change needed |
| GAS connection health check | `App.tsx` | No change needed |

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = the v3.0 overhaul feels incomplete.

#### Sidebar Drawer Navigation

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Hamburger icon opens drawer from left | Universal mobile pattern; any app with >5 nav items uses it | LOW | Fixed top-left `☰` button; 44px tap target minimum |
| Overlay backdrop closes drawer on tap | Standard dismiss behavior across iOS/Android; users tap outside to close | LOW | Semi-transparent dark overlay (`bg-black/50`) over content; click closes drawer |
| Swipe-right-to-open gesture | Expected on mobile, especially iOS users; Material Design standard | MEDIUM | Track `touchstart`/`touchmove` on left edge (first 20px of screen); use `useSwipeable` or manual touch handlers — no library needed |
| Swipe-left-to-close gesture | Mirror of open gesture; expected once open | MEDIUM | Same implementation as open gesture |
| Active route highlight in drawer | Users need to know where they are | LOW | Match `location.pathname` to drawer item; apply active color class |
| All nav destinations accessible from drawer | Replaces the bottom tab bar entirely | LOW | Map existing routes to drawer items with icon + label |
| Drawer slides in with animation | Feels broken without it; jarring without transition | LOW | CSS `transition: transform 300ms ease` on drawer panel |
| ESC key closes drawer | Desktop/keyboard accessibility | LOW | `useEffect` listening for `keydown` with `key === "Escape"` |
| Body scroll lock when drawer open | Content should not scroll behind the overlay | LOW | `document.body.style.overflow = "hidden"` when open, restore on close |

#### Profile Section at Drawer Bottom

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| User avatar or initials at drawer bottom | Material Design navigation drawer spec; every major app does this (Gmail, Google Maps) | LOW | Avatar circle with name initial fallback; tap navigates to `/profile` |
| Display name shown in drawer | Personalizes the app; users want to see their name | LOW | Read from `SettingsService` or new `ProfileService`; show "設定名稱" placeholder if empty |
| Tap avatar navigates to Profile page | Standard behavior; drawer is a doorway to profile | LOW | `navigate("/profile")` + close drawer |
| Settings icon at drawer bottom | Expected secondary access alongside profile; consistent with iOS/Android apps | LOW | Small gear icon bottom-right of drawer footer; `navigate("/settings")` |

#### Unified Checkbox Daily Plan

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Single page showing food plan + supplements for the day | Users think about "what I did today" as one stream, not 3 separate pages | MEDIUM | Merge slots from SCHEDULE with timing-grouped supplements; render as one scrollable list |
| Checkbox to mark item as consumed/taken | The primary interaction; makes logging frictionless (one tap per item vs. navigating to a form) | MEDIUM | Toggle state stored in `checkedIds: Set<string>` per date; persist to localStorage |
| Checked items visually distinguished | Users need to see progress at a glance | LOW | Strike-through + reduced opacity + checkmark icon on checked items |
| Full re-random locked when any item is checked | Prevents destroying logged progress; universally expected in any planning+tracking hybrid | MEDIUM | `const isLocked = checkedIds.size > 0`; disable full re-random button + show explanation tooltip/toast |
| Single-item re-random allowed even when locked | Users still want to swap one item without losing other check states | MEDIUM | Per-item swap button still enabled; only regenerates that slot; does not clear other checked states |
| Today's date shown prominently | Users need to confirm they are on the correct day | LOW | Display `YYYY年MM月DD日` at top of page; auto-detect `todayStr()` |
| Supplement timing sections within unified view | Supplements have timing context (空腹/餐後/睡前) that matters for effectiveness | MEDIUM | Group supplement rows under their timing label inside the unified scroll; visual separator between food slots and supplement slots |
| Nutrition summary bar (cal/protein/fat/carbs) | Tracking without a total is incomplete; users need the running sum | MEDIUM | Derive from checked food items only; use existing `FoodItem` macro fields; display as compact bar at top or bottom |

#### Meal Menu Management (我的菜單)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Save current plan as a named menu | Users who find a good combination want to reuse it; manual re-random every time is friction | MEDIUM | Capture current plan's item IDs + slot structure into a named `MenuPreset`; store in localStorage |
| List of saved menus | Users need to browse their saved combinations | LOW | Simple list with name, item count, created date |
| Load a menu into today's plan | The entire point of saving; replaces random generation with a known combination | MEDIUM | Populate today's plan state from saved `MenuPreset.slots`; mark plan as "from menu" (not random) |
| Delete a saved menu | Catalog hygiene; accumulation of unused menus creates clutter | LOW | Confirmation prompt before delete; remove from localStorage |
| Menu name entry | Menus need names to be distinguishable | LOW | Simple text input at save time; placeholder "我的菜單 #N" auto-incremented |

#### Profile Page

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Display name entry | Personalizes the app; shown in drawer | LOW | Single text input; persist to localStorage via `ProfileService` or extend `SettingsService` |
| Avatar initial or emoji selector | Visual identity; not full image upload (that adds file storage complexity) | LOW | Pick from a grid of emoji/letter options; store as string |
| Weight log access on profile page | Weight is deeply personal and user-profile-adjacent; MyFitnessPal, Lose It, and others put weight chart on profile | MEDIUM | Move `WeightLog` component or link to it from profile; no rebuild needed |
| Current weight display | Quick reference without navigating | LOW | Show most recent weight entry from `WeightEntry[]` |
| BMR and daily targets summary | Context for what the user is working toward | LOW | Read from `SettingsService`; display TDEE, macro targets as non-editable summary row |

---

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Lock icon with tooltip explaining why re-random is disabled | Most apps just disable the button silently; explaining why is better UX | LOW | Show "已打勾項目，鎖定整體重新隨機" tooltip on tap of disabled button |
| Nutrition progress shown only for checked items | Real-time "how much have I eaten" vs. "what the full plan would be" — most apps don't differentiate | MEDIUM | Two display modes: planned total vs. consumed total |
| Menu save from any plan state (partial checks OK) | Users may want to save a plan before they start eating it, or after | LOW | Allow save regardless of checked state |
| Drawer section grouping (主要功能 / 管理 / 帳號) | Organizes 7+ nav items without overwhelming; Group Theory UX principle | LOW | Add section headers in drawer; visual separator lines |
| Today's supplement coverage indicator in unified plan | Shows "X/Y 補品已服用" summary — gamification signal | LOW | Count `checkedIds` intersected with supplement item IDs |

---

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Swipe-between-pages gesture navigation | Native app feel | Conflicts with horizontal scroll in cards; React Router's HashRouter does not support swipe-to-go-back natively; adds significant complexity | Drawer and tab nav are sufficient; save swipe for open/close drawer only |
| Full image upload for avatar | Personal touch | Static SPA has no file storage; base64 in localStorage causes storage bloat (localStorage has ~5MB limit) | Emoji picker or initial-based avatar; visually clear, zero storage cost |
| Nested/hierarchical drawer menus (expand sub-items) | Seems organized for many pages | Adds interaction complexity; users miss items in collapsed sections; Material Design guidance advises against nesting | Use section headers with visual separators instead of expandable sections |
| Auto-save plan as menu on date change | Seems helpful | Pollutes menu list with junk entries; users build up 30 "2026-04-06" menus | Manual save only; explicit naming |
| Drag-to-reorder items in unified plan | Power user feature | Complex touch event handling conflicts with scroll; deferred complexity with low payoff for this app | Re-random swap is sufficient for reordering intent |
| Plan sharing / export as image | Social motivation | Requires canvas rendering or external service; significant complexity | Plain text export (copy to clipboard) is sufficient for doctor/sharing use case |
| Multiple profiles | Multi-user households | Single-user architecture; localStorage is not user-scoped; authentication not in scope | Out of scope; document as future PWA milestone |

---

## Feature Dependencies

```
Sidebar Drawer
    └──replaces──> Bottom Tab Nav (App.tsx tabs array → drawer items)
    └──requires──> Route structure unchanged (paths stay same)
    └──provides──> Profile page entry point (drawer footer avatar tap)
    └──provides──> Settings entry point (drawer footer gear icon)

Unified Daily Plan (今日方案)
    └──merges──> DailyPlan.tsx (food slot generation + swap)
    └──merges──> SupplementSchedule.tsx (timing-grouped supplement rows)
    └──merges──> NutritionTracker.tsx (nutrition summary from checked items)
    └──requires──> Checkbox state persistence (new: checkedIds per date in localStorage)
    └──requires──> Lock logic (isLocked = checkedIds.size > 0)
    └──feeds──> Meal Menu Management (save current plan's item IDs as MenuPreset)

Meal Menu Management (我的菜單)
    └──requires──> Unified Daily Plan (plan must exist to save)
    └──requires──> MenuPreset data model (new: name, slots, createdAt in localStorage)
    └──provides──> Load into daily plan (replaces random generation)

Profile Page
    └──requires──> ProfileService or SettingsService extension (name, avatar stored)
    └──reuses──> WeightLog.tsx (either embed or link from profile)
    └──provides to──> Sidebar Drawer (name + avatar shown in drawer footer)
    └──reads from──> SettingsService (TDEE/macro targets summary)

Nutrition Summary Bar in Unified Plan
    └──requires──> Checkbox state (only sum macros for checked food items)
    └──requires──> FoodItem.cal/protein/fat/carbs (already on FoodItem type)
    └──reads from──> SettingsService (daily targets for progress display)
```

### Dependency Notes

- **Unified Plan requires Sidebar Drawer first:** The page restructure removes the bottom nav and adds a new `/plan` route; Drawer must exist before the unified plan page can be navigated to properly.
- **Profile page data is independent:** Can be built in parallel with Unified Plan; only needs `SettingsService` and `WeightLog` re-export.
- **Menu Management depends on Unified Plan being stable:** Cannot save a plan that doesn't have a stable item ID structure; build after Unified Plan checkbox state is working.
- **NutritionTracker page may be deprecated:** Once unified plan handles nutrition logging via checkboxes, the separate `/track` route may become redundant. Decision: keep route but redirect to `/plan` with a deprecation note; remove after v3.0 validated.

---

## MVP Definition

### Launch With (v3.0)

Minimum viable product for the sidebar + unified plan milestone.

- [ ] Sidebar drawer replacing bottom tab nav — without this, the milestone has no visual change
- [ ] Profile page with name, avatar, weight log link — needed for drawer footer to be functional
- [ ] Unified checkbox daily plan (food + supplements merged, checkbox logs consumption) — core UX change
- [ ] Lock full re-random when items checked; single-item re-random always enabled — prevents accidental log destruction
- [ ] Nutrition macro summary bar (checked items only) — makes checkbox tracking meaningful
- [ ] Meal Menu save + load (name, save current, load into plan, delete) — the new differentiating feature

### Add After Validation (v3.1)

Features to add once core is working and confirmed stable.

- [ ] Swipe gesture open/close for drawer — adds polish; not blocking functionality
- [ ] Supplement coverage indicator ("X/Y 已服用") in unified plan — nice signal but not required for MVP
- [ ] Plan → Menu save from partial check state — edge case; basic save-from-full-plan is sufficient for launch

### Future Consideration (v4+)

Features to defer until product-market fit established.

- [ ] Plain text plan export (copy to clipboard) — low demand until sharing is validated
- [ ] Multiple saved plan dates (history view) — adds data model complexity
- [ ] Menu tagging / categorization — needed only when menu list exceeds ~10 items

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Sidebar drawer (replaces bottom nav) | HIGH | LOW | P1 |
| Drawer profile footer (avatar + name) | MEDIUM | LOW | P1 |
| Profile page (name entry + weight) | MEDIUM | LOW | P1 |
| Unified daily plan (food + supplements) | HIGH | HIGH | P1 |
| Checkbox logging in unified plan | HIGH | MEDIUM | P1 |
| Lock full re-random when checked | HIGH | LOW | P1 |
| Nutrition summary bar (checked items) | HIGH | MEDIUM | P1 |
| Meal menu save/load | HIGH | MEDIUM | P1 |
| Swipe gesture for drawer | LOW | MEDIUM | P2 |
| Supplement coverage indicator | LOW | LOW | P2 |
| Drawer section grouping headers | LOW | LOW | P2 |
| Lock icon tooltip explanation | LOW | LOW | P2 |

**Priority key:**
- P1: Must have for launch (defines the milestone)
- P2: Should have, add when P1 items are stable
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | MyFitnessPal | Cronometer | Our Approach |
|---------|--------------|------------|--------------|
| Navigation structure | Bottom tab (5 items) + hamburger for overflow | Bottom tab + side menu | Full sidebar drawer replaces bottom tabs entirely |
| Daily log structure | Meal sections (B/L/D/S) with + button per meal | Diary with meal sections | Merged slots from schedule + supplement timing groups |
| Supplement logging | Separate "Supplements" section | Nutrient diary (manual only) | Inline in unified plan under timing headers |
| Meal saving | "Meals" tab saves food combos | "Custom Foods" | 我的菜單: save named plan presets, load into today |
| Profile location | Hamburger menu → profile at top | Hamburger → profile icon | Drawer footer → avatar tap → `/profile` page |
| Re-random / refresh | N/A (not a plan generator) | N/A | Lock on check, per-item swap always available |

---

## Implementation Notes for Roadmap

### Sidebar Drawer: One Component, Zero Libraries

No library needed. The drawer is a `div` with `transform: translateX(-100%)` when closed, `transform: translateX(0)` when open, and a `transition`. Overlay is a separate fixed `div` with `pointer-events-none` when closed. Total: ~80 lines. Using MUI Drawer or similar adds 300KB+ for a 3-line CSS problem.

### Unified Plan: Merging Three Pages

The merge is primarily a UI concern. The underlying data sources stay separate:
- Food slots: from `SCHEDULE` (existing `src/data/schedule.ts`)
- Supplements: from `ItemService.getSupplements()` (existing)
- Checkbox state: new `checkedIds: string[]` stored as `localStorage.setItem("plan_checked_" + todayStr(), JSON.stringify([...ids]))`

The nutrition summary bar reads `FoodItem` macros for checked food IDs only. This requires `FOOD_MAP` to be accessible from the unified plan component.

### Menu Preset Data Model

```typescript
interface MenuPreset {
  id: string;           // nanoid or timestamp string
  name: string;         // user-entered name
  createdAt: string;    // ISO date string
  slots: {
    slotLabel: string;  // e.g. "早餐", "午餐"
    itemIds: string[];  // food and supplement IDs
  }[];
}
```

Store as `localStorage.setItem("menu_presets", JSON.stringify(MenuPreset[]))`. No Sheets sync needed for v3.0 — menus are device-local like settings.

### Profile Service

Extend `SettingsService` rather than creating a new service. Add a `profile` key to the settings schema:

```typescript
interface ProfileData {
  displayName: string;
  avatar: string; // emoji character or 1-2 letter initial
}
```

Reading name in drawer and profile page both call `SettingsService.getProfile()`. No new service singleton needed.

---

## Sources

- [Material Design Navigation Drawer spec — avatar/name in drawer footer](https://m1.material.io/patterns/navigation-drawer.html)
- [Mobile Navigation UX Best Practices 2026](https://www.designstudiouiux.com/blog/mobile-navigation-ux/)
- [Side Drawer UI: A Guide to Smarter Navigation](https://www.designmonks.co/blog/side-drawer-ui)
- [React Swipeable — gesture handling for drawer](https://codingcops.com/react-swipeable/)
- [Plan to Eat — meal plan save/reuse pattern](https://www.plantoeat.com/)
- [Samsung Food — unlimited saved meal plans](https://apps.apple.com/us/app/samsung-food-meal-planner/id1133637674)
- [Paprika Recipe Manager — reusable menus pattern](https://www.paprikaapp.com/)
- [Best Meal Planner Apps 2025 — feature survey](https://fitia.app/learn/article/best-meal-planner-apps-2025-expert-review/)
- [11 Best Nutrition Tracking Apps 2025](https://www.nutrisense.io/blog/apps-to-track-nutrition)
- Existing codebase analysis: `App.tsx`, `DailyPlan.tsx`, `SupplementSchedule.tsx`, `NutritionTracker.tsx`, `src/data/types.ts`, `src/lib/data-service.ts`

---
*Feature research for: Sidebar drawer navigation, unified checkbox daily plan, meal menu management, profile page*
*Researched: 2026-04-06*
