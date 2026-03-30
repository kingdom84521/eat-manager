# Feature Landscape: Item Management & Supplement Routines

**Domain:** Food/supplement CRUD, composition-based nutrition, inventory tracking, deterministic routine generation
**Researched:** 2026-03-30
**Overall confidence:** HIGH (supplement metadata patterns verified via live app research; inventory formula verified via pharmacy literature; composition model verified via USDA/FDA guidance; routine generation patterns from SuppCo, SuppTrack, Supplements AI product research)

---

## Existing Features (Do Not Rebuild)

These features are already in production (v1.0). Listed here to clarify scope boundaries.

| Existing Feature | Location | Note |
|-----------------|----------|-------|
| Weight logging + chart | `WeightLog.tsx` | Complete |
| Supplement schedule view | `SupplementSchedule.tsx` | Static data only, no CRUD |
| Daily plan generator | `DailyPlan.tsx` | Random from hardcoded pools |
| Nutrition tracker page | `NutritionTracker.tsx` | Shell exists, empty data |
| BMR + TDEE calculation | `src/data/bmr.ts` | Full Mifflin-St Jeor |
| Dietary guideline presets (3 countries) | `src/data/dietary-guidelines.ts` | Complete |
| Settings page with Sheets config | `Settings.tsx` | Complete |
| SettingsService (localStorage schema) | `src/lib/settings-service.ts` | Versioned, complete |
| Google Apps Script proxy | `scripts/gas-api.js` | CRUD operations |

---

## Table Stakes

Features users expect from an item management + supplement tracking app. Missing any of these makes the app feel incomplete or untrustworthy.

### Food Management

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Add food via nutrition label | Every food logger (MyFitnessPal, Cronometer, FatSecret) allows direct macro entry | Low | Fields: name, serving description, cal, protein, fat, carbs, sodium. Optional: sugar, fiber |
| Edit existing food | Typos in nutrition data are common; no edit = broken trust | Low | Edit all fields; update derived composition values if food is used as ingredient |
| Delete food | Catalog hygiene; duplicate entries accumulate quickly | Low | Soft-delete or hard-delete; warn if food is used in a composed item |
| List/browse foods with search | Without search, a catalog of 20+ items is unusable | Low | Filter by name substring; existing `searchFoods()` pattern to follow |
| Per-serving calorie display | Users think in servings, not 100g | Low | Display as entered; always show serving description alongside numbers |
| Food type tags (optional) | Health tag association for future filtering | Low-Med | Reuse existing `HealthTag` union type from `types.ts` |

### Food Composition (Ingredient-Based Foods)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Create composed food from ingredients | Meal-prep and home-cooked foods cannot be entered as a single label; composition is the only accurate method | Med | One food item can declare `ingredients: { foodId, ratio }[]` where ratio is weight fraction |
| Dynamic calorie/macro recalculation on ratio change | If you change ingredient ratios the totals must update instantly | Med | `totalCal = sum(ingredient.cal * ratio)` — linear; same formula for all macros |
| Total nutrition preview before save | Users need to validate the composed result looks right before committing | Low | Show live-updating summary row while editing ingredient ratios |
| Add/remove ingredients freely | Composition is iterative; fixed ingredient count is a dealbreaker | Low | Dynamic list with add/remove buttons |

### Supplement Management

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Add supplement with name + dosage | Core tracking requirement; every supplement app (SuppTrack, CareClinic, Supplemate) starts here | Low | Fields: name (zh-TW + English optional), dose (amount + unit), dosage unit (mg/mcg/IU/g/capsule) |
| Health goal tags | Grouping by goal (sleep, inflammation, gut health) is standard in all 2025 supplement apps | Low | Reuse existing `HealthTag` system — exactly the right abstraction |
| Timing metadata | When to take a supplement affects absorption; "with food", "fasting", "before bed" is table stakes | Low | Enum: `"空腹" | "餐前" | "餐中" | "餐後" | "睡前" | "運動前" | "運動後"` |
| Caution / notes field | Side effects, contraindications, doctor notes belong here | Low | Free text; existing `RemedyItem.caution` field pattern |
| Edit + delete supplement | Same rationale as food edit/delete | Low | |
| Core vs optional flag | "Must take daily" vs "take as needed" distinction drives the routine generator | Low | Existing `RemedyItem.isCore` boolean — keep and formalize |

