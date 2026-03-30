/**
 * ============================================================
 * Foods 表 — 一般食物
 * ============================================================
 *
 * 資料來自 Google Sheets，不在此硬編碼
 */

import type { FoodItem } from "./types";

export const FOODS: FoodItem[] = [];

// ── 查詢工具 ─────────────────────────────────────

export const FOOD_MAP = new Map<string, FoodItem>();
FOODS.forEach((f) => FOOD_MAP.set(f.id, f));

export function searchFoods(query: string): FoodItem[] {
  const q = query.toLowerCase();
  return FOODS.filter((f) => f.name.toLowerCase().includes(q));
}

export function getFoodsByTag(tag: string): FoodItem[] {
  return FOODS.filter((f) => f.tags?.includes(tag as any));
}
