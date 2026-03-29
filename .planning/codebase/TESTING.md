# Testing Patterns

**Analysis Date:** 2026-03-29

## Test Framework

**Runner:**
- No test framework is installed or configured
- No test-related dependencies in `package.json` (no jest, vitest, testing-library, playwright, cypress)
- No test configuration files exist (no `jest.config.*`, `vitest.config.*`, `playwright.config.*`)

**Run Commands:**
- No `test` script defined in `package.json`
- Available scripts are limited to: `dev`, `build`, `preview`, `deploy`

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

3. **Data service** (`src/lib/data-service.ts`):
   - `todayStr()` and `daysAgo()` date formatting
   - `rowToFood()` and `rowToRemedy()` conversion from sheet rows (currently private, would need refactoring or testing via public API)
   - Cache read/write behavior with mocked localStorage
   - Graceful degradation when SheetsAPI fails

4. **Schedule generation** (`src/pages/DailyPlan.tsx`):
   - `pickFromPool()` respects used IDs set
   - `generatePlan()` produces valid slots with no duplicate selections
   - These functions are currently defined inside the page component file and not exported

5. **Data integrity** (`src/data/foods.ts`, `src/data/remedies.ts`, `src/data/schedule.ts`):
   - All IDs referenced in schedule `fixedIds` and `pools.itemIds` resolve to actual items
   - No duplicate IDs across food and remedy maps
   - Required fields are present on all items

## Recommended Setup

**Framework:** Vitest (already using Vite as build tool, zero-config integration)

**Installation:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Configuration** (`vitest.config.ts` or add to existing `vite.config.ts`):
```typescript
/// <reference types="vitest" />
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
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

**Suggested test file locations (co-located):**
- `src/data/resolver.test.ts`
- `src/lib/utils.test.ts`
- `src/lib/data-service.test.ts`
- `src/data/integrity.test.ts` (data validation tests)

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
```

**Data integrity test:**
```typescript
// src/data/integrity.test.ts
import { describe, it, expect } from "vitest";
import { SCHEDULE } from "./schedule";
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

## CI/CD Integration

- No CI pipeline exists (deployment is manual via `npm run deploy` using gh-pages)
- No pre-commit hooks configured
- No type-checking in CI (only runs during `npm run build` via `tsc -b`)

---

*Testing analysis: 2026-03-29*
