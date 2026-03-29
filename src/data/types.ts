/**
 * ============================================================
 * 核心資料模型
 * ============================================================
 *
 * 三張表的關係：
 *
 * ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
 * │  foods      │     │  remedies    │     │  schedule   │
 * │ (一般食物)   │     │ (補品+食療)   │     │ (時間排程)   │
 * │             │     │              │     │             │
 * │ 7-11雞胸肉  │     │ Berberine    │     │ 06:30 空腹  │
 * │ 茶葉蛋      │     │ 魚油         │     │ 07:00 餐前  │
 * │ 排骨飯      │     │ 綠豆薏仁湯   │     │ 07:30 早餐  │
 * │ 燕麥        │     │ 洛神花茶     │     │ ...         │
 * └─────────────┘     │ 苦瓜(藥用)   │     └──────┬──────┘
 *                     │ 黑豆水       │            │
 *                     └──────┬───────┘            │
 *                            │                    │
 *                            │ refs by id         │
 *                            ▼                    ▼
 *                     ┌──────────────────────────────┐
 *                     │       daily_plan             │
 *                     │  (每日方案 = schedule          │
 *                     │   + 隨機選出的 foods/remedies) │
 *                     └──────────────────────────────┘
 */

// ── Item Type ───────────────────────────────────

/**
 * food     = 一般食物，吃來補充營養/熱量（雞胸肉、燕麥、蛋）
 * supplement = 補品/膠囊/藥錠（Berberine、魚油、NAC）
 * remedy   = 自然食療，吃/喝的主要目的是治療/調理（綠豆薏仁湯、洛神花茶、苦瓜）
 * behavior = 行為/習慣（飯後散步、進食順序）
 */
export type ItemType = "food" | "supplement" | "remedy" | "behavior";

// ── Health Condition Tags ───────────────────────

/**
 * 標記補品/食療針對的健康問題
 * 一個 item 可以有多個 tag
 */
export type HealthTag =
  | "insulin_resistance"  // 胰島素阻抗
  | "inflammation"        // 慢性發炎 (CRP, IL-6, TNF-α)
  | "dehumidify"          // 去濕（中醫）
  | "cholesterol"         // 膽固醇 / 血脂
  | "gut_health"          // 腸道健康
  | "antioxidant"         // 抗氧化
  | "liver"               // 護肝
  | "blood_pressure"      // 血壓
  | "sleep"               // 助眠
  | "blood_sugar"         // 直接降血糖（跟胰島素阻抗不完全一樣）
  | "weight_loss";        // 體重管理

/** 中文對照 */
export const HEALTH_TAG_LABELS: Record<HealthTag, string> = {
  insulin_resistance: "胰島素阻抗",
  inflammation: "抗發炎",
  dehumidify: "去濕",
  cholesterol: "膽固醇",
  gut_health: "腸道",
  antioxidant: "抗氧化",
  liver: "護肝",
  blood_pressure: "血壓",
  sleep: "助眠",
  blood_sugar: "降血糖",
  weight_loss: "體重管理",
};

export const HEALTH_TAG_COLORS: Record<HealthTag, string> = {
  insulin_resistance: "#ef4444",
  inflammation: "#f97316",
  dehumidify: "#06b6d4",
  cholesterol: "#8b5cf6",
  gut_health: "#22c55e",
  antioxidant: "#a855f7",
  liver: "#eab308",
  blood_pressure: "#3b82f6",
  sleep: "#6366f1",
  blood_sugar: "#f59e0b",
  weight_loss: "#ec4899",
};

// ── TCM Metadata ────────────────────────────────

export type TCMNature = "寒" | "涼" | "平" | "溫" | "熱";

export interface TCMInfo {
  effect: string;
  nature: TCMNature;
}

// ── Food Item (一般食物) ────────────────────────

export interface FoodItem {
  id: string;
  type: "food";
  name: string;
  serving: string;
  cal: number;
  protein: number;
  fat: number;
  carbs: number;
  sugar?: number;
  sodium: number;
  source: string;
  /** 食物也可以有 tag，但通常是空的或很少 */
  tags?: HealthTag[];
}

// ── Remedy Item (補品 + 自然食療) ────────────────

export interface RemedyItem {
  id: string;
  type: "supplement" | "remedy";
  name: string;
  dose: string;
  /** 估算熱量（食療類才有，補品通常0） */
  cal?: number;
  /** 針對的健康問題 — 這是 remedy 表的核心欄位 */
  tags: HealthTag[];
  /** 為什麼有效（西醫證據） */
  mechanism: string;
  /** 中醫資訊（食療類才有） */
  tcm?: TCMInfo;
  /** 注意事項 / 禁忌 */
  caution?: string;
  /** 最佳服用時機 */
  timing?: string;
  /** 是否為核心項目（每天必吃） */
  isCore?: boolean;
}

// ── Behavior Item ───────────────────────────────

export interface BehaviorItem {
  id: string;
  type: "behavior";
  name: string;
  dose: string;
  tags: HealthTag[];
  mechanism: string;
}

// ── Union type ──────────────────────────────────

export type AnyItem = FoodItem | RemedyItem | BehaviorItem;

// ── Schedule Types ──────────────────────────────

export interface ScheduleSlot {
  time: string;
  label: string;
  icon: string;
  /** 每天固定出現的 item IDs */
  fixedIds: string[];
  /** 隨機池 */
  pools: ItemPool[];
}

export interface ItemPool {
  name: string;
  /** 從池中隨機選幾個 */
  pick: number;
  /** 池中的 item IDs */
  itemIds: string[];
}

// ── Daily Plan (生成結果) ────────────────────────

export interface DailyPlan {
  date: string;
  /** 被選中的 item IDs */
  selectedIds: string[];
  /** 預估總熱量 */
  totalCal: number;
  notes: string;
}

// ── Nutrition Log ───────────────────────────────

export interface NutritionEntry {
  date: string;
  meal: "breakfast" | "lunch" | "dinner" | "snack";
  /** 食物名稱或 food ID */
  items: { foodId?: string; name: string; cal: number; protein: number; fat: number; carbs: number; sodium: number }[];
}

// ── Weight Log ──────────────────────────────────

export interface WeightEntry {
  date: string;
  weightKg: number;
  notes?: string;
}

// ── Supplement Log ──────────────────────────────

export interface SupplementLogEntry {
  date: string;
  /** 今天實際吃了哪些 remedy IDs */
  takenIds: string[];
  /** 跳過的 */
  skippedIds?: string[];
  notes?: string;
}
