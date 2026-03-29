# 🥗💊 Daily Wellness Tracker

個人化每日保健 + 飲食追蹤系統
針對胰島素阻抗 + 慢性發炎 + 去濕體質

## Architecture

```
┌─────────────────────────────────────────────┐
│              GitHub Pages (Static)           │
│  ┌─────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ 每日方案 │ │ 飲食追蹤  │ │ 補充劑/食療  │  │
│  │ 隨機產生 │ │ 卡路里    │ │ 時程表      │  │
│  └────┬────┘ └────┬─────┘ └──────┬───────┘  │
│       │           │              │           │
│  ┌────▼───────────▼──────────────▼────────┐  │
│  │         DataService (abstraction)       │  │
│  │  localStorage (cache) + Google Sheets   │  │
│  └────────────────┬───────────────────────┘  │
└───────────────────┼──────────────────────────┘
                    │
        ┌───────────▼───────────┐
        │   Google Apps Script  │
        │   (REST API proxy)    │
        └───────────┬───────────┘
                    │
        ┌───────────▼───────────┐
        │    Google Sheets DB   │
        │  ┌──────────────────┐ │
        │  │ daily_plans      │ │
        │  │ nutrition_log    │ │
        │  │ supplement_log   │ │
        │  │ weight_log       │ │
        │  │ food_database    │ │
        │  └──────────────────┘ │
        └───────────────────────┘
```

## Tech Stack

- **Framework**: Vite + React + TypeScript
- **Styling**: Tailwind CSS (utility-first, 你熟的)
- **Hosting**: GitHub Pages (gh-pages branch)
- **Database**: Google Sheets via Apps Script API
- **Cache**: localStorage (offline-first)
- **Deploy**: GitHub Actions auto-deploy on push

## Google Sheets Setup

### 1. 建立 Spreadsheet
建一個新的 Google Sheet，建立以下分頁 (tabs)：

| Tab 名稱 | 用途 | 欄位 |
|---|---|---|
| `daily_plans` | 每日隨機方案紀錄 | date, items_json, total_cal, notes |
| `nutrition_log` | 每餐飲食紀錄 | date, meal, items_json, calories, protein, fat, carbs, sodium |
| `supplement_log` | 補充劑服用紀錄 | date, items_json, notes |
| `weight_log` | 體重紀錄 | date, weight_kg, notes |
| `food_database` | 已確認食物營養資料 | id, name, cal, protein, fat, carbs, sodium, source |

### 2. 部署 Apps Script API
在 Sheet 中 Extensions > Apps Script，貼上 `scripts/gas-api.js` 的內容，
部署為 Web App (Execute as: Me, Access: Anyone)。

### 3. 設定環境變數
```bash
cp .env.example .env.local
# 填入你的 Apps Script Web App URL
```

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/
npm run deploy     # 部署到 gh-pages
```

## Project Structure

```
src/
├── main.tsx                 # Entry point
├── App.tsx                  # App shell + router
├── env.d.ts                 # 環境變數型別
│
├── lib/
│   ├── data-service.ts      # 資料層抽象 (localStorage + Sheets)
│   ├── sheets-api.ts        # Google Sheets API client
│   └── utils.ts             # 共用工具
│
├── data/
│   ├── supplements.ts       # 補充劑資料 (固定)
│   ├── foods.ts             # 食療食材資料 (固定, 用於隨機產生器)
│   ├── tcm-dehumidify.ts    # 去濕食材資料
│   └── saved-foods.ts       # 已知食物營養資料 (7-11, 早餐店等)
│
├── pages/
│   ├── DailyPlan.tsx        # 🎲 每日方案隨機產生器
│   ├── NutritionTracker.tsx # 📊 飲食追蹤 (卡路里計算)
│   ├── SupplementSchedule.tsx # 💊 補充劑+食療時程表
│   ├── WeightLog.tsx        # ⚖️ 體重紀錄
│   └── History.tsx          # 📅 歷史紀錄
│
├── components/
│   ├── NavBar.tsx           # 底部導航列
│   ├── TimeSlot.tsx         # 時間軸卡片
│   ├── FoodCard.tsx         # 食物項目卡片
│   ├── MealLogger.tsx       # 餐食記錄器
│   └── CalorieBudget.tsx    # 熱量預算顯示
│
└── styles/
    └── index.css            # Tailwind base + custom vars
```
