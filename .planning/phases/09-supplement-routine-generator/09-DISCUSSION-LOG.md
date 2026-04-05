# Phase 9: Supplement Routine Generator - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 09-supplement-routine-generator
**Areas discussed:** Routine presentation, Conflict resolution, Taken/skipped UX, Date navigation
**Mode:** Auto (all areas auto-selected, recommended defaults chosen)

---

## Routine Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped cards by timing slot | 5 sections (空腹→睡前), each with supplement cards | ✓ |
| Timeline view | Vertical timeline with time markers | |
| Flat checklist | Single list sorted by timing, no visual grouping | |

**User's choice:** [auto] Grouped cards by timing slot (recommended default)
**Notes:** Matches existing 5 SupplementTiming values and card-based UI patterns throughout the app.

---

## Conflict Resolution

| Option | Description | Selected |
|--------|-------------|----------|
| Move to next slot with warning | Conflicting supplement moved to adjacent slot, shows ⚠ badge | ✓ |
| Show warning but keep in same slot | User decides whether to separate | |
| Hide conflicting supplement | Silently drop from routine | |

**User's choice:** [auto] Move to next slot with warning badge (recommended default)
**Notes:** Satisfies RTN-06 — unscheduled items are never silently dropped. Deterministic sort-by-ID ensures consistency.

---

## Taken/Skipped UX

| Option | Description | Selected |
|--------|-------------|----------|
| Tap-to-toggle checklist | Tap = taken, long-press = skipped, cycle through states | ✓ |
| Swipe gestures | Swipe right = taken, swipe left = skipped | |
| Explicit buttons | Two buttons per row: "已服用" / "跳過" | |

**User's choice:** [auto] Tap-to-toggle checklist (recommended default)
**Notes:** Minimal interaction, mobile-friendly. Three states: untouched → taken → skipped → untouched.

---

## Date Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Today only | Shows today's date, no navigation | ✓ |
| Swipeable dates | Swipe left/right to see past/future | |
| Date picker | Calendar selector at top | |

**User's choice:** [auto] Today only (recommended default)
**Notes:** Keeps scope minimal. Past data viewable through future features or direct Sheets access.

---

## Claude's Discretion

- Internal component decomposition
- Tailwind styling for taken/skipped states
- Long-press detection implementation
- "All done" celebration state
- ConsumptionEvent sheet naming

## Deferred Ideas

- Historical routine views (past days)
- Notification/reminder system (requires PWA)
- Supplement effectiveness tracking (v3.0)
