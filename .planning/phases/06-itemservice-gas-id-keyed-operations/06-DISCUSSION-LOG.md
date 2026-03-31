# Phase 6: ItemService + GAS id-keyed Operations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 06-itemservice-gas-id-keyed-operations
**Areas discussed:** ItemService API, GAS id-keyed ops, ID generation, Cache strategy
**Mode:** Auto (all recommended defaults selected)

---

## ItemService API Design

| Option | Description | Selected |
|--------|-------------|----------|
| Singleton object (DataService pattern) | Plain object with named methods, matches existing codebase | ✓ |
| Class-based service | OOP pattern with constructor | |
| Extend DataService | Add methods to existing DataService object | |

**User's choice:** [auto] Singleton object pattern matching existing DataService
**Notes:** Consistent with `DataService` and `SheetsAPI` — no classes in codebase.

---

## GAS id-keyed Operations

| Option | Description | Selected |
|--------|-------------|----------|
| Add upsertById/deleteById actions | New GAS actions that search id column | ✓ |
| Make existing upsert/delete generic (key param) | Refactor upsertByDate to accept key column name | |
| Client-side read-modify-write | Read all, modify in JS, write back | |

**User's choice:** [auto] Add dedicated upsertById and deleteById GAS actions
**Notes:** Additive approach — keeps existing date-keyed ops untouched, no regression risk.

---

## ID Generation

| Option | Description | Selected |
|--------|-------------|----------|
| Timestamp-based (food_1711900000000) | Simple, no collision in single-user app | ✓ |
| UUID v4 | Universally unique, overkill for single-user | |
| Sequential counter | Requires tracking last ID, fragile with sync | |

**User's choice:** [auto] Timestamp-based IDs
**Notes:** Single-user static app — timestamp prefix with type discriminator is sufficient.

---

## Cache Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Single key per catalog (full array) | Simple, matches existing pattern | ✓ |
| Individual keys per item | Granular but complex cache management | |
| IndexedDB | More storage, but adds complexity | |

**User's choice:** [auto] Single cache key per catalog
**Notes:** Matches existing DataService caching pattern. Full array replacement on each write.

---

## Claude's Discretion

- Cache helper reuse (import vs duplicate)
- Error handling granularity
- Row converter functions for supplements
- Internal helper organization

## Deferred Ideas

None
