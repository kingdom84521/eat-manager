/**
 * ============================================================
 * 核心資料模型
 * ============================================================
 *
 * 兩張參考表：
 *
 * ┌─────────────┐     ┌──────────────┐
 * │  foods      │     │  supplements │
 * │ (一般食物)   │     │ (補品/膠囊)   │
 * │             │     │              │
 * │ 7-11雞胸肉  │     │ Berberine    │
 * │ 茶葉蛋      │     │ 魚油         │
 * │ 排骨飯      │     │ NAC          │
 * │ 燕麥        │     │ 維生素D3     │
 * └─────────────┘     └──────┬───────┘
 *                            │
 *                            │ refs by id
 *                            ▼
 *                     ┌──────────────────────────────┐
 *                     │       daily_plan             │
 *                     │  (每日方案 = schedule          │
 *                     │   + 隨機選出的 foods/supplements) │
 *                     └──────────────────────────────┘
 */

// ── Item Type ───────────────────────────────────

/**
 * food       = 一般食物，吃來補充營養/熱量（雞胸肉、燕麥、蛋）
 * supplement = 補品/膠囊/藥錠（Berberine、魚油、NAC）
 */
export type ItemType = "food" | "supplement";

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

// ── Supplement Timing -----------------------------------------------

/**
 * 建議服用時機
 * 用於日常排程分組
 */
export type SupplementTiming =
  | "empty_stomach"   // 空腹
  | "before_meal"     // 餐前
  | "with_meal"       // 餐中
  | "after_meal"      // 餐後
  | "bedtime";        // 睡前

/** 服用時機中文對照 */
export const SUPPLEMENT_TIMING_LABELS: Record<SupplementTiming, string> = {
  empty_stomach: "空腹",
  before_meal: "餐前",
  with_meal: "餐中",
  after_meal: "餐後",
  bedtime: "睡前",
};

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
  /** v2.0: 組合食物的成分列表（原子食物 only）*/
  ingredients?: FoodIngredient[];
}

/**
 * 組合食物的成分引用
 * Atomic only — foodId must reference a non-composed FoodItem
 */
export interface FoodIngredient {
  /** 引用的食物 ID（只能是非組合食物） */
  foodId: string;
  /** 本份使用的克數 */
  grams: number;
}

// ── Supplement Item (補品) -----------------------------------------

/**
 * 補品項目 — 膠囊/錠劑/藥用食品
 * v2.0: 新型補品資料模型
 */
export interface SupplementItem {
  id: string;
  type: "supplement";
  /** 顯示名稱（繁體中文） */
  name: string;
  brand?: string;
  /** 每顆/每包的含量，e.g. "500mg" */
  dosagePerUnit: string;
  /** 每次服用幾顆 */
  unitsPerDose: number;
  /** 每天服用幾次 */
  dosesPerDay: number;
  /** 建議服用時機（可多個） */
  timing: SupplementTiming[];
  /** 健康標籤 */
  tags: HealthTag[];
  /** 與哪些補品有衝突（supplement IDs） */
  interactions: string[];
  /** 與哪些補品協同（supplement IDs） */
  synergies: string[];
  /** 作用機制（選填） */
  mechanism?: string;
  /** 注意事項 */
  caution?: string;
  /** 中醫資訊（選填） */
  tcm?: TCMInfo;
  /** 是否納入每日排程 */
  isActive: boolean;
}

// ── Union type ──────────────────────────────────

export type AnyItem = FoodItem | SupplementItem;

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
  /** 今天實際吃了哪些 supplement IDs */
  takenIds: string[];
  /** 跳過的 */
  skippedIds?: string[];
  notes?: string;
}

// ── Inventory & Consumption -----------------------------------------

/**
 * 補品庫存補貨記錄
 * One entry per purchase batch
 */
export interface InventoryEntry {
  supplementId: string;
  /** 本次購入顆數 */
  purchasedUnits: number;
  /** 購買日期 ISO YYYY-MM-DD */
  purchaseDate: string;
}

/**
 * 補品服用記錄（事件溯源）
 * remaining = sum(purchasedUnits) - sum(consumedUnits)
 */
export interface ConsumptionEvent {
  supplementId: string;
  /** 服用日期 */
  date: string;
  /** 本次服用顆數 */
  units: number;
}

// ── BMR / TDEE Types ────────────────────────────────

/** 活動量等級 ID — 對應 bmr.ts 的 ACTIVITY_LEVELS 陣列 */
export type ActivityLevelId =
  | "sedentary"
  | "light"
  | "moderate"
  | "very"
  | "extra";

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
}

/** BMR + TDEE 計算結果 */
export interface BMRResult {
  /** 基礎代謝率 kcal/day（未四捨五入） */
  bmr: number;
  /** 每日總消耗熱量 kcal/day（四捨五入至十位數） */
  tdee: number;
}

// ── Dietary Guideline Types ───────────────────────

/** 三大營養素佔總熱量的百分比 */
export interface MacroRatios {
  /** % of TDEE */
  protein: number;
  /** % of TDEE */
  fat: number;
  /** % of TDEE */
  carb: number;
}

/** 三大營養素的克數目標 */
export interface MacroGrams {
  protein: number;
  fat: number;
  carb: number;
}

/** 飲食指南預設組 */
export interface GuidelinePreset {
  id: string;
  /** 顯示名稱（繁體中文） */
  name: string;
  /** 發布機構（繁體中文） */
  authority: string;
  /** 來源 URL */
  sourceUrl: string;
  /** 版本年份 */
  year: number;
  /**
   * 三大營養素佔總熱量百分比。
   * 三項相加應為 100。
   * 儲存百分比（非克數）— 克數由 calculateMacroGrams() 動態計算。
   */
  macroRatios: MacroRatios;
}
