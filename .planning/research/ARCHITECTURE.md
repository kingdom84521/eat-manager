# Architecture Research

**Domain:** Offline-first React SPA — Sidebar Drawer Navigation & Page Consolidation (v3.0)
**Researched:** 2026-04-06
**Confidence:** HIGH — all decisions derived from direct codebase analysis of current source files

> **Note:** This file supersedes v2.0 research (2026-03-30) for the v3.0 milestone.
> v2.0 research remains valid as historical context — the v2.0 component architecture
> described there is now the "existing" baseline that v3.0 builds on.

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     App.tsx (Shell)                          │
│  ┌────────────────────────┐  ┌──────────────────────────┐   │
│  │   SidebarDrawer        │  │   GAS Banner (error)     │   │
│  │   (overlay + backdrop) │  └──────────────────────────┘   │
│  │   ┌────────────────┐   │                                  │
│  │   │  NavItems      │   │  ┌───────────────────────────┐  │
│  │   │  /plan         │   │  │  Routes (content area)    │  │
│  │   │  /foods        │   │  │  /plan    → UnifiedPlan   │  │
│  │   │  /supplements  │   │  │  /foods   → FoodManager   │  │
│  │   │  /menu         │   │  │  /supps   → SupplMgr      │  │
│  │   │  /weight       │   │  │  /menu    → MyMenu        │  │
│  │   ├────────────────┤   │  │  /weight  → WeightLog     │  │
│  │   │  ProfileLink   │   │  │  /profile → Profile       │  │
│  │   │  SettingsLink  │   │  │  /settings→ Settings      │  │
│  │   └────────────────┘   │  └───────────────────────────┘  │
│  └────────────────────────┘                                  │
└─────────────────────────────────────────────────────────────┘
         ↓                              ↓
┌─────────────────┐          ┌─────────────────────────────┐
│  SettingsService │          │  DataService / ItemService  │
│  (localStorage) │          │  (localStorage + SheetsAPI) │
└─────────────────┘          └─────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `App.tsx` | Shell: drawer open/close state, GAS check, routes | `useState(drawerOpen)`, HashRouter routes |
| `SidebarDrawer` | Overlay nav, open/close animation, nav links, profile+settings links at bottom | Fixed overlay, `translate-x` CSS transition |
| `UnifiedPlan` (replaces `DailyPlan`) | Today's plan + nutrition log + supplement routine as one checkbox interface | Tabs or sections within single page |
| `MyMenu` | Create/save/reuse named meal combinations | New page, `ItemService` or new `MenuService` |
| `Profile` | Weight log display + avatar + name entry | Extracts from existing `WeightLog` + new avatar/name fields |
| `Settings` | Unchanged — BMR, guidelines, Sheets config | No change to internal logic |
| `FoodManager` | Unchanged from v2.0 | No change |
| `SupplementManager` | Unchanged from v2.0 | No change |

---

## Recommended Project Structure

```
src/
├── components/
│   └── SidebarDrawer.tsx      # NEW — drawer nav component
├── pages/
│   ├── UnifiedPlan.tsx        # NEW — replaces DailyPlan.tsx
│   ├── MyMenu.tsx             # NEW — menu management
│   ├── Profile.tsx            # NEW — weight + avatar/name
│   ├── FoodManager.tsx        # Unchanged (v2.0)
│   ├── SupplementManager.tsx  # Unchanged (v2.0)
│   ├── WeightLog.tsx          # Retire — absorb into Profile.tsx
│   ├── NutritionTracker.tsx   # Retire — absorb into UnifiedPlan.tsx
│   ├── SupplementSchedule.tsx # Retire — absorb into UnifiedPlan.tsx
│   └── Settings.tsx           # Unchanged
├── lib/
│   ├── menu-service.ts        # NEW — menu CRUD
│   ├── item-service.ts        # Unchanged (v2.0)
│   ├── data-service.ts        # Minor: expose nutrition log write for UnifiedPlan
│   ├── settings-service.ts    # Extend: add displayName + avatarInitials fields
│   └── sheets-api.ts          # Unchanged
└── App.tsx                    # MODIFY — drawer state, updated routes, no bottom nav
```

