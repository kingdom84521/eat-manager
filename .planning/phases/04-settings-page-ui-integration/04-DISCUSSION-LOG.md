# Phase 4: Settings Page UI + Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 04-settings-page-ui-integration
**Areas discussed:** Settings page layout, Navigation tab design, Cross-page state propagation, Empty state handling
**Mode:** --auto (all decisions auto-selected)

---

## Settings Page Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Single scrollable page | Three sections with headers: BMR, Guidelines, Sheets config | :white_check_mark: |
| Tabbed sections | Sub-tabs within the settings page for each section | |
| Accordion sections | Collapsible sections to reduce scroll length | |

**User's choice:** [auto] Single scrollable page (recommended default)
**Notes:** Matches mobile-first pattern. No tabs-within-tabs complexity. Three sections are short enough to scroll comfortably.

---

## Navigation Tab Design

| Option | Description | Selected |
|--------|-------------|----------|
| ⚙️ 設定 | Gear icon with "Settings" in zh-TW | :white_check_mark: |
| 👤 個人 | Person icon with "Personal" in zh-TW | |
| 📋 設定 | Clipboard icon with "Settings" in zh-TW | |

**User's choice:** [auto] ⚙️ 設定 (recommended default)
**Notes:** Standard settings icon, matches existing tab label length (2 characters).

---

## Cross-Page State Propagation

| Option | Description | Selected |
|--------|-------------|----------|
| Read on render | SettingsService.getComputedTargets() called on each render, no events | :white_check_mark: |
| React Context | Wrap app in SettingsContext provider for reactive updates | |
| Window storage event | Listen to localStorage change events for cross-tab sync | |

**User's choice:** [auto] Read on render (recommended default)
**Notes:** SettingsService reads localStorage synchronously. Pages re-render on navigation. Settings only changed on settings page, so no stale data risk. Simplest approach, no new patterns needed.

---

## Empty State Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Inline prompt | "請先完成個人設定" with link to settings page | :white_check_mark: |
| Banner at top | Dismissable banner prompting settings completion | |
| Keep hardcoded fallback | Show hardcoded defaults when no settings exist | |

**User's choice:** [auto] Inline prompt (recommended default)
**Notes:** Matches success criterion #5. Minimal UI change to existing pages. Clear call to action.

---

## Claude's Discretion

- BMR form state management (individual useState vs single form object)
- Guideline selector presentation (radio buttons vs selectable cards)
- Specific Tailwind styling within dark theme constraints
- Weight target handling in WeightLog

## Deferred Ideas

- Connection test button (v2 UX-01)
- Visual macro ratio bar chart (v2 UX-02)
- Guideline tooltips (v2 UX-03)
- Activity level descriptions (v2 UX-04)
- Imperial unit toggle (v2 UX-05)
