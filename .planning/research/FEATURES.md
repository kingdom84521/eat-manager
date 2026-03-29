# Feature Landscape: Nutrition/BMR Settings

**Domain:** Health/nutrition SPA settings — BMR configuration, dietary guidelines, Google Sheets connection
**Researched:** 2026-03-29
**Overall confidence:** HIGH (BMR/formula accuracy verified via PubMed + NASM + official DRI docs; dietary guideline numbers from official government sources; UX patterns verified via NNGroup + IxDF)

---

## Table Stakes

Features users expect. Missing = settings page feels broken or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Age, sex, height, weight inputs | Every BMR calculator since Harris-Benedict (1919) collects these four | Low | Sex input needs Male/Female minimum; non-binary option is a differentiator |
| Activity level selector | TDEE = BMR × activity multiplier; without it the output is clinically useless | Low | 5-level scale is standard: Sedentary (×1.2), Light (×1.375), Moderate (×1.55), Very active (×1.725), Extra active (×1.9) — from Harris-Benedict/Mifflin convention |
| Calorie target output (TDEE) | The number users came to see; burying it makes the whole flow pointless | Low | Display as kcal/day rounded to nearest 10 |
| Macronutrient gram targets | Calorie-only display is table stakes in 2020; users expect carbs/protein/fat grams | Low-Med | Derived from TDEE × guideline ratio ÷ kcal-per-gram (carb/protein=4, fat=9) |
| At least 2 guideline presets | Single-preset implies the app has an agenda; users expect choice | Med | Minimum viable: one East-Asian guideline (Taiwan/Japan), one Western (USDA/AMDR) |
| Preset label with authority source | Users distrust macro numbers without knowing "who says so" | Low | Display guideline name + issuing body (e.g., "台灣衛福部 DRI 2020") |
| Settings persisted across sessions | Re-entering height/weight every visit is a dealbreaker | Low | localStorage is correct choice for this static SPA |
| Unit system toggle (metric/imperial) | Taiwanese audience — metric default is correct, but height in cm vs ft/in matters | Low | Metric only is acceptable MVP; imperial is a near-term expectation |
| Inline validation on inputs | Age=0 or weight=500 silently producing an absurd TDEE destroys trust | Low | Min/max bounds per field; show error inline, not on submit |
| Google Sheets URL/ID entry with save | Runtime Sheets config is a stated requirement; text field + save button is the minimum | Low | One text field for the GAS deployment URL, one for Sheet ID |

---

## Differentiators

Features that set this app apart. Not expected, but valued when discovered.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| BMR formula selector (Mifflin-St Jeor vs Harris-Benedict vs Katch-McArdle) | Power users know formulas differ; letting them choose signals scientific credibility | Med | Mifflin-St Jeor is the validated default (most accurate for non-athletes per meta-analysis); Katch-McArdle requires body fat % input — gate it behind an optional field |
| 3+ national dietary guideline presets with real citations | Taiwan (衛福部), Japan (MHLW 2025 DRI), USDA AMDR — each covers a different philosophy | Med | Japan 2025 DRI: protein 13-20%, fat 20-30%, carbs 50-65%. Taiwan label DV: protein 60g, fat 55g, carbs 320g (≈12%/25%/63%). USDA AMDR: protein 10-35%, fat 20-35%, carbs 45-65%. Mid-range of each range is a reasonable preset value |
| Live BMR/TDEE recalculation as fields change | Removes the friction of a submit button; makes the calculator feel responsive | Low-Med | Standard in web calculators; debounce 300ms on number inputs |
| Connection test button for Google Sheets | "Did my URL work?" is the #1 user question when configuring a backend; a ping/test call gives instant feedback | Med | Issue a test GET to the GAS URL, check HTTP 200 + expected response shape; show "Connected" / "Failed" state |
| Preset goal modes (maintenance / mild cut / bulk) | Adds calorie-deficit and surplus variants (+/- 10-20%) on top of TDEE; popular in MyFitnessPal, MacroFactor | Low-Med | Only add if macros page consumes this; out of scope for v1 per PROJECT.md |
| Visual macro ratio donut/bar chart | Turns abstract percentages into intuitive proportions; widely used by MyFitnessPal, Cronometer | Med | A simple CSS/SVG horizontal bar (carbs/protein/fat colored segments) is sufficient; avoid full charting library just for this |
| Explanation tooltips on each guideline | "Why is Japan's carb target higher than USDA?" is a natural question; tooltips with 1-sentence rationale build trust | Low | Store tooltip text in the guideline data object; no library needed |
| Activity level description expansion | Users often unsure if they're "moderate" or "very active"; expandable descriptions reduce mis-selection | Low | Accordion or tooltip per option |

---

## Anti-Features

