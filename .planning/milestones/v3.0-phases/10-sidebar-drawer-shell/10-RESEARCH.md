# Phase 10: Sidebar Drawer Shell - Research

**Researched:** 2026-04-06
**Domain:** React sidebar drawer, @headlessui/react Dialog, iOS Safari scroll lock, React Router NavLink
**Confidence:** HIGH

## Summary

Phase 10 replaces the existing seven-tab bottom navigation with a sidebar drawer opened via a hamburger icon in a fixed top bar. The drawer is built on `@headlessui/react@^2.2.9`'s `Dialog` + `DialogPanel` + `DialogBackdrop` components, which provide focus trap, Escape-to-close, ARIA `role="dialog"`, and iOS-aware scroll locking out of the box — no extra scroll-lock library is needed.

All implementation decisions are locked in CONTEXT.md (D-01 through D-11). The work touches exactly three files of existing code: `src/App.tsx` (drawer state, top bar, route additions, bottom nav removal) and three page files (`FoodManager.tsx`, `SupplementSchedule.tsx`, `SupplementManager.tsx`) for `pb-24` cleanup. One new file is created: `src/components/SidebarDrawer.tsx`.

The primary risk is the iOS Safari scroll lock edge case: headlessui v2 uses `touchmove` prevention + `overscroll-behavior: contain` rather than `position:fixed`, which is correct but has known edge cases in v2.1.8 around scroll position shift on dialog close. This does not require a workaround at implementation time — the built-in mechanism works for iOS 15+ — but should be verified on device before the phase is marked complete.

**Primary recommendation:** Build `SidebarDrawer` as a pure presentational component receiving `open`/`onClose` props; wire it in `App.tsx`; use `useEffect` watching `location.pathname` to call `onClose` for auto-close on navigation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** SidebarDrawer will be the first file in a new `src/components/` directory, as a standalone component receiving `open` and `onClose` props from App.tsx
- **D-02:** Drawer open/closed state lives in App.tsx via `useState` — pages never manage drawer state
- **D-03:** All 7 existing routes (`/plan`, `/foods`, `/track`, `/supplements`, `/items`, `/weight`, `/settings`) remain functional. Routes not in the drawer (`/track`, `/items`, `/weight`) are accessible via direct URL until later phases retire them.
- **D-04:** Drawer shows exactly 4 main nav items: 今日方案 (`/plan`), 我的食材 (`/foods`), 我的菜單 (`/menu` — new route, placeholder page), 營養補充 (`/supplements`)
- **D-05:** Add `/menu` route with a minimal placeholder page for Phase 13; add `/profile` route with a minimal placeholder page for Phase 11
- **D-06:** Install `@headlessui/react@^2.2.9` as new dependency. Use Dialog/DialogPanel for the drawer with built-in focus trap, Escape-to-close, and ARIA `role="dialog"`
- **D-07:** Drawer transitions use Tailwind v4 `data-[closed]` syntax: panel slides in from left (`data-[closed]:-translate-x-full`), backdrop fades (`data-[closed]:opacity-0`)
- **D-08:** Hamburger icon placed in a fixed top bar (top-left), not a bottom FAB. Top bar height ~40px with `pt-10` content offset.
- **D-09:** Remove bottom nav (`<nav>` block in App.tsx) and `pb-20` from outer container
- **D-10:** Audit and remove `pb-24` bottom padding from FoodManager, SupplementSchedule, and SupplementManager pages to prevent leftover whitespace
- **D-11:** Use headlessui Dialog's built-in scroll lock first. If insufficient on iOS Safari, apply `position:fixed` technique on `<body>` (not `overflow:hidden`, which fails on iOS). Target iOS 15+ compatibility.

### Claude's Discretion

- Top bar styling (background color, border, blur) — should match existing dark theme tokens
- Drawer width on mobile (likely 75-80% viewport or 280px)
- Transition duration and easing
- Active route highlight style in drawer