### Supplement Inventory

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Record purchase: total capsules/tablets | The only way to calculate "how many days left" | Low | Input: total count purchased. Example: "120 capsules" |
| Record serving size (capsules per dose) | Combined with purchase quantity and daily dose frequency, this yields days remaining | Low | Input: capsules per dose. Example: "2 capsules per dose" |
| Record daily dose frequency | How many times per day the supplement is taken | Low | Input: doses per day. Example: "1x daily", "2x daily" |
| Days remaining calculation | `daysRemaining = totalCapsules / (capsulesPerDose × dosesPerDay)` — standard pharmacy formula | Low | Computed field, not stored. Show as integer. Formula: `floor(remaining / (serving * freq))` |
| Current capsules remaining | Track consumption: `remaining = purchased - (daysConsumed × capsulesPerDose × dosesPerDay)` | Low-Med | Store `purchasedAt` date + `totalCapsules`; derive remaining from daily log OR use last-purchase anchor |
| Low stock visual indicator | Users need to reorder before they run out; visual warning is expected | Low | Threshold: ≤ 14 days remaining → amber warning; ≤ 7 days → red alert |

### Supplement Routine Generation

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Generate daily routine from all active supplements | The core value proposition of the supplement tracking screen | Med | Group all active (non-out-of-stock) supplements by their timing metadata |
| Cover all health goals | The routine should include at least one supplement per health goal tag the user has active supplements for | Med | Goal-coverage check: iterate tags, verify ≥1 supplement per tag appears in routine |
| Deterministic output for same inputs | Same supplement catalog + same date = same routine; no randomness | Med | Sort by: timing slot → isCore first → alphabetical. No random selection |
| Timing-grouped schedule display | Show routine as time slots: 空腹 / 餐前 / 餐中 / 餐後 / 睡前 etc. | Low | Reuse existing `ScheduleSlot` concept; rename and adapt |
| Exclude out-of-stock supplements | Do not include supplements with 0 days remaining in the routine | Low | Filter step before grouping |
| Mark taken / skip for today | Basic compliance tracking; expected by all tracking apps | Low | Boolean per supplement per date; store in `SupplementLogEntry.takenIds` (already exists) |

---

## Differentiators

Features that set this app apart. Not universally expected, but meaningfully valued.

### Food

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Public nutrition database lookup (USDA FoodData Central) | Users don't know the calories in 7-11 chicken breast by heart; search-to-import removes manual entry friction | High | USDA FoodData Central is free, public domain, CC0 1.0. API rate limit: 1,000 req/hr. Requires API key (free). CRITICAL: static site cannot embed full DB; must call API live. Offline fallback = manual entry. Confidence: HIGH |
| Ingredient ratio normalization | If ratios don't sum to 1.0, normalize automatically and show user the adjustment | Low | Prevents "101% total" silent error |
| Composition yield factor (cooking weight loss) | Chicken breast loses ~25% weight when cooked; raw-to-cooked conversion prevents systematic overestimation | High | USDA publish yield factors per food. This is a deep nutrition science rabbit hole — defer unless needed. Complexity is HIGH |
| Duplicate food detection | Warn when a new food name is similar to an existing one (Levenshtein distance ≥ 80%) | Med | Prevents accumulation of "Chicken breast" / "雞胸肉" / "chicken breast (cooked)" variants |
| Synergy display between supplements | "Vitamin D and Magnesium work better together" — pairing hints visible in supplement detail | Med | Hardcode known synergies (D+Mg, K2+D, Omega-3+D, Curcumin+Black Pepper). Do not use external API |
| Known interaction warnings | "Calcium blocks iron absorption — separate by 2 hours" | Med | Hardcode ~20 critical pairs. Free Supplement Stack Checker covers 44 supplements, 40+ pairs — use as reference. Examples: Ca+Fe (absorption -60%), Zn+Cu (compete), Fe+polyphenols |
| Days-until-reorder suggestion | "You'll run out on April 15 — buy by April 8 to avoid a gap" | Low | `runOutDate = today + daysRemaining`; suggest reorder 7 days early |
| Supplement cycle management | Some supplements (Creatine: 5g/day for 4-6 weeks then deload; Ashwagandha: 8-12 weeks on / 4 weeks off) have protocols | High | Implement loading/deload phases. High complexity, niche audience. Defer to v3 |

