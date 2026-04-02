---
phase: 08-supplement-manager-inventory
verified: 2026-04-02T11:00:00Z
status: human_needed
score: 12/12 must-haves verified
re_verification: false
human_verification:
  - test: "Navigate to /supplements tab and confirm full end-to-end CRUD flow"
    expected: "Add, edit, delete supplements; interactions/synergies bidirectional display; inventory recording; low-inventory banner; search and timing filter"
    why_human: "Visual rendering and multi-step interaction flows cannot be verified programmatically without a browser"
  - test: "Bidirectional interaction display — if A marks B as conflict, open B edit view"
    expected: "Dimmed chip '⚠ 與 A 衝突（由對方設定）' appears in B's interaction section without B explicitly setting it"
    why_human: "Requires two-supplement setup and live UI verification"
  - test: "Record a purchase in edit view and confirm card in list view updates"
    expected: "Inventory status bar on the card changes from gray 'undef' to green/amber/red with remaining count and days"
    why_human: "Requires optimistic state update verification across views"
---

# Phase 8: Supplement Manager + Inventory Verification Report

**Phase Goal:** Users can manage their supplement catalog with full metadata — interactions, synergies, timing, dosage — and track inventory per supplement so remaining supply and days until empty are always visible.
**Verified:** 2026-04-02T11:00:00Z
**Status:** human_needed (all automated checks pass; end-to-end UI flows require human verification)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can navigate to /supplements via bottom nav tab and see a supplement list page | VERIFIED | `src/App.tsx` line 14: `/supplements` tab with 💊 icon at index 3; Route wired at line 28; `SupplementManager` default export confirmed |
| 2 | User can add a supplement with name, brand, dosage, timing, tags, isActive toggle and it appears in the list | VERIFIED | `SupplementForm` in `SupplementManager.tsx` has all fields; `handleSubmit` calls `ItemService.saveSupplement`; `handleSave` re-fetches and updates state |
| 3 | User can tap a supplement to edit it and save changes | VERIFIED | `handleTapSupplement` sets `editTarget` and `view="edit"`; edit form pre-filled from `supp` prop; save calls `ItemService.saveSupplement` |
| 4 | User can delete a supplement with confirmation | VERIFIED | `handleDelete` at line 823 uses `window.confirm`; calls `ItemService.deleteSupplement`; filters local state |
| 5 | Search by name filters the list in real time | VERIFIED | `filteredSupplements` computed from `searchTerm` and `timingFilter` at lines 807-811 |
| 6 | User can select other supplements as interaction warnings and see red-tinted chips | VERIFIED | `SupplementRefSelector` with `chipColor="red"` at line 696; hex `#ef444430` confirmed at line 134 |
| 7 | User can select other supplements as synergies and see green-tinted chips | VERIFIED | `SupplementRefSelector` with `chipColor="green"` at line 727; hex `#22c55e30` confirmed at line 135 |
| 8 | Bidirectional interactions are displayed — if A marks B as conflict, B's edit view also shows the conflict | VERIFIED | `indirectInteractions` computed at lines 452-459; rendered as dimmed chips with "由對方設定" at line 717 |
| 9 | User can record a purchase in edit view and see it in the history list | VERIFIED | `InventorySection` component at line 204; `handleRecordPurchase` at line 847 calls `ItemService.upsertInventory`; purchase history rendered at lines 275-288 |
| 10 | Remaining units and estimated days display in edit view inventory section | VERIFIED | `InventorySection` summary card at lines 241-247: "剩餘 X 顆 · 約 Y 天" or "尚無庫存記錄" |
| 11 | Inventory status bar on cards reflects purchase data | VERIFIED | `SupplementCard` renders `INV_COLORS[color]` pill at line 383 using `calcDaysRemaining` and `calcRemainingUnits` from parent |
| 12 | Dangling references to deleted supplements are gracefully filtered out | VERIFIED | `resolvedSelected` in `SupplementRefSelector` filters undefined IDs via type guard at lines 119-120; `resolveInteractions`/`resolveSynergies` use `.filter((x): x is SupplementItem => x !== undefined)` |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/pages/SupplementManager.tsx` | Supplement manager page with list, add, edit views | VERIFIED | 958 lines; exports `default function SupplementManager`; all sub-components present |
| `src/App.tsx` | Updated routing with /supplements tab | VERIFIED | Tab at index 3, Route at line 28, `SupplementManager` imported at line 6 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `SupplementManager.tsx` | `src/lib/item-service.ts` | `ItemService.getSupplements` | WIRED | Line 796: `ItemService.getSupplements().then(setSupplements)` |
| `SupplementManager.tsx` | `src/lib/item-service.ts` | `ItemService.saveSupplement` | WIRED | Line 838: `await ItemService.saveSupplement(supp)` |
| `SupplementManager.tsx` | `src/lib/item-service.ts` | `ItemService.deleteSupplement` | WIRED | Line 824: `await ItemService.deleteSupplement(id)` |
| `SupplementManager.tsx` | `src/lib/item-service.ts` | `ItemService.upsertInventory` | WIRED | Line 848: `await ItemService.upsertInventory(entry)` |
| `SupplementManager.tsx` | `src/lib/item-service.ts` | `ItemService.getInventory` | WIRED | Line 797: `ItemService.getInventory().then(setInventory)` |
| `src/App.tsx` | `src/pages/SupplementManager.tsx` | Route element | WIRED | Line 28: `<Route path="/supplements" element={<SupplementManager />} />` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `SupplementManager.tsx` list | `supplements` state | `ItemService.getSupplements()` — reads `localStorage` cache + background Sheets sync; seeds from `SUPPLEMENTS` constant | Yes — localStorage + hardcoded seed | FLOWING |
| `SupplementManager.tsx` list | `inventory` state | `ItemService.getInventory()` — reads `localStorage` cache + background Sheets sync | Yes — localStorage | FLOWING |
| `InventorySection` | `entries` (filtered inventory) | Parent `inventory` state filtered by `supplementId` | Yes — flows from parent state | FLOWING |
| `SupplementCard` | `daysLeft`, `remainingUnits` | `calcDaysRemaining` / `calcRemainingUnits` computed from `inventory` state | Yes — computed from real state | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript build passes | `npm run build` | Exit 0; 59 modules, zero TS errors | PASS |
| App.tsx has /supplements tab | `grep -c "supplements" src/App.tsx` | 2 (tab + route) | PASS |
| App.tsx has SupplementManager | `grep -c "SupplementManager" src/App.tsx` | 2 (import + element) | PASS |
| ItemService has all 5 supplement/inventory methods | `grep -c "getSupplements\|saveSupplement\|deleteSupplement\|getInventory\|upsertInventory" src/lib/item-service.ts` | 5 methods defined | PASS |
| resolveInteractions/resolveSynergies present | `grep "resolveInteractions\|resolveSynergies" SupplementManager.tsx` | Lines 70, 82 (definitions) + 308, 309 (usage in card) | PASS |
| Low inventory banner present | `grep "即將耗盡" SupplementManager.tsx` | Line 927 | PASS |
| Bidirectional indirect display | `grep "由對方設定" SupplementManager.tsx` | Lines 717, 748 | PASS |
| INV-02 partial — no consumption deduction | `grep "ConsumptionEvent\|consumed" SupplementManager.tsx` | No matches — remaining = sum(purchased) only per D-19 | EXPECTED (locked decision) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SUPP-01 | 08-01 | Add supplement with name, brand, dosage, tags, timing | SATISFIED | `SupplementForm` fields: name, brand, `dosagePerUnit`, timing chips, tag chips |
| SUPP-02 | 08-02 | Interaction warnings (conflicts with other supplements) | SATISFIED | `SupplementRefSelector` with red chips; `interactionIds` saved to `SupplementItem.interactions` |
| SUPP-03 | 08-02 | Synergy notes (pairs well with other supplements) | SATISFIED | `SupplementRefSelector` with green chips; `synergyIds` saved to `SupplementItem.synergies` |
| SUPP-04 | 08-01 | Edit an existing supplement | SATISFIED | `view="edit"` path; form pre-filled from `supp` prop; save updates existing ID |
| SUPP-05 | 08-01 | Delete a supplement | SATISFIED | `handleDelete` with `window.confirm`; `ItemService.deleteSupplement` + local state filter |
| SUPP-06 | 08-01 | Supplement list accessible from navigation with key metadata | SATISFIED | `/supplements` tab in App.tsx; cards show name, brand, dosage, timing, tags, inventory |
| INV-01 | 08-02 | Record a supplement purchase (quantity, purchase date) | SATISFIED | `InventorySection` with "記錄購入" form; `ItemService.upsertInventory` called |
| INV-02 | 08-02 | Track remaining quantity based on consumption events | PARTIAL — EXPECTED | Per locked decision D-19: Phase 8 uses `sum(purchased)` only; consumption deductions deferred to Phase 9. REQUIREMENTS.md text says "event-sourced, not estimated" — implementation is purchase-only estimation, not consumption-event tracking. Gap is acknowledged by D-19 and the prompt explicitly notes this is known-partial. |
| INV-03 | 08-02 | See remaining quantity and estimated days of supply | SATISFIED | `InventorySection` summary card + `SupplementCard` inventory pill both show "剩餘 X 顆 · 約 Y 天" |
| INV-04 | 08-02 | Low inventory warning when days remaining below threshold | SATISFIED | `lowInventoryCount` computed at lines 815-818 (threshold: < 14 days); banner at line 927 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `SupplementManager.tsx` | 803 | `void suppMap;` — suppMap built but intentionally voided | Info | Documented decision: suppMap kept for Plan 02 use, voided to satisfy `noUnusedLocals`. Now that Plan 02 is complete, suppMap is still unused. No functional impact — build passes cleanly. |

No TODO/FIXME/placeholder comments found. No empty return stubs. No hardcoded empty data passed to render paths.

### Human Verification Required

#### 1. End-to-End CRUD Flow

**Test:** Run `npm run dev`. Navigate to the 💊 補品 tab. Add a supplement "Berberine" (brand: "Thorne", dosage: "500mg", timing: 餐中, tags: 胰島素阻抗). Save and confirm card appears.
**Expected:** Card shows name, brand, timing badge, health tag chip, and gray "尚無庫存" inventory pill.
**Why human:** Visual rendering, card layout, and localStorage persistence require browser verification.

#### 2. Bidirectional Interaction Display

**Test:** Add a second supplement "魚油". Edit "Berberine" and add "魚油" as an interaction conflict. Save. Then open "魚油" edit view.
**Expected:** "⚠ 與 Berberine 衝突（由對方設定）" appears as a dimmed read-only chip in 魚油's form — without 魚油 explicitly setting Berberine as a conflict.
**Why human:** Requires two live supplements in localStorage and live React state to verify bidirectional render logic.

#### 3. Purchase Recording and Card Update

**Test:** Edit "Berberine". In the inventory section, enter 60 units, today's date, click "記錄". Return to list.
**Expected:** Card inventory pill changes from gray to green and shows "剩餘 60 顆 · 約 60 天" (assuming 1 unit/dose, 1 dose/day). Purchase appears in history list.
**Why human:** Requires optimistic state update and re-render across component boundary.

## INV-02 Partial Status — Locked Decision

INV-02 as written in REQUIREMENTS.md states: "App tracks remaining quantity based on actual consumption events (event-sourced, not estimated)."

The implementation does **not** use consumption events. Remaining = `sum(purchasedUnits)` — a purchase-based estimate. This is a **known and intentional partial** per:
- Decision D-19 in `08-CONTEXT.md`: "ConsumptionEvent tracking is NOT implemented in Phase 8 ... Phase 9 will add consumption events"
- Prompt instruction: "INV-02 is knowingly partial — purchase tracking complete, consumption deductions deferred to Phase 9 per locked decision D-19"

REQUIREMENTS.md marks INV-02 as `[x] Complete` at the project level, which overstates the Phase 8 implementation. Phase 9 must complete the consumption-event half of this requirement.

## Gaps Summary

No functional gaps. All 12 observable truths pass automated verification. The build is clean with zero TypeScript errors.

The only open item is INV-02's partial implementation, which is intentional per D-19 and acknowledged in the prompt. Consumption event tracking is deferred to Phase 9.

Three items are routed to human verification as they require browser interaction to confirm visual rendering and multi-step state flows.

---

_Verified: 2026-04-02T11:00:00Z_
_Verifier: Claude (gsd-verifier)_
