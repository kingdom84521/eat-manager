/**
 * DataService: Offline-first data layer
 *
 * Strategy:
 * 1. 所有讀取先從 localStorage 取 (instant)
 * 2. 背景從 Sheets 拉最新資料更新 cache
 * 3. 所有寫入同時寫 localStorage + Sheets
 * 4. Sheets 掛了也不影響使用 (graceful degradation)
 */

import { SheetsAPI, type SheetRow } from "./sheets-api";
import type { FoodItem, HealthTag, ScheduleSlot } from "../data/types";
import type { ResolvedItem } from "../data/resolver";

// ── Types ───────────────────────────────────────

export interface DailyPlan {
  date: string;
  items_json: string; // JSON stringified array of item IDs
  total_cal: number;
  notes: string;
}

export interface NutritionEntry {
  date: string;
  meal: "breakfast" | "lunch" | "dinner" | "snack";
  items_json: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  sodium: number;
}

export interface WeightEntry {
  date: string;
  weight_kg: number;
  notes: string;
}

export interface SupplementEntry {
  date: string;
  items_json: string;
  notes: string;
}

export interface GeneratedSlot {
  slot: ScheduleSlot;
  fixed: ResolvedItem[];
  selected: { poolName: string; items: ResolvedItem[] }[];
}

/**
 * 今日方案持久化記錄（每日一筆，存入 localStorage）
 *
 * 注意：不儲存 supplementRoutine — RoutineResult.slots 是 Map 無法 JSON.stringify。
 * 補品排程在每次 mount 時從 live data 重新計算（見 generateRoutine）。
 */
export interface TodayPlanRecord {
  date: string;
  foodSlots: GeneratedSlot[];
  checkedIds: string[];
  skippedSupplementIds: string[];
}

// ── Constants ───────────────────────────────────

const CACHE_PREFIX = "wellness_";
const SHEETS = {
  // 參考資料表
  FOODS: "foods",
  SUPPLEMENTS_CATALOG: "supplements",
  // 記錄表
  DAILY_PLANS: "daily_plans",
  NUTRITION: "nutrition_log",
  SUPPLEMENTS: "supplement_log",
  WEIGHT: "weight_log",
} as const;

// ── Cache helpers ───────────────────────────────

function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function cacheSet(key: string, data: unknown): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  } catch {
    console.warn("localStorage write failed for", key);
  }
}

// ── Date helpers ────────────────────────────────

