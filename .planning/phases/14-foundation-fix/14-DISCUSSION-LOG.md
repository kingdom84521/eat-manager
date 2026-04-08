# Phase 14: Foundation Fix - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 14-foundation-fix
**Areas discussed:** Resolver merge strategy, Merge timing
**Mode:** Auto (--auto flag, all decisions auto-selected)

---

## Sidebar Rename

No gray area — requirement NAV-05 specifies exact change: "我的食材" → "我的食物" in SidebarDrawer.tsx.

---

## Resolver Merge Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Fallback read from ItemService | resolveItem() reads user-created foods from ItemService on FOOD_MAP miss | ✓ |
| Mutate FOOD_MAP at startup | Preload user foods into FOOD_MAP on app init | |
| Parallel Map | Maintain a separate userFoodMap alongside FOOD_MAP | |

**User's choice:** [auto] Fallback read from ItemService (recommended default)
**Notes:** Simplest approach, no global mutation, always reflects latest user data. Avoids needing an app-level init step or cache invalidation.

---

## Merge Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Lazy on miss | Only read ItemService when FOOD_MAP has no match | ✓ |
| Eager at startup | Preload all user foods into memory at app init | |
| On every call | Always check both sources | |

**User's choice:** [auto] Lazy on miss (recommended default)
**Notes:** Keeps hot path (static catalog hits) fast. User-created foods are only loaded when needed — which is exactly when loading menu presets with user-created food IDs.

---

## Claude's Discretion

- Import strategy for ItemService in resolver (direct import vs helper)
- Lookup order for user-created foods (after both static maps miss)

## Deferred Ideas

None
