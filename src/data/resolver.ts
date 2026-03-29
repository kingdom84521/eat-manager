/**
 * ============================================================
 * Item Resolver — 統一查詢層
 * ============================================================
 *
 * 前端拿到一個 ID，不需要知道它是 food 還是 remedy
 * 丟進 resolveItem() 就能拿到完整資料+渲染需要的資訊
 */

import type { FoodItem, RemedyItem, BehaviorItem, ItemType, HealthTag } from "./types";
import { FOOD_MAP } from "./foods";
import { REMEDY_MAP } from "./remedies";

// ── Resolved Item（前端渲染用） ──────────────────

export interface ResolvedItem {
  id: string;
  type: ItemType;
  name: string;
  dose: string;
  cal: number;
  tags: HealthTag[];
  /** 西醫機制/說明 */
  description: string;
  /** 中醫資訊 */
  tcm?: { effect: string; nature: string };
  /** 注意事項 */
  caution?: string;
  /** 是否為核心項目 */
  isCore: boolean;
  /** 原始資料參照 */
  raw: FoodItem | RemedyItem | BehaviorItem;
}

/**
 * 根據 ID 從 foods 或 remedies 表查詢，回傳統一格式
 */
export function resolveItem(id: string): ResolvedItem | null {
  // 先查 remedy/behavior
  const remedy = REMEDY_MAP.get(id);
  if (remedy) {
    if (remedy.type === "behavior") {
      const b = remedy as BehaviorItem;
      return {
        id: b.id,
        type: "behavior",
        name: b.name,
        dose: b.dose,
        cal: 0,
        tags: b.tags,
        description: b.mechanism,
        isCore: true,
        raw: b,
      };
    }
    const r = remedy as RemedyItem;
    return {
      id: r.id,
      type: r.type,
      name: r.name,
      dose: r.dose,
      cal: r.cal ?? 0,
      tags: r.tags,
      description: r.mechanism,
      tcm: r.tcm,
      caution: r.caution,
      isCore: r.isCore ?? false,
      raw: r,
    };
  }

  // 再查 food
  const food = FOOD_MAP.get(id);
  if (food) {
    return {
      id: food.id,
      type: "food",
      name: food.name,
      dose: food.serving,
      cal: food.cal,
      tags: food.tags ?? [],
      description: `P${food.protein}g / F${food.fat}g / C${food.carbs}g / Na${food.sodium}mg`,
      isCore: false,
      raw: food,
    };
  }

  console.warn(`[resolveItem] Unknown ID: ${id}`);
  return null;
}

/**
 * 批次解析 IDs
 */
export function resolveItems(ids: string[]): ResolvedItem[] {
  return ids.map(resolveItem).filter((x): x is ResolvedItem => x !== null);
}

/**
 * 解析一個 pool 的 IDs，依 type 分組回傳
 */
export function resolveAndGroup(ids: string[]): {
  supplements: ResolvedItem[];
  remedies: ResolvedItem[];
  foods: ResolvedItem[];
  behaviors: ResolvedItem[];
} {
  const all = resolveItems(ids);
  return {
    supplements: all.filter((i) => i.type === "supplement"),
    remedies: all.filter((i) => i.type === "remedy"),
    foods: all.filter((i) => i.type === "food"),
    behaviors: all.filter((i) => i.type === "behavior"),
  };
}
