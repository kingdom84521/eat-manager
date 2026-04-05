# Retrospective

Living document tracking lessons learned across milestones.

---

## Milestone: v1.0 — Settings & Nutrition Configuration

**Shipped:** 2026-03-30
**Phases:** 4 | **Plans:** 6 | **Timeline:** 2 days (2026-03-29 to 2026-03-30)

### What Was Built
- Pure BMR/TDEE calculation functions (Mifflin-St Jeor) and dietary guideline catalog (3 countries)
- SettingsService singleton with versioned localStorage schema and computed targets
- SheetsAPI runtime config patch (GAS URL at call time with env var fallback)
- Settings page (363 LOC) with BMR form, guideline selector, Sheets config, and 5th nav tab
- Hardcoded target migration in NutritionTracker and WeightLog

### What Worked
- Strict dependency chain (data > persistence > API patch > UI) prevented integration issues
- Derived values never stored — computed on demand avoided stale cache bugs
- Read-on-render pattern for cross-page state was the simplest viable approach
- Single-file surgical patches (Phase 3) completed quickly with high confidence

### What Was Inefficient
- Phase 2 ROADMAP progress tracking drifted (showed "Planned" even after completion)
- Some SUMMARY.md one-liner extraction failed (empty or partial results)

### Patterns Established
- Service singletons as plain objects (`SettingsService` follows `DataService`/`SheetsAPI`)
- Versioned settings schema with inline migration (switch/case from version N to N+1)
- Validation messages in zh-TW hardcoded inline (no i18n framework)
- `||` operator (not `??`) for fallback when empty strings should also fall through

### Key Lessons
- For single-file patches, one plan with one task is the right granularity
- UI phases benefit from 2 waves: create page first, then migrate consumers

### Cost Observations
- Model mix: Opus for planning, Sonnet for research/execution/verification
- Sessions: 1 main session covering Phases 3-4 (Phases 1-2 completed in prior sessions)
- Notable: Phase 3 (surgical patch) was the most efficient — minimal research, 1 plan, 1 task

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 4 |
| Plans | 6 |
| Timeline | 2 days |
| Verification pass rate | 100% (all phases passed first attempt) |
| Gap closure phases | 0 |
