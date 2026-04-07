# Phase 13: My Menu - Context

**Gathered:** 2026-04-07 (auto mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

Named meal preset CRUD. Users can save the current food plan as a named menu preset, browse saved presets on the `/menu` page, load a preset to replace today's food plan, and edit or delete existing presets. This is food-only — supplement routines are deterministic and not part of menu presets. Presets are localStorage-only (no Sheets sync per MENU-04 deferral).

</domain>

<decisions>
## Implementation Decisions

### MenuService & Data Model
- **D-01:** Create a `MenuService` singleton following the existing `ItemService`/`DataService` pattern. Uses `crypto.randomUUID()` for IDs (per ROADMAP v3.0 decision). localStorage-only — no Sheets sync.
- **D-02:** Menu preset interface: `{ id: string, name: string, createdAt: string, foodItemIds: string[][] }` — where `foodItemIds` is a 2D array matching the slot structure (array of slot arrays, each containing the resolved food item IDs for that slot). This preserves which items belong to which time slot.
- **D-03:** Presets store exact resolved food item IDs, not pool references. The user saves a specific combination they liked — loading replays those exact items.

### Save Trigger & Naming
- **D-04:** A "儲存為菜單" button appears on the UnifiedPlan page, near the regenerate button in the header/action area. Only enabled when a food plan exists (not on empty state).
- **D-05:** Tapping the save button opens a headlessui Dialog (reusing the existing `@headlessui/react` dependency from Phase 10) with a text input for the menu name and Save/Cancel buttons.
- **D-06:** If the user doesn't enter a name, auto-generate one from the date (e.g., "4月7日 菜單").

### Menu List Page (`/menu`)
- **D-07:** Replace `MenuPlaceholder.tsx` with a full `MyMenu.tsx` page. The page shows a simple list of saved menu presets — each row displays the menu name, item count summary, and creation date.
- **D-08:** Empty state shows a message prompting the user to save a menu from today's plan (e.g., "尚無菜單，從今日方案儲存你的第一份菜單").
- **D-09:** Each menu row has edit (rename) and delete actions. Delete shows a confirmation before removing. Edit opens an inline input or small dialog for renaming.
- **D-10:** Tapping a menu row loads it as today's food plan and navigates to `/plan`.

### Load Behavior
- **D-11:** Loading a menu preset replaces today's food slots entirely. Checked state is cleared (all items unchecked). Supplement routine is unaffected (it's independently computed).
- **D-12:** If today's plan has checked items (locked state), show a confirmation dialog before replacing: "目前已有已勾選項目，載入菜單將清除紀錄。確定要載入嗎？"
- **D-13:** After loading, the `TodayPlanRecord` is updated with the new food slots, empty checkedIds, and today's date — then persisted via `saveTodayPlan()`.

### Claude's Discretion
- Visual styling of menu list items (card vs flat row — should match existing app patterns)
- Whether to show a food item preview/summary in each menu row or just the count
- Animation/transition when saving or loading
- Whether the save dialog pre-fills with a suggested name or starts empty
- Sort order of menu list (newest first vs alphabetical)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Menu Management — MENU-01 through MENU-03 acceptance criteria
- `.planning/ROADMAP.md` §Phase 13 — Success criteria and phase goal

### Current implementation (to be extended)
- `src/pages/UnifiedPlan.tsx` — The plan page where "save as menu" button will be added
- `src/pages/MenuPlaceholder.tsx` — Current placeholder to be replaced by MyMenu.tsx
- `src/App.tsx` — Route `/menu` currently renders MenuPlaceholder (line 91)
- `src/components/SidebarDrawer.tsx` — "我的菜單" nav item already points to `/menu` (line 10)

### Patterns to follow
- `src/lib/item-service.ts` — Singleton service pattern with localStorage cache helpers (cacheGet/cacheSet)
- `src/lib/data-service.ts` — TodayPlanRecord, GeneratedSlot, saveTodayPlan/loadTodayPlan for plan persistence
- `src/data/resolver.ts` — resolveItem() for reconstructing ResolvedItem from stored IDs
- `src/components/SidebarDrawer.tsx` — headlessui Dialog usage pattern (already installed)

### Architecture decisions
- `.planning/STATE.md` §Decisions — MenuService singleton pattern, crypto.randomUUID(), localStorage-only, debounce pattern
- `.planning/ROADMAP.md` §v3.0 decisions — My Menu localStorage-only, MENU-04 Sheets sync deferred

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@headlessui/react` Dialog: Already installed and used in SidebarDrawer — reuse for save/confirm dialogs
- `cacheGet`/`cacheSet` in item-service.ts: localStorage abstraction — MenuService can use same pattern
- `crypto.randomUUID()`: Already decided as ID generator (no uuid package)
- `todayStr()` in data-service.ts: Date formatting helper
- `resolveItem()` in resolver.ts: Reconstruct ResolvedItem from stored food IDs when loading a preset
- `saveTodayPlan()`/`loadTodayPlan()` in data-service.ts: Plan persistence — loading a menu writes through these

### Established Patterns
- Singleton service objects (plain objects, not classes): `ItemService`, `DataService`, `SettingsService`
- localStorage as primary store with `wellness_` prefix
- No global state — each page reads services on mount/render
- Dark theme: `bg-slate-800/50` cards, `border-slate-700` borders, `text-slate-400` secondary text

### Integration Points
- `src/pages/UnifiedPlan.tsx`: Add "儲存為菜單" button + save dialog
- `src/App.tsx`: Replace MenuPlaceholder import with MyMenu
- `src/lib/data-service.ts`: saveTodayPlan() called when loading a menu preset
- Route `/menu` already wired in App.tsx and SidebarDrawer

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The menu system should be lightweight: save what you like, load it when you want to repeat it. Think of it as bookmarking a meal combination.

</specifics>

<deferred>
## Deferred Ideas

- **MENU-04:** Menu presets sync to Google Sheets — deferred to future milestone (explicit in REQUIREMENTS.md)
- Menu sharing/export — not in scope
- Menu scheduling (auto-load on specific days) — not in scope
- Menu templates with partial randomization — not in scope; presets store exact items

</deferred>

---

*Phase: 13-my-menu*
*Context gathered: 2026-04-07*
