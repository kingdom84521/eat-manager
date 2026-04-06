# Phase 11: Profile Page - Context

**Gathered:** 2026-04-06 (auto mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a Profile page where users can view and edit their display name and avatar initials, and access their weight log. The `/weight` standalone route is retired — weight logging moves into the Profile page. The drawer footer updates to show real initials and display name instead of the 👤 stub. No new data sync, no BMR display, no avatar upload — those are deferred.

</domain>

<decisions>
## Implementation Decisions

### Display Name & Initials Storage
- **D-01:** Extend `UserProfile` interface in `src/data/types.ts` with optional `displayName: string` and `initials: string` fields
- **D-02:** Bump `settings_version` to 3 in `SettingsService`; migration v2→v3 sets `displayName` and `initials` to empty string (not null) for existing profiles
- **D-03:** SettingsService gets `getDisplayProfile()` convenience method returning `{ displayName, initials }` for drawer footer consumption

### WeightLog Absorption
- **D-04:** Extract WeightLog page body into a reusable section component (e.g., `WeightSection`) that the Profile page imports — keeps code DRY
- **D-05:** The `/weight` route is removed from App.tsx routes and SidebarDrawer; direct URL `/weight` should redirect to `/profile`
- **D-06:** WeightSection receives no extra props beyond what it fetches internally (same self-contained pattern as current WeightLog)

### Avatar Display
- **D-07:** Avatar is a circle with user's initials text (1-2 characters), `bg-slate-700` background — consistent with existing drawer stub styling
- **D-08:** When no initials are set, show 👤 fallback (matching current drawer behavior)
- **D-09:** Drawer footer replaces hardcoded 👤 and "使用者" with real initials circle and displayName from SettingsService

### Profile Page Layout
- **D-10:** Top section: avatar circle (large, centered) + display name + initials edit form
- **D-11:** Below: weight log section (absorbed WeightSection component)
- **D-12:** Page uses same `px-4 pt-5` pattern as other pages; dark theme tokens consistent with existing UI

### Claude's Discretion
- Avatar circle size on Profile page (likely 64-80px for the hero display vs 28px in drawer)
- Form layout for display name and initials editing (inline edit vs separate form fields)
- Whether to show a "save" button or auto-save on blur for name/initials fields
- Transition/animation when drawer footer updates with new name

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Profile requirements
- `.planning/REQUIREMENTS.md` §Profile — PROF-01, PROF-02, PROF-03 acceptance criteria
- `.planning/ROADMAP.md` §Phase 11 — Success criteria and phase goal

### Current implementation
- `src/pages/ProfilePlaceholder.tsx` — Current placeholder to be replaced
- `src/pages/WeightLog.tsx` — Weight log page to be absorbed into Profile
- `src/components/SidebarDrawer.tsx` — Drawer footer with avatar+name stub (lines 70-89)
- `src/lib/settings-service.ts` — SettingsService with UserProfile storage, migration pattern
- `src/data/types.ts` — UserProfile interface (line 329)

### Architecture decisions
- `.planning/STATE.md` §Decisions — Locked decisions on drawer state, iOS scroll lock
- `.planning/phases/10-sidebar-drawer-shell/10-CONTEXT.md` — Phase 10 decisions (D-05: /profile route exists)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `WeightLog.tsx`: Self-contained weight logging UI (~108 lines) with input, history list, progress display — can be extracted as a section component with minimal changes
- `SettingsService`: Established migration pattern (v1→v2 exists) — extending to v2→v3 follows the same pattern
- `SidebarDrawer.tsx`: Footer already has NavLink to `/profile` with avatar stub — update to read from SettingsService
- `DataService.getWeightLog()` / `DataService.logWeight()`: Weight data access already abstracted

### Established Patterns
- Page components: functional, default export, `px-4 pt-5` padding, `useState`/`useEffect` hooks
- Settings storage: `SettingsService` singleton with `loadSettings()` / `writeRaw()` pattern
- Dark theme: `bg-slate-800/50` cards, `text-slate-200` primary text, `text-slate-400` secondary
- Form inputs: `bg-slate-800 rounded-lg px-4 py-3 text-sm text-white` (see WeightLog input)

### Integration Points
- `src/App.tsx`: Route definitions — replace `/weight` with redirect, replace ProfilePlaceholder with Profile
- `src/components/SidebarDrawer.tsx`: Footer avatar/name area (lines 70-89)
- `src/data/types.ts`: UserProfile interface extension
- `src/lib/settings-service.ts`: Migration and new accessor methods

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The profile page should feel like a natural home for personal info and weight tracking, consistent with the existing dark mobile-first UI.

</specifics>

<deferred>
## Deferred Ideas

- **PROF-04**: Custom avatar image upload — deferred to future milestone per REQUIREMENTS.md
- **PROF-05**: BMR summary and macro targets display on profile — deferred to future milestone
- NutritionTracker `/track` redirect timing — to be resolved in Phase 12 planning

</deferred>

---

*Phase: 11-profile-page*
*Context gathered: 2026-04-06*
