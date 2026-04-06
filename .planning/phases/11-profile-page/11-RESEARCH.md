# Phase 11: Profile Page - Research

**Researched:** 2026-04-06
**Domain:** React SPA — profile page, localStorage settings migration, component extraction
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Extend `UserProfile` interface in `src/data/types.ts` with optional `displayName: string` and `initials: string` fields
- **D-02:** Bump `settings_version` to 3 in `SettingsService`; migration v2→v3 sets `displayName` and `initials` to empty string (not null) for existing profiles
- **D-03:** SettingsService gets `getDisplayProfile()` convenience method returning `{ displayName, initials }` for drawer footer consumption
- **D-04:** Extract WeightLog page body into a reusable section component (e.g., `WeightSection`) that the Profile page imports — keeps code DRY
- **D-05:** The `/weight` route is removed from App.tsx routes and SidebarDrawer; direct URL `/weight` should redirect to `/profile`
- **D-06:** WeightSection receives no extra props beyond what it fetches internally (same self-contained pattern as current WeightLog)
- **D-07:** Avatar is a circle with user's initials text (1-2 characters), `bg-slate-700` background — consistent with existing drawer stub styling
- **D-08:** When no initials are set, show 👤 fallback (matching current drawer behavior)
- **D-09:** Drawer footer replaces hardcoded 👤 and "使用者" with real initials circle and displayName from SettingsService
- **D-10:** Top section: avatar circle (large, centered) + display name + initials edit form
- **D-11:** Below: weight log section (absorbed WeightSection component)
- **D-12:** Page uses same `px-4 pt-5` pattern as other pages; dark theme tokens consistent with existing UI

### Claude's Discretion

- Avatar circle size on Profile page (likely 64-80px for the hero display vs 28px in drawer)
- Form layout for display name and initials editing (inline edit vs separate form fields)
- Whether to show a "save" button or auto-save on blur for name/initials fields
- Transition/animation when drawer footer updates with new name

### Deferred Ideas (OUT OF SCOPE)

- **PROF-04**: Custom avatar image upload — deferred to future milestone per REQUIREMENTS.md
- **PROF-05**: BMR summary and macro targets display on profile — deferred to future milestone
- NutritionTracker `/track` redirect timing — to be resolved in Phase 12 planning
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROF-01 | Profile page accessible from drawer bottom (avatar+name) | Drawer footer NavLink to `/profile` already exists in SidebarDrawer.tsx lines 71-80; replacing stub content enables it |
| PROF-02 | Profile page includes weight log (moved from standalone page) | WeightLog.tsx is 109 lines, fully self-contained; extract as WeightSection component, remove `/weight` route |
| PROF-03 | Placeholder avatar image displayed | Avatar circle with initials text (or 👤 fallback) satisfies this; no image upload needed |
</phase_requirements>

## Summary

Phase 11 delivers a Profile page that replaces the current `ProfilePlaceholder.tsx` stub with a functional page containing: (1) an avatar circle with editable initials + display name, and (2) the weight log section absorbed from the retired standalone `/weight` page. The drawer footer updates to show real profile data.

All technical patterns in this phase are direct extensions of existing code. The `SettingsService` already has a proven v1→v2 migration pattern; extending it to v3 follows the identical structure. `WeightLog.tsx` is fully self-contained at 109 lines and requires only renaming from a page component to a section component (no prop changes needed, per D-06). The `SidebarDrawer.tsx` footer already has the NavLink to `/profile` with the avatar stub — it just needs to read from `SettingsService.getDisplayProfile()` instead of hardcoded values.