### Structure Rationale

- **`src/components/`:** Introduced for the first time because `SidebarDrawer` is a true shared layout component, not a page. All other shared sub-components (`TagBadge`, `ItemCard`, etc.) currently live inline in pages — that stays unchanged.
- **Three retired pages:** `WeightLog`, `NutritionTracker`, `SupplementSchedule` are not deleted immediately — their logic is extracted and re-homed, but they can stay as files until the phase that absorbs them is complete (safety net against regressions).

---

## Architectural Patterns

### Pattern 1: Drawer-as-Shell in App.tsx

**What:** `App.tsx` owns `drawerOpen: boolean` state and renders `<SidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />` as a sibling to `<Routes>`. A hamburger button in each page header (or in a thin top bar) calls `setDrawerOpen(true)`.

**When to use:** The drawer is an app-level concern. Pages do not manage it.

**Trade-offs:** Pages need a way to open the drawer. Options: (a) pass `onOpenDrawer` prop to every page — verbose; (b) use a shared context — one valid exception to the no-Context rule; (c) put a fixed top bar in `App.tsx` with the hamburger — cleanest, zero prop threading.

**Recommended approach:** Fixed top bar in `App.tsx` (option c). 40px height, contains hamburger left and page title center. No prop drilling.

```typescript
// App.tsx
const [drawerOpen, setDrawerOpen] = useState(false);

return (
  <div className="min-h-screen bg-slate-950 text-slate-100 max-w-xl mx-auto">
    <SidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    {/* Fixed top bar */}
    <header className="fixed top-0 left-0 right-0 max-w-xl mx-auto h-10 flex items-center px-4 bg-slate-900/95 z-40">
      <button onClick={() => setDrawerOpen(true)}>☰</button>
      <PageTitle /> {/* derived from current route */}
    </header>
    <div className="pt-10">
      <Routes>...</Routes>
    </div>
  </div>
);
```

### Pattern 2: SidebarDrawer as Fixed Overlay

**What:** `SidebarDrawer` renders as a fixed overlay with a semi-transparent backdrop. The drawer panel slides in from the left using a CSS `translate-x` transition driven by the `open` prop.

**When to use:** Standard mobile drawer pattern — no library needed, pure Tailwind.

**Trade-offs:** Requires `z-50` to sit above page content. The backdrop click closes the drawer (call `onClose`). Route changes (via `NavLink` click) must also close the drawer — handle via `useEffect` watching `location.pathname`.

```typescript
// SidebarDrawer.tsx — structure
export function SidebarDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();
  useEffect(() => { onClose(); }, [location.pathname]); // close on nav

  return (
    <>
      {/* Backdrop */}
      {open && <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />}
      {/* Panel */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-slate-900 z-50 transform transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Nav links */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          <NavLink to="/plan">今日方案</NavLink>
          <NavLink to="/foods">食材管理</NavLink>
          <NavLink to="/supplements">補品管理</NavLink>
          <NavLink to="/menu">我的菜單</NavLink>
          <NavLink to="/weight">體重紀錄</NavLink>
        </nav>
        {/* Bottom anchored links */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-4 border-t border-slate-800">
          <NavLink to="/profile">個人資料</NavLink>
          <NavLink to="/settings">⚙️ 設定</NavLink>
        </div>
      </div>
    </>
  );
}
```

### Pattern 3: UnifiedPlan — Tabs Within One Page

**What:** `UnifiedPlan` (`/plan`) combines three existing views: food plan generation (from `DailyPlan`), nutrition log summary (from `NutritionTracker`), and supplement routine (from `SupplementSchedule`). These are rendered as **tab sections within a single page** rather than separate routes.

**When to use:** The three views share a "today" context. Merging them removes the need to navigate between tabs to complete a single daily workflow (check food → check supplements → verify nutrition).

**Trade-offs:** The page becomes larger. Keep sub-sections as named sub-components within the file (matching existing convention). State for each section stays local to its sub-component where possible.

