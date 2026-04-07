# Phase 10: Sidebar Drawer Shell - Context

**Gathered:** 2026-04-06 (assumptions mode, --auto)
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the bottom tab bar with a sidebar drawer. Users navigate the entire app through the drawer, opened via a hamburger icon in a fixed top bar. The drawer shows 4 main navigation items, a footer with avatar+name stub and settings icon. The drawer must handle focus trap, Escape-to-close, backdrop click, and iOS Safari body scroll lock. No page merges or new features — this is purely navigation shell replacement.

</domain>

<decisions>
## Implementation Decisions

### Component Placement and File Structure
- **D-01:** SidebarDrawer will be the first file in a new `src/components/` directory, as a standalone component receiving `open` and `onClose` props from App.tsx
- **D-02:** Drawer open/closed state lives in App.tsx via `useState` — pages never manage drawer state

### Route Preservation
- **D-03:** All 7 existing routes (`/plan`, `/foods`, `/track`, `/supplements`, `/items`, `/weight`, `/settings`) remain functional. Routes not in the drawer (`/track`, `/items`, `/weight`) are accessible via direct URL until later phases retire them.
- **D-04:** Drawer shows exactly 4 main nav items: 今日方案 (`/plan`), 我的食材 (`/foods`), 我的菜單 (`/menu` — new route, placeholder page), 營養補充 (`/supplements`)
- **D-05:** Add `/menu` route with a minimal placeholder page for Phase 13; add `/profile` route with a minimal placeholder page for Phase 11

### Headless UI Dialog
- **D-06:** Install `@headlessui/react@^2.2.9` as new dependency. Use Dialog/DialogPanel for the drawer with built-in focus trap, Escape-to-close, and ARIA `role="dialog"`
- **D-07:** Drawer transitions use Tailwind v4 `data-[closed]` syntax: panel slides in from left (`data-[closed]:-translate-x-full`), backdrop fades (`data-[closed]:opacity-0`)

### Top Bar and Layout
- **D-08:** Hamburger icon placed in a fixed top bar (top-left), not a bottom FAB. Top bar height ~40px with `pt-10` content offset.
- **D-09:** Remove bottom nav (`<nav>` block in App.tsx) and `pb-20` from outer container
- **D-10:** Audit and remove `pb-24` bottom padding from FoodManager, SupplementSchedule, and SupplementManager pages to prevent leftover whitespace

### iOS Safari Scroll Lock
- **D-11:** Use headlessui Dialog's built-in scroll lock first. If insufficient on iOS Safari, apply `position:fixed` technique on `<body>` (not `overflow:hidden`, which fails on iOS). Target iOS 15+ compatibility.

### Claude's Discretion
- Top bar styling (background color, border, blur) — should match existing dark theme tokens
- Drawer width on mobile (likely 75-80% viewport or 280px)
- Transition duration and easing
- Active route highlight style in drawer

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Navigation requirements
- `.planning/REQUIREMENTS.md` §v3.0 Navigation — NAV-01 through NAV-04 acceptance criteria
- `.planning/ROADMAP.md` §Phase 10 — Success criteria and phase goal

### Current implementation
- `src/App.tsx` — Current bottom nav, route definitions, GAS version check, layout structure
- `src/pages/FoodManager.tsx` — Has `pb-24` padding to audit
- `src/pages/SupplementSchedule.tsx` — Has `pb-24` padding to audit
- `src/pages/SupplementManager.tsx` — Has `pb-24` padding to audit

### Architecture decisions
- `.planning/STATE.md` §Decisions — Locked decisions on headlessui, scroll lock, drawer state placement

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tabs` array in `src/App.tsx` (line 19): Contains route/icon/label mappings — can be refactored into drawer nav items
- `NavLink` from react-router-dom: Already used for active route highlighting with `isActive` callback
- Dark theme tokens in `src/styles/index.css`: `--color-surface`, `--color-surface-raised`, `--color-emerald-glow`

### Established Patterns
- Fixed positioned nav: Current bottom nav uses `fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur` — similar pattern applies to top bar and drawer
- `max-w-xl mx-auto`: Content container pattern used in App.tsx and all pages
- No `src/components/` directory yet — this phase creates it

### Integration Points
- `src/App.tsx`: Primary integration point — drawer state, top bar, route changes
- `useNavigate` / `useLocation`: Already imported in App.tsx for GAS version check; can reuse for drawer auto-close on route change
- `SettingsService`: Drawer footer settings icon will link to `/settings` (existing route)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The drawer should feel native on mobile with smooth slide-in animation and proper backdrop dimming.

</specifics>

<deferred>
## Deferred Ideas

- Swipe-to-open drawer gesture — explicitly out of scope per REQUIREMENTS.md
- Drawer transition animations beyond basic slide/fade — keep simple for v3.0
- Profile page content — Phase 11 scope
- Menu page content — Phase 13 scope

</deferred>

---

*Phase: 10-sidebar-drawer-shell*
*Context gathered: 2026-04-06*
