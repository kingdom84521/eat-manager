/**
 * ============================================================
 * Schedule 表 — 時間排程
 * ============================================================
 *
 * 這張表只定義「什麼時間點可以放什麼」
 * 不存食物/補品的詳細資料，只存 ID 參照
 *
 * fixed = 每天都要出現的（補品為主）
 * pools = 隨機池（食物+食療為主）
 *   pool.itemIds 裡混合了 food ID 和 remedy ID
 *   前端 render 時根據 ID 去 FOOD_MAP 或 REMEDY_MAP 查詳細資料
 */

import type { ScheduleSlot } from "./types";

export const SCHEDULE: ScheduleSlot[] = [
  {
    time: "06:30",
    label: "起床（空腹）",
    icon: "🌅",
    fixedIds: ["probiotics", "nac"],
    pools: [],
  },
  {
    time: "07:00",
    label: "早餐前 15-30min",
    icon: "⏰",
    fixedIds: ["berberine", "acv_water"],
    pools: [],
  },
  {
    time: "07:30",
    label: "早餐",
    icon: "🍳",
    fixedIds: ["fish_oil", "vitamin_d3", "chromium"],
    pools: [
      {
        name: "主食",
        pick: 1,
        itemIds: [
          // food IDs
          "oatmeal_50g",       // 可搭配 ceylon_cinnamon + goji_berry (remedy)
          "plain_yogurt",
          "whole_wheat_toast",
        ],
      },
      {
        name: "主食搭配（食療）",
        pick: 1,
        itemIds: [
          // remedy IDs — 加進早餐的食療元素
          "ceylon_cinnamon",
          "goji_berry",
        ],
      },
      {
        name: "蛋白質",
        pick: 1,
        itemIds: [
          "egg_boiled",         // food: 水煮蛋
          "chicken_breast_711", // food: 7-11雞胸肉
          "tofu_firm",          // food: 板豆腐
        ],
      },
    ],
  },
  {
    time: "10:00",
    label: "上午點心",
    icon: "🍵",
    fixedIds: [],
    pools: [
      {
        name: "飲品",
        pick: 1,
        itemIds: [
          // remedy IDs
          "green_tea",
          "black_bean_water",
          "roselle_tea",
          "barley_water",
        ],
      },
      {
        name: "小食",
        pick: 1,
        itemIds: [
          // food IDs
          "walnuts_30g",
          "almonds_30g",
          "dark_choc_85",
          "blueberry",
          "tea_egg",
          // remedy IDs
          "goji_berry",
        ],
      },
    ],
  },
  {
    time: "12:00",
    label: "午餐前 15-30min",
    icon: "⏰",
    fixedIds: ["berberine", "acv_water"],
    pools: [],
  },
  {
    time: "12:30",
    label: "午餐",
    icon: "🍱",
    fixedIds: ["eat_order", "curcumin", "chromium"],
    pools: [
      {
        name: "蔬菜（選2）",
        pick: 2,
        itemIds: [
          // food IDs
          "broccoli",
          "spinach",
          "bok_choy",
          "bell_pepper",
          "mushroom_mix",
          "onion",
          "winter_melon",
          // remedy IDs
          "bitter_melon_remedy",
          "kimchi_remedy",
        ],
      },
      {
        name: "蛋白質",
        pick: 1,
        itemIds: [
          "chicken_leg_stew",
          "chicken_breast_711",
          "tofu_firm",
          "egg_boiled",   // x2 in UI
          "edamame",
        ],
      },
    ],
  },
  {
    time: "15:00",
    label: "下午",
    icon: "☕",
    fixedIds: ["ala", "vitamin_c"],
    pools: [
      {
        name: "飲品",
        pick: 1,
        itemIds: [
          "roselle_tea",
          "green_tea",
          "ginger_tea",
          "black_bean_water",
          "barley_water",
          "burdock_tea",
          "corn_silk_tea",
        ],
      },
      {
        name: "點心（可選）",
        pick: 1,
        itemIds: [
          "avocado_half",
          "dark_choc_85",
          "walnuts_30g",
          "blueberry",
          "almonds_30g",
        ],
      },
    ],
  },
  {
    time: "17:30",
    label: "晚餐前 15-30min",
    icon: "⏰",
    fixedIds: ["berberine"],
    pools: [],
  },
  {
    time: "18:00",
    label: "晚餐",
    icon: "🍽️",
    fixedIds: [
      "garlic_remedy",
      "turmeric_cooking",
      "fish_oil",
      "natto_monacolin",
    ],
    pools: [
      {
        name: "蔬菜（選2）",
        pick: 2,
        itemIds: [
          "broccoli",
          "spinach",
          "bell_pepper",
          "mushroom_mix",
          "winter_melon",
          "bitter_melon_remedy",
          "kimchi_remedy",
        ],
      },
      {
        name: "蛋白質+豆類",
        pick: 1,
        itemIds: [
          "edamame",
          "tofu_firm",
          "chicken_leg_stew",
          "shrimp",
        ],
      },
      {
        name: "主食",
        pick: 1,
        itemIds: [
          // food IDs
          "barley_rice",
          "black_rice",
          "sweet_potato",
          "white_rice_half",
          // remedy IDs — 湯品當主食替代
          "mung_barley_soup",
          "red_bean_barley_soup",
          "four_spirits_soup",
        ],
      },
    ],
  },
  {
    time: "19:00",
    label: "餐後",
    icon: "🚶",
    fixedIds: ["post_meal_walk"],
    pools: [
      {
        name: "餐後飲品",
        pick: 1,
        itemIds: [
          "golden_milk",
          "ginger_tea",
          "roselle_tea",
          "burdock_tea",
          "mung_barley_soup", // 如果晚餐沒選到
        ],
      },
    ],
  },
  {
    time: "21:30",
    label: "睡前 30-60min",
    icon: "🌙",
    fixedIds: ["magnesium", "vitamin_c"],
    pools: [],
  },
];