**Checkbox logging pattern:** Checking a food plan item logs it as a `NutritionEntry`. Unchecking removes the log entry. The "lock on check" rule: once any item is checked, the "全部重新隨機" button is hidden; only per-item swap (🔄) remains available.

```typescript
// Internal tab state — no router involvement
type PlanTab = "food" | "supplements";
const [activeTab, setActiveTab] = useState<PlanTab>("food");
```

### Pattern 4: Profile Page — Extracted from WeightLog + New Fields

**What:** `/profile` hosts weight log display (lifted from `WeightLog.tsx`) plus new display-name and avatar-initials fields. The weight log input form that was inline in `WeightLog` moves here.

**When to use:** The PRD places "weight log + avatar+name" at the drawer bottom as a profile concept, distinct from Settings (which is technical config).

**Trade-offs:** `SettingsService` must be extended to persist `displayName` and `avatarInitials`. These are profile fields, not BMR configuration, but they live in the same localStorage key (`eat_manager_settings`) under the existing `userProfile` object — cleanest approach, no new key needed.

```typescript
// Extend UserProfile in types.ts
export interface UserProfile {
  // ... existing fields ...
  displayName?: string;       // "王小明"
  avatarInitials?: string;    // "王" — shown as avatar circle
}
```

### Pattern 5: MyMenu Service

**What:** `MenuService` manages named meal combinations. A menu is a user-created grouping of food IDs with a name. Users can apply a menu to a plan slot, replacing the randomly picked items.

**When to use:** The feature is self-contained enough to warrant its own service module, following the `ItemService` / `DataService` singleton pattern.

**Trade-offs:** Menus are personal config, not logs. They belong in localStorage with optional Sheets sync. `MenuService` mirrors `ItemService` pattern exactly.

```typescript
export interface MenuItem {
  id: string;          // "menu_1712345678"
  name: string;        // "我的早餐套餐"
  foodIds: string[];   // food item IDs from ItemService
  notes?: string;
}

export const MenuService = {
  async getMenus(): Promise<MenuItem[]>,
  async saveMenu(menu: MenuItem): Promise<void>,  // upsert by id
  async deleteMenu(id: string): Promise<void>,
};
```

LocalStorage key: `wellness_menus` (under existing `wellness_` prefix).
Sheets tab: `menus` (optional — add only if user wants cross-device sync).

---

## Data Flow

### Request Flow: Drawer Navigation

```
User taps hamburger (top bar)
    ↓
App.tsx setDrawerOpen(true)
    ↓
SidebarDrawer renders (open=true → translate-x-0)
    ↓
User taps NavLink → HashRouter navigates
    ↓
SidebarDrawer useEffect [location.pathname] → onClose()
    ↓
App.tsx setDrawerOpen(false)
    ↓
SidebarDrawer slides out (translate-x-full)
```

### Request Flow: UnifiedPlan Checkbox → Nutrition Log

```
User checks food item in UnifiedPlan
    ↓
handleCheckFood(itemId, checked)
    ↓
if (checked):
  DataService.logMeal({
    date: todayStr(),
    meal: slot.mealType,    // "breakfast" | "lunch" etc.
    items_json: JSON.stringify([itemId]),
    calories: item.cal,
    protein: item.protein,
    ...
  })
  setCheckedIds(prev => new Set([...prev, itemId]))
  setLocked(true)           // lock full re-random
else:
  DataService.removeMealEntry(itemId, todayStr())   // NEW method needed
  setCheckedIds(prev => { prev.delete(itemId); return new Set(prev) })
  if (checkedIds.size === 0) setLocked(false)
```

### Request Flow: MyMenu — Apply to Plan Slot

```
User opens MyMenu picker from a plan slot
    ↓
MenuService.getMenus() → MenuItem[]
    ↓
User selects menu → onApplyMenu(menu)
    ↓
UnifiedPlan replaces slot items with menu.foodIds
  (resolveItems(menu.foodIds) → ResolvedItem[])
    ↓
These items are pre-checked (auto-log them)
setSaved(false)  // plan needs re-save
```

### State Management

