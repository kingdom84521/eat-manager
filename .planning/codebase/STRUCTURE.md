# Codebase Structure

**Analysis Date:** 2026-03-29

## Directory Layout

```
eat-manager/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages deployment workflow
├── .planning/
│   └── codebase/               # GSD codebase analysis documents
├── scripts/
│   └── gas-api.js              # Google Apps Script backend (deployed separately)
├── src/
│   ├── data/                   # Static reference data & type definitions
│   │   ├── types.ts            # All TypeScript interfaces and type unions
│   │   ├── foods.ts            # Food item catalog (FOODS array + FOOD_MAP)
│   │   ├── remedies.ts         # Supplements, remedies, behaviors catalog
│   │   ├── resolver.ts         # ID-to-ResolvedItem unified lookup
│   │   └── schedule.ts         # Daily time slot schedule template
│   ├── lib/                    # Service layer & utilities
│   │   ├── data-service.ts     # Offline-first CRUD (localStorage + Sheets)
│   │   ├── sheets-api.ts       # Google Apps Script HTTP client
│   │   └── utils.ts            # Small pure utility functions
│   ├── pages/                  # Page-level React components (one per tab)
│   │   ├── DailyPlan.tsx       # Daily plan generator with randomization
│   │   ├── NutritionTracker.tsx # Meal tracking (partially implemented)
│   │   ├── SupplementSchedule.tsx # Supplement/remedy catalog browser
│   │   └── WeightLog.tsx       # Weight logging with progress tracking
│   ├── styles/
│   │   └── index.css           # Tailwind CSS import + custom theme vars
│   ├── App.tsx                 # Root component: routes + bottom nav
│   ├── main.tsx                # React entry: HashRouter + StrictMode
│   └── env.d.ts                # Vite env type declarations
├── index.html                  # HTML shell (Vite entry point)
├── package.json                # Dependencies and scripts
├── package-lock.json           # Lockfile
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite config (React plugin, Tailwind, base path)
├── .env.example                # Example environment variables (exists)
├── .gitignore                  # Git ignore rules
└── README.md                   # Project readme
```

## Directory Purposes

**`src/data/`:**
- Purpose: All domain data definitions and static catalogs
- Contains: TypeScript interfaces (`types.ts`), hardcoded item arrays with nutritional/medical data, lookup Maps, query helper functions, and the schedule template
- Key files:
  - `types.ts`: All shared types -- `FoodItem`, `RemedyItem`, `BehaviorItem`, `ScheduleSlot`, `HealthTag`, `DailyPlan`, `WeightEntry`, etc.
  - `foods.ts`: `FOODS` array (35 items) + `FOOD_MAP` (Map<string, FoodItem>) + `searchFoods()`, `getFoodsByTag()`
  - `remedies.ts`: `SUPPLEMENTS` array (11 items), `NATURAL_REMEDIES` array (14 items), `BEHAVIORS` array (2 items), `REMEDY_MAP` + query functions
  - `resolver.ts`: `resolveItem(id)` -- checks REMEDY_MAP then FOOD_MAP, returns normalized `ResolvedItem`
  - `schedule.ts`: `SCHEDULE` array of `ScheduleSlot` objects defining the daily time template (06:30 to 21:30)

**`src/lib/`:**
- Purpose: Service layer providing data persistence and utilities
- Contains: Offline-first data service, Sheets API client, small utility functions
- Key files:
  - `data-service.ts`: `DataService` object with methods for CRUD on daily plans, nutrition, weight, supplements. Uses `CACHE_PREFIX = "wellness_"` for localStorage keys.
  - `sheets-api.ts`: `SheetsAPI` object wrapping fetch calls to Google Apps Script. Uses `VITE_GAS_URL` env var.
  - `utils.ts`: `parseCal()`, `formatDate()`, `clamp()` -- pure functions, no side effects

**`src/pages/`:**
- Purpose: Top-level page components, one per bottom navigation tab
- Contains: Self-contained page components with local state management
- Key files:
  - `DailyPlan.tsx`: Most complex page (~163 lines). Generates randomized daily plans from schedule template, supports item swapping, saves to DataService. Contains `ItemCard` and `TagBadge` sub-components inline.
  - `NutritionTracker.tsx`: Partially implemented stub (~82 lines). Has budget bar UI but only a placeholder "quick add" button. Multiple TODO comments.
  - `SupplementSchedule.tsx`: Catalog browser (~137 lines). Filter by type (supplement/remedy/behavior) and health tag. Expandable detail cards.
  - `WeightLog.tsx`: Weight input + history list (~90 lines). Progress bar from 104kg to 80kg goal. Fully connected to DataService.

