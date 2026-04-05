# Architecture

**Analysis Date:** 2026-03-29

## Pattern Overview

**Overall:** Client-side SPA with offline-first data layer and optional Google Sheets backend

**Key Characteristics:**
- Single-page React application with client-side routing (HashRouter for GitHub Pages compatibility)
- Static data catalogs (foods, remedies, behaviors) hardcoded in TypeScript with ID-based lookup maps
- Offline-first persistence: localStorage as primary store, Google Sheets as async background sync
- No server-side rendering, no SSR framework -- pure Vite + React build deployed as static files
- Mobile-first UI (max-width container, bottom tab nav, touch-optimized)

## Layers

**Presentation Layer (Pages):**
- Purpose: Full-page views corresponding to bottom navigation tabs
- Location: `src/pages/`
- Contains: Page components with local state, UI rendering, event handlers
- Depends on: Data layer (`src/data/`), Service layer (`src/lib/`)
- Used by: Router in `src/App.tsx`

**Data Catalog Layer (Static Reference Data):**
- Purpose: Defines all food items, supplement/remedy items, behaviors, and the daily schedule template
- Location: `src/data/`
- Contains: TypeScript type definitions, hardcoded item arrays, lookup Maps, query/filter functions
- Depends on: Nothing (leaf layer)
- Used by: Presentation layer, Resolver, DataService

**Resolver Layer (ID-to-Object Resolution):**
- Purpose: Unified lookup interface -- given an ID, returns a normalized `ResolvedItem` regardless of whether it's a food, supplement, remedy, or behavior
- Location: `src/data/resolver.ts`
- Contains: `resolveItem()`, `resolveItems()`, `resolveAndGroup()` functions
- Depends on: `FOOD_MAP` from `src/data/foods.ts`, `REMEDY_MAP` from `src/data/remedies.ts`
- Used by: `src/pages/DailyPlan.tsx`

**Service Layer (Persistence):**
- Purpose: Offline-first data access -- reads from localStorage first, syncs with Google Sheets in background
- Location: `src/lib/`
- Contains: `DataService` (high-level CRUD), `SheetsAPI` (low-level HTTP to Google Apps Script), utility functions
- Depends on: Browser localStorage, Google Apps Script Web App endpoint
- Used by: Page components (`DailyPlan`, `WeightLog`, `NutritionTracker`)

**Backend Proxy (Google Apps Script):**
- Purpose: Serverless REST API that reads/writes Google Sheets as a database
- Location: `scripts/gas-api.js` (deployed separately to Google Apps Script, not part of the Vite build)
- Contains: `doGet()`, `doPost()` handlers with read/readRange/append/upsert/delete actions
- Depends on: Google Sheets SpreadsheetApp API
- Used by: `SheetsAPI` client in `src/lib/sheets-api.ts`

## Data Flow

**Daily Plan Generation:**

1. User taps "Generate" button in `src/pages/DailyPlan.tsx`
2. `DataService.getDailyPlans(3)` fetches recent plans (localStorage first, Sheets in background) to avoid repeats
3. `generatePlan()` iterates through `SCHEDULE` slots, resolves fixed IDs, randomly picks from pools (avoiding recently used items)
4. Each picked ID is resolved via `resolveItem()` which checks `REMEDY_MAP` then `FOOD_MAP`
5. User can swap individual items via `swapItem()` which picks a random alternative from the same pool
6. On save, `DataService.saveDailyPlan()` writes to localStorage immediately + async POST to Sheets

**Weight Logging:**

1. `WeightLog` component loads history via `DataService.getWeightLog(90)` on mount
2. User enters weight, `DataService.logWeight()` upserts to localStorage and async to Sheets
3. Progress bar calculated from hardcoded `START_KG` (104) and `TARGET_KG` (80)

**Offline-First Strategy:**

1. All reads check localStorage cache first (instant response)
2. Background fetch from Google Sheets updates cache silently (fire-and-forget)
3. All writes go to localStorage immediately, then async POST to Sheets
4. Sheets failures are caught and silently ignored (graceful degradation)

**State Management:**
- No global state management library (no Redux, Zustand, Context)
- Each page manages its own state via `useState` / `useEffect`
- Persistence handled through `DataService` which abstracts localStorage + Sheets

## Key Abstractions

**ResolvedItem:**
- Purpose: Normalized representation of any item (food, supplement, remedy, behavior) for UI rendering
- Defined in: `src/data/resolver.ts`
- Pattern: Adapter pattern -- converts heterogeneous source types (`FoodItem`, `RemedyItem`, `BehaviorItem`) into a uniform shape with `name`, `dose`, `cal`, `tags`, `description`, `tcm`, `caution`, `isCore`

**ScheduleSlot:**
- Purpose: Defines a time slot in the daily schedule with fixed items and randomizable pools
- Defined in: `src/data/types.ts`
- Pattern: Template pattern -- the schedule is a template; `generatePlan()` fills in the random selections

**DataService:**
- Purpose: Singleton object providing offline-first CRUD operations
- Defined in: `src/lib/data-service.ts`
- Pattern: Repository pattern with localStorage as primary store and Sheets as eventual-consistency remote

**SheetsAPI:**
- Purpose: Low-level HTTP client for Google Apps Script Web App
- Defined in: `src/lib/sheets-api.ts`
- Pattern: API client with GET for reads and POST for writes, using query params and JSON body respectively

## Entry Points

**Browser Entry:**
- Location: `index.html` -> `src/main.tsx`
- Triggers: Page load
- Responsibilities: Mounts React app inside `HashRouter` with `StrictMode`

**App Shell:**
- Location: `src/App.tsx`
- Triggers: React render
- Responsibilities: Defines routes (`/plan`, `/track`, `/schedule`, `/weight`) and bottom tab navigation. Default route redirects to `/plan`.

**Google Apps Script Entry:**
- Location: `scripts/gas-api.js`
- Triggers: HTTP GET/POST to the deployed Apps Script Web App URL
- Responsibilities: CRUD operations on Google Sheets (read, readRange, append, upsert, delete)

## Error Handling

**Strategy:** Silent failure with graceful degradation

**Patterns:**
- All Sheets API calls are wrapped in `.catch(() => {})` -- failures are silently swallowed
- localStorage read/write wrapped in try/catch returning null on failure
- `resolveItem()` returns `null` for unknown IDs and logs `console.warn`
- No user-facing error messages, toast notifications, or error boundaries
- The app remains fully functional offline due to localStorage fallback + hardcoded data catalogs

## Cross-Cutting Concerns

**Logging:** `console.warn` only, used sparingly (unknown item IDs, localStorage failures)
**Validation:** Minimal -- weight input checks `isNaN` and range 40-200kg; no form validation library
**Authentication:** None -- Google Apps Script Web App is deployed with "Anyone" access; no user auth
**Internationalization:** Chinese (Traditional) throughout; no i18n library; all strings hardcoded in components and data files

---

*Architecture analysis: 2026-03-29*