```
App.tsx (shell state)
  drawerOpen: boolean
  gasBroken: string | false

UnifiedPlan (page-local state)
  plan: GeneratedSlot[] | null      ← from DailyPlan
  checkedIds: Set<string>           ← NEW
  locked: boolean                   ← NEW (no full re-random when checked)
  takenStates: Map<string, TakenState>  ← from SupplementSchedule
  nutritionTargets: ComputedTargets | null  ← from NutritionTracker

Profile (page-local state)
  entries: WeightEntry[]            ← from WeightLog
  displayName: string               ← from SettingsService
  avatarInitials: string            ← from SettingsService
```

### Key Data Flows

1. **Plan generation lock:** `locked` state in `UnifiedPlan` prevents full re-random when `checkedIds.size > 0`. Single-item swap (🔄 button on each card) is always available — it only affects one slot, not the full plan.
2. **Cross-section shared date:** All three sections in `UnifiedPlan` derive from `todayStr()` — computed once at render, passed down to sub-sections. No date sync needed between sections.
3. **SettingsService read-on-render:** `Profile` and `Settings` read from `SettingsService` synchronously at render time — existing pattern, unchanged. No React state for settings at page level; re-renders happen on form submit which saves then forces re-read.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single user (current) | App-level `useState` for drawer. No Context needed. |
| If multiple pages need drawer state | Add a `DrawerContext` — one valid exception to the no-Context rule. But wait until the need is real; the top-bar approach avoids this entirely. |
| If `UnifiedPlan` becomes too large | Extract `FoodPlanSection`, `SupplementSection`, `NutritionSummary` as named sub-components within the same file — matching existing convention (`TagBadge`, `ItemCard` inline). |
| If `MenuService` grows | The `MenuItem` model is simple. Scaling concern is only localStorage size — 50 menus × ~500 bytes = ~25 KB, well within limit. |

### Scaling Priorities

1. **First concern:** `UnifiedPlan.tsx` will be the largest page (~250-350 LOC). Keep sub-components inline as per existing convention. Do not split into separate files until it exceeds ~500 LOC.
2. **Second concern:** Drawer open/close state in `App.tsx` is sufficient. If other pages need to trigger drawer close (e.g., a "back" action in a sub-page), use `useNavigate(-1)` — the drawer auto-closes on route change via the `useEffect`.

---

## Anti-Patterns

### Anti-Pattern 1: Separate routes for plan sections

**What people do:** Keep `/plan`, `/track`, `/schedule` as separate routes and just replace the tab bar with drawer links pointing to three different URLs.

**Why it's wrong:** The v3.0 requirement explicitly merges them into a unified checkbox interface. Separate routes mean separate state — checking a food item cannot automatically update the nutrition summary without a full navigation. The cross-section interaction (check food → nutrition bar updates) requires shared component state.

**Do this instead:** Single `/plan` route with `UnifiedPlan` containing internal tab/section state. All three domains share the same component lifecycle and can share state directly.

### Anti-Pattern 2: Drawer state in localStorage

**What people do:** Persist `drawerOpen` to localStorage so the drawer "remembers" its state.

**Why it's wrong:** Drawer open state is transient UI, not user data. Persisting it creates confusing behavior on next app open (drawer starts open). Mobile users expect drawers to be closed on fresh load.

**Do this instead:** `useState(false)` in `App.tsx`. Always starts closed.

### Anti-Pattern 3: WeightLog as a separate route after v3.0

**What people do:** Keep `/weight` as an independent page and add `/profile` as a new page that duplicates or links to it.

**Why it's wrong:** The PRD defines Profile as "weight log + avatar+name at drawer bottom." Weight log is a sub-feature of Profile, not an independent destination. Two routes for the same data causes confusion about where to log weight.

**Do this instead:** `/profile` contains weight log display + input form + avatar/name fields. Remove `/weight` route after `Profile` is complete. Update the `WeightLog` link in the drawer to `/profile`.

### Anti-Pattern 4: Storing re-random lock state in localStorage

**What people do:** Persist the `locked` boolean so the plan stays locked across page reloads.

**Why it's wrong:** Over-engineering. The lock is derived state: `locked = checkedIds.size > 0`. On page reload, `checkedIds` is rehydrated from `DataService.getNutritionLog(todayStr())`. The lock state follows naturally — no need to persist it separately.

