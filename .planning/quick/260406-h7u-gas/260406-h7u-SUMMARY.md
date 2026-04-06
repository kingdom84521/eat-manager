---
quick_id: "260406-h7u"
status: complete
commit: 88e637a
---

# Quick Task 260406-h7u: GAS 版本錯誤提醒條重新連接後不會消失

## Problem
GAS version mismatch banner (`gasBroken` state) was set on check failure but never cleared on success. After reconnecting in Settings, the red banner persisted.

## Solution
- Added `setGasBroken(false)` in the version check `.then()` success path
- Added `location.pathname` as a useEffect dependency so the check re-runs when navigating away from Settings

## Files Changed
- `src/App.tsx` — import `useLocation`, add success clear + pathname dependency