### Deferred Ideas (OUT OF SCOPE)

- Swipe-to-open drawer gesture — explicitly out of scope per REQUIREMENTS.md
- Drawer transition animations beyond basic slide/fade — keep simple for v3.0
- Profile page content — Phase 11 scope
- Menu page content — Phase 13 scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NAV-01 | User can open/close a sidebar drawer via hamburger icon | headlessui Dialog with `open`/`onClose`; hamburger button in fixed top bar triggers `setOpen(true)`, X button + backdrop click + Escape all trigger `onClose` |
| NAV-02 | Drawer shows 4 main items: 今日方案, 我的食材, 我的菜單, 營養補充 | NavLink array in SidebarDrawer; new `/menu` placeholder route added to App.tsx |
| NAV-03 | Drawer bottom shows avatar+name (→ profile) and settings icon (→ settings) | Footer section in SidebarDrawer with NavLink to `/profile` and `/settings`; new `/profile` placeholder route |
| NAV-04 | Drawer auto-closes on route navigation | `useEffect` watching `location.pathname` in App.tsx calls `setOpen(false)`; or pass router-aware `onClose` via NavLink's `onClick` in SidebarDrawer |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @headlessui/react | ^2.2.9 (latest: 2.2.9) | Accessible Dialog/DialogPanel/DialogBackdrop with focus trap, Escape-to-close, scroll lock | Decision D-06; purpose-built for Tailwind CSS, zero styling opinions |
| react-router-dom | ^7.6.0 (already installed) | NavLink for active route highlighting, useLocation for auto-close effect | Already used in App.tsx |
| tailwindcss | ^4.1.7 (already installed) | `data-[closed]` transition utilities on DialogPanel and DialogBackdrop | Decision D-07 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | — | iOS scroll lock | headlessui v2 built-in handles iOS 15+ via touchmove prevention + overscroll-behavior |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @headlessui/react Dialog | Radix UI Dialog | Radix is heavier, different API; headlessui is the official Tailwind Labs library |
| @headlessui/react Dialog | hand-rolled div+useEffect | Would need manual focus trap, ARIA, Escape key — exactly what D-06 avoids |
| body-scroll-lock npm package | headlessui built-in | Extra dependency; headlessui already handles iOS via touchmove prevention |

**Installation:**
```bash
npm install @headlessui/react@^2.2.9
```

**Version verification:** `npm view @headlessui/react version` returns `2.2.9` as of 2026-04-06.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── SidebarDrawer.tsx   # New — drawer component (D-01)
├── pages/
│   ├── MenuPlaceholder.tsx  # New — placeholder for /menu (D-05)
│   ├── ProfilePlaceholder.tsx # New — placeholder for /profile (D-05)
│   └── [existing pages unchanged]
└── App.tsx                  # Modified — drawer state, top bar, new routes
```

### Pattern 1: Dialog-as-Drawer (left-slide panel)

**What:** Use `Dialog` as the drawer container; `DialogBackdrop` for the dimmed overlay; `DialogPanel` for the slide-in panel. Apply `transition` prop to both backdrop and panel, using `data-[closed]` attribute classes for the enter/exit states.

**When to use:** Whenever a full-height slide-in panel needs focus trap + ARIA + Escape key.

**Example:**
```tsx
// Source: https://headlessui.com/react/dialog (verified 2026-04-06)
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";