**Do this instead:** Derive `locked` from `checkedIds` size. On mount, load today's nutrition log and populate `checkedIds` from it.

### Anti-Pattern 5: Using a CSS library or animation library for the drawer

**What people do:** Install `framer-motion` or `react-spring` for the slide animation.

**Why it's wrong:** The existing codebase uses zero animation libraries. Tailwind's `transition-transform duration-200` is sufficient for a sidebar drawer on mobile. Adding a dependency for a 4-line CSS pattern is not justified.

**Do this instead:** `transform transition-transform duration-200 ease-in-out` with `translate-x-0` vs `-translate-x-full` classes, conditionally applied based on `open` prop.

### Anti-Pattern 6: Checkbox persistence via a new localStorage key

**What people do:** Create a new `wellness_plan_checked_ids` key for checkbox state.

**Why it's wrong:** Checked food items ARE nutrition log entries. They already have a storage home: `DataService.logMeal()` and `wellness_nutrition_log_{date}`. Creating a parallel store duplicates data and creates sync drift.

**Do this instead:** On mount, rehydrate `checkedIds` from `DataService.getNutritionLog(todayStr())`. Check = call `logMeal`. Uncheck = call `removeMealEntry` (new `DataService` method, removes by `itemId + date`).

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Google Apps Script | Unchanged — fire-and-forget via `SheetsAPI` | No new Sheets tabs required for v3.0 unless `MenuService` opts into Sheets sync |
| USDA FDC API | Unchanged — used only in `FoodManager` ingredient search | Not involved in v3.0 features |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `App.tsx` ↔ `SidebarDrawer` | Props: `open`, `onClose` | Simple — no context needed |
| `UnifiedPlan` ↔ `DataService` | Direct import — existing pattern | Add `removeMealEntry()` method to `DataService` |
| `UnifiedPlan` ↔ `ItemService` | Direct import — supplement routine section | Existing pattern from `SupplementSchedule` |
| `Profile` ↔ `SettingsService` | Direct import — read `userProfile`, save extended fields | Extend `UserProfile` type with `displayName?`, `avatarInitials?` |
| `MyMenu` ↔ `MenuService` | Direct import | New module, new page, no cross-page interaction |
| `SidebarDrawer` ↔ `react-router-dom` | `useLocation()` to auto-close on nav | Single `useEffect` — no side effects beyond closing |

---

## File Change Impact Matrix

| File | Change Type | Risk | Notes |
|------|-------------|------|-------|
| `src/App.tsx` | Modify — remove bottom nav, add drawer state, add routes `/menu` `/profile` | Medium | Central file; all routes pass through here |
| `src/components/SidebarDrawer.tsx` | New file | None | First use of `src/components/` directory |
| `src/pages/UnifiedPlan.tsx` | New file (replaces 3 pages) | High | Most complex change; requires merging logic from `DailyPlan`, `NutritionTracker`, `SupplementSchedule` |
| `src/pages/Profile.tsx` | New file (absorbs WeightLog) | Low | Mostly extraction from `WeightLog.tsx` + new fields |
| `src/pages/MyMenu.tsx` | New file | None | New feature, no existing consumers |
| `src/lib/menu-service.ts` | New file | None | New service, no existing consumers |
| `src/lib/data-service.ts` | Modify — add `removeMealEntry()` | Low | Additive method only |
| `src/data/types.ts` | Modify — extend `UserProfile` with `displayName?`, `avatarInitials?` | Low | Optional fields, backward compatible |
| `src/pages/DailyPlan.tsx` | Retire (keep as file until UnifiedPlan ships) | Low | Keep for rollback safety; remove route when ready |
| `src/pages/NutritionTracker.tsx` | Retire (keep as file until UnifiedPlan ships) | Low | Same |
| `src/pages/SupplementSchedule.tsx` | Retire (keep as file until UnifiedPlan ships) | Low | Same |
| `src/pages/WeightLog.tsx` | Retire (keep as file until Profile ships) | Low | Same |

---

## Suggested Build Order

Dependencies flow strictly downward. Each phase must compile and render before the next begins.

