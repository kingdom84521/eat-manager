# Coding Conventions

**Analysis Date:** 2026-03-29

## Naming Patterns

**Files:**
- Page components: PascalCase (`DailyPlan.tsx`, `NutritionTracker.tsx`, `WeightLog.tsx`, `SupplementSchedule.tsx`)
- Library/utility modules: kebab-case (`data-service.ts`, `sheets-api.ts`)
- Data modules: lowercase singular (`foods.ts`, `remedies.ts`, `schedule.ts`, `resolver.ts`, `types.ts`)
- Style files: lowercase (`index.css`)
- Type declarations: lowercase with `.d.ts` (`env.d.ts`)

**Functions:**
- Use camelCase for all functions: `resolveItem()`, `pickFromPool()`, `generatePlan()`, `formatDate()`
- React components use PascalCase: `TagBadge`, `ItemCard`, `Section`
- Prefix boolean getters with `is`/`has` on interfaces: `isCore`
- Prefix query functions with `get`/`search`: `getFoodsByTag()`, `searchFoods()`, `getCoreRemedies()`
- Data conversion functions use `rowTo` prefix: `rowToFood()`, `rowToRemedy()`

**Variables:**
- Use camelCase: `typeFilter`, `expandedIds`, `totalCal`, `remainProtein`
- Constants use UPPER_SNAKE_CASE: `SCHEDULE`, `FOODS`, `SUPPLEMENTS`, `NATURAL_REMEDIES`, `BEHAVIORS`
- Lookup maps use UPPER_SNAKE_CASE with `_MAP` suffix: `FOOD_MAP`, `REMEDY_MAP`
- Label/color records use UPPER_SNAKE_CASE: `HEALTH_TAG_LABELS`, `HEALTH_TAG_COLORS`
- Cache keys use snake_case strings: `"daily_plans"`, `"nutrition_log"`

**Types:**
- Interfaces use PascalCase: `FoodItem`, `RemedyItem`, `ScheduleSlot`, `DailyPlan`
- Type aliases use PascalCase: `ItemType`, `HealthTag`, `TCMNature`, `AnyItem`
- Union literal types for enums: `type ItemType = "food" | "supplement" | "remedy" | "behavior"`
- Discriminated unions via `type` field on interfaces

## Code Style

**Formatting:**
- No ESLint or Prettier config files detected; formatting is manual/editor-based
- Indentation: 2 spaces
- Semicolons: used consistently
- Quotes: double quotes for strings
- Trailing commas: used in arrays and object literals
- Line length: no enforced limit; some JSX lines are very long (150+ chars)

**Linting:**
- TypeScript strict mode enabled in `tsconfig.json`
- `noUnusedLocals: true` and `noUnusedParameters: true` enforced
- `noFallthroughCasesInSwitch: true` enabled
- No ESLint, Biome, or other linter configured

**TypeScript:**
- Strict mode with `"strict": true`
- Target: ES2022, Module: ESNext
- Path aliases configured: `@/*` maps to `./src/*`
- Non-null assertion used sparingly: `document.getElementById("root")!`
- Type assertions used for sheet data conversions: `as HealthTag[]`, `as unknown as SheetRow`

## Import Organization

**Order:**
1. React imports (`import { useState, useCallback } from "react"`)
2. Third-party libraries (`import { Routes, Route, NavLink } from "react-router-dom"`)
3. Local data/types (`import { SCHEDULE } from "../data/schedule"`, `import type { HealthTag } from "../data/types"`)
4. Local lib/utilities (`import { DataService, todayStr } from "../lib/data-service"`)

**Path Style:**
- Relative paths used throughout (`../data/types`, `./pages/DailyPlan`)
- The `@/*` path alias is configured but not used in any source file
- Type-only imports use `import type` syntax: `import type { FoodItem, RemedyItem } from "../data/types"`

## Error Handling

**Patterns:**
- Silent catch for background sync operations: `.catch(() => {})` throughout `src/lib/data-service.ts`
- `try/catch` with fallback for localStorage operations in `cacheGet()` and `cacheSet()`
- Console warnings for non-critical failures: `console.warn("localStorage write failed for", key)`
- `console.warn()` for unresolvable item IDs in `src/data/resolver.ts`
- No global error boundary or error UI component

**Strategy:** Offline-first graceful degradation. All Sheets API calls are fire-and-forget with silent failures. localStorage serves as primary data source; remote sync is best-effort.

## Logging

**Framework:** `console` (native browser)

**Patterns:**
- `console.warn()` for recoverable issues (unknown IDs, storage failures)
- No structured logging, no log levels beyond warn
- No analytics or telemetry

## Comments

**When to Comment:**
- File-level block comments with ASCII art section headers explaining module purpose (see `src/data/types.ts`, `src/data/foods.ts`, `src/data/remedies.ts`)
- Section dividers using `// -- Section Name --` pattern with Unicode box-drawing characters
- JSDoc `/** */` on exported types and key functions
- Inline comments for non-obvious data (e.g., nutritional science notes)
- TODO comments for unfinished features: `// TODO:` prefix
- Comments are bilingual: Chinese (Traditional) for domain concepts, English for code concepts

**JSDoc/TSDoc:**
- Used on exported interfaces and type aliases
- Used on key exported functions (`resolveItem`, `resolveAndGroup`)
- Not used on internal/private helper functions

## Function Design

**Size:**
- Utility functions are small (3-10 lines): `parseCal()`, `formatDate()`, `clamp()`, `todayStr()`, `daysAgo()`
- Page components are larger (80-160 lines) with inline sub-components
- Data service methods are 5-15 lines each

**Parameters:**
- Use destructured props for React components: `{ item, onSwap }`
- Default parameter values for optional args: `days = 14`, `days = 90`
- Callbacks passed as props use `on` prefix: `onSwap`, `onToggle`

**Return Values:**
- Functions return `null` for "not found" cases (not `undefined`)
- Type guards used with `.filter()` for null filtering: `.filter((x): x is ResolvedItem => x !== null)`
- Async service methods return `Promise<T[]>` with empty array fallback

## Module Design

**Exports:**
- Default exports for page components: `export default function DailyPlan()`
- Named exports for data, types, utilities, and service objects
- Data modules export both raw arrays and lookup Maps/functions
- Service modules export singleton objects: `export const DataService = { ... }`, `export const SheetsAPI = { ... }`

**Barrel Files:**
- Not used. Each module is imported directly by path.

## Component Patterns

**React Components:**
- Functional components only (no classes)
- State managed with `useState` hooks
- Side effects with `useEffect`
- Performance optimization with `useCallback` for event handlers
- No custom hooks extracted
- Sub-components defined in same file (e.g., `TagBadge`, `ItemCard`, `Section` inside page files)
- No prop type validation beyond TypeScript interfaces

**Styling:**
- Tailwind CSS v4 via `@tailwindcss/vite` plugin
- All styles are inline Tailwind utility classes in JSX
- Dynamic styles use template literals with conditional classes
- Inline `style` prop used for dynamic colors from data (health tag colors)
- Custom theme tokens defined in `src/styles/index.css` using `@theme` directive
- Dark theme only (slate-950 background)

## Language & Localization

- UI text is in Traditional Chinese (zh-TW)
- Code identifiers are in English
- Type definitions mix English field names with Chinese comments
- No i18n framework; all strings are hardcoded

---

*Convention analysis: 2026-03-29*
