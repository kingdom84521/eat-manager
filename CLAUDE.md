<!-- GSD:project-start source:PROJECT.md -->
## Project

**Eat Manager — Settings & Nutrition Configuration**

A health/nutrition tracking SPA (React + TypeScript + Vite) deployed to GitHub Pages. Users can generate daily meal plans from a curated food/remedy catalog, track weight, and log nutrition — all synced to Google Sheets via Apps Script. This milestone focuses on adding a proper settings system: personal BMR configuration, multi-country dietary guideline integration, and in-app Google Sheets connection setup.

**Core Value:** Users can configure their personal metabolic profile and see nutritional intake recommendations tailored to their BMR, based on established national dietary guidelines — all without leaving the static site.

### Constraints

- **Tech stack**: Must remain a static SPA (React + Vite + GitHub Pages). No SSR, no server.
- **Language**: All user-facing text in Traditional Chinese
- **Styling**: Tailwind CSS v4 with existing dark theme tokens
- **Data**: Dietary guidelines must reference real, citable national sources
- **Compatibility**: Must work offline — settings stored in localStorage
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript ~5.8.3 - All application source code (`src/**/*.ts`, `src/**/*.tsx`)
- TSX (React JSX) - UI components (`src/pages/*.tsx`, `src/App.tsx`)
- JavaScript (Google Apps Script) - Backend API proxy (`scripts/gas-api.js`)
- CSS (Tailwind v4) - Styling (`src/styles/index.css`)
## Runtime
- Browser (client-side SPA) - No server runtime
- Google Apps Script runtime - For the Sheets API proxy (`scripts/gas-api.js`)
- npm
- Lockfile: `package-lock.json` (present)
## Frameworks
- React ^19.1.0 - UI framework, functional components only
- React Router DOM ^7.6.0 - Client-side routing via `HashRouter`
- Tailwind CSS ^4.1.7 - Utility-first CSS (v4 with `@import "tailwindcss"` syntax)
- Not detected - No test framework configured
- Vite ^6.3.5 - Dev server and production bundler (`vite.config.ts`)
- @vitejs/plugin-react ^4.5.2 - React Fast Refresh for Vite
- @tailwindcss/vite ^4.1.7 - Tailwind CSS Vite plugin (replaces PostCSS setup)
- TypeScript ~5.8.3 - Type checking (`tsc -b` runs before build)
## Key Dependencies
- `react` ^19.1.0 - UI rendering
- `react-dom` ^19.1.0 - DOM bindings
- `react-router-dom` ^7.6.0 - Page routing (4 routes: `/plan`, `/track`, `/schedule`, `/weight`)
- `gh-pages` ^6.3.0 - Deployment to GitHub Pages
- `vite` ^6.3.5 - Build toolchain
- `tailwindcss` ^4.1.7 - CSS framework
- `typescript` ~5.8.3 - Type safety
## Configuration
- Target: ES2022
- Module: ESNext with bundler resolution
- Strict mode enabled
- Path alias: `@/*` maps to `./src/*`
- `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` enabled
- Plugins: `@vitejs/plugin-react`, `@tailwindcss/vite`
- Base path: `/eat-manager/` (for GitHub Pages deployment)
- `VITE_GAS_URL` - Google Apps Script Web App URL (required for API)
- `VITE_SHEET_ID` - Google Sheet ID (for direct links)
- Type definitions in `src/env.d.ts`
- v4 syntax using `@import "tailwindcss"` (no `tailwind.config.js` needed)
- Custom theme tokens: `--color-emerald-glow`, `--color-surface`, `--color-surface-raised`
## Build & Deploy
- `npm run dev` - Start Vite dev server
- `npm run build` - TypeScript check + Vite production build (`tsc -b && vite build`)
- `npm run preview` - Preview production build locally
- `npm run deploy` - Build and deploy to GitHub Pages via `gh-pages -d dist`
- GitHub Pages (static site)
- Uses `HashRouter` for SPA compatibility with static hosting
- Base path configured as `/eat-manager/`
## Platform Requirements
- Node.js (version not pinned, no `.nvmrc`)
- npm
- Static file hosting (GitHub Pages)
- Google Apps Script Web App (backend proxy for Google Sheets)
- No server-side runtime required
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Page components: PascalCase (e.g., `src/pages/DailyPlan.tsx`, `src/pages/NutritionTracker.tsx`, `src/pages/WeightLog.tsx`, `src/pages/SupplementSchedule.tsx`)
- Library/utility modules: kebab-case (`src/lib/data-service.ts`, `src/lib/sheets-api.ts`)
- Data modules: lowercase singular (`src/data/foods.ts`, `src/data/remedies.ts`, `src/data/schedule.ts`, `src/data/resolver.ts`, `src/data/types.ts`)
- Style files: lowercase (`src/styles/index.css`)
- Type declarations: lowercase with `.d.ts` (`src/env.d.ts`)
- Use camelCase for all functions: `resolveItem()`, `pickFromPool()`, `generatePlan()`, `formatDate()`
- React components use PascalCase: `TagBadge`, `ItemCard`, `Section`
- Prefix boolean getters with `is`/`has` on interfaces: `isCore`
- Prefix query functions with `get`/`search`: `getFoodsByTag()`, `searchFoods()`, `getCoreRemedies()`
- Data conversion functions use `rowTo` prefix: `rowToFood()`, `rowToRemedy()`
- Event handlers use `handle` prefix: `handleLog` in `src/pages/WeightLog.tsx`
- Callback props use `on` prefix: `onSwap`, `onToggle`
- Use camelCase: `typeFilter`, `expandedIds`, `totalCal`, `remainProtein`
- Constants use UPPER_SNAKE_CASE: `SCHEDULE`, `FOODS`, `SUPPLEMENTS`, `NATURAL_REMEDIES`, `BEHAVIORS`
- Lookup maps use UPPER_SNAKE_CASE with `_MAP` suffix: `FOOD_MAP`, `REMEDY_MAP`
- Label/color records use UPPER_SNAKE_CASE: `HEALTH_TAG_LABELS`, `HEALTH_TAG_COLORS`
- Cache keys use snake_case strings: `"daily_plans"`, `"nutrition_log"`
- Interfaces use PascalCase: `FoodItem`, `RemedyItem`, `ScheduleSlot`, `DailyPlan`
- Type aliases use PascalCase: `ItemType`, `HealthTag`, `TCMNature`, `AnyItem`
- Union literal types for enums: `type ItemType = "food" | "supplement" | "remedy" | "behavior"`
- Discriminated unions via `type` field on interfaces (e.g., `FoodItem.type = "food"`, `RemedyItem.type = "supplement" | "remedy"`)
- snake_case strings: `"oatmeal_50g"`, `"chicken_breast_711"`, `"mung_barley_soup"`, `"acv_water"`
## Code Style
- No ESLint or Prettier config files; formatting is manual/editor-based
- Indentation: 2 spaces
- Semicolons: used consistently
- Quotes: double quotes for strings
- Trailing commas: used in arrays and object literals
- Line length: no enforced limit; some JSX lines are very long (150+ chars)
- TypeScript strict mode enabled in `tsconfig.json`
- `noUnusedLocals: true` and `noUnusedParameters: true` enforced
- `noFallthroughCasesInSwitch: true` enabled
- `noUncheckedSideEffectImports: true` enabled
- No ESLint, Biome, or other linter configured
- Strict mode with `"strict": true`
- Target: ES2022, Module: ESNext, moduleResolution: bundler
- Path aliases configured: `@/*` maps to `./src/*` (but not used in practice)
- Non-null assertion used sparingly: `document.getElementById("root")!`
- Type assertions used for sheet data conversions: `as HealthTag[]`, `as unknown as SheetRow`
- Type guards used with filter: `.filter((x): x is ResolvedItem => x !== null)`
## Import Organization
- Relative paths used throughout (`../data/types`, `./pages/DailyPlan`)
- The `@/*` path alias is configured in `tsconfig.json` but NOT used in any source file
- Type-only imports use `import type` syntax: `import type { FoodItem, RemedyItem } from "../data/types"`
## Error Handling
- Silent catch for background sync operations: `.catch(() => {})` throughout `src/lib/data-service.ts`
- `try/catch` with fallback for localStorage operations in `cacheGet()` and `cacheSet()` inside `src/lib/data-service.ts`
- `console.warn()` for recoverable issues: storage failures, unresolvable item IDs (`src/data/resolver.ts`)
- Return `null` for not-found lookups, then filter with type guards
- Input validation with early return: `if (isNaN(kg) || kg < 40 || kg > 200) return` in `src/pages/WeightLog.tsx`
- No global error boundary or error UI component
## Logging
- `console.warn()` for recoverable issues (unknown IDs, storage failures)
- No structured logging, no log levels beyond warn
- No analytics or telemetry
## Comments
- File-level block comments with ASCII art section headers explaining module purpose (see `src/data/types.ts`, `src/data/foods.ts`, `src/data/remedies.ts`)
- Section dividers using `// ── Section Name ──` pattern with Unicode box-drawing em-dash characters
- JSDoc `/** */` on exported types and key functions
- Inline comments for non-obvious data (e.g., nutritional science notes, why a food has a particular health tag)
- `TODO` comments for unfinished features: `// TODO:` prefix (see `src/pages/NutritionTracker.tsx`)
- Comments are bilingual: Traditional Chinese (zh-TW) for domain concepts, English for code concepts
- Used on exported interfaces and type aliases
- Used on key exported functions (`resolveItem`, `resolveAndGroup`, `getCoreRemedies`)
- Not used on internal/private helper functions
## Function Design
- Utility functions are small (3-10 lines): `parseCal()`, `formatDate()`, `clamp()`, `todayStr()`, `daysAgo()`
- Page components are larger (80-160 lines) with inline sub-components
- Data service methods are 5-15 lines each
- Destructured props for React components: `{ item, onSwap }`
- Default parameter values for optional args: `days = 14`, `days = 90`
- Simple positional parameters for utility functions: `resolveItem(id: string)`
- Functions return `null` for "not found" cases (not `undefined`)
- Type guards used with `.filter()` for null filtering: `.filter((x): x is ResolvedItem => x !== null)`
- Async service methods return `Promise<T[]>` with empty array fallback
- `void` for side-effect operations (save/log)
## Module Design
- Default exports for page components only: `export default function DailyPlan()`
- Named exports for data, types, utilities, and service objects
- Data modules export both raw arrays and lookup Maps/functions
- Service modules export singleton objects (plain objects, not classes): `export const DataService = { ... }`, `export const SheetsAPI = { ... }`
- Not used. Each module is imported directly by path.
## Component Patterns
- Functional components only (no classes)
- State managed with `useState` hooks; no global state library, no Context API
- Side effects with `useEffect` (e.g., data fetch on mount in `src/pages/WeightLog.tsx`)
- Performance optimization with `useCallback` for event handlers in `src/pages/DailyPlan.tsx`
- No custom hooks extracted
- Sub-components defined in same file as the parent page (e.g., `TagBadge`, `ItemCard` in `src/pages/DailyPlan.tsx`; `Section` in `src/pages/SupplementSchedule.tsx`)
- No prop type validation beyond TypeScript interfaces
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
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Single-page React application with client-side routing (HashRouter for GitHub Pages compatibility)
- Static data catalogs (foods, remedies, behaviors) hardcoded in TypeScript with ID-based lookup maps
- Offline-first persistence: localStorage as primary store, Google Sheets as async background sync
- No server-side rendering, no SSR framework -- pure Vite + React build deployed as static files
- Mobile-first UI (max-width container, bottom tab nav, touch-optimized)
## Layers
- Purpose: Full-page views corresponding to bottom navigation tabs
- Location: `src/pages/`
- Contains: Page components with local state, UI rendering, event handlers
- Depends on: Data layer (`src/data/`), Service layer (`src/lib/`)
- Used by: Router in `src/App.tsx`
- Purpose: Defines all food items, supplement/remedy items, behaviors, and the daily schedule template
- Location: `src/data/`
- Contains: TypeScript type definitions, hardcoded item arrays, lookup Maps, query/filter functions
- Depends on: Nothing (leaf layer)
- Used by: Presentation layer, Resolver, DataService
- Purpose: Unified lookup interface -- given an ID, returns a normalized `ResolvedItem` regardless of whether it's a food, supplement, remedy, or behavior
- Location: `src/data/resolver.ts`
- Contains: `resolveItem()`, `resolveItems()`, `resolveAndGroup()` functions
- Depends on: `FOOD_MAP` from `src/data/foods.ts`, `REMEDY_MAP` from `src/data/remedies.ts`
- Used by: `src/pages/DailyPlan.tsx`
- Purpose: Offline-first data access -- reads from localStorage first, syncs with Google Sheets in background
- Location: `src/lib/`
- Contains: `DataService` (high-level CRUD), `SheetsAPI` (low-level HTTP to Google Apps Script), utility functions
- Depends on: Browser localStorage, Google Apps Script Web App endpoint
- Used by: Page components (`DailyPlan`, `WeightLog`, `NutritionTracker`)
- Purpose: Serverless REST API that reads/writes Google Sheets as a database
- Location: `scripts/gas-api.js` (deployed separately to Google Apps Script, not part of the Vite build)
- Contains: `doGet()`, `doPost()` handlers with read/readRange/append/upsert/delete actions
- Depends on: Google Sheets SpreadsheetApp API
- Used by: `SheetsAPI` client in `src/lib/sheets-api.ts`
## Data Flow
- No global state management library (no Redux, Zustand, Context)
- Each page manages its own state via `useState` / `useEffect`
- Persistence handled through `DataService` which abstracts localStorage + Sheets
## Key Abstractions
- Purpose: Normalized representation of any item (food, supplement, remedy, behavior) for UI rendering
- Defined in: `src/data/resolver.ts`
- Pattern: Adapter pattern -- converts heterogeneous source types (`FoodItem`, `RemedyItem`, `BehaviorItem`) into a uniform shape with `name`, `dose`, `cal`, `tags`, `description`, `tcm`, `caution`, `isCore`
- Purpose: Defines a time slot in the daily schedule with fixed items and randomizable pools
- Defined in: `src/data/types.ts`
- Pattern: Template pattern -- the schedule is a template; `generatePlan()` fills in the random selections
- Purpose: Singleton object providing offline-first CRUD operations
- Defined in: `src/lib/data-service.ts`
- Pattern: Repository pattern with localStorage as primary store and Sheets as eventual-consistency remote
- Purpose: Low-level HTTP client for Google Apps Script Web App
- Defined in: `src/lib/sheets-api.ts`
- Pattern: API client with GET for reads and POST for writes, using query params and JSON body respectively
## Entry Points
- Location: `index.html` -> `src/main.tsx`
- Triggers: Page load
- Responsibilities: Mounts React app inside `HashRouter` with `StrictMode`
- Location: `src/App.tsx`
- Triggers: React render
- Responsibilities: Defines routes (`/plan`, `/track`, `/schedule`, `/weight`) and bottom tab navigation. Default route redirects to `/plan`.
- Location: `scripts/gas-api.js`
- Triggers: HTTP GET/POST to the deployed Apps Script Web App URL
- Responsibilities: CRUD operations on Google Sheets (read, readRange, append, upsert, delete)
## Error Handling
- All Sheets API calls are wrapped in `.catch(() => {})` -- failures are silently swallowed
- localStorage read/write wrapped in try/catch returning null on failure
- `resolveItem()` returns `null` for unknown IDs and logs `console.warn`
- No user-facing error messages, toast notifications, or error boundaries
- The app remains fully functional offline due to localStorage fallback + hardcoded data catalogs
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
