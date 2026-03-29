/**
 * ============================================================
 * Foods 表 — 一般食物
 * ============================================================
 *
 * 只放「為了營養/熱量而吃的一般食物」
 * 補品和食療在 remedies 表
 *
 * 這些食物也可以出現在每日方案的隨機池中
 * （例如早餐的燕麥、午餐的雞腿、晚餐的毛豆）
 */

import type { FoodItem } from "./types";

export const FOODS: FoodItem[] = [
  // ── 早餐主食 ──────────────────────────────────
  {
    id: "oatmeal_50g", type: "food",
    name: "燕麥", serving: "50g乾燥",
    cal: 190, protein: 7, fat: 3.5, carbs: 33, sodium: 2,
    source: "桂格即食燕麥標示",
    tags: ["blood_sugar"], // 燕麥β-葡聚醣本身就有穩血糖效果
  },
  {
    id: "whole_wheat_toast", type: "food",
    name: "全麥吐司", serving: "1片",
    cal: 80, protein: 3, fat: 1, carbs: 15, sodium: 150,
    source: "估算",
  },
  {
    id: "plain_yogurt", type: "food",
    name: "無糖優格", serving: "200g",
    cal: 120, protein: 8, fat: 5, carbs: 9, sodium: 80,
    source: "估算",
  },

  // ── 蛋白質來源 ────────────────────────────────
  {
    id: "egg_boiled", type: "food",
    name: "水煮蛋", serving: "1顆",
    cal: 70, protein: 6, fat: 5, carbs: 0.5, sodium: 60,
    source: "USDA",
  },
  {
    id: "chicken_breast_711", type: "food",
    name: "7-11 雞胸肉", serving: "1包~100g",
    cal: 125, protein: 23, fat: 2.5, carbs: 2, sodium: 450,
    source: "包裝標示平均",
  },
  {
    id: "tea_egg", type: "food",
    name: "茶葉蛋", serving: "1顆",
    cal: 75, protein: 7, fat: 5, carbs: 0.5, sodium: 200,
    source: "估算",
  },
  {
    id: "tofu_firm", type: "food",
    name: "板豆腐", serving: "半盒~150g",
    cal: 120, protein: 12, fat: 6, carbs: 3, sodium: 15,
    source: "估算",
    tags: ["insulin_resistance"], // 大豆異黃酮
  },
  {
    id: "edamame", type: "food",
    name: "毛豆", serving: "一小碗~100g",
    cal: 120, protein: 11, fat: 5, carbs: 9, sodium: 5,
    source: "USDA",
    tags: ["insulin_resistance"],
  },
  {
    id: "shrimp", type: "food",
    name: "蝦", serving: "8-10隻~100g",
    cal: 100, protein: 20, fat: 1.5, carbs: 0, sodium: 200,
    source: "USDA",
    tags: ["antioxidant"], // 蝦青素
  },
  {
    id: "chicken_leg_stew", type: "food",
    name: "烤/滷雞腿", serving: "1隻",
    cal: 250, protein: 28, fat: 14, carbs: 2, sodium: 500,
    source: "估算（高估）",
  },

  // ── 蔬菜 ─────────────────────────────────────
  {
    id: "broccoli", type: "food",
    name: "花椰菜", serving: "半碗~80g",
    cal: 25, protein: 2, fat: 0, carbs: 5, sodium: 25,
    source: "USDA",
    tags: ["inflammation"], // 蘿蔔硫素
  },
  {
    id: "spinach", type: "food",
    name: "菠菜/地瓜葉", serving: "一大把~100g",
    cal: 25, protein: 3, fat: 0, carbs: 3, sodium: 70,
    source: "USDA",
    tags: ["inflammation"], // LIFE研究降CRP
  },
  {
    id: "bok_choy", type: "food",
    name: "青江菜/小白菜", serving: "一大把~100g",
    cal: 15, protein: 1.5, fat: 0, carbs: 2, sodium: 65,
    source: "USDA",
    tags: ["inflammation"],
  },
  {
    id: "bell_pepper", type: "food",
    name: "彩色甜椒（紅/黃/橙）", serving: "半顆",
    cal: 20, protein: 1, fat: 0, carbs: 5, sodium: 2,
    source: "USDA",
    tags: ["inflammation"], // 槲皮素+維C
  },
  {
    id: "mushroom_mix", type: "food",
    name: "菇類（香菇/杏鮑菇/金針菇）", serving: "半碗~80g",
    cal: 20, protein: 2, fat: 0, carbs: 3, sodium: 5,
    source: "USDA",
    tags: ["inflammation"],
  },
  {
    id: "onion", type: "food",
    name: "洋蔥", serving: "半顆~80g",
    cal: 30, protein: 1, fat: 0, carbs: 7, sodium: 3,
    source: "USDA",
    tags: ["blood_sugar", "inflammation"], // 硫化物+槲皮素
  },
  {
    id: "winter_melon", type: "food",
    name: "冬瓜", serving: "半碗~100g",
    cal: 12, protein: 0.4, fat: 0, carbs: 3, sodium: 6,
    source: "USDA",
    tags: ["dehumidify"],
  },
  {
    id: "avocado_half", type: "food",
    name: "酪梨", serving: "半顆~70g",
    cal: 115, protein: 1.5, fat: 10.5, carbs: 6, sodium: 5,
    source: "USDA",
    tags: ["inflammation"], // 降IL-1β/CRP
  },

  // ── 主食/碳水 ─────────────────────────────────
  {
    id: "white_rice_half", type: "food",
    name: "白飯（少半碗）", serving: "半碗~100g",
    cal: 130, protein: 2.5, fat: 0.3, carbs: 28, sodium: 1,
    source: "USDA",
  },
  {
    id: "barley_rice", type: "food",
    name: "薏仁飯（薏仁:白米=1:2）", serving: "半碗",
    cal: 125, protein: 3, fat: 0.5, carbs: 27, sodium: 2,
    source: "估算",
    tags: ["dehumidify", "blood_sugar"],
  },
  {
    id: "black_rice", type: "food",
    name: "黑米/紫米飯", serving: "半碗",
    cal: 130, protein: 3, fat: 1, carbs: 27, sodium: 3,
    source: "估算",
    tags: ["inflammation"], // 花青素
  },
  {
    id: "sweet_potato", type: "food",
    name: "蒸地瓜", serving: "1小條~120g",
    cal: 110, protein: 1.5, fat: 0, carbs: 26, sodium: 35,
    source: "USDA",
  },

  // ── 點心 ──────────────────────────────────────
  {
    id: "walnuts_30g", type: "food",
    name: "核桃", serving: "一小把~30g",
    cal: 195, protein: 4.5, fat: 19, carbs: 4, sodium: 0,
    source: "USDA",
    tags: ["inflammation"],
  },
  {
    id: "almonds_30g", type: "food",
    name: "杏仁", serving: "一小把~30g",
    cal: 170, protein: 6, fat: 15, carbs: 6, sodium: 0,
    source: "USDA",
    tags: ["inflammation"],
  },
  {
    id: "dark_choc_85", type: "food",
    name: "85%黑巧克力", serving: "10-20g",
    cal: 80, protein: 1.5, fat: 6, carbs: 4, sugar: 2, sodium: 5,
    source: "Lindt 85%",
    tags: ["insulin_resistance"], // 黃烷醇降HOMA-IR
  },
  {
    id: "blueberry", type: "food",
    name: "藍莓", serving: "½杯~75g",
    cal: 40, protein: 0.5, fat: 0, carbs: 10, sodium: 1,
    source: "USDA",
    tags: ["inflammation"], // 花青素降CRP
  },

  // ── 超商/外食已確認 ────────────────────────────
  {
    id: "shian_egg", type: "food",
    name: "石安牧場椒麻溫泉蛋", serving: "1顆（整包76g/2顆）",
    cal: 53, protein: 4.7, fat: 3.3, carbs: 1.1, sodium: 126,
    source: "營養標示實拍",
  },
  {
    id: "ucc_black", type: "food",
    name: "UCC罐裝黑咖啡", serving: "1罐",
    cal: 5, protein: 0.4, fat: 0, carbs: 0, sodium: 29,
    source: "營養標示",
  },
  {
    id: "city_latte_m_ice", type: "food",
    name: "CITY CAFE 中杯冰拿鐵", serving: "1杯",
    cal: 171, protein: 8, fat: 6, carbs: 18, sugar: 10.7, sodium: 100,
    source: "官網",
  },
  {
    id: "city_latte_l_hot", type: "food",
    name: "CITY CAFE 大杯熱拿鐵", serving: "1杯",
    cal: 254, protein: 11, fat: 9, carbs: 25, sugar: 16.7, sodium: 140,
    source: "官網",
  },
  {
    id: "imei_grape_choc", type: "food",
    name: "義美葡萄巧克球 50g", serving: "1盒",
    cal: 238, protein: 3.8, fat: 11.4, carbs: 30.2, sugar: 22.4, sodium: 50,
    source: "營養標示",
  },
  {
    id: "fule_yogurt", type: "food",
    name: "福樂Q果優酪覆盆莓草莓 135g", serving: "1罐",
    cal: 111, protein: 4.5, fat: 1.4, carbs: 20.1, sugar: 19.2, sodium: 68,
    source: "營養標示",
  },
  {
    id: "salad_dressing", type: "food",
    name: "桂冠沙拉醬", serving: "20g",
    cal: 129, protein: 0.3, fat: 13.2, carbs: 2.2, sodium: 180,
    source: "營養標示",
  },
  {
    id: "bf_liji_toast", type: "food",
    name: "里肌蛋吐司（少醬）", serving: "1份",
    cal: 280, protein: 18, fat: 10, carbs: 30, sodium: 600,
    source: "估算（高估）",
  },
  {
    id: "bf_kala_burger", type: "food",
    name: "卡啦雞腿堡", serving: "1個",
    cal: 620, protein: 22, fat: 30, carbs: 60, sodium: 900,
    source: "估算（高估）",
  },
  {
    id: "lunch_chick_leg_rice", type: "food",
    name: "雞腿飯（非炸）", serving: "1份",
    cal: 800, protein: 35, fat: 25, carbs: 100, sodium: 1200,
    source: "估算（高估）",
  },
  {
    id: "lunch_pork_fried_rice", type: "food",
    name: "排骨飯（炸）", serving: "1份",
    cal: 920, protein: 28, fat: 35, carbs: 100, sodium: 1200,
    source: "估算（高估）",
  },
  {
    id: "kfc_orleans", type: "food",
    name: "KFC 紐奧良烤雞腿堡", serving: "1個",
    cal: 411, protein: 22, fat: 18, carbs: 40, sodium: 900,
    source: "官網",
  },
];

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