**`src/styles/`:**
- Purpose: Global CSS
- Contains: Single `index.css` with Tailwind import and minimal custom theme variables

**`scripts/`:**
- Purpose: Backend code deployed to Google Apps Script (not part of Vite build)
- Contains: `gas-api.js` -- a complete REST API handling read/readRange/append/upsert/delete operations on Google Sheets

## Key File Locations

**Entry Points:**
- `index.html`: Vite HTML entry, loads `src/main.tsx`
- `src/main.tsx`: React root, wraps App in HashRouter + StrictMode
- `src/App.tsx`: Route definitions and bottom tab navigation

**Configuration:**
- `vite.config.ts`: Vite build config with `base: "/eat-manager/"` for GitHub Pages
- `tsconfig.json`: TypeScript config
- `src/env.d.ts`: Type declarations for `VITE_GAS_URL` and `VITE_SHEET_ID` env vars
- `.env.example`: Template for required environment variables

**Core Logic:**
- `src/data/resolver.ts`: Central item resolution -- the bridge between ID references and renderable data
- `src/data/schedule.ts`: The daily schedule template that drives plan generation
- `src/lib/data-service.ts`: All persistence logic (localStorage + Sheets sync)
- `src/pages/DailyPlan.tsx`: Plan generation algorithm (`generatePlan`, `pickFromPool`)

**Deployment:**
- `.github/workflows/deploy.yml`: GitHub Actions workflow for GitHub Pages deployment
- `scripts/gas-api.js`: Google Apps Script backend (deployed manually via Apps Script editor)

## Naming Conventions

**Files:**
- Pages: PascalCase matching the component name (`DailyPlan.tsx`, `WeightLog.tsx`)
- Data modules: lowercase with dots (`data-service.ts`, `sheets-api.ts`)
- Data catalogs: lowercase singular (`foods.ts`, `remedies.ts`, `schedule.ts`, `types.ts`)

**Directories:**
- All lowercase, short names: `data/`, `lib/`, `pages/`, `styles/`, `scripts/`

**Exported Constants:**
- UPPER_SNAKE_CASE for arrays and maps: `FOODS`, `FOOD_MAP`, `SUPPLEMENTS`, `NATURAL_REMEDIES`, `BEHAVIORS`, `REMEDY_MAP`, `SCHEDULE`, `HEALTH_TAG_LABELS`, `HEALTH_TAG_COLORS`

**Item IDs:**
- snake_case strings: `"chicken_breast_711"`, `"berberine"`, `"mung_barley_soup"`, `"post_meal_walk"`

## Where to Add New Code

**New Page/Tab:**
1. Create component in `src/pages/NewPage.tsx` (PascalCase)
2. Add route in `src/App.tsx` Routes block
3. Add tab entry to `tabs` array in `src/App.tsx`

**New Food Item:**
- Add to `FOODS` array in `src/data/foods.ts` with a unique `id`
- It will automatically be available via `FOOD_MAP` and `resolveItem()`

**New Supplement/Remedy/Behavior:**
- Add to `SUPPLEMENTS`, `NATURAL_REMEDIES`, or `BEHAVIORS` in `src/data/remedies.ts`
- It will automatically be available via `REMEDY_MAP` and `resolveItem()`

**New Schedule Slot or Pool Item:**
- Add item IDs to existing pools in `src/data/schedule.ts`, or add new `ScheduleSlot` objects
- Item IDs must exist in either `FOOD_MAP` or `REMEDY_MAP`

**New Data Persistence Operation:**
- Add method to `DataService` object in `src/lib/data-service.ts`
- Follow existing pattern: cache read -> background Sheets sync -> cache write + async Sheets write

**New Utility Function:**
- Add to `src/lib/utils.ts` for pure helper functions

**New Health Tag:**
- Add to `HealthTag` type union in `src/data/types.ts`
- Add label to `HEALTH_TAG_LABELS` and color to `HEALTH_TAG_COLORS` in same file

**New Shared UI Component:**
- Currently no `src/components/` directory exists. Create one if needed. Existing sub-components (`ItemCard`, `TagBadge`, `Section`) are defined inline within page files.

## Special Directories

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents
- Generated: Yes (by GSD mapping)
- Committed: Yes

**`scripts/`:**
- Purpose: Google Apps Script code meant to be copy-pasted into the Apps Script editor
- Generated: No (hand-written)
- Committed: Yes
- Note: Not part of the Vite build pipeline; deployed separately

**`dist/` (not in repo):**
- Purpose: Vite build output, deployed to GitHub Pages
- Generated: Yes (`npm run build`)
- Committed: No (in `.gitignore`)

---

*Structure analysis: 2026-03-29*
