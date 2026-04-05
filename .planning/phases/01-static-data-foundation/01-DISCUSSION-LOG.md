# Phase 1: Static Data Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 01-static-data-foundation
**Areas discussed:** BMR Formula Scope, Guideline Data Structure, Activity Level Design, Unit System
**Mode:** Auto (all recommended defaults selected)

---

## BMR Formula Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Mifflin-St Jeor only | Validated as most accurate for general population; single formula for v1 | auto |
| Multiple formulas | Include Harris-Benedict and Katch-McArdle | |

**User's choice:** [auto] Mifflin-St Jeor only (recommended default)
**Notes:** Harris-Benedict and Katch-McArdle deferred to v2 requirements BMR-07, BMR-08

---

## Guideline Data Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single mid-range percentage | One clear number per macro from each guideline's range | auto |
| Min/max ranges | Store full ranges from each guideline | |

**User's choice:** [auto] Single mid-range percentage (recommended default)
**Notes:** Simpler for users; avoids confusion of showing ranges

---

## Activity Level Design

| Option | Description | Selected |
|--------|-------------|----------|
| Standard 5-level | Sedentary/Light/Moderate/Very Active/Extra Active with standard multipliers | auto |
| Simplified 3-level | Low/Medium/High | |

**User's choice:** [auto] Standard 5-level (recommended default)
**Notes:** Industry standard from Harris-Benedict convention

---

## Unit System

| Option | Description | Selected |
|--------|-------------|----------|
| Metric only | cm/kg — matches Taiwan target audience | auto |
| Metric + imperial | Support both unit systems | |

**User's choice:** [auto] Metric only (recommended default)
**Notes:** zh-TW audience in Taiwan uses metric system

---

## Claude's Discretion

- File organization within `src/data/`
- TypeScript interface naming conventions
- Whether to split into multiple files or use a single module
- Export style (individual vs namespace)

## Deferred Ideas

None