The only discretionary design decisions are avatar sizing on the Profile hero display (recommend 80px circle / `w-20 h-20`) and whether to auto-save on blur vs explicit save button (recommend auto-save on blur — consistent with the app's no-save-button pattern seen in Settings page form fields).

**Primary recommendation:** Implement in three sequential tasks: (1) types + migration + SettingsService, (2) WeightSection extraction + Profile page, (3) SidebarDrawer footer update + route cleanup.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.1.0 | Functional components, useState, useEffect | Project stack |
| React Router DOM | ^7.6.0 | Route definitions, Navigate redirect | Project stack — HashRouter in use |
| Tailwind CSS | ^4.1.7 | Utility classes, dark theme tokens | Project stack |

### No New Dependencies

This phase requires zero new packages. All patterns use existing project libraries.

## Architecture Patterns

### Recommended Project Structure (changes only)

```
src/
├── components/
│   └── WeightSection.tsx   # NEW — extracted from WeightLog.tsx
├── pages/
│   ├── Profile.tsx          # NEW — replaces ProfilePlaceholder.tsx
│   └── WeightLog.tsx        # REMOVE — content moved to WeightSection
├── data/
│   └── types.ts             # EXTEND — add displayName, initials to UserProfile
└── lib/
    └── settings-service.ts  # EXTEND — migration v2→v3, getDisplayProfile()
```

### Pattern 1: Settings Version Migration

**What:** The `migrate()` function in `settings-service.ts` applies sequential version upgrades. Each `if (version === N)` block upgrades N→N+1 and falls through to the next check.

**When to use:** Any time a new field is added to `AppSettings` or `UserProfile`.

**Exact migration pattern to add (v2→v3):**

```typescript
// In migrate() function, after the version === 1 block:
if (version === 2) {
  const profile = data.userProfile as Record<string, unknown> | null;
  if (profile) {
    if (typeof profile.displayName !== "string") profile.displayName = "";
    if (typeof profile.initials !== "string") profile.initials = "";
  }
  data.settings_version = 3;
  version = 3;
}

if (version === 3) {
  // Current schema version — no migration needed
  return data as unknown as AppSettings;
}
```

**Also update `defaultSettings()`:** bump `settings_version: 2` to `settings_version: 3`.

### Pattern 2: WeightSection Extraction

**What:** WeightLog.tsx becomes `src/components/WeightSection.tsx`. The component is renamed from `WeightLog` to `WeightSection`, the `export default` changes to `export function WeightSection`, and the header (h1 "⚖️ 體重紀錄") is removed — the Profile page provides its own section heading.

**When to use:** The WeightLog page currently has `useNavigate` for the "前往設定" button redirect. This stays as-is; WeightSection can still navigate internally. No prop interface needed.

**Key point:** WeightSection continues to call `SettingsService.getUserProfile()` internally (D-06). If profile is null, it shows the "請先完成個人設定" message with a navigate-to-settings button — same as current behavior.

### Pattern 3: Avatar Circle Component (inline sub-component)

**What:** An inline sub-component within Profile.tsx (following the project pattern of sub-components in same file as parent — see TagBadge in DailyPlan.tsx).

**Recommended implementation:**

```tsx
// Inline in Profile.tsx
function AvatarCircle({ initials, size }: { initials: string; size: "sm" | "lg" }) {
  const dim = size === "lg" ? "w-20 h-20 text-2xl" : "w-7 h-7 text-xs";
  return (
    <div className={`${dim} rounded-full bg-slate-700 flex items-center justify-center`}>
      {initials ? initials.toUpperCase().slice(0, 2) : "👤"}
    </div>
  );
}
```

The drawer footer reuses the same pattern inline (no shared component needed — drawer already has the `w-7 h-7` circle div).

### Pattern 4: getDisplayProfile() Convenience Method

**What:** New method on `SettingsService` that reads profile and returns display fields only, safe to call when profile is null.

```typescript
/** 取得顯示名稱與縮寫，供抽屜頁尾使用。未設定時回傳空字串。(per D-03) */
getDisplayProfile(): { displayName: string; initials: string } {
  const profile = loadSettings().userProfile;
  return {
    displayName: profile?.displayName ?? "",
    initials: profile?.initials ?? "",
  };
},
```

### Pattern 5: Auto-save on Blur (Recommended for Claude's Discretion)

**What:** Name/initials fields save immediately on `onBlur`. No save button. Consistent with the existing Settings page pattern where fields save on blur/submit without an explicit confirmation step.

**Why:** The app stores everything in localStorage with no server round-trip. Auto-save on blur gives instant persistence with zero UI chrome. A save button would be inconsistent with existing UX.

```tsx
const handleBlur = () => {
  const profile = SettingsService.getUserProfile();
  if (!profile) return;
  SettingsService.saveUserProfile({ ...profile, displayName, initials });
};
```

**Drawer footer update:** After saving, the drawer footer reads the updated value on next render via `SettingsService.getDisplayProfile()`. No cross-component event system needed — drawer re-reads on every open.

### Pattern 6: Route Replacement in App.tsx

**What:** `/weight` route becomes a `<Navigate>` redirect; `ProfilePlaceholder` import replaced with `Profile`.

```tsx
// Remove:
import WeightLog from "./pages/WeightLog";
import ProfilePlaceholder from "./pages/ProfilePlaceholder";

// Add:
import Profile from "./pages/Profile";

// In Routes, replace:
<Route path="/weight" element={<WeightLog />} />
<Route path="/profile" element={<ProfilePlaceholder />} />

// With:
<Route path="/weight" element={<Navigate to="/profile" replace />} />
<Route path="/profile" element={<Profile />} />
```

### Pattern 7: Drawer Footer with Real Profile Data

**What:** `SidebarDrawer.tsx` reads from `SettingsService.getDisplayProfile()` to replace the hardcoded stub.

**Key consideration:** `SidebarDrawer.tsx` currently has no imports from `SettingsService`. Adding it introduces a dependency from a component into the service layer — this is the established pattern (WeightLog.tsx already does this). No state needed; the drawer reads fresh from localStorage on each render.

```tsx
// Add import at top of SidebarDrawer.tsx:
import { SettingsService } from "../lib/settings-service";

// Inside SidebarDrawer component:
const { displayName, initials } = SettingsService.getDisplayProfile();

// Footer avatar+name:
<div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs">
  {initials ? initials.toUpperCase().slice(0, 2) : "👤"}
</div>
<span className="text-sm">{displayName || "使用者"}</span>
```

### Anti-Patterns to Avoid

- **Storing `initials` as derived from `displayName` at save time:** Do not auto-compute initials from the display name. The user sets them explicitly (they may want "小明" not "張" as their initials). Store both independently.
- **Adding props to WeightSection for profile data:** WeightSection must remain self-contained (D-06). It reads from SettingsService internally.
- **Global state / Context API for profile updates:** The drawer simply re-reads from localStorage on open. No pub/sub or context needed for a single-user local app.
- **Leaving `WeightLog.tsx` in place:** The file should be deleted after extraction — `noUnusedLocals` is enforced and the old file would create dead code.
- **Adding navigation to SidebarDrawer for `/weight`:** The `/weight` route is retired. No drawer link for weight — it lives inside Profile now.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Focus trap in drawer | Custom focus management | @headlessui/react Dialog (already in use) | Phase 10 already solved this |
| Settings persistence | Custom storage wrapper | Existing `readRaw()`/`writeRaw()` pattern in settings-service.ts | Existing try/catch localStorage wrapper handles failures |
| Route redirects | Custom redirect component | React Router `<Navigate to="/profile" replace />` | Built-in, handles history correctly |
| Initials truncation | Custom string parser | `.toUpperCase().slice(0, 2)` | Sufficient for 1-2 char initials |

**Key insight:** This phase is almost entirely wiring existing code into new shapes. There are no novel engineering problems to solve.

## Common Pitfalls

### Pitfall 1: TypeScript strict mode — optional fields on UserProfile

**What goes wrong:** Adding `displayName?: string` and `initials?: string` as optional fields means every existing call to `SettingsService.saveUserProfile(profile)` passes a `UserProfile` that may be missing the new fields. TypeScript will accept this (they're optional), but the migration must set them to `""` so subsequent reads don't get `undefined`.

**Why it happens:** Optional fields in TypeScript (`field?: string`) are `string | undefined`, not `string`. The migration sets them to `""` to make `getDisplayProfile()` return predictable strings without null-checks throughout the UI.

**How to avoid:** After adding the fields, verify `migrate()` explicitly sets `profile.displayName = ""` and `profile.initials = ""` for existing profiles (v2→v3 step). Also update `defaultSettings()` so new installations start with `settings_version: 3` and `userProfile: null` (profile is null until user sets up settings — the null check in WeightSection handles this).

**Warning signs:** TypeScript error `Type 'string | undefined' is not assignable to type 'string'` in getDisplayProfile if the fields are `?: string` and the return type is `{ displayName: string; initials: string }`.

### Pitfall 2: Drawer footer reads stale profile data

**What goes wrong:** User edits their name on Profile page, closes the page, reopens the drawer — drawer still shows "使用者".

**Why it happens:** If `SidebarDrawer` calls `SettingsService.getDisplayProfile()` at module level (outside the component function), it captures the value once.

**How to avoid:** Call `SettingsService.getDisplayProfile()` inside the `SidebarDrawer` component body (not at module level). Since `SidebarDrawer` re-renders on open (Dialog animates in), it will read the fresh localStorage value each time the drawer opens.

**Warning signs:** Display name updates on Profile page don't appear in the drawer footer on the same session.

### Pitfall 3: WeightLog.tsx import still referenced after removal

**What goes wrong:** `App.tsx` still imports `WeightLog` after the route is replaced. TypeScript `noUnusedLocals` will cause a build failure.

**Why it happens:** Import cleanup is easy to miss when replacing a route.

**How to avoid:** Remove the `import WeightLog from "./pages/WeightLog"` line from App.tsx in the same task that removes the `/weight` route. Also delete `ProfilePlaceholder.tsx` and its import when replacing with `Profile.tsx`.

**Warning signs:** `tsc -b` fails with "WeightLog is declared but never read" or similar.

### Pitfall 4: WeightSection `useNavigate` removed prematurely

**What goes wrong:** WeightSection still has the "前往設定" fallback when `getUserProfile()` returns null. This uses `useNavigate()`. If someone removes it thinking "Profile page always has a profile", the null path breaks silently.

**Why it happens:** When embedded in Profile.tsx, one might assume the profile is always available. But the user could visit `/profile` before completing Settings setup.

**How to avoid:** Keep the `useNavigate` + "前往設定" button in WeightSection exactly as in the current WeightLog.tsx. The null guard is valid and necessary.

## Code Examples

Verified patterns from existing codebase:

### UserProfile interface extension (src/data/types.ts)

```typescript
/** 使用者基本資料，用於 BMR 計算 */
export interface UserProfile {
  /** 生日（ISO 格式 YYYY-MM-DD） */
  birthday: string;
  sex: "male" | "female";
  /** 身高（公分） */
  heightCm: number;
  /** 體重（公斤） */
  weightKg: number;
  activityLevelId: ActivityLevelId;
  /** 顯示名稱（選用） */
  displayName?: string;
  /** 縮寫（1-2 字，選用） */
  initials?: string;
}
```

### Profile page structure (src/pages/Profile.tsx)

```tsx
import { useState } from "react";
import { SettingsService } from "../lib/settings-service";
import { WeightSection } from "../components/WeightSection";

// Inline sub-component
function AvatarCircle({ initials, size }: { initials: string; size: "sm" | "lg" }) {
  const dim = size === "lg" ? "w-20 h-20 text-2xl" : "w-7 h-7 text-xs";
  return (
    <div className={`${dim} rounded-full bg-slate-700 flex items-center justify-center`}>
      {initials ? initials.toUpperCase().slice(0, 2) : "👤"}
    </div>
  );
}

export default function Profile() {
  const { displayName: savedName, initials: savedInitials } = SettingsService.getDisplayProfile();
  const [displayName, setDisplayName] = useState(savedName);
  const [initials, setInitials] = useState(savedInitials);

  const handleBlur = () => {
    const profile = SettingsService.getUserProfile();
    if (!profile) return;
    SettingsService.saveUserProfile({ ...profile, displayName, initials });
  };

  return (
    <div className="px-4 pt-5">
      {/* Avatar hero */}
      <div className="flex flex-col items-center mb-6">
        <AvatarCircle initials={initials} size="lg" />
        <p className="text-slate-400 text-xs mt-2">{displayName || "未設定名稱"}</p>
      </div>

      {/* Edit form */}
      <div className="bg-slate-800/50 rounded-xl p-4 mb-6 space-y-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">顯示名稱</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onBlur={handleBlur}
            placeholder="輸入名稱"
            className="w-full bg-slate-800 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">縮寫（1-2 字）</label>
          <input
            value={initials}
            onChange={(e) => setInitials(e.target.value.slice(0, 2))}
            onBlur={handleBlur}
            maxLength={2}
            placeholder="縮寫"
            className="w-full bg-slate-800 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Weight section */}
      <WeightSection />
    </div>
  );
}
```

### Settings version constants (after migration)

```typescript
function defaultSettings(): AppSettings {
  return {
    settings_version: 3,   // bumped from 2
    userProfile: null,
    activeGuidelineId: null,
    sheetsConfig: null,
  };
}
```

## Environment Availability

Step 2.6: SKIPPED — This phase is purely code changes within the existing static SPA. No external tools, services, or CLI utilities beyond the project's existing npm/Node.js stack.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded 👤 stub in drawer footer | Real initials from SettingsService | Phase 11 | Drawer shows actual user identity |
| Standalone `/weight` route | Weight log inside `/profile` | Phase 11 | One fewer route, consolidated personal area |
| ProfilePlaceholder.tsx (empty) | Full Profile.tsx page | Phase 11 | PROF-01, PROF-02, PROF-03 satisfied |

## Open Questions

1. **Initials character set**
   - What we know: The UI is zh-TW; users may enter Chinese characters as initials (e.g., "小明" → "小明" as 2-char initials)
   - What's unclear: Chinese characters render fine in a Tailwind `text-xs` circle at 28px but may overflow at 2 characters in some fonts
   - Recommendation: Use `text-xs` for the small circle (same as current stub), `text-2xl` for the large circle. `.slice(0, 2)` is correct for both ASCII and Unicode chars. Accept the slight visual risk; no special handling needed for v3.0.

2. **Profile page section heading**
   - What we know: WeightSection extracts the body of WeightLog without the h1 header
   - What's unclear: Whether WeightSection should have its own `<h2>` heading within the Profile page layout
   - Recommendation: Add `<h2 className="text-sm font-bold text-slate-400 mb-3">體重紀錄</h2>` before `<WeightSection />` in Profile.tsx — consistent with how other pages label their sections.

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/lib/settings-service.ts` — migration pattern, v1→v2, `loadSettings()`, `writeRaw()`
- Direct code inspection: `src/pages/WeightLog.tsx` — full component structure, props, internal state
- Direct code inspection: `src/components/SidebarDrawer.tsx` — footer lines 70-89, existing NavLink to `/profile`
- Direct code inspection: `src/data/types.ts` lines 329-338 — `UserProfile` interface
- Direct code inspection: `src/App.tsx` — route definitions, existing `/weight` and `/profile` routes
- Direct code inspection: `src/pages/ProfilePlaceholder.tsx` — 8-line stub to be replaced

### Secondary (MEDIUM confidence)
- Project CONTEXT.md — locked decisions D-01 through D-12 (authoritative for this phase)
- Project CLAUDE.md — TypeScript strict mode constraints, noUnusedLocals enforcement, naming conventions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all patterns read directly from existing source files
- Architecture: HIGH — extraction pattern (WeightSection) is straightforward, migration pattern is copied from existing v1→v2
- Pitfalls: HIGH — TypeScript strict mode + noUnusedLocals pitfalls are deterministic given the constraints

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable codebase, no external API changes)