### Routine Generation

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Goal-coverage summary ("Coverage: 8/11 health goals covered") | Gamification signal that motivates users to fill gaps in their supplement stack | Low | Count distinct HealthTags across active supplements vs total tags user has supplements for |
| Routine comparison: today vs yesterday | Show which supplements were added or removed from yesterday's routine (driven by stock/activation changes) | Low-Med | Diff two generated routines |
| Routine export as text (for sharing with doctor/dietitian) | Clinical visits benefit from a plain-text summary | Low | Plain text list: name, dose, timing, health goal |

---

## Anti-Features

Features to deliberately NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Barcode scanning | Requires camera API, ML model, or third-party barcode DB API. Adds native app complexity to a static SPA | USDA FoodData Central text search covers the same need; barcode is a future native wrapper milestone |
| AI/LLM nutrition analysis | Streaming API calls, API cost, server keys — incompatible with static SPA constraint | Use deterministic rule-based logic for interactions and routine generation |
| Drug-supplement interaction checker (pharmaceutical-grade) | Requires licensed database (Natural Medicines costs ~$1,500/yr) or NLP over medical literature | Hardcode the ~20 most common interactions as static data; flag complex cases as "consult pharmacist" |
| Recipe scaling (2x, 0.5x servings) | Composition ratio math already handles this via serving size; a separate scale feature adds UI complexity with minimal payoff | Users can duplicate a food item and adjust ratios |
| Meal planning calendar (schedule food intake by day) | This is a separate feature domain; the existing DailyPlan page handles meal selection; merging them creates scope creep | Keep DailyPlan and food CRUD as separate concerns |
| Supplement reminders / push notifications | Static SPA cannot receive push; browser notifications require service worker + user permission + re-engagement flow | Show routine schedule as a screen reference; reminders are a PWA milestone |
| Community/shared supplement stacks | Requires accounts, moderation, social features — incompatible with single-user static app architecture | Single-user catalog; sharing via export text only |
| Automatic nutrient tracking from supplement list | Supplement micronutrient amounts (e.g., "Magnesium 200mg") against BMR targets requires a micronutrient database, not just macros | Defer to a future "micronutrient profile" milestone |
| Multiple inventory bottles per supplement | Tracking multiple open bottles of the same supplement adds bookkeeping complexity users don't need | One active bottle per supplement; user replaces when restocking |
| BehaviorItem type | PROJECT.md explicitly removes this type | Delete BehaviorItem entirely; migrate any existing behavior IDs out of schedule data |

---

## Feature Dependencies

```
Food CRUD (label input)
  └─ Required by: Food composition (ingredients reference food IDs)
  └─ Required by: Nutrition tracking page (logs food consumption)
  └─ Required by: Daily plan generator (plan items reference food IDs)

Food composition
  └─ Requires: Food CRUD (at least some ingredient foods must exist first)
  └─ Requires: Ratio → calorie math (linear: sum of ingredient.cal × ratio)
  └─ Data model: FoodItem gains optional `ingredients: { foodId: string, ratio: number }[]`
     When present, cal/protein/fat/carbs are DERIVED not stored

USDA FoodData Central lookup (differentiator)
  └─ Requires: Network access (no offline fallback)
  └─ Falls back to: Manual label entry (always available)
  └─ Provides: Pre-filled nutrition label data → feeds Food CRUD save

Supplement CRUD
  └─ Required by: Inventory management (no item = no inventory)
  └─ Required by: Routine generator (items must exist to be scheduled)
  └─ Reuses: HealthTag system from types.ts (no new type needed)
  └─ Extends: RemedyItem pattern (timing, isCore, caution already present)

Supplement inventory
  └─ Requires: Supplement CRUD (item must exist)
  └─ Provides to: Routine generator (out-of-stock filter)
  └─ Provides to: Low-stock UI indicator
  └─ Formula: daysRemaining = floor(totalCapsules / (capsulesPerDose × dosesPerDay))
  └─ Tracks: purchasedAt date, totalCapsules, capsulesPerDose, dosesPerDay
  └─ Derives: remainingCapsules from log (or uses purchase anchor if no log)

Supplement routine generator
  └─ Requires: Supplement CRUD (items with timing metadata)
  └─ Requires: Inventory state (to exclude out-of-stock items)
  └─ Algorithm: Filter active → group by timing → sort isCore first → alphabetical within group
  └─ Goal coverage: count distinct HealthTags covered by active supplements
  └─ Output: deterministic — same inputs always produce same routine

Supplement log (taken/skipped)
  └─ Requires: Routine generator (need a routine to mark items against)
  └─ Uses: Existing SupplementLogEntry type in types.ts (takenIds, skippedIds)

Interaction warnings (differentiator)
  └─ Requires: Supplement CRUD (need item list to check pairs)
  └─ Implementation: Static lookup table of ~20 known pairs; O(n²) scan on catalog
  └─ No external API required

Data model restructure (prerequisite for everything)
  └─ Remove: BehaviorItem type
  └─ Rename/extend: RemedyItem → SupplementItem (add inventory fields)
  └─ Extend: FoodItem (add optional ingredients array)
  └─ Update: ScheduleSlot references (remove behavior IDs)
```

