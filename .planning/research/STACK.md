# Stack Research

**Domain:** React SPA — Sidebar Drawer Navigation, Checkbox Plan UI, Menu Management
**Researched:** 2026-04-06
**Confidence:** HIGH (versions verified via npm registry, peer deps confirmed live)

---

## Scope

This research covers ONLY what is new for milestone v3.0. The existing fixed stack
(React 19.1, TypeScript ~5.8, Vite 6, Tailwind v4, React Router v7, HashRouter,
localStorage + Google Sheets sync, SettingsService, react-hook-form, zod) is validated
and NOT re-evaluated here.

---

## Core Decision: Drawer Component Strategy

**Recommendation: `@headlessui/react` Dialog used as a left sidebar, styled with Tailwind v4 CSS transitions. No JS animation runtime.**

### Options Evaluated

| Option | Version | React 19 | Bundle Impact | Verdict |
|--------|---------|----------|---------------|---------|
| `@headlessui/react` Dialog as drawer | 2.2.9 | Yes — `^18 \|\| ^19` | ~10 kb gzip | **USE** |
| Pure Tailwind CSS only (no headlessui) | — | — | 0 kb | Skip — no focus trap, no keyboard close |
| `vaul` | 1.1.2 | Yes — `^19.0.0` | ~5 kb | Skip — wrong UX model (bottom-sheet, not sidebar) |
| `motion/react` (animation) | 12.38.0 | Yes — `^18 \|\| ^19` | 34 kb min | Skip — overkill for a single-axis slide |

Versions confirmed via `npm info` against live npm registry (2026-04-06).

### Why @headlessui/react

- Maintained by Tailwind Labs — first-class Tailwind v4 integration
- `DialogPanel` with the `transition` prop emits `data-closed` / `data-enter` / `data-leave`
  attributes, which Tailwind v4 can target with `data-[closed]:-translate-x-full`
- Built-in focus trapping, `Escape` to close, `role="dialog"` ARIA — accessibility correct
  with no extra work
- `DialogBackdrop` provides the overlay/scrim with its own independent transition
- `TransitionChild` allows panel and backdrop to animate independently (backdrop fades,
  panel slides) within the same open/close lifecycle
- No JS animation runtime — transitions are pure CSS driven by `data-*` attributes
- Already React 19 compatible: peer dep `"react": "^18 || ^19 || ^19.0.0-rc"` confirmed

### Why vaul is skipped

vaul's UX contract is a drag-responsive bottom-sheet with snap points. This project needs
a fixed left sidebar opened by a hamburger button — a fundamentally different interaction
model. vaul's defaults (drag-to-dismiss, snap positions, scaling) would work against the
sidebar nav pattern and require significant override fighting.

### Why motion/react is skipped

34 kb gzip for a single `translate-x` slide animation is unjustifiable. Tailwind's CSS
`transition-transform duration-300 ease-in-out` combined with `data-[closed]:-translate-x-full`
produces identical visual output at zero bundle cost. motion/react adds value for staggered
lists, spring physics, or gesture-driven interactions — none of which appear in this milestone.

---

## Recommended Stack Additions

### New Runtime Dependencies

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@headlessui/react` | ^2.2.9 | Sidebar drawer (Dialog), accessible overlay | Only library providing focus trap + keyboard close + Tailwind `data-*` transition hooks without a JS animation runtime |

### No Other New Dependencies Needed

| Feature | Approach | Rationale |
|---------|----------|-----------|
| Sidebar slide animation | Tailwind `translate-x-full` + `data-[closed]:-translate-x-full transition duration-300 ease-in-out` | Pure CSS, zero bundle cost, sufficient for a single-axis translate |
| Backdrop fade | `DialogBackdrop transition` + `data-[closed]:opacity-0 transition duration-200` | Built into headlessui |
| Checkbox-based daily plan | Native `<input type="checkbox">` + Tailwind | Checked state = `Set<string>` in `useState`; no library needed |
| Lock full re-random | Derived boolean: `checkedIds.size > 0` | Pure React state, no library |
| Menu save/load (我的菜單) | `localStorage` via existing `DataService` pattern | New key `"my_menus"`, `SavedMenu[]` shape — follows codebase conventions exactly |
| Profile page (avatar + name) | `SettingsService` extension | Consistent read-on-render pattern; no new state management |

---

## Supporting Libraries (no change from v2.0)

The `react-hook-form` + `zod` + `@hookform/resolvers` stack added in v2.0 remains appropriate
for any new forms (Profile, Menu creation). No version changes needed.

---

## Installation

```bash
# Single new runtime dependency
npm install @headlessui/react
```

No dev dependency changes.

---

## Integration Points

### Sidebar Drawer Pattern

```tsx
// src/components/Sidebar.tsx
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 data-[closed]:opacity-0 transition duration-200 ease-in-out"
      />
      <DialogPanel
        transition
        className="fixed inset-y-0 left-0 w-72 bg-slate-900 flex flex-col
                   data-[closed]:-translate-x-full transition duration-300 ease-in-out"
      >
        {/* nav items */}
      </DialogPanel>
    </Dialog>
  );
}
```

The `transition` prop on `DialogPanel` makes headlessui emit `data-closed` when closing,
which drives the Tailwind `data-[closed]:-translate-x-full` class. No framer-motion needed.

### Checkbox Daily Plan State

```tsx
// Checked IDs as a Set — O(1) lookup, serializable to JSON array for localStorage
const [checkedIds, setCheckedIds] = useState<Set<string>>(() => {
  const saved = localStorage.getItem("today_checked");
  return new Set<string>(saved ? (JSON.parse(saved) as string[]) : []);
});

