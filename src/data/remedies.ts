/**
 * ============================================================
 * Remedies 表 — 補品 + 自然食療
 * ============================================================
 *
 * 資料來自 Google Sheets，不在此硬編碼
 */

import type { RemedyItem, BehaviorItem } from "./types";

// ── SUPPLEMENTS（補品/膠囊） ────────────────────

export const SUPPLEMENTS: RemedyItem[] = [];

// ── REMEDIES（自然食療） ────────────────────────

export const NATURAL_REMEDIES: RemedyItem[] = [];

// ── BEHAVIORS（行為） ───────────────────────────

export const BEHAVIORS: BehaviorItem[] = [];

// ── 合併查詢工具 ─────────────────────────────────

/** 所有 remedy items 的 map (by id) */
export const REMEDY_MAP = new Map<string, RemedyItem | BehaviorItem>();
[...SUPPLEMENTS, ...NATURAL_REMEDIES].forEach((r) => REMEDY_MAP.set(r.id, r));
BEHAVIORS.forEach((b) => REMEDY_MAP.set(b.id, b));

/** 根據 tag 篩選 */
export function getRemediesByTag(tag: string): (RemedyItem | BehaviorItem)[] {
  return [...SUPPLEMENTS, ...NATURAL_REMEDIES, ...BEHAVIORS].filter((r) =>
    r.tags.includes(tag as any)
  );
}

/** 取得所有核心項目 */
export function getCoreRemedies(): RemedyItem[] {
  return [...SUPPLEMENTS, ...NATURAL_REMEDIES].filter((r) => r.isCore);
}

/** 根據 type 篩選 */
export function getByType(type: "supplement" | "remedy"): RemedyItem[] {
  return [...SUPPLEMENTS, ...NATURAL_REMEDIES].filter((r) => r.type === type);
}