---

## Composition Model: How It Works

The most technically nuanced feature. Documented here for roadmap accuracy.

### Data Model

```typescript
// Extended FoodItem (new fields)
interface FoodItem {
  // ... existing fields unchanged ...
  ingredients?: IngredientRef[]; // present = composed food; absent = label food
}

interface IngredientRef {
  foodId: string;   // references another FoodItem (leaf, no nested composition)
  ratio: number;    // weight fraction 0-1; all ratios must sum to 1.0
}
```

### Calculation

```typescript
// When ingredients present, all macro fields are DERIVED (never stored)
function deriveNutrition(food: FoodItem, allFoods: Map<string, FoodItem>): MacroGrams {
  if (!food.ingredients) return { cal: food.cal, protein: food.protein, fat: food.fat, carbs: food.carbs };
  return food.ingredients.reduce((acc, ing) => {
    const source = allFoods.get(ing.foodId);
    if (!source) return acc;
    return {
      cal:     acc.cal     + source.cal     * ing.ratio,
      protein: acc.protein + source.protein * ing.ratio,
      fat:     acc.fat     + source.fat     * ing.ratio,
      carbs:   acc.carbs   + source.carbs   * ing.ratio,
    };
  }, { cal: 0, protein: 0, fat: 0, carbs: 0 });
}
```

### Constraints

