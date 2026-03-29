# Coding Conventions

**Analysis Date:** 2026-03-29

## Naming Patterns

**Files:**
- Page components: PascalCase (e.g., `src/pages/DailyPlan.tsx`, `src/pages/NutritionTracker.tsx`, `src/pages/WeightLog.tsx`, `src/pages/SupplementSchedule.tsx`)
- Library/utility modules: kebab-case (`src/lib/data-service.ts`, `src/lib/sheets-api.ts`)
- Data modules: lowercase singular (`src/data/foods.ts`, `src/data/remedies.ts`, `src/data/schedule.ts`, `src/data/resolver.ts`, `src/data/types.ts`)
- Style files: lowercase (`src/styles/index.css`)
- Type declarations: lowercase with `.d.ts` (`src/env.d.ts`)

**Functions:**
- Use camelCase for all functions: `resolveItem()`, `pickFromPool()`, `generatePlan()`, `formatDate()`
- React components use PascalCase: `TagBadge`, `ItemCard`, `Section`
- Prefix boolean getters with `is`/`has` on interfaces: `isCore`
- Prefix query functions with `get`/`search`: `getFoodsByTag()`, `searchFoods()`, `getCoreRemedies()`
- Data conversion functions use `rowTo` prefix: `rowToFood()`, `rowToRemedy()`
- Event handlers use `handle` prefix: `handleLog` in `src/pages/WeightLog.tsx`
- Callback props use `on` prefix: `onSwap`, `onToggle`

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
- Discriminated unions via `type` field on interfaces (e.g., `FoodItem.type = "food"`, `RemedyItem.type = "supplement" | "remedy"`)

**Item IDs:**
- snake_case strings: `"oatmeal_50g"`, `"chicken_breast_711"`, `"mung_barley_soup"`, `"acv_water"`

## Code Style

**Formatting:**
- No ESLint or Prettier config files; formatting is manual/editor-based
- Indentation: 2 spaces
- Semicolons: used consistently
- Quotes: double quotes for strings
- Trailing commas: used in arrays and object literals
- Line length: no enforced limit; some JSX lines are very long (150+ chars)

**Linting:**
- TypeScript strict mode enabled in `tsconfig.json`
- `noUnusedLocals: true` and `noUnusedParameters: true` enforced
- `noFallthroughCasesInSwitch: true` enabled
- `noUncheckedSideEffectImports: true` enabled
- No ESLint, Biome, or other linter configured

**TypeScript:**
- Strict mode with `"strict": true`
- Target: ES2022, Module: ESNext, moduleResolution: bundler
- Path aliases configured: `@/*` maps to `./src/*` (but not used in practice)
- Non-null assertion used sparingly: `document.getElementById("root")!`
- Type assertions used for sheet data conversions: `as HealthTag[]`, `as unknown as SheetRow`
- Type guards used with filter: `.filter((x): x is ResolvedItem => x !== null)`

## Import Organization

**Order:**
1. React imports (`import { useState, useCallback } from "react"`)
2. Third-party libraries (`import { Routes, Route, NavLink } from "react-router-dom"`)
3. Local data/types (`import { SCHEDULE } from "../data/schedule"`, `import type { HealthTag } from "../data/types"`)
4. Local lib/utilities (`import { DataService, todayStr } from "../lib/data-service"`)

**Path Style:**
- Relative paths used throughout (`../data/types`, `./pages/DailyPlan`)
- The `@/*` path alias is configured in `tsconfig.json` but NOT used in any source file
- Type-only imports use `import type` syntax: `import type { FoodItem, RemedyItem } from "../data/types"`

## Error Handling

**Patterns:**
- Silent catch for background sync operations: `.catch(() => {})` throughout `src/lib/data-service.ts`
- `try/catch` with fallback for localStorage operations in `cacheGet()` and `cacheSet()` inside `src/lib/data-service.ts`
- `console.warn()` for recoverable issues: storage failures, unresolvable item IDs (`src/data/resolver.ts`)
- Return `null` for not-found lookups, then filter with type guards
- Input validation with early return: `if (isNaN(kg) || kg < 40 || kg > 200) return` in `src/pages/WeightLog.tsx`
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
- Section dividers using `// ── Section Name ──` pattern with Unicode box-drawing em-dash characters
- JSDoc `/** */` on exported types and key functions
- Inline comments for non-obvious data (e.g., nutritional science notes, why a food has a particular health tag)
- `TODO` comments for unfinished features: `// TODO:` prefix (see `src/pages/NutritionTracker.tsx`)
- Comments are bilingual: Traditional Chinese (zh-TW) for domain concepts, English for code concepts

**JSDoc/TSDoc:**
- Used on exported interfaces and type aliases
- Used on key exported functions (`resolveItem`, `resolveAndGroup`, `getCoreRemedies`)
- Not used on internal/private helper functions

## Function Design

**Size:**
- Utility functions are small (3-10 lines): `parseCal()`, `formatDate()`, `clamp()`, `todayStr()`, `daysAgo()`
- Page components are larger (80-160 lines) with inline sub-components
- Data service methods are 5-15 lines each

**Parameters:**
- Destructured props for React components: `{ item, onSwap }`
- Default parameter values for optional args: `days = 14`, `days = 90`
- Simple positional parameters for utility functions: `resolveItem(id: string)`

**Return Values:**
- Functions return `null` for "not found" cases (not `undefined`)
- Type guards used with `.filter()` for null filtering: `.filter((x): x is ResolvedItem => x !== null)`
- Async service methods return `Promise<T[]>` with empty array fallback
- `void` for side-effect operations (save/log)

## Module Design

**Exports:**
- Default exports for page components only: `export default function DailyPlan()`
- Named exports for data, types, utilities, and service objects
- Data modules export both raw arrays and lookup Maps/functions
- Service modules export singleton objects (plain objects, not classes): `export const DataService = { ... }`, `export const SheetsAPI = { ... }`

**Barrel Files:**
- Not used. Each module is imported directly by path.

## Component Patterns

**React Components:**
- Functional components only (no classes)
- State managed with `useState` hooks; no global state library, no Context API
- Side effects with `useEffect` (e.g., data fetch on mount in `src/pages/WeightLog.tsx`)
- Performance optimization with `useCallback` for event handlers in `src/pages/DailyPlan.tsx`
- No custom hooks extracted
- Sub-components defined in same file as the parent page (e.g., `TagBadge`, `ItemCard` in `src/pages/DailyPlan.tsx`; `Section` in `src/pages/SupplementSchedule.tsx`)
- No prop type validation beyond TypeScript interfaces

**Styling:**
- Tailwind CSS v4 via `@tailwindcss/vite` plugin -- no `tailwind.config.js` needed
- All styles are inline Tailwind utility classes in JSX `className` strings
- Dynamic styles use template literals with conditional ternary classes
- Inline `style` prop used for dynamic colors from data (health tag colors with opacity suffixes like `+ "20"`, `+ "40"`)
- Custom theme tokens defined in `src/styles/index.css` using `@theme` directive
- Dark theme only: `bg-slate-950` base, `bg-slate-900/95` nav, `bg-slate-800/50` cards
- Color palette: blue/violet for primary actions, emerald for success, amber for warnings, red for critical

## Language & Localization

- UI text is entirely in Traditional Chinese (zh-TW)
- Code identifiers are in English
- Type definitions use English field names with Chinese JSDoc comments
- No i18n framework; all strings are hardcoded
- `index.html` sets `lang="zh-TW"`

---

*Convention analysis: 2026-03-29*