### Phase 1: Drawer Shell (no page changes)

Scope: Replace bottom nav with sidebar drawer in `App.tsx`. Pages are unchanged.

Files:
- `src/components/SidebarDrawer.tsx` — new component (links to existing routes)
- `src/App.tsx` — remove `tabs` array, remove `<nav>` bottom bar, add `<SidebarDrawer>`, add fixed top bar with hamburger, add placeholder routes for `/menu` and `/profile` pointing to stub components

Gate: App renders with working drawer on all 7 existing routes. No regression on GAS check, routing, or page content.

Produces: Working drawer navigation. Zero page logic changes — this phase has the smallest blast radius.

### Phase 2: Profile Page (replaces WeightLog route)

Scope: Extract `WeightLog` content into `Profile.tsx`, add avatar/name fields.

Files:
- `src/pages/Profile.tsx` — new, absorbs `WeightLog` logic + adds name/initials fields
- `src/data/types.ts` — extend `UserProfile` with `displayName?`, `avatarInitials?`
- `src/lib/settings-service.ts` — save/read new profile fields
- `src/App.tsx` — add `/profile` route, update drawer link

Gate: Profile page shows weight log history, accepts name and avatar initials, persists to `SettingsService`. WeightLog route kept alive in parallel until phase completes.

Produces: Profile feature complete. `/weight` route can now be retired.

### Phase 3: UnifiedPlan — Supplement Section

Scope: Merge `SupplementSchedule` into `/plan` as a tab within `UnifiedPlan`.

Files:
- `src/pages/UnifiedPlan.tsx` — new, starts as a copy of `DailyPlan.tsx`, adds internal tab navigation, embeds supplement routine section (extracted from `SupplementSchedule`)

Gate: `/plan` shows both food plan and supplement routine tabs. Supplement taken/skipped state works correctly. `/items` route (old `SupplementSchedule`) kept alive in parallel until verified.

Produces: Supplement section merged into plan page.

### Phase 4: UnifiedPlan — Nutrition Summary + Checkbox Logging

Scope: Add nutrition budget bar (from `NutritionTracker`) to `UnifiedPlan`, wire food plan checkboxes to `DataService.logMeal`.

Files:
- `src/pages/UnifiedPlan.tsx` — add checkedIds state, locked state, nutrition summary section
- `src/lib/data-service.ts` — add `removeMealEntry()` method

Gate: Checking a food item logs it as a nutrition entry. Unchecking removes it. Nutrition budget bar updates in real time. Full re-random locks when any item is checked; per-item swap (🔄) always works. On page reload, checked state rehydrates from today's nutrition log.

Produces: Unified plan with checkbox logging. `/track` and `/schedule` old routes can be retired.

### Phase 5: My Menu

Scope: Build `MyMenu` feature — create, name, save, and apply meal combinations.

Files:
- `src/lib/menu-service.ts` — new CRUD service
- `src/pages/MyMenu.tsx` — list + create + edit + delete menus
- `src/pages/UnifiedPlan.tsx` — add "套用菜單" button on plan slots

Gate: User can create a named menu, apply it to a plan slot, and the slot items are replaced with menu items. Menus persist across reload.

Produces: My Menu feature complete.

---

## Sources

- Direct codebase analysis: `src/App.tsx`, `src/pages/DailyPlan.tsx`, `src/pages/NutritionTracker.tsx`, `src/pages/SupplementSchedule.tsx`, `src/pages/WeightLog.tsx`, `src/pages/Settings.tsx`, `src/lib/data-service.ts`, `src/lib/settings-service.ts`, `src/lib/item-service.ts`
- Project requirements: `.planning/PROJECT.md` (v3.0, 2026-04-06)
- Previous architecture research: `.planning/research/ARCHITECTURE.md` (v2.0, 2026-03-30)
- Confidence: HIGH — all integration decisions derived from direct source file inspection. No external library research required; drawer animation uses existing Tailwind CSS v4 utilities already in the project.

---
*Architecture research for: Eat Manager v3.0 — Sidebar Navigation & Page Consolidation*
*Researched: 2026-04-06*