Features to deliberately NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Custom macro ratio editor (free-form % sliders) | PROJECT.md explicitly out of scope; adds surface area without matching real guidelines; users can override by selecting a different preset | Use preset-only selection; add custom editor in a later milestone if validated |
| Micronutrient targets (vitamins, minerals, sodium) | Dramatically increases data maintenance burden; no existing app surface to display them against | Defer to a dedicated nutrition milestone; placeholder text "更多營養素目標 — 即將推出" is fine |
| Automatic nutrient tracking against BMR targets | Out of scope per PROJECT.md; requires integration into the NutritionTracker page which is not part of this milestone | Settings page should only calculate and persist targets; NutritionTracker reads them later |
| User accounts / profile sync | Single-user static app; authentication adds OAuth complexity, server requirements, and scope creep | Keep everything in localStorage; Sheets sync covers the backup use case |
| Multiple profiles / family mode | Doubles the settings complexity; navigation paradigm (bottom tabs, single user) doesn't support it | Single profile only; if multi-user is needed, it is a major architectural milestone |
| BMR "optimization tips" or coaching content | This is a config/settings page, not a health coaching screen; mixing motivational copy with data entry creates a confusing information hierarchy | Keep settings utilitarian: inputs, outputs, save; move guidance content to a future "Insights" screen |
| Body fat percentage as a required input | Most users don't know their BF%; making it required blocks the primary path | Make it optional; only surface it when Katch-McArdle formula is selected |
| Imperial-only mode | App is zh-TW; Taiwanese users use metric; building imperial-first wastes time | Default metric; add imperial as an enhancement if user demand surfaces |
| Real-time Sheets sync for settings | Network calls on every keystroke adds unreliable latency to what should be instant local changes | Save settings to localStorage synchronously; Sheets sync on explicit "save" button press only |

---

## Feature Dependencies

```
Unit system (metric/imperial)
  └─ Required by: Age/sex/height/weight inputs (affects field labels and validation bounds)

BMR formula selector
  └─ Requires: Body fat % input (optional, only activated by Katch-McArdle selection)
  └─ Required by: TDEE calculation output

Activity level selector
  └─ Required by: TDEE calculation output

TDEE output
  └─ Requires: All four anthropometric inputs + activity level + BMR formula
  └─ Required by: Macronutrient gram targets

Guideline preset selector
  └─ Required by: Macronutrient gram targets (ratio source)
  └─ Requires: At least 2 guideline objects with { name, source_url, protein_pct, fat_pct, carb_pct }

Macronutrient gram targets
  └─ Requires: TDEE output + guideline preset

Google Sheets URL + Sheet ID inputs
  └─ Independent of BMR flow; can be a separate section on the same settings page
  └─ Connection test button requires: GAS URL populated

Settings persistence (localStorage)
  └─ Required by: Every other feature (nothing survives a reload without it)
```

---

## MVP Recommendation

**Minimum viable settings page that is not embarrassing:**

1. Anthropometric inputs: age, sex, height (cm), weight (kg) — with inline validation
2. Activity level: 5-option radio/select
3. BMR formula: default Mifflin-St Jeor (no selector needed in MVP — add formula choice as a differentiator in v1.1)
4. TDEE output: displayed prominently after inputs are valid
5. Guideline preset selector: 3 presets (Taiwan, Japan, USDA/AMDR) with source label
6. Macronutrient gram targets: derived automatically from TDEE + selected preset
7. Google Sheets config: GAS URL field + Sheet ID field + Save button
8. localStorage persistence: all settings auto-saved on change

**Total: 8 features, all Low-Med complexity. Achievable in a single phase.**

**Defer to v1.1:**
- BMR formula selector (Katch-McArdle + body fat % input)
- Connection test button for Sheets (needs async error-state handling)
- Visual macro ratio bar chart (nice-to-have, not functional)
- Imperial unit toggle

---

## Dietary Guideline Reference Data

Concrete numbers for implementation, sourced from official documents.

### Taiwan — 衛福部食品藥物管理署 (TFDA) / 健康促進署 (HPA)
- Reference daily calorie: 2000 kcal
- Protein: ~12-15% (DV: 60g = 240 kcal = 12% of 2000)
- Fat: ~25-28% (DV: 55g = 495 kcal ≈ 25%)
- Carbohydrate: ~60-65% (DV: 320g = 1280 kcal = 64%)
- Source: TFDA Nutrition Labeling Reference Daily Values; HPA MyPlate guidance
- New guidelines expected Q2 2026 — use current DV as interim

### Japan — 厚生労働省 (MHLW) DRI 2025
- Protein: 13-20% (age <50), 14-20% (age 50-64), 15-20% (age 65+)
- Fat: 20-30%
- Carbohydrate: 50-65%
- Preset (mid-range, adult default): protein 16%, fat 25%, carbs 59%
- Source: Ministry of Health, Labour and Welfare — Dietary Reference Intakes for Japanese (2025)

### USDA / National Academies AMDR (USA)
- Protein: 10-35%
- Fat: 20-35%
- Carbohydrate: 45-65%
- Preset (mid-range): protein 20%, fat 30%, carbs 50%
- Source: National Academies of Sciences — Acceptable Macronutrient Distribution Ranges (reviewed 2024)

---

## BMR Formula Reference Data

For implementation, all formulas are client-side JavaScript.

