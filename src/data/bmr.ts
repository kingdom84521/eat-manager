/**
 * ============================================================
 * BMR / TDEE 計算
 * ============================================================
 *
 * 純函式，無副作用，無 I/O。
 * 所有公式採用公制單位（公斤、公分）。
 *
 * 公式來源：Mifflin & St Jeor (1990)
 * doi:10.1093/ajcn/51.2.241
 *
 * 驗證值：30歲男性，70kg，175cm → BMR = 1648.75 kcal/day
 */

import type { ActivityLevelId, BMRResult } from "./types";

// ── Activity Levels ──────────────────────────────────

/**
 * 活動量等級，含乘數與繁體中文標籤。
 * 乘數來源：Harris & Benedict 修正版，廣泛用於 TDEE 估算。
 */
export const ACTIVITY_LEVELS = [
  {
    id: "sedentary" as const,
    label: "久坐",
    description: "坐辦公室，每週運動 0–1 次",
    multiplier: 1.2,
  },
  {
    id: "light" as const,
    label: "輕度活動",
    description: "每週輕度運動 1–3 天",
    multiplier: 1.375,
  },
  {
    id: "moderate" as const,
    label: "中度活動",
    description: "每週中度運動 3–5 天",
    multiplier: 1.55,
  },
  {
    id: "very" as const,
    label: "高度活動",
    description: "每週運動 6–7 天",
    multiplier: 1.725,
  },
  {
    id: "extra" as const,
    label: "極高活動",
    description: "體力勞動工作或每日高強度訓練",
    multiplier: 1.9,
  },
] as const;

/** 活動量等級查找 Map，O(1) by id */
export const ACTIVITY_LEVEL_MAP = new Map<ActivityLevelId, (typeof ACTIVITY_LEVELS)[number]>();
ACTIVITY_LEVELS.forEach((a) => ACTIVITY_LEVEL_MAP.set(a.id, a));

// ── BMR Calculation ──────────────────────────────────

/**
 * 計算基礎代謝率（BMR）。
 *
 * 使用 Mifflin-St Jeor 公式（1990）：
 *   男性：10W + 6.25H - 5A + 5
 *   女性：10W + 6.25H - 5A - 161
 *
 * 回傳值為未四捨五入的 kcal/day。
 * 驗證：calculateBMR(30, "male", 175, 70) === 1648.75
 *
 * @param ageYears - 年齡（歲），有效範圍 10–120
 * @param sex - 性別 "male" | "female"
 * @param heightCm - 身高（公分），有效範圍 100–250
 * @param weightKg - 體重（公斤），有效範圍 30–300
 */
export function calculateBMR(
  ageYears: number,
  sex: "male" | "female",
  heightCm: number,
  weightKg: number,
): number {
  // Mifflin-St Jeor (1990): doi:10.1093/ajcn/51.2.241
  // IMPORTANT: male offset is +5, female offset is -161.
  // Swapping these produces a 166 kcal error on every output.
  const GENDER_OFFSET = sex === "male" ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + GENDER_OFFSET;
}

/**
 * 計算每日總消耗熱量（TDEE）。
 *
 * 回傳值四捨五入至十位數 kcal/day。
 * 先乘後捨：Math.round(bmr * multiplier / 10) * 10
 *
 * @param bmr - calculateBMR() 的回傳值（未四捨五入）
 * @param activityMultiplier - ACTIVITY_LEVELS 中對應的 multiplier 值
 */
export function calculateTDEE(bmr: number, activityMultiplier: number): number {
  return Math.round((bmr * activityMultiplier) / 10) * 10;
}

/**
 * 給定 UserProfile 中的 activityLevelId，回傳對應的乘數。
 * 若 id 不存在（不應發生），回傳久坐乘數 1.2 作為安全預設值。
 */
export function getActivityMultiplier(id: ActivityLevelId): number {
  return ACTIVITY_LEVEL_MAP.get(id)?.multiplier ?? 1.2;
}

/**
 * 一次性計算 BMR + TDEE 並回傳 BMRResult。
 *
 * @param ageYears - 年齡（歲）
 * @param sex - 性別
 * @param heightCm - 身高（公分）
 * @param weightKg - 體重（公斤）
 * @param activityLevelId - 活動量等級 ID
 */
export function calculateBMRResult(
  ageYears: number,
  sex: "male" | "female",
  heightCm: number,
  weightKg: number,
  activityLevelId: ActivityLevelId,
): BMRResult {
  const bmr = calculateBMR(ageYears, sex, heightCm, weightKg);
  const multiplier = getActivityMultiplier(activityLevelId);
  return { bmr, tdee: calculateTDEE(bmr, multiplier) };
}
