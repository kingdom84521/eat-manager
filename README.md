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
        │  │ foods (一般食物)  │ │
        │  │ remedies (補品    │ │
        │  │   +自然食療+tags) │ │
        │  │ daily_plans      │ │
        │  │ nutrition_log    │ │
        │  │ supplement_log   │ │
        │  │ weight_log       │ │
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

#### 參考資料表

##### `foods` — 一般食物

| 欄位 | 說明 | 範例 |
|---|---|---|
| id | 唯一識別碼 | chicken_breast_711 |
| name | 食物名稱 | 7-11 雞胸肉 |
| serving | 份量 | 1包~100g |
| cal | 熱量(kcal) | 125 |
| protein | 蛋白質(g) | 23 |
| fat | 脂肪(g) | 2.5 |
| carbs | 碳水(g) | 2 |
| sugar | 糖(g)，可空 | |
| sodium | 鈉(mg) | 450 |
| source | 資料來源 | 包裝標示 |
| tags | 健康標籤(逗號分隔) | inflammation,blood_sugar |

##### `remedies` — 補品 & 自然食療

| 欄位 | 說明 | 範例 |
|---|---|---|
| id | 唯一識別碼 | berberine |
| type | supplement / remedy / behavior | supplement |
| name | 名稱 | 小檗鹼 Berberine |
| dose | 劑量/用法 | 500mg × 3次/日 |
| cal | 估算熱量，可空 | 0 |
| tags | 健康標籤(逗號分隔) | insulin_resistance,blood_sugar,cholesterol |
| mechanism | 作用機制 | 啟動AMPK改善胰島素敏感性 |
| timing | 最佳服用時機，可空 | 三餐前各500mg |
| caution | 注意事項，可空 | 有服降血糖藥先諮詢醫師 |
| isCore | 是否核心項目 | TRUE / FALSE |
| tcm_effect | 中醫功效，可空 | 清熱利濕 |
| tcm_nature | 中醫性質，可空 | 寒/涼/平/溫/熱 |

**可用的 tags：** insulin_resistance, inflammation, dehumidify, cholesterol, gut_health, antioxidant, liver, blood_pressure, sleep, blood_sugar, weight_loss

#### 記錄表

| Tab 名稱 | 用途 | 欄位 |
|---|---|---|
| `daily_plans` | 每日隨機方案紀錄 | date, items_json, total_cal, notes |
| `nutrition_log` | 每餐飲食紀錄 | date, meal, items_json, calories, protein, fat, carbs, sodium |
| `supplement_log` | 補充劑服用紀錄 | date, items_json, notes |
| `weight_log` | 體重紀錄 | date, weight_kg, notes |

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
│   ├── types.ts             # 核心型別 (FoodItem, RemedyItem, HealthTag...)
│   ├── foods.ts             # 一般食物資料 (fallback, Sheets 優先)
│   ├── remedies.ts          # 補品+自然食療資料 (fallback, Sheets 優先)
│   ├── schedule.ts          # 時間排程定義
│   └── resolver.ts          # ID → Item 解析
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
