# Technology Stack

**Analysis Date:** 2026-03-29

## Languages

**Primary:**
- TypeScript ~5.8.3 - All application source code (`src/**/*.ts`, `src/**/*.tsx`)
- TSX (React JSX) - UI components (`src/pages/*.tsx`, `src/App.tsx`)

**Secondary:**
- JavaScript (Google Apps Script) - Backend API proxy (`scripts/gas-api.js`)
- CSS (Tailwind v4) - Styling (`src/styles/index.css`)

## Runtime

**Environment:**
- Browser (client-side SPA) - No server runtime
- Google Apps Script runtime - For the Sheets API proxy (`scripts/gas-api.js`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- React ^19.1.0 - UI framework, functional components only
- React Router DOM ^7.6.0 - Client-side routing via `HashRouter`
- Tailwind CSS ^4.1.7 - Utility-first CSS (v4 with `@import "tailwindcss"` syntax)

**Testing:**
- Not detected - No test framework configured

**Build/Dev:**
- Vite ^6.3.5 - Dev server and production bundler (`vite.config.ts`)
- @vitejs/plugin-react ^4.5.2 - React Fast Refresh for Vite
- @tailwindcss/vite ^4.1.7 - Tailwind CSS Vite plugin (replaces PostCSS setup)
- TypeScript ~5.8.3 - Type checking (`tsc -b` runs before build)

## Key Dependencies

**Critical (3 runtime deps):**
- `react` ^19.1.0 - UI rendering
- `react-dom` ^19.1.0 - DOM bindings
- `react-router-dom` ^7.6.0 - Page routing (4 routes: `/plan`, `/track`, `/schedule`, `/weight`)

**Infrastructure (dev only):**
- `gh-pages` ^6.3.0 - Deployment to GitHub Pages
- `vite` ^6.3.5 - Build toolchain
- `tailwindcss` ^4.1.7 - CSS framework
- `typescript` ~5.8.3 - Type safety

## Configuration

**TypeScript** (`tsconfig.json`):
- Target: ES2022
- Module: ESNext with bundler resolution
- Strict mode enabled
- Path alias: `@/*` maps to `./src/*`
- `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` enabled

**Vite** (`vite.config.ts`):
- Plugins: `@vitejs/plugin-react`, `@tailwindcss/vite`
- Base path: `/eat-manager/` (for GitHub Pages deployment)

**Environment Variables** (`.env.example`):
- `VITE_GAS_URL` - Google Apps Script Web App URL (required for API)
- `VITE_SHEET_ID` - Google Sheet ID (for direct links)
- Type definitions in `src/env.d.ts`

**Tailwind CSS** (`src/styles/index.css`):
- v4 syntax using `@import "tailwindcss"` (no `tailwind.config.js` needed)
- Custom theme tokens: `--color-emerald-glow`, `--color-surface`, `--color-surface-raised`

## Build & Deploy

**Scripts** (`package.json`):
- `npm run dev` - Start Vite dev server
- `npm run build` - TypeScript check + Vite production build (`tsc -b && vite build`)
- `npm run preview` - Preview production build locally
- `npm run deploy` - Build and deploy to GitHub Pages via `gh-pages -d dist`

**Deployment Target:**
- GitHub Pages (static site)
- Uses `HashRouter` for SPA compatibility with static hosting
- Base path configured as `/eat-manager/`

## Platform Requirements

**Development:**
- Node.js (version not pinned, no `.nvmrc`)
- npm

**Production:**
- Static file hosting (GitHub Pages)
- Google Apps Script Web App (backend proxy for Google Sheets)
- No server-side runtime required

---

*Stack analysis: 2026-03-29*