interface SidebarDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SidebarDrawer({ open, onClose }: SidebarDrawerProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 transition duration-200 data-[closed]:opacity-0"
      />
      {/* Panel slides from left */}
      <div className="fixed inset-0 flex">
        <DialogPanel
          transition
          className="w-72 bg-slate-900 flex flex-col transition duration-300 ease-in-out data-[closed]:-translate-x-full"
        >
          {/* nav items + footer */}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
```

### Pattern 2: Drawer Auto-Close on Navigation

**What:** `useEffect` in App.tsx watches `location.pathname`. When the path changes, call `setDrawerOpen(false)`.

**When to use:** Required by NAV-04.

**Example:**
```tsx
// Source: react-router-dom useLocation + React useEffect
const location = useLocation(); // already imported in App.tsx
const [drawerOpen, setDrawerOpen] = useState(false);

useEffect(() => {
  setDrawerOpen(false);
}, [location.pathname]);
```

Alternative: Pass `onClose` as `onClick` to each `NavLink` in SidebarDrawer — simpler but requires threading the callback deeper. The `useEffect` approach keeps `SidebarDrawer` stateless and is preferred.

### Pattern 3: NavLink Active Highlight in Drawer

**What:** `NavLink` from react-router-dom exposes `isActive` in its `className` callback, identical to the existing bottom nav pattern.

**Example:**
```tsx
// Source: existing App.tsx pattern (line 91-96)
<NavLink
  to={item.path}
  className={({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      isActive
        ? "bg-blue-500/20 text-blue-400"
        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
    }`
  }
>
  {item.icon} {item.label}
</NavLink>
```

### Pattern 4: Fixed Top Bar

**What:** Replace the bottom nav with a fixed top bar containing the hamburger button. Apply `pt-10` (or `pt-12`) to the main content container to offset the fixed top bar height.

**Example:**
```tsx
// Source: existing App.tsx bottom nav pattern adapted (line 85)
{/* Top bar */}
<header className="fixed top-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 h-10 max-w-xl mx-auto flex items-center px-3">
  <button
    onClick={() => setDrawerOpen(true)}
    aria-label="開啟選單"
    className="text-slate-400 hover:text-slate-200 p-1"
  >
    ☰
  </button>
</header>
{/* Content offset */}
<div className="pt-10"> {/* was pb-20 for bottom nav */}
  <Routes>...</Routes>
</div>
```

### Pattern 5: Placeholder Page

**What:** Minimal page component returning a centered "coming soon" message, satisfying the route requirement without any real content.

**Example:**
```tsx
// For /menu and /profile placeholder routes
export default function MenuPlaceholder() {
  return (
    <div className="px-4 pt-10 text-center text-slate-500">
      <p className="text-lg mt-8">我的菜單</p>
      <p className="text-sm mt-2">即將推出</p>
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Putting drawer state in a page component:** Violates D-02; pages should never control the drawer.
- **Using `overflow:hidden` on `<body>` for iOS scroll lock:** Fails on iOS Safari; headlessui uses touchmove prevention instead (verified via source). Only use `position:fixed` fallback if headlessui built-in is insufficient after device testing.
- **Nesting `<Dialog>` inside `<Routes>`:** Dialog must live at App level (sibling to Routes), not inside a page, so it can overlay the entire viewport.
- **Forgetting `max-w-xl` constraint on top bar:** The top bar uses `max-w-xl mx-auto` to stay within the content column, matching all other fixed bars.
- **Leaving `pb-20` on the outer container:** D-09 removes it; leaving it causes empty whitespace at the bottom after the bottom nav is gone.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Focus trap in drawer | Custom tabIndex management + keydown listener | headlessui Dialog built-in | Edge cases with portals, shadow DOM, dynamic content |
| Escape-to-close | `window.addEventListener('keydown', ...)` | headlessui Dialog built-in (fires `onClose` on Escape) | Stacking order, cleanup, event bubbling |
| ARIA dialog role | Manual `role="dialog"` + `aria-modal` + `aria-labelledby` | headlessui Dialog built-in | Required attributes change based on state; headlessui manages them |
| iOS body scroll lock | Custom `position:fixed` + scrollY save/restore | headlessui Dialog built-in (touchmove prevention) | headlessui v2 has explicit `handle-ios-locking.ts` — tested on iOS 15+ |

**Key insight:** headlessui Dialog was purpose-built for Tailwind CSS projects and handles every accessibility and mobile concern that would require 100+ lines of custom code.

## Common Pitfalls

### Pitfall 1: `data-[closed]` vs `data-closed` syntax

**What goes wrong:** Using `data-closed:...` without brackets works in Tailwind v4 but is technically the shorthand. The official headlessui docs show `data-[closed]:` (with brackets) which is also v4-compatible. Both work.

**Why it happens:** Tailwind v4 changed the data attribute variant syntax from v3's `data-[closed]:` (with brackets required in v3 for arbitrary values) to also accepting shorthand. The CONTEXT.md (D-07) specifies `data-[closed]` with brackets — use that form for consistency.

**How to avoid:** Use `data-[closed]:-translate-x-full` (with brackets) as specified in D-07. Do not mix styles.

### Pitfall 2: Drawer renders behind page content without `z-50`

**What goes wrong:** The drawer panel appears behind page elements despite opening.

**Why it happens:** Without an explicit z-index, the portal-rendered Dialog stacks at the default level. Page elements with `z-10` or `z-20` overlay it.

**How to avoid:** Set `className="relative z-50"` on the `Dialog` root element (not just `DialogPanel`).

### Pitfall 3: Top bar not centered on wide viewports

**What goes wrong:** The hamburger button floats at the actual screen edge rather than staying within the `max-w-xl` content column.

**Why it happens:** `fixed` positioning breaks out of the normal document flow. Without `max-w-xl mx-auto` inside the fixed container, it spans the full viewport.

**How to avoid:** Structure the top bar as: `<header class="fixed top-0 left-0 right-0 z-40">` with an inner `<div class="max-w-xl mx-auto ...">` — same pattern as the existing bottom nav (App.tsx line 85-86).

### Pitfall 4: Drawer does not auto-close on back/forward navigation

**What goes wrong:** User opens drawer, presses browser back, drawer stays open.

**Why it happens:** The `onClick` on `NavLink` fires on tap but not on browser history navigation. The `useEffect` on `location.pathname` fires in both cases.

**How to avoid:** Use the `useEffect` pattern (Pattern 2) rather than relying solely on `onClick` in NavLink. Both can coexist — `onClick` for immediate feedback, `useEffect` as the safety net.

### Pitfall 5: iOS scroll position jumps on dialog close

**What goes wrong:** After closing the drawer on iOS Safari, the page scrolls to a different position.

**Why it happens:** A known edge case in headlessui v2.1.8 where navigation links inside a Dialog trigger a `window.scrollTo` call during close. Filed as issue #3484.

**How to avoid:** For this phase, the drawer contains `NavLink` elements that navigate on tap and immediately close the drawer. The `useEffect` pattern closes the drawer synchronously — test on a real iOS device. If the jump occurs, the workaround is to temporarily disable `window.scrollTo` during the close transition (community workaround from #3484 thread).

**Warning signs:** Page content appears to jump or snap after drawer close on iOS.

### Pitfall 6: `pb-24` removal leaves wrong spacing on some pages

**What goes wrong:** After removing `pb-24`, content is clipped or sits flush against the bottom viewport edge.

**Why it happens:** `pb-24` was compensation for the fixed bottom nav. Three pages have it hardcoded: FoodManager.tsx (line 143 and line 598), SupplementSchedule.tsx (line 393), SupplementManager.tsx (line 665). Note FoodManager has it in TWO places.

**How to avoid:** Grep for `pb-24` in all pages before marking this pitfall resolved. Replace with `pb-4` or `pb-6` as appropriate for breathing room.

## Code Examples

Verified patterns from official sources:

### Complete SidebarDrawer skeleton
```tsx
// Source: https://headlessui.com/react/dialog (verified 2026-04-06)
// Source: pattern from existing App.tsx NavLink (line 88-100)
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { path: "/plan",        icon: "🎲", label: "今日方案" },
  { path: "/foods",       icon: "🍽️", label: "我的食材" },
  { path: "/menu",        icon: "📋", label: "我的菜單" },
  { path: "/supplements", icon: "💊", label: "營養補充" },
];

interface SidebarDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SidebarDrawer({ open, onClose }: SidebarDrawerProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 transition duration-200 data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex">
        <DialogPanel
          transition
          className="flex flex-col w-72 max-w-[80vw] h-full bg-slate-900 border-r border-slate-800 transition duration-300 ease-in-out data-[closed]:-translate-x-full"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-10 border-b border-slate-800">
            <span className="text-sm font-medium text-slate-200">選單</span>
            <button onClick={onClose} aria-label="關閉選單" className="text-slate-400 hover:text-slate-200">✕</button>
          </div>

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto py-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors text-sm ${
                    isActive
                      ? "bg-blue-500/20 text-blue-400"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-slate-800 p-3 flex items-center justify-between">
            <NavLink to="/profile" onClick={onClose} className="flex items-center gap-2 text-slate-400 hover:text-slate-200">
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs">👤</div>
              <span className="text-sm">使用者</span>
            </NavLink>
            <NavLink to="/settings" onClick={onClose} aria-label="設定" className="text-slate-400 hover:text-slate-200 p-1">
              ⚙️
            </NavLink>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
```

### App.tsx drawer wiring
```tsx
// Source: pattern derived from existing App.tsx structure
const [drawerOpen, setDrawerOpen] = useState(false);

// Auto-close on navigation (NAV-04)
useEffect(() => {
  setDrawerOpen(false);
}, [location.pathname]);

return (
  <div className="min-h-screen bg-slate-950 text-slate-100 max-w-xl mx-auto">
    <SidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

    {/* Fixed top bar */}
    <header className="fixed top-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
      <div className="max-w-xl mx-auto flex items-center px-3 h-10">
        <button onClick={() => setDrawerOpen(true)} aria-label="開啟選單" className="text-slate-400 hover:text-slate-200 p-1">
          ☰
        </button>
      </div>
    </header>

    {/* Content offset for top bar */}
    <div className="pt-10">
      {gasBroken && (/* banner */)}
      <Routes>
        {/* existing routes */}
        <Route path="/menu" element={<MenuPlaceholder />} />
        <Route path="/profile" element={<ProfilePlaceholder />} />
        {/* catch-all */}
      </Routes>
    </div>
    {/* bottom nav REMOVED */}
  </div>
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Headless UI v1 `Transition` wrapping `Dialog` | headlessui v2: `transition` prop on `Dialog`/`DialogPanel` directly + `data-[closed]` attributes | v2.0 (2024) | Simpler JSX — no separate `Transition` wrapper needed |
| Tailwind v3 arbitrary data attr `data-[closed]:` | Tailwind v4 supports same `data-[closed]:` syntax | v4.0 (2025) | No change required — syntax identical |
| Bottom tab navigation (7 items) | Sidebar drawer with 4 primary items + footer | This phase | Drawer pattern standard for content-heavy mobile apps |

**Deprecated/outdated:**
- `<Transition show={open}><TransitionChild>` wrapper pattern (headlessui v1): Replaced in v2 by `transition` prop directly on `Dialog`/`DialogPanel`. Do not use the v1 pattern — the docs URL `headlessui.com/v1/react/dialog` is the old version.

## Open Questions

1. **iOS Safari scroll position jump on drawer close (issue #3484)**
   - What we know: headlessui v2.1.8 has a reported edge case where navigation link clicks inside a Dialog can cause scroll position to jump on iOS when the dialog closes
   - What's unclear: Whether this manifests in our specific pattern (tap NavLink → onClose called immediately via onClick → drawer closes)
   - Recommendation: Implement as planned; test on real iOS 15+ device. If jump occurs, apply the `window.scrollTo` suppression workaround during the close animation window.

2. **Top bar height and `pt-` offset**
   - What we know: CONTEXT.md specifies `~40px` top bar height with `pt-10` content offset. Tailwind `h-10` = 40px and `pt-10` = 40px.
   - What's unclear: Whether any page's own internal `pt-5` creates too much top whitespace when combined.
   - Recommendation: Use `pt-10` on the outer container. Individual pages' `pt-5` is relative to the container, not the viewport — this is additive but intentional breathing room.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm install | ✓ | 22.21.0 | — |
| npm | Package install | ✓ | 11.6.0 | — |
| @headlessui/react | Dialog/Drawer (D-06) | ✗ (not installed) | — | None — must install |

**Missing dependencies with no fallback:**
- `@headlessui/react@^2.2.9` — not in `node_modules/`. Must be installed with `npm install @headlessui/react@^2.2.9` before implementation begins. The package exists on the registry at version 2.2.9 (verified via `npm view`).

## Project Constraints (from CLAUDE.md)

| Directive | Implication for This Phase |
|-----------|---------------------------|
| Static SPA only (React + Vite + GitHub Pages) | No SSR; all drawer state in client `useState` — already planned |
| All user-facing text in Traditional Chinese | Drawer labels: 今日方案, 我的食材, 我的菜單, 營養補充; buttons: 關閉選單, 開啟選單 |
| Tailwind CSS v4 with existing dark theme tokens | Use `bg-slate-900`, `border-slate-800`, `--color-surface` tokens; no `tailwind.config.js` needed |
| Functional components only, no class components | SidebarDrawer is a function component with destructured props |
| `noUnusedLocals: true` enforced | Do not import `NavLink` if it's unused; remove old `tabs` array from App.tsx once bottom nav is deleted |
| Named exports for utility/component modules; default exports for pages | `SidebarDrawer`: named export (`export function SidebarDrawer`). Placeholder pages: default exports. |
| No global state library | Drawer state stays in `useState` in App.tsx — no Context or Zustand |
| `@/*` alias configured but not used in practice | Use relative imports: `import { SidebarDrawer } from "./components/SidebarDrawer"` |
| `src/components/` does not exist yet | This phase creates it — no prior components directory to be aware of |
| GSD workflow enforcement | All edits go through `/gsd:execute-phase` — no direct file edits outside GSD |

## Sources

### Primary (HIGH confidence)
- https://headlessui.com/react/dialog — Dialog, DialogPanel, DialogBackdrop API; `transition` prop; `data-[closed]` attribute; `onClose` callback; focus trap behavior
- https://headlessui.com/react/transition — TransitionChild for staggered animations; `data-[closed]`, `data-[enter]`, `data-[leave]` attributes
- https://github.com/tailwindlabs/headlessui (source code review) — `handle-ios-locking.ts` confirms touchmove + overscroll-behavior technique; `useScrollLock` hook confirmed present in Dialog
- `npm view @headlessui/react version` — confirmed 2.2.9 is latest as of 2026-04-06

### Secondary (MEDIUM confidence)
- https://github.com/tailwindlabs/headlessui/issues/3484 — iOS scroll position jump bug in v2.1.8 with navigation links inside Dialog; community workaround documented
- https://pqina.nl/blog/how-to-prevent-scrolling-the-page-on-ios-safari/ — position:fixed scroll-lock technique with scrollY preservation (fallback if headlessui built-in insufficient)

### Tertiary (LOW confidence)
- None — all findings have primary or secondary verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry confirmed v2.2.9; headlessui docs verified 2026-04-06
- Architecture: HIGH — patterns derived from existing App.tsx code + headlessui official docs
- Pitfalls: HIGH (pitfalls 1-4), MEDIUM (pitfall 5 iOS scroll jump — reproduced in GitHub issues but version-specific)

**Research date:** 2026-04-06
**Valid until:** 2026-07-06 (headlessui is stable; Tailwind v4 syntax stable)
