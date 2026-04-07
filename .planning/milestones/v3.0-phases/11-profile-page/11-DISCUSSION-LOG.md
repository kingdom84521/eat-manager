# Phase 11: Profile Page - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 11-profile-page
**Areas discussed:** Display name & initials storage, WeightLog absorption, Avatar display, Profile layout
**Mode:** Auto (all areas auto-selected, recommended defaults chosen)

---

## Display Name & Initials Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Extend UserProfile + bump version | Add displayName/initials to existing UserProfile, migrate v2→v3 | ✓ |
| Separate localStorage key | New key like `profile_display` independent of settings | |
| New ProfileService singleton | Dedicated service for profile-only data | |

**User's choice:** [auto] Extend UserProfile + bump version (recommended default)
**Notes:** Follows established SettingsService migration pattern (v1→v2 already exists). Keeps all user data in one place.

---

## WeightLog Absorption

| Option | Description | Selected |
|--------|-------------|----------|
| Extract as reusable section component | WeightLog body becomes WeightSection, imported by Profile | ✓ |
| Copy-paste into Profile page | Duplicate the code directly into Profile component | |
| Keep WeightLog.tsx, render via portal/slot | Profile page renders WeightLog via composition | |

**User's choice:** [auto] Extract as reusable section component (recommended default)
**Notes:** Avoids duplication, keeps WeightLog logic testable in isolation. `/weight` route removed with redirect to `/profile`.

---

## Avatar Display

| Option | Description | Selected |
|--------|-------------|----------|
| Circle with initials, slate-700 bg | Matches existing drawer stub, consistent dark theme | ✓ |
| Gradient background circle | More visually distinctive but new pattern | |
| Icon-based (no initials) | Simpler but less personal | |

**User's choice:** [auto] Circle with initials, slate-700 bg (recommended default)
**Notes:** Consistent with current 👤 stub in drawer footer. Fallback to 👤 when no initials set.

---

## Profile Page Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Avatar + name top, weight log below | Natural hierarchy, profile info first | ✓ |
| Weight log top, profile info sidebar | Prioritizes frequent-use feature | |
| Tab layout (profile / weight tabs) | Separates concerns but adds complexity | |

**User's choice:** [auto] Avatar + name top, weight log below (recommended default)
**Notes:** Simple vertical layout matching mobile-first design. Consistent with other pages' single-column approach.

---

## Claude's Discretion

- Avatar circle sizing (large hero on profile, small in drawer)
- Form layout for name/initials editing
- Save behavior (auto-save vs explicit button)
- Drawer footer update animation

## Deferred Ideas

- PROF-04: Custom avatar upload (future milestone)
- PROF-05: BMR summary on profile (future milestone)
