# External Integrations

**Analysis Date:** 2026-03-29

## APIs & External Services

**Google Sheets (via Apps Script proxy):**
- Purpose: Primary data persistence layer - stores all user data (daily plans, nutrition logs, weight logs, supplement logs) and reference data (foods, remedies)
- SDK/Client: Custom fetch-based client at `src/lib/sheets-api.ts`
- Auth: No auth token - Apps Script Web App deployed with "Anyone" access
- Env var: `VITE_GAS_URL` (the deployed Apps Script URL)
- Env var: `VITE_SHEET_ID` (for direct sheet links)

**Google Apps Script Web App:**
- Purpose: REST API proxy that bridges the browser app to Google Sheets
- Implementation: `scripts/gas-api.js` (deployed separately to Google Apps Script)
- Endpoints:
  - `GET ?action=read&sheet={name}` - Read entire sheet
  - `GET ?action=readRange&sheet={name}&startDate={}&endDate={}` - Read date range
  - `POST {action: "append", sheet, data}` - Add row
  - `POST {action: "upsert", sheet, data}` - Update or insert by date
  - `POST {action: "delete", sheet, data: {date}}` - Delete by date

## Data Storage

**Primary Database: Google Sheets**
- Connection: Via Apps Script Web App URL (`VITE_GAS_URL`)
- Client: `SheetsAPI` object in `src/lib/sheets-api.ts`
- Sheets (tables):
  - `foods` - Food reference data (id, name, serving, cal, protein, fat, carbs, sugar, sodium, source, tags)
  - `remedies` - Supplements/remedies reference data (id, type, name, dose, cal, tags, mechanism, timing, caution, isCore, tcm_effect, tcm_nature)
  - `daily_plans` - Generated daily meal/supplement plans
  - `nutrition_log` - Per-meal nutrition tracking
  - `supplement_log` - Supplement intake tracking
  - `weight_log` - Weight measurements

**Local Cache: localStorage**
- Purpose: Offline-first data layer for instant reads
- Implementation: `src/lib/data-service.ts`
- Key prefix: `wellness_`
- Strategy: Read from cache first, background-sync from Sheets, write to both simultaneously
- Graceful degradation: App works fully offline if Sheets API is unavailable

**File Storage:**
- Not applicable - No file uploads

**Caching:**
- localStorage only (see above)
- No service worker or external cache

## Authentication & Identity

**Auth Provider:**
- None - No user authentication
- Single-user app (personal wellness tracker)
- Google Apps Script Web App is deployed with "Anyone" access (no OAuth)

## Data Flow Architecture

**Offline-First Pattern** (`src/lib/data-service.ts`):
1. All reads: localStorage first (instant), then background fetch from Sheets to update cache
2. All writes: localStorage immediately + async POST to Sheets
3. Sheets failures silently caught (`.catch(() => {})`) - never blocks UI
4. Cache trimming: Daily plans keep last 30 entries

**Reference Data Flow:**
- `DataService.getFoods(fallback)` and `DataService.getRemedies(fallback)` accept hardcoded fallback data from `src/data/foods.ts` and `src/data/remedies.ts`
- Falls back to static data if both cache and Sheets are empty

## Monitoring & Observability

**Error Tracking:**
- None - No error tracking service

**Logs:**
- `console.warn` only for localStorage write failures
- All Sheets API errors silently swallowed

## CI/CD & Deployment

**Hosting:**
- GitHub Pages (static site)

**CI Pipeline:**
- GitHub Actions (implied by `gh-pages` package and deploy script)
- Deploy command: `npm run deploy` runs `npm run build && gh-pages -d dist`

## Environment Configuration

**Required env vars:**
- `VITE_GAS_URL` - Google Apps Script Web App deployment URL
- `VITE_SHEET_ID` - Google Sheet ID

**Secrets location:**
- `.env.local` (local development, gitignored)
- `.env.example` exists with placeholder values

**Setup steps for Google Sheets backend:**
1. Create a Google Sheet with required sheet tabs (foods, remedies, daily_plans, nutrition_log, supplement_log, weight_log)
2. Open Extensions > Apps Script
3. Paste contents of `scripts/gas-api.js`
4. Deploy as Web App (Execute as: Me, Access: Anyone)
5. Copy deployment URL to `VITE_GAS_URL` in `.env.local`

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Third-Party Library Usage

This app has zero third-party runtime dependencies beyond React and React Router. All data fetching uses native `fetch()`. All state management uses React built-in hooks. No UI component library - everything is custom with Tailwind CSS utility classes.

---

*Integration audit: 2026-03-29*