### Mifflin-St Jeor (recommended default)
- Men: (10 × weight_kg) + (6.25 × height_cm) - (5 × age) + 5
- Women: (10 × weight_kg) + (6.25 × height_cm) - (5 × age) - 161
- Accuracy: Most accurate for general population; validated as best predictor of RMR within 10% for non-obese and obese adults (PubMed 15883556)
- Confidence: HIGH (multiple meta-analyses confirm)

### Harris-Benedict (revised 1984) — secondary option
- Men: 88.362 + (13.397 × weight_kg) + (4.799 × height_cm) - (5.677 × age)
- Women: 447.593 + (9.247 × weight_kg) + (3.098 × height_cm) - (4.330 × age)
- Accuracy: Less accurate than Mifflin-St Jeor for most adults; historically dominant
- Use case: Include for users who want to compare or match legacy tools

### Katch-McArdle (lean body mass) — optional, gated by BF% input
- RDEE: 370 + (21.6 × lean_body_mass_kg)
- lean_body_mass_kg = weight_kg × (1 - body_fat_fraction)
- Accuracy: Most accurate for athletic individuals with low body fat; performs poorly for general population
- Confidence: HIGH (consistent across literature)

### Activity multipliers (all formulas)
| Level | Label (zh-TW suggestion) | Multiplier |
|-------|--------------------------|------------|
| 1 | 久坐 (幾乎不運動) | ×1.2 |
| 2 | 輕度活動 (每週運動1-3天) | ×1.375 |
| 3 | 中度活動 (每週運動3-5天) | ×1.55 |
| 4 | 高度活動 (每週運動6-7天) | ×1.725 |
| 5 | 極高活動 (體力勞動或專業運動) | ×1.9 |

---

## UX Pattern Notes

### Settings page layout
- Use a single scrollable page (not tabs within settings) — this is a single-user config form, not a multi-section dashboard
- Group: [個人資料 → BMR/TDEE 結果 → 飲食指南選擇 → Google Sheets 連線] as vertically stacked card sections
- Results section (TDEE + macros) should appear between inputs and guideline selector so users see the live number before choosing a preset
- Bottom tab navigation: settings icon is typically the last item; existing 4-tab structure should become 5-tab (plan / track / schedule / weight / **settings**)

### Input UX
- Use number inputs with min/max attributes for validation; do not accept free-text for numeric fields
- Debounce recalculation 300ms after last keystroke — avoids showing NaN mid-entry
- Show TDEE only when all required fields are valid; show a placeholder state ("請填入個人資料以計算基礎代謝率") before that
- Do not use a form submit button for BMR calculation — live recalculation is the expected pattern

### Guideline preset UX
- Radio buttons or a card-select pattern work better than a dropdown for 3-5 options — users can see all choices at once
- Display the macro breakdown (carbs/protein/fat as %) alongside the preset name — removes the need to select and then check
- Show gram amounts (not just %) as the primary number once TDEE is available; % is context, grams is action

### Google Sheets connection UX
- Two text inputs (GAS URL, Sheet ID) in a clearly separated section labeled "資料同步設定" or similar
- Save button is explicit (not auto-save) — configuration changes should be intentional, not accidental
- After save, store in localStorage and show a brief success state ("已儲存")
- Connection test (v1.1): a "測試連線" button that issues a test GET and shows "連線成功 / 連線失敗" with a spinner during the request

---

## Sources

- [Mifflin-St Jeor accuracy meta-analysis — PubMed 15883556](https://pubmed.ncbi.nlm.nih.gov/15883556/)
- [BMR in athletes — PMC10687135 (2023 systematic review)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10687135/)
- [Harris-Benedict equation — Wikipedia](https://en.wikipedia.org/wiki/Harris%E2%80%93Benedict_equation)
- [USDA/AMDR rethinking 2024 — National Academies](https://www.ncbi.nlm.nih.gov/books/NBK610327/)
- [Japan MHLW DRI 2025 research summary](https://discovery.researcher.life/article/dietary-reference-intakes-for-japanese-2025-the-fundamental-and-comprehensive-guideline-for-healthy-and-diets/60825ba3b88b3c86b249920ec1fb3a01)
- [Japan DRI 2020 — official MHLW PDF](https://www.mhlw.go.jp/content/001151422.pdf)
- [Taiwan new guidelines expected Q2 2026 — Focus Taiwan](https://focustaiwan.tw/society/202601110007)
- [Taiwan HPA MyPlate guidance](https://www.hpa.gov.tw/EngPages/Detail.aspx?nodeid=4106&pid=11729)
- [NASM — Resting Metabolic Rate and BMR equation comparison](https://blog.nasm.org/nutrition/resting-metabolic-rate-how-to-calculate-and-improve-yours)
- [Progressive disclosure — NNGroup](https://www.nngroup.com/articles/progressive-disclosure/)
- [Mobile bottom navigation — AppMySite 2025](https://blog.appmysite.com/bottom-navigation-bar-in-mobile-apps-heres-all-you-need-to-know/)
- [Activity multiplier values — Harris-Benedict calculator reference](https://www.bmi-calculator.net/bmr-calculator/harris-benedict-equation/)
- [Google Apps Script web app URL pattern](https://developers.google.com/apps-script/guides/web)
