# Requirements: Eat Manager

**Defined:** 2026-04-08 | **Updated:** 2026-04-08
**Core Value:** Users can manage their food and supplement items, generate a unified daily plan with checkbox logging, save/load meal presets, and track supplement inventory — all from a static site synced to Google Sheets.

## v4.0 Requirements

Requirements for Menu Composition & Navigation Refinement milestone.

### Navigation

- [ ] **NAV-05**: Sidebar label "我的食材" renamed to "我的食物"

### Food Resolution

- [ ] **RES-01**: User-created food items resolve correctly when loading a menu preset (not only static FOOD_MAP)

### Menu Composition

- [ ] **MENU-05**: User can create a new menu from scratch by selecting food items per time slot
- [ ] **MENU-06**: User can open an existing menu and add/remove food items per slot
- [ ] **MENU-07**: User can search and filter the food list when picking items for a menu slot
- [ ] **MENU-08**: Menu editor shows nutritional totals (calories, protein, fat, carbs) for the composed menu
- [ ] **MENU-09**: Changes to a menu's food items are saved via MenuService.update()

### Inline Food Creation

- [ ] **FOOD-08**: User can quick-create a food item (name + serving + macros) from within the menu composition flow without leaving the menu page
- [ ] **FOOD-09**: Newly created food item appears immediately in the food picker list

## Future Requirements

Deferred to future release.

### Menu Enhancements
- **MENU-10**: Duplicate an existing menu as a new preset
- **MENU-04**: Menu presets sync to Google Sheets

### Enhanced Food
- **FOOD-10**: Favorite/frequent foods for quick access
- **FOOD-11**: Barcode scanning for food lookup via Open Food Facts

### Enhanced Supplements
- **SUPP-07**: Supplement effectiveness tracking (user-rated over time)
- **SUPP-08**: Auto-reorder reminders when inventory is critically low

### Profile Enhancements
- **PROF-04**: User can upload custom avatar image
- **PROF-05**: Profile page shows BMR summary and macro targets

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full NutritionLabelForm extraction | Quick-create form diverges in intent — minimal fields only |
| Drag-and-drop food reordering | Complexity vs value for mobile-first SPA |
| Flat menu structure (no slots) | Breaks existing MenuPreset.foodItemIds: string[][] shape |
| Menu Sheets sync | Deferred to MENU-04; localStorage-only for v4.0 |
| Dialog-based food picker | Conflicts with headlessui Dialog nesting; use manual panel |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAV-05 | Phase 14 | Pending |
| RES-01 | Phase 14 | Pending |
| MENU-05 | Phase 15 | Pending |
| MENU-06 | Phase 15 | Pending |
| MENU-07 | Phase 15 | Pending |
| MENU-08 | Phase 15 | Pending |
| MENU-09 | Phase 15 | Pending |
| FOOD-08 | Phase 16 | Pending |
| FOOD-09 | Phase 16 | Pending |

**Coverage:**
- v4.0 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after roadmap creation*
