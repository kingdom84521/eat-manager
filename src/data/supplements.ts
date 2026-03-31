/**
 * ============================================================
 * Supplements 表 — 補品
 * ============================================================
 *
 * 資料來自 Google Sheets，不在此硬編碼
 */

import type { SupplementItem } from "./types";

// -- SUPPLEMENTS（補品/膠囊） ----------------------------------------

export const SUPPLEMENTS: SupplementItem[] = [];

// -- 查詢工具 --------------------------------------------------------

export const SUPPLEMENT_MAP = new Map<string, SupplementItem>();
SUPPLEMENTS.forEach((s) => SUPPLEMENT_MAP.set(s.id, s));

/** 根據 tag 篩選 */
export function getSupplementsByTag(tag: string): SupplementItem[] {
  return SUPPLEMENTS.filter((s) => s.tags.includes(tag as any));
}

/** 取得啟用中補品 */
export function getActiveSupplements(): SupplementItem[] {
  return SUPPLEMENTS.filter((s) => s.isActive);
}