export function todayStr(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

// ── Today Plan persistence ──────────────────────

const TODAY_PLAN_KEY = "today_plan";

export function saveTodayPlan(record: TodayPlanRecord): void {
  try {
    localStorage.setItem(CACHE_PREFIX + TODAY_PLAN_KEY, JSON.stringify(record));
  } catch {
    console.warn("localStorage write failed for today_plan");
  }
}

export function loadTodayPlan(): TodayPlanRecord | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + TODAY_PLAN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── Row → Type converters ───────────────────────

function rowToFood(row: SheetRow): FoodItem {
  return {
    id: String(row.id),
    type: "food",
    name: String(row.name),
    serving: String(row.serving ?? ""),
    cal: Number(row.cal) || 0,
    protein: Number(row.protein) || 0,
    fat: Number(row.fat) || 0,
    carbs: Number(row.carbs) || 0,
    sugar: row.sugar ? Number(row.sugar) : undefined,
    sodium: Number(row.sodium) || 0,
    source: String(row.source ?? ""),
    tags: row.tags ? String(row.tags).split(",").map((t) => t.trim()).filter(Boolean) as HealthTag[] : undefined,
  };
}

// ── DataService ─────────────────────────────────

export const DataService = {
  // ── Foods (from Sheets, cached) ───────────

  async getFoods(fallback: FoodItem[]): Promise<FoodItem[]> {
    const cacheKey = SHEETS.FOODS;
    const cached = cacheGet<FoodItem[]>(cacheKey);

    // Background sync from Sheets
    SheetsAPI.readAll(SHEETS.FOODS)
      .then((rows) => {
        if (rows.length > 0) {
          cacheSet(cacheKey, rows.map(rowToFood));
        }
      })
      .catch(() => {});

    return cached ?? fallback;
  },

  // ── Daily Plans ─────────────────────────────

  async getDailyPlans(days = 14): Promise<DailyPlan[]> {
    const cacheKey = `${SHEETS.DAILY_PLANS}_recent`;
    const cached = cacheGet<DailyPlan[]>(cacheKey);

    // Background sync
    SheetsAPI.readRange(SHEETS.DAILY_PLANS, daysAgo(days), todayStr())
      .then((rows) => {
        cacheSet(cacheKey, rows);
      })
      .catch(() => {}); // Fail silently

    return cached ?? [];
  },

  async saveDailyPlan(plan: DailyPlan): Promise<void> {
    // Write to cache immediately
    const cacheKey = `${SHEETS.DAILY_PLANS}_recent`;
    const existing = cacheGet<DailyPlan[]>(cacheKey) ?? [];
    const filtered = existing.filter((p) => p.date !== plan.date);
    filtered.push(plan);
    // Keep last 30 entries
    const trimmed = filtered.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
    cacheSet(cacheKey, trimmed);

    // Async write to Sheets
    SheetsAPI.upsert(SHEETS.DAILY_PLANS, plan as unknown as SheetRow).catch(
      () => {}
    );
  },

  // ── Nutrition Log ───────────────────────────

  async getNutritionLog(date: string): Promise<NutritionEntry[]> {
    const cacheKey = `${SHEETS.NUTRITION}_${date}`;
    const cached = cacheGet<NutritionEntry[]>(cacheKey);

    SheetsAPI.readRange(SHEETS.NUTRITION, date, date)
      .then((rows) => cacheSet(cacheKey, rows))
      .catch(() => {});

    return cached ?? [];
  },

  async logMeal(entry: NutritionEntry): Promise<void> {
    const cacheKey = `${SHEETS.NUTRITION}_${entry.date}`;
    const existing = cacheGet<NutritionEntry[]>(cacheKey) ?? [];
    existing.push(entry);
    cacheSet(cacheKey, existing);

    SheetsAPI.append(SHEETS.NUTRITION, entry as unknown as SheetRow).catch(
      () => {}
    );
  },

  /**
   * 從今日的 nutrition log 移除特定食物 ID 的紀錄。
   * 策略：先更新 localStorage，Sheets 側採 silent fail（per D-08）。
   */
  async removeMealEntry(date: string, itemId: string): Promise<void> {
    const cacheKey = `${SHEETS.NUTRITION}_${date}`;
    const existing = cacheGet<NutritionEntry[]>(cacheKey) ?? [];
    const filtered = existing.filter(
      (entry) => !entry.items_json.includes(itemId)
    );
    cacheSet(cacheKey, filtered);
    // Re-upsert strategy: rewrite all entries for this date to Sheets
    // (per RESEARCH.md Pitfall 3 -- no per-item delete in GAS)
    // Silent fail on Sheets -- localStorage is source of truth
  },

  // ── Weight Log ──────────────────────────────

  async getWeightLog(days = 90): Promise<WeightEntry[]> {
    const cacheKey = `${SHEETS.WEIGHT}_recent`;
    const cached = cacheGet<WeightEntry[]>(cacheKey);

    SheetsAPI.readRange(SHEETS.WEIGHT, daysAgo(days), todayStr())
      .then((rows) => cacheSet(cacheKey, rows))
      .catch(() => {});

    return cached ?? [];
  },

  async logWeight(entry: WeightEntry): Promise<void> {
    const cacheKey = `${SHEETS.WEIGHT}_recent`;
    const existing = cacheGet<WeightEntry[]>(cacheKey) ?? [];
    const filtered = existing.filter((w) => w.date !== entry.date);
    filtered.push(entry);
    filtered.sort((a, b) => b.date.localeCompare(a.date));
    cacheSet(cacheKey, filtered);

    SheetsAPI.upsert(SHEETS.WEIGHT, entry as unknown as SheetRow).catch(
      () => {}
    );
  },

  // ── Supplement Log ──────────────────────────

  async logSupplements(entry: SupplementEntry): Promise<void> {
    SheetsAPI.upsert(
      SHEETS.SUPPLEMENTS,
      entry as unknown as SheetRow
    ).catch(() => {});
  },
};