// Persist on change
useEffect(() => {
  localStorage.setItem("today_checked", JSON.stringify([...checkedIds]));
}, [checkedIds]);

// Lock re-random when any item is checked
const isLocked = checkedIds.size > 0;

function toggle(id: string) {
  setCheckedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
}
```

All existing-stack capability — no new library.

### Menu Management Data Shape

```typescript
// Extends existing DataService with new localStorage key: "my_menus"
interface SavedMenu {
  id: string;        // crypto.randomUUID() — available natively, no uuid package
  name: string;      // user-provided name (Traditional Chinese)
  itemIds: string[]; // existing item IDs from FOOD_MAP / REMEDY_MAP
  createdAt: string; // ISO date string
}
```

Persists as `SavedMenu[]` under `"my_menus"` in localStorage, synced to a `menus` Sheets
tab via the existing `SheetsAPI.upsert` pattern.

---

## Alternatives Considered

| Recommended | Alternative | When Alternative Is Better |
|-------------|-------------|---------------------------|
| `@headlessui/react` Dialog as sidebar | Pure Tailwind `translate-x` (no headlessui) | Prototypes, or if accessibility/focus management is not a concern |
| `@headlessui/react` Dialog as sidebar | `vaul` | If the UI is a mobile bottom-sheet drawer, not a sidebar (e.g., item detail sheet) |
| CSS `transition` via Tailwind v4 | `motion/react` | If multiple orchestrated animations needed — stagger, spring physics, gesture drag |
| `localStorage` + `DataService` extension | Zustand / Jotai | Only if cross-component state becomes unmanageable — not the case at current 3K LOC scale |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `motion/react` (framer-motion) | 34 kb gzip for a single translate animation | Tailwind `translate-x` + `data-[closed]` CSS transitions |
| `vaul` | Bottom-sheet drag UX conflicts with fixed sidebar nav interaction model | `@headlessui/react` Dialog |
| `@radix-ui/react-dialog` | Direct Radix UI primitive — headlessui wraps the same accessibility patterns with better Tailwind integration | `@headlessui/react` |
| `zustand` / `jotai` | No cross-component state sharing problem at this scale | `useState` per page + `SettingsService` read-on-render |
| `react-spring` | Same overkill as motion; adds CSS-in-JS patterns inconsistent with Tailwind-only codebase | Tailwind CSS transitions |
| shadcn/ui component collection | Adds opinionated component boilerplate on top of a codebase with its own established conventions | Direct `@headlessui/react` primitives |
| `uuid` npm package | Native `crypto.randomUUID()` available in all modern browsers | `crypto.randomUUID()` built-in |

---

## Version Compatibility

| Package | Compatible With | Verified |
|---------|-----------------|---------|
| `@headlessui/react@2.2.9` | `react@^19.1.0` | Yes — peer dep `^18 \|\| ^19 \|\| ^19.0.0-rc` |
| `@headlessui/react@2.2.9` | `tailwindcss@^4.1.7` | Yes — `data-[closed]:` variant syntax is Tailwind v4 standard |
| `@headlessui/react@2.2.9` | `react-router-dom@^7.6.0` | Yes — no routing dependencies in headlessui |

---

## Sources

- npm registry live query: `npm info @headlessui/react version peerDependencies` — 2.2.9, `"react": "^18 || ^19 || ^19.0.0-rc"` confirmed
- npm registry live query: `npm info vaul version peerDependencies` — 1.1.2, `"react": "^16.8 || ^17.0 || ^18.0 || ^19.0.0 || ^19.0.0-rc"` confirmed
- npm registry live query: `npm info motion version peerDependencies` — 12.38.0, `"react": "^18.0.0 || ^19.0.0"` confirmed
- [Headless UI Dialog docs](https://headlessui.com/react/dialog) — `data-closed` transition API and sidebar panel pattern
- [Headless UI v2.1 release notes](https://tailwindcss.com/blog/2024-06-21-headless-ui-v2-1) — simplified transition API with `data-*` attributes
- [motion.dev bundle reduction guide](https://motion.dev/docs/react-reduce-bundle-size) — 34 kb full, 4.6 kb LazyMotion minimum confirmed
- [vaul GitHub](https://github.com/emilkowalski/vaul) — drawer-sheet UX model confirmed (not sidebar nav)

---
*Stack research for: Eat Manager v3.0 — Sidebar Drawer, Checkbox Plan, Menu Management*
*Researched: 2026-04-06*
