---
phase: quick
plan: 260406-f2f
subsystem: supplement-manager
tags: [types, supplement, inventory, unit-conversion]
dependency_graph:
  requires: []
  provides: [UnitConversion type, structured dosage fields, unit conversion chain editor, multi-unit inventory]
  affects: [src/data/types.ts, src/pages/SupplementManager.tsx]
tech_stack:
  added: []
  patterns: [BFS unit conversion graph traversal, string draft state for numeric inputs (per decision 07-02)]
key_files:
  created: []
  modified:
    - src/data/types.ts
    - src/pages/SupplementManager.tsx
decisions:
  - "UnitConversion uses BFS traversal to support multi-hop chains in both forward and reverse directions"
  - "Inventory purchase converts to consumptionUnit at record time — remaining display derives from stored purchasedUnits"
  - "consumptionUnit defaults to 顆 in display when not set — backward compatible with existing data"
  - "InventorySection receives live unitConversionDrafts from form — no need to save first to see unit options"
metrics:
  duration_minutes: 18
  completed_date: "2026-04-06"
  tasks_completed: 2
  files_modified: 2
---

# Quick Task 260406-f2f: Nested Unit System Summary

**One-liner:** Structured dosage fields (value + unit), per-supplement conversion chains (1 罐 = 100 顆), and multi-unit inventory purchase/display using BFS traversal over the conversion graph.

## Tasks Completed

| # | Name | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Add unit conversion types and update SupplementItem | a04e700 | UnitConversion interface, doseUnit/consumptionUnit/unitConversions fields on SupplementItem, unit/originalQty on InventoryEntry |
| 2 | Add unit conversion editor and multi-unit inventory to SupplementManager | 4bbec72 | convertUnits() BFS helper, split dosage inputs, consumptionUnit field, chain editor, multi-unit inventory section |

## What Was Built

### Types (src/data/types.ts)

- **`UnitConversion` interface**: `baseUnit`, `factor`, `targetUnit` — each link in a conversion chain
- **`SupplementItem` new optional fields**:
  - `unitConversions?: UnitConversion[]` — array of conversion chain links
  - `doseUnit?: string` — unit for dosagePerUnit (e.g. "mg"). Displayed as `{dosagePerUnit}{doseUnit}` when present
  - `consumptionUnit?: string` — smallest tracked unit (e.g. "顆", "粒"). Defaults to "顆" in display
- **`InventoryEntry` new optional fields**:
  - `unit?: string` — original purchase unit when different from consumptionUnit
  - `originalQty?: number` — original quantity entered before conversion

### SupplementManager (src/pages/SupplementManager.tsx)

- **`convertUnits()`**: BFS traversal that walks the conversion chain in both directions (multiply for baseUnit→targetUnit, divide for reverse). Supports multi-hop chains.
- **`getAllUnits()`**: Extracts all unique unit names from conversions + consumptionUnit for the selector dropdown.
- **Form — dosage section**: Single "每顆劑量" text input replaced with two inputs: numeric value + unit (e.g. "500" + "mg").
- **Form — consumptionUnit**: New "服用單位" text input (placeholder: "顆") below dosage.
- **Form — unit conversion editor**: Dynamic list with rows showing `1 [baseUnit] = [factor] [targetUnit]` + delete button, and an "新增轉換" button.
- **InventorySection**: Receives `consumptionUnit` and `unitConversions` props. Shows unit selector dropdown when multiple units are defined. Converts quantity to consumptionUnit before storing. Displays original unit in purchase history.
- **Remaining display**: Shows largest-unit breakdown when conversions exist (e.g. "剩餘 200 顆 (2 罐) · 約 66 天").
- **SupplementCard**: Dosage displayed as `{dosagePerUnit}{doseUnit}` when doseUnit set; remaining shown with `consumptionUnit ?? "顆"`.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows are wired.

## Self-Check: PASSED

- `src/data/types.ts` — exists and modified
- `src/pages/SupplementManager.tsx` — exists and modified
- Commit a04e700 — exists
- Commit 4bbec72 — exists
- `npm run build` — passes with zero errors
