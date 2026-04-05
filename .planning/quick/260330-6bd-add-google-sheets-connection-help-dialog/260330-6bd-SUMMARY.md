---
phase: quick
plan: 260330-6bd
subsystem: settings-ui
tags: [dialog, help, google-sheets, settings]
dependency_graph:
  requires: [src/pages/Settings.tsx]
  provides: [sheets-help-dialog]
  affects: [settings-page]
tech_stack:
  added: []
  patterns: [inline-sub-component, modal-overlay, useState-boolean-toggle]
key_files:
  created: []
  modified:
    - src/pages/Settings.tsx
decisions:
  - Dialog rendered as inline conditional JSX in Settings.tsx — no separate file, per codebase convention
  - Backdrop click closes dialog via stopPropagation on inner panel
metrics:
  duration: 5m
  completed: 2026-03-30
---

# Quick Task 260330-6bd: Add Google Sheets Connection Help Dialog — Summary

**One-liner:** Inline help dialog with 5-step Traditional Chinese setup instructions for the Google Sheets connection section in Settings.

## What Was Done

Added a "?" help button next to the "Google Sheets 連接" section header in `src/pages/Settings.tsx`. Tapping the button opens a scrollable modal overlay with step-by-step instructions (in Traditional Chinese) explaining how to:

1. Create a Google Sheets spreadsheet and find the Sheet ID
2. Open the Apps Script editor from the spreadsheet
3. Paste in the `gas-api.js` code
4. Deploy it as a Web App with correct access settings
5. Copy the deployed URL into the Settings fields

The dialog closes via the X button in the corner or by clicking the backdrop overlay.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add Google Sheets help dialog to Settings page | 01faebc | src/pages/Settings.tsx |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- src/pages/Settings.tsx: modified (89 insertions)
- Commit 01faebc: confirmed in git log
- Build: passes with no TypeScript errors
