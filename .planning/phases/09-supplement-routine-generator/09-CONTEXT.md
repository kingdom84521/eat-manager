# Phase 9: Supplement Routine Generator - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Redesign the SupplementSchedule page (`/schedule`) into a deterministic daily supplement routine. Groups all active, in-stock supplements by timing slot, respects interaction conflicts, lets users mark items as taken or skipped, and deducts from inventory on each taken event. This is the final phase of v2.0.

</domain>

<decisions>
## Implementation Decisions

### Routine Presentation
- **D-01:** Redesign `SupplementSchedule.tsx` — replace the current catalog-browse view with a daily routine checklist grouped by timing slot.
- **D-02:** Five timing slot sections displayed vertically: 空腹 → 餐前 → 餐中 → 餐後 → 睡前 (matching `SupplementTiming` values). Each section is a card with the timing label as header.
- **D-03:** Each supplement within a slot shows: name, dosage (e.g., "2顆 500mg"), health tag badges, and taken/skipped status indicator.
- **D-04:** Deterministic routine — the same date always produces the same routine. No randomness. All active + in-stock supplements appear every day in their assigned timing slot(s).
- **D-05:** Empty timing slots (no supplements assigned to that time) are hidden, not shown as empty cards.

### Conflict Resolution
- **D-06:** When two supplements have a declared interaction (via `interactions[]` field) AND share the same timing slot, one is moved to the next available slot. The moved supplement shows a warning badge: "⚠ 避開 [name]".
- **D-07:** Conflict resolution is deterministic — supplements are sorted by ID, and the second one (alphabetically by ID) is the one that gets moved. This ensures the same routine every day.
- **D-08:** If no alternative slot can accommodate a conflicting supplement (all slots have conflicts), it is listed in a separate "未排入" (Unscheduled) section at the bottom with an explanation of which conflicts prevented scheduling. This satisfies RTN-06.
- **D-09:** Synergies are informational only — synergistic supplements in the same slot show a green "✓ 與 [name] 協同" note but synergies don't affect slot assignment.

### Taken/Skipped UX
- **D-10:** Each supplement row is a tap-to-toggle checklist item. Three states: untouched (default), taken (green check ✓), skipped (gray strikethrough).
- **D-11:** Tap once → taken. Long-press (or second tap on taken) → skipped. Tap on skipped → back to untouched.
- **D-12:** Marking "taken" immediately deducts `unitsPerDose` from inventory via a new `ConsumptionEvent` record. Uses event-sourced pattern: `ItemService.logConsumption({ supplementId, date, units })`.
- **D-13:** Marking "skipped" does NOT deduct from inventory. Skipped items are recorded in the daily log for tracking purposes only.
- **D-14:** Taken/skipped state persists for the current day via `SupplementLogEntry` in localStorage (key: today's date). Refreshing the page restores the state.

### Date & Navigation
- **D-15:** Today's date displayed at top of page. No date navigation — routine always shows today.
- **D-16:** Reuses the existing `/schedule` route and 🗓️ 時程 tab. No new tab added.

### Inventory Integration
- **D-17:** Supplements with zero remaining inventory are excluded from the routine (they appear in the Supplement Manager with red "庫存不足" but not in the daily routine).
- **D-18:** Remaining inventory calculated as: `sum(purchasedUnits) - sum(consumedUnits)` where consumedUnits come from ConsumptionEvent records. This replaces Phase 8's purchase-only calculation.
- **D-19:** A new `ItemService.logConsumption()` method appends a ConsumptionEvent to localStorage and syncs to Sheets (same append-only pattern as `upsertInventory`).
- **D-20:** A new `ItemService.getConsumption(supplementId?)` method reads ConsumptionEvent records from localStorage.

### Progress Summary
- **D-21:** At top of page, show a daily progress summary: "今日進度: X/Y 已服用" with a simple progress indicator (e.g., "5/12").
- **D-22:** Timing slot headers also show per-slot progress: "空腹 (2/3)".

### Claude's Discretion
- Internal component decomposition within SupplementSchedule.tsx
- Exact Tailwind styling for taken/skipped states
- Whether to show a "全部完成" (all done) celebration state
- Exact long-press detection implementation (timeout-based or pointer events)
- Whether to add a ConsumptionEvent sheet name constant or reuse existing patterns

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Types
- `src/data/types.ts` — SupplementItem, SupplementTiming, InventoryEntry, ConsumptionEvent, SupplementLogEntry interfaces
- `src/data/types.ts` lines 98-112 — SupplementTiming type and SUPPLEMENT_TIMING_LABELS map

### Services
- `src/lib/item-service.ts` — ItemService singleton: getSupplements, getInventory, upsertInventory (add logConsumption, getConsumption)
- `src/lib/sheets-api.ts` — SheetsAPI.append for event-sourced records

### Existing Page (to redesign)
- `src/pages/SupplementSchedule.tsx` — Current catalog-browse view, will be completely rewritten

### Related UI Patterns
- `src/pages/SupplementManager.tsx` — Supplement cards, inventory display, interaction/synergy resolution patterns
- `src/pages/DailyPlan.tsx` — Daily plan generation pattern, TagBadge component
- `src/App.tsx` — Route and tab configuration (reuses /schedule)

### Phase 8 Context (upstream decisions)
- `.planning/phases/08-supplement-manager-inventory/08-CONTEXT.md` — D-14 bidirectional interactions, D-19/D-20 consumption deferred to this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SUPPLEMENT_TIMING_LABELS` map for slot header display
- `HEALTH_TAG_LABELS` / `HEALTH_TAG_COLORS` for tag badges
- `TagBadge` pattern from DailyPlan.tsx
- `ItemService.getSupplements()` / `ItemService.getInventory()` for data loading
- `ConsumptionEvent` interface already defined in types.ts — ready to use
- `SupplementLogEntry` interface already defined in types.ts — has takenIds/skippedIds fields

### Established Patterns
- Offline-first: localStorage first, Sheets background sync
- Append-only event sourcing for inventory (same pattern for consumption)
- Card-based UI: `bg-slate-800/50 rounded-lg` with section headers
- Single-page components with useState for view state

### Integration Points
- `SupplementSchedule.tsx` — complete rewrite of existing page (same route `/schedule`)
- `ItemService` — add `logConsumption()` and `getConsumption()` methods
- `SupplementManager.tsx` — inventory remaining calculation now includes consumption deduction
- No changes to `App.tsx` — route and tab already exist

</code_context>

<specifics>
## Specific Ideas

- The routine should feel like a daily checklist — open the app, see what to take now, tap done. Quick and actionable.
- Interaction warnings should be prominent but not blocking — the user may intentionally take conflicting supplements at the same time.
- The page replaces the current catalog browse entirely. If users want to browse supplements, they use the 💊 補品 tab (SupplementManager).
- ConsumptionEvent deduction makes the inventory "remaining" calculation in SupplementManager accurate for the first time (Phase 8 only counted purchases).

</specifics>

<deferred>
## Deferred Ideas

- Historical routine views (past days) — future feature
- Supplement effectiveness tracking over time → v3.0 (SUPP-07)
- Auto-reorder reminders when critically low → v3.0 (SUPP-08)
- Notification/reminder at scheduled times — requires PWA service worker, out of scope

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-supplement-routine-generator*
*Context gathered: 2026-04-05*
