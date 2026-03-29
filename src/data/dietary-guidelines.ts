/**
 * ============================================================
 * 飲食指南預設組
 * ============================================================
 *
 * 收錄三個國家級飲食指南的三大營養素建議比例。
 * 純資料模組，無 I/O，無副作用。
 *
 * 來源：
 *   台灣  — 衛生福利部國民健康署 第八版國人膳食營養素參考攝取量 (DRI)
 *   美國  — USDA Dietary Guidelines for Americans 2025–2030 (AMDR)
 *   日本  — 厚生勞動省 日本人の食事摂取基準 2025年版
 */

import type { GuidelinePreset, MacroGrams } from "./types";

// ── Guideline Presets ───────────────────────────────

/**
 * 三個國家/機構的飲食指南預設組。
 * macroRatios 儲存佔 TDEE 的百分比（非克數），三項相加為 100。
 * 克數由 calculateMacroGrams() 動態計算，避免硬編碼個人化值。
 */
export const GUIDELINES: GuidelinePreset[] = [
  {
    id: "taiwan-hpa",
    name: "台灣衛福部 DRI",
    authority: "衛生福利部國民健康署",
    sourceUrl: "https://www.hpa.gov.tw/Pages/Detail.aspx?nodeid=4248&pid=12285",
    year: 2011,
    macroRatios: {
      // 第八版 DRI — 中信度（來自二手資料，待比對中文原始 PDF 確認）
      // STATE.md 已登錄為已知疑慮：建議在 v1.1 對照原始文件驗證
      protein: 12,
      fat: 25,
      carb: 63,
    },
  },
  {
    id: "usda-amdr",
    name: "美國 USDA AMDR",
    authority: "美國農業部（USDA）",
    sourceUrl: "https://www.dietaryguidelines.gov/",
    year: 2025,
    macroRatios: {
      // AMDR 中間值：蛋白質 10–35%、脂肪 20–35%、碳水 45–65%
      // 高信度 — 來自 Dietary Guidelines for Americans 2025–2030 官方文件
      protein: 20,
      fat: 30,
      carb: 50,
    },
  },
  {
    id: "japan-mhlw",
    name: "日本厚生勞動省 DRI",
    authority: "日本厚生勞動省",
    sourceUrl: "https://www.mhlw.go.jp/content/001151422.pdf",
    year: 2025,
    macroRatios: {
      // 2025 年版中間值：蛋白質 13–20%、脂肪 20–30%、碳水 50–65%
      // 高信度 — 來自日本人の食事摂取基準 2025 年版官方 PDF
      protein: 16,
      fat: 25,
      carb: 59,
    },
  },
];

/** 飲食指南 ID 查找 Map，O(1) by id */
export const GUIDELINE_MAP = new Map<string, GuidelinePreset>();
GUIDELINES.forEach((g) => GUIDELINE_MAP.set(g.id, g));

// ── Macro Calculation ────────────────────────────────

/**
 * 根據 TDEE 和飲食指南預設組，計算三大營養素克數目標。
 *
 * 換算公式：
 *   蛋白質、碳水：1g = 4 kcal
 *   脂肪：1g = 9 kcal
 *
 * 範例（USDA AMDR，TDEE 2000 kcal）：
 *   蛋白質：round(2000 × 0.20 / 4) = 100g
 *   脂肪：  round(2000 × 0.30 / 9) ≈ 67g
 *   碳水：  round(2000 × 0.50 / 4) = 250g
 *
 * @param tdeeKcal - 每日總消耗熱量（kcal/day），由 calculateTDEE() 取得
 * @param preset - 選定的飲食指南預設組
 */
export function calculateMacroGrams(tdeeKcal: number, preset: GuidelinePreset): MacroGrams {
  return {
    protein: Math.round((tdeeKcal * preset.macroRatios.protein) / 100 / 4),
    fat: Math.round((tdeeKcal * preset.macroRatios.fat) / 100 / 9),
    carb: Math.round((tdeeKcal * preset.macroRatios.carb) / 100 / 4),
  };
}
