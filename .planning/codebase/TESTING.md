# Testing Patterns

**Analysis Date:** 2026-03-29

## Test Framework

**Runner:**
- No test framework is installed or configured
- No test-related dependencies in `package.json` (no jest, vitest, testing-library, playwright, cypress)
- No test configuration files exist (no `jest.config.*`, `vitest.config.*`, `playwright.config.*`)

**Run Commands:**
- No `test` script defined in `package.json`
- Available scripts: `dev`, `build`, `preview`, `deploy`

## Test File Organization

**Location:**
- No test files exist anywhere in the codebase
- No `__tests__/` directories
- No `*.test.*` or `*.spec.*` files

## Current State

**Coverage:** 0% -- no tests of any kind exist.

**What should be tested (priority order):**

1. **Data resolution layer** (`src/data/resolver.ts`):
   - `resolveItem()` returning correct `ResolvedItem` for food, remedy, supplement, and behavior IDs
   - `resolveItem()` returning `null` for unknown IDs
   - `resolveItems()` filtering out null results
   - `resolveAndGroup()` correctly grouping by type

2. **Utility functions** (`src/lib/utils.ts`):
   - `parseCal()` parsing various string formats
   - `formatDate()` producing correct Chinese day-of-week labels
   - `clamp()` boundary behavior

3. **Data integrity** (`src/data/foods.ts`, `src/data/remedies.ts`, `src/data/schedule.ts`):
   - All IDs referenced in schedule `fixedIds` and `pools.itemIds` resolve to actual items
   - No duplicate IDs across food and remedy maps
   - Required fields are present on all items
   - All `tags` values are valid `HealthTag` union members

4. **Data service** (`src/lib/data-service.ts`):
   - `todayStr()` and `daysAgo()` date formatting
   - `rowToFood()` and `rowToRemedy()` conversion from sheet rows (currently module-private, would need refactoring or testing via public API)
   - Cache read/write behavior with mocked localStorage
   - Graceful degradation when SheetsAPI fails

5. **Schedule generation logic** (currently inlined in `src/pages/DailyPlan.tsx`):
   - `pickFromPool()` respects used IDs set and falls back when pool is exhausted
   - `generatePlan()` produces valid slots with no duplicate selections
   - These functions are NOT exported; would need to be extracted to a separate module for unit testing

## Recommended Setup

**Framework:** Vitest (already using Vite as build tool, near-zero-config integration)

**Installation:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Configuration** (add `test` block to existing `vite.config.ts`):
```typescript
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/eat-manager/",
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
  },
});
```

**Package.json scripts to add:**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Suggested test file locations (co-located pattern):**
- `src/data/resolver.test.ts`
- `src/data/integrity.test.ts`
- `src/lib/utils.test.ts`
- `src/lib/data-service.test.ts`

## Example Test Patterns

**Unit test for resolver:**
```typescript
// src/data/resolver.test.ts
import { describe, it, expect } from "vitest";
import { resolveItem, resolveItems, resolveAndGroup } from "./resolver";

describe("resolveItem", () => {
  it("resolves a food item by ID", () => {
    const item = resolveItem("egg_boiled");
    expect(item).not.toBeNull();
    expect(item!.type).toBe("food");
    expect(item!.name).toBe("水煮蛋");
    expect(item!.cal).toBe(70);
  });

  it("resolves a supplement by ID", () => {
    const item = resolveItem("berberine");
    expect(item).not.toBeNull();
    expect(item!.type).toBe("supplement");
    expect(item!.isCore).toBe(true);
  });

  it("resolves a behavior by ID", () => {
    const item = resolveItem("eat_order");
    expect(item).not.toBeNull();
    expect(item!.type).toBe("behavior");
  });

  it("returns null for unknown ID", () => {
    expect(resolveItem("nonexistent_item")).toBeNull();
  });
});

describe("resolveAndGroup", () => {
  it("groups items by type", () => {
    const result = resolveAndGroup(["egg_boiled", "berberine", "eat_order", "roselle_tea"]);
    expect(result.foods).toHaveLength(1);
    expect(result.supplements).toHaveLength(1);
    expect(result.behaviors).toHaveLength(1);
    expect(result.remedies).toHaveLength(1);
  });
});
```