- No recursive composition (ingredient cannot itself be composed). Enforced at save time.
- Ratios must sum to 1.0 ± 0.001. Normalize automatically and warn user.
- If an ingredient food is deleted, composed food is flagged as broken (show warning, don't auto-delete).
- Serving size of composed food is independent — user defines it (e.g., "1 bowl", "300g").

---

## Inventory Model: How It Works

Standard pharmacy days-supply formula adapted for supplements.

### Data Model

```typescript
interface SupplementInventory {
  supplementId: string;
  totalCapsules: number;       // total purchased in this bottle
  capsulesPerDose: number;     // serving size (e.g., 2 capsules)
  dosesPerDay: number;         // frequency (e.g., 1 = once daily, 2 = twice daily)
  purchasedAt: string;         // ISO date, used as consumption anchor
  // DERIVED (never stored):
  // daysRemaining = floor(totalCapsules / (capsulesPerDose * dosesPerDay))
  // runOutDate = addDays(purchasedAt, daysRemaining)
  // capsuleConsumed = daysSincePurchase * capsulesPerDose * dosesPerDay
  // capsulesLeft = totalCapsules - capsuleConsumed
}
```

### Days Remaining Formula

```
daysRemaining = floor(totalCapsules / (capsulesPerDose × dosesPerDay))
```

Example: 120 capsules, 2 per dose, once daily → floor(120 / (2 × 1)) = 60 days

### Simplification Decision

Use purchase date as anchor (time-based consumption) rather than actual log-based tracking. Rationale: requiring users to mark every dose before inventory updates creates friction; time-based calculation is "good enough" and matches how pharmacy apps work. If user skips days, the estimate will be conservative (shows more remaining than reality) — an acceptable error direction.

---

## Routine Generation Algorithm: How It Works

Deterministic means: same supplement catalog on same date always produces same output.

### Algorithm

```
1. Load all supplements from localStorage
2. Filter: remove out-of-stock (daysRemaining == 0)
3. Filter: remove any user-deactivated supplements
4. Group by timing slot (空腹 → 餐前 → 餐中 → 餐後 → 睡前 → 運動前 → 運動後)
5. Within each timing slot: sort isCore first, then alphabetical by name
6. Output: timing-keyed object { "空腹": [...], "餐後": [...], ... }
7. Coverage report: collect all HealthTags across output items, count distinct tags
```

### Why Deterministic (Not Random)

- Users need to trust their routine is complete. Randomness creates anxiety ("did I miss something today?").
- The existing `DailyPlan` page uses random selection for food variety — correct for meals. Wrong for supplements.
- Coverage guarantee: deterministic output means every active supplement appears every day. No missing days for any health goal.
- This aligns with SuppCo, SuppTrack, CareClinic patterns: supplement routines are schedules, not random selections.

### Interaction Checking (Post-Generation)

After routine is generated, run a pairwise scan against the interaction table. Flag conflicts with the same timing slot (e.g., Calcium + Iron both at 餐後 → warn to separate). Suggestion: display inline warning under the conflicting timing group.

---

## MVP Recommendation

**Minimum viable item management that is not embarrassing:**

Priority 1 — Data model restructure (blocks everything):
1. Remove `BehaviorItem` type; update all references
2. Extend `FoodItem` with optional `ingredients` array
3. Extend `RemedyItem` → formalize as `SupplementItem` with inventory fields
4. Migrate existing hardcoded foods/supplements to new model

Priority 2 — Core CRUD (without CRUD the catalog is static):
5. Food CRUD: add/edit/delete via nutrition label form
6. Supplement CRUD: add/edit/delete with timing + isCore + health tags

Priority 3 — Composition + inventory (the differentiated features):
7. Food composition: add ingredient refs + live calorie derivation
8. Supplement inventory: purchased quantity + days remaining display + low-stock alert

Priority 4 — Routine generation (the flagship feature):
9. Supplement routine generator: deterministic, timing-grouped, goal-coverage summary
10. Mark taken/skip per supplement per day

**Defer to v2.1:**
- USDA FoodData Central lookup (needs API key management, network error handling)
- Interaction warnings (needs hardcoded interaction table)
- Days-until-reorder suggestion
- Routine export as text

---

## Phase-Specific Complexity Notes

| Feature | Phase Risk | Reason |
|---------|-----------|--------|
| Data model restructure | HIGH | Touches every existing module: types.ts, foods.ts, remedies.ts, schedule.ts, resolver.ts, data-service.ts, DailyPlan.tsx, SupplementSchedule.tsx — all need migration |
| Food composition (nested refs) | MED | Linear math is simple; UI for ratio editing (add/remove ingredients, live preview) takes careful component design |
| Inventory days calculation | LOW | Formula is 3 lines; UI is a progress bar + number display |
| Routine generator | LOW-MED | Algorithm is a filter+group+sort; complexity is in the UI (timing-grouped list + coverage indicator) |
| USDA DB lookup | HIGH | Network dependency on static site; API key in env var; rate limiting; search result disambiguation; offline fallback state management |
| Interaction warnings | MED | Requires curating ~20 pairs (research needed); O(n²) scan is trivial at catalog scale |

---

## Sources

- [USDA FoodData Central API — free, public domain CC0 1.0](https://fdc.nal.usda.gov/api-guide/)
- [Open Food Facts API — open database with offline exports](https://openfoodfacts.github.io/openfoodfacts-server/api/)
- [SuppCo supplement stack optimizer](https://supp.co/)
- [SuppTrack — goal-based supplement stacks](https://supptrack.app/)
- [Supplements AI — timing optimization and interaction detection](https://supplements-ai.com/)
- [CareClinic supplement tracker features](https://careclinic.io/supplement-tracker/)
- [Pharmacy days supply formula — ISBE reference](https://www.isbe.net/CTEDocuments/HST-690049.pdf)
- [MDTools day supply calculator — formula reference](https://mdtools.org/day-supply-calculator)
- [Free Supplement Stack Checker — open-source interaction pairs reference](https://dev.to/botanica_andina/i-built-a-free-supplement-interaction-checker-heres-what-i-learned-about-dangerous-combinations-2bkh)
- [USDA recipe nutrition calculation methodology](https://www.ars.usda.gov/ARSUserFiles/80400525/Articles/ndbc26_recipe.pdf)
- [FDA guidance on nutrition database development](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-industry-guide-developing-and-using-data-bases-nutrition-labeling)
- [ScienceDirect — recipe-based diet planning system architecture](https://pubmed.ncbi.nlm.nih.gov/7547833/)
