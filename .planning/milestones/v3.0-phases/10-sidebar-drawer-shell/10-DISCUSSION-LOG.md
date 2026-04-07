# Phase 10: Sidebar Drawer Shell - Discussion Log (Assumptions Mode)

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the analysis.

**Date:** 2026-04-06
**Phase:** 10-sidebar-drawer-shell
**Mode:** assumptions (--auto)
**Areas analyzed:** Component Placement, Route Preservation, Headless UI Dialog, Top Bar and Layout

## Assumptions Presented

### Component Placement and File Structure
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| SidebarDrawer as first file in new `src/components/` | Confident | No components/ dir exists; STATE.md locks drawer state in App.tsx |

### Route Preservation During Transition
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| All 7 existing routes remain functional; drawer shows 4 main items per NAV-02 | Likely | Phase 12/11 handle page merges; NAV-02 specifies exactly 4 items |

### Headless UI Dialog as Drawer Implementation
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| @headlessui/react Dialog/DialogPanel with data-[closed] transitions | Confident | STATE.md locked decision; provides focus trap, Escape, ARIA |

### Bottom Padding and Top Bar Layout Swap
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Remove bottom nav + pb-20; add fixed top bar; audit pb-24 in 3 pages | Likely | App.tsx pb-20, FoodManager/SupplementSchedule/SupplementManager pb-24 |

## Corrections Made

No corrections — all assumptions auto-confirmed.

## Auto-Resolved

- Hamburger placement: auto-selected "top-left fixed bar" (recommended default over bottom FAB)
- iOS scroll lock: auto-selected "headlessui built-in + position:fixed fallback" (recommended default)
- Route preservation: auto-selected "keep all 7 routes" (recommended — prevents breaking changes)

## External Research

- @headlessui/react v2.2.x Dialog API with Tailwind v4 `data-[closed]` syntax — flagged for phase researcher
- iOS Safari body scroll lock: headlessui built-in vs manual position:fixed — flagged for phase researcher