**Data integrity test:**
```typescript
// src/data/integrity.test.ts
import { describe, it, expect } from "vitest";
import { SCHEDULE } from "./schedule";
import { FOODS, FOOD_MAP } from "./foods";
import { SUPPLEMENTS, NATURAL_REMEDIES, BEHAVIORS, REMEDY_MAP } from "./remedies";
import { resolveItem } from "./resolver";

describe("schedule data integrity", () => {
  it("all fixedIds resolve to valid items", () => {
    for (const slot of SCHEDULE) {
      for (const id of slot.fixedIds) {
        expect(resolveItem(id), `fixedId "${id}" in slot ${slot.time}`).not.toBeNull();
      }
    }
  });

  it("all pool itemIds resolve to valid items", () => {
    for (const slot of SCHEDULE) {
      for (const pool of slot.pools) {
        for (const id of pool.itemIds) {
          expect(resolveItem(id), `itemId "${id}" in pool "${pool.name}" at ${slot.time}`).not.toBeNull();
        }
      }
    }
  });

  it("no duplicate IDs across foods and remedies", () => {
    const allIds = [
      ...FOODS.map((f) => f.id),
      ...SUPPLEMENTS.map((s) => s.id),
      ...NATURAL_REMEDIES.map((r) => r.id),
      ...BEHAVIORS.map((b) => b.id),
    ];
    const unique = new Set(allIds);
    expect(unique.size).toBe(allIds.length);
  });
});
```

**Utility function test:**
```typescript
// src/lib/utils.test.ts
import { describe, it, expect } from "vitest";
import { parseCal, formatDate, clamp } from "./utils";

describe("parseCal", () => {
  it("parses numeric string with tilde", () => {
    expect(parseCal("~280")).toBe(280);
  });
  it("parses string with parenthetical note", () => {
    expect(parseCal("~80(含蛋)")).toBe(80);
  });
  it("returns 0 for undefined", () => {
    expect(parseCal(undefined)).toBe(0);
  });
  it("returns 0 for empty string", () => {
    expect(parseCal("")).toBe(0);
  });
});

describe("clamp", () => {
  it("clamps below min", () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });
  it("clamps above max", () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });
  it("passes through value in range", () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });
});
```

**Mocking pattern for DataService tests:**
```typescript
// src/lib/data-service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DataService } from "./data-service";

// Mock sheets-api module
vi.mock("./sheets-api", () => ({
  SheetsAPI: {
    readAll: vi.fn().mockRejectedValue(new Error("offline")),
    readRange: vi.fn().mockRejectedValue(new Error("offline")),
    append: vi.fn().mockRejectedValue(new Error("offline")),
    upsert: vi.fn().mockRejectedValue(new Error("offline")),
    deleteByDate: vi.fn().mockRejectedValue(new Error("offline")),
  },
}));

beforeEach(() => {
  localStorage.clear();
});

describe("DataService offline behavior", () => {
  it("returns fallback foods when cache is empty and API fails", async () => {
    const fallback = [{
      id: "test", type: "food" as const, name: "Test",
      serving: "1", cal: 100, protein: 10, fat: 5,
      carbs: 10, sodium: 50, source: "test",
    }];
    const result = await DataService.getFoods(fallback);
    expect(result).toEqual(fallback);
  });

  it("returns empty array for weight log when cache is empty", async () => {
    const result = await DataService.getWeightLog(90);
    expect(result).toEqual([]);
  });
});
```

## CI/CD Integration

- No CI pipeline exists
- Deployment is manual via `npm run deploy` using `gh-pages` package
- No pre-commit hooks configured (no husky, lint-staged)
- Type-checking only runs during `npm run build` via `tsc -b`
- GitHub Actions workflow exists at `.github/workflows/` for gh-pages deployment (triggers on push to master)

## Test Types

**Unit Tests:**
- Not implemented. Best candidates: `src/data/resolver.ts`, `src/lib/utils.ts`, `src/data/` integrity checks

**Integration Tests:**
- Not implemented. Best candidate: `src/lib/data-service.ts` with mocked localStorage and SheetsAPI

**E2E Tests:**
- Not implemented. Lower priority given the app's scope (personal wellness tracker)

**Component Tests:**
- Not implemented. If added, use `@testing-library/react` for page component rendering tests

---

*Testing analysis: 2026-03-29*
