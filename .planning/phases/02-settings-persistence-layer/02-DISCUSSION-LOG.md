# Phase 2: Settings Persistence Layer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 02-settings-persistence-layer
**Areas discussed:** Settings schema structure, Schema versioning & migration, API surface design, Storage namespace
**Mode:** Auto (--auto flag — recommended defaults selected automatically)

---

## Settings Schema Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single key with nested object | One localStorage key storing all settings as JSON | ✓ |
| Multiple keys per concern | Separate keys for profile, guideline, sheets config | |

**User's choice:** [auto] Single key with nested object (recommended default)
**Notes:** Atomic reads/writes, simpler versioning (one version field covers all settings), matches the pattern of a cohesive settings blob.

---

## Schema Versioning & Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Version field + inline switch/case migration | `settings_version: 1` in root, migrate() runs on every read | ✓ |
| Separate migration registry | Dedicated migration module with registered handlers | |
| No migration — wipe on version mismatch | Reset to defaults if version doesn't match | |

**User's choice:** [auto] Version field + inline switch/case migration (recommended default)
**Notes:** Simple, no extra infrastructure. Appropriate for single-user app. Corrupted/missing version treated as fresh start.

---

## API Surface Design

| Option | Description | Selected |
|--------|-------------|----------|
| Granular getters with partial update writers | Typed getters per group, merge-write methods | ✓ |
| Bulk get/set of entire blob | Single getSettings() / saveSettings() | |
| Class-based with methods | SettingsService as instantiated class | |

**User's choice:** [auto] Granular getters with partial update writers (recommended default)
**Notes:** Matches success criteria (getUserProfile(), getComputedTargets()). Read methods return typed slices; write methods accept partial updates and merge. Consistent with DataService/SheetsAPI singleton pattern.

---

## Storage Namespace

| Option | Description | Selected |
|--------|-------------|----------|
| Separate settings key | Dedicated `"eat_manager_settings"` key | ✓ |
| Reuse wellness_ prefix | `wellness_settings` using existing cache prefix | |

**User's choice:** [auto] Separate settings key (recommended default)
**Notes:** Settings are structurally different from cache data (not transient, not overwritten by Sheets sync). Dedicated key makes the boundary clear.

---

## Claude's Discretion

- Internal helper naming (readRaw, writeRaw, etc.)
- Type definition co-location (types.ts vs service file)
- Error handling for corrupted data (return defaults)
- File placement within src/lib/

## Deferred Ideas

None — discussion stayed within phase scope
