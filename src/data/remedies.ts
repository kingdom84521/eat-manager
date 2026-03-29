/**
 * ============================================================
 * Remedies 表 — 補品 + 自然食療
 * ============================================================
 *
 * 這張表只放「為了治療/調理身體而吃的東西」
 * 一般食物（雞胸肉、便當、茶葉蛋）不在這裡，在 foods 表
 *
 * 每個 item 都標記了：
 * - type: supplement（膠囊/藥錠）或 remedy（自然食療）
 * - tags: 針對哪些健康問題
 * - mechanism: 西醫作用機制
 * - tcm: 中醫屬性（食療類才有）
 */

import type { RemedyItem, BehaviorItem } from "./types";

// ── SUPPLEMENTS（補品/膠囊） ────────────────────

export const SUPPLEMENTS: RemedyItem[] = [
  // ── 核心三寶 ──
  {
    id: "berberine",
    type: "supplement",
    name: "小檗鹼 Berberine",
    dose: "500mg × 3次/日，餐前15-30min",
    tags: ["insulin_resistance", "blood_sugar", "cholesterol", "gut_health"],
    mechanism: "啟動AMPK（與Metformin相同路徑）改善胰島素敏感性。半衰期短需分次服。臨床研究1500mg/日降空腹血糖20%。同時調節腸道菌相。",
    timing: "三餐前各500mg",
    caution: "有服降血糖藥/降壓藥/血液稀釋劑先諮詢醫師。與高劑量抗氧化劑(VitC>500mg)間隔2hr。可從500mg/天開始逐步增加。",
    isCore: true,
  },
  {
    id: "fish_oil",
    type: "supplement",
    name: "Omega-3 魚油 (rTG)",
    dose: "EPA+DHA合計 ≥2000mg/日（如大研生醫2-4顆）",
    tags: ["inflammation", "cholesterol", "blood_pressure"],
    mechanism: "EPA/DHA直接抑制促發炎前列腺素合成，降低CRP和IL-6。rTG型吸收率比EE型高124%。脂溶性隨含脂肪餐食吸收提高300%。",
    timing: "午餐+晚餐各一次，隨餐吃",
    caution: "空腹吃吸收差70%且易打嗝。有出血傾向者注意。",
    isCore: true,
  },
  {
    id: "magnesium",
    type: "supplement",
    name: "鎂 Magnesium Glycinate",
    dose: "200-400mg，睡前30-60min",
    tags: ["insulin_resistance", "sleep", "inflammation", "blood_pressure"],
    mechanism: "鎂是胰島素受體上酪胺酸激酶的必要輔因子，缺鎂直接加劇胰島素阻抗。甘胺酸降低核心體溫促進入睡。睡眠品質改善→降皮質醇→降胰島素阻抗。",
    timing: "睡前30-60min",
    caution: "腎功能不佳者先諮詢醫師。",
    isCore: true,
  },

  // ── 抗發炎/抗氧化 ──
  {
    id: "curcumin",
    type: "supplement",
    name: "薑黃素 + 黑胡椒",
    dose: "薑黃素500mg + 胡椒鹼5mg",
    tags: ["inflammation", "insulin_resistance", "antioxidant"],
    mechanism: "薑黃素抑制NF-κB和COX-2，效果可媲美部分NSAID。脂溶性隨餐吸收好。胡椒鹼增加生物利用率2000%。",
    timing: "午餐隨餐",
    caution: "服用血液稀釋劑/NSAID者注意。高劑量可能影響鐵吸收。",
    isCore: false,
  },
  {
    id: "nac",
    type: "supplement",
    name: "NAC (N-乙醯半胱胺酸)",
    dose: "600mg，早上空腹",
    tags: ["antioxidant", "inflammation", "liver", "insulin_resistance"],
    mechanism: "穀胱甘肽(GSH)前驅物。GSH是人體最強內源性抗氧化劑，直接對抗氧化壓力和慢性發炎。改善胰島素敏感性。護肝。",
    timing: "早上空腹（避免被鋅銅鐵干擾吸收）",
    caution: "與鋅/銅/鐵/血液稀釋劑分開吃。",
    isCore: false,
  },
  {
    id: "ala",
    type: "supplement",
    name: "α-硫辛酸 (Alpha-Lipoic Acid)",
    dose: "300-600mg",
    tags: ["antioxidant", "insulin_resistance", "inflammation", "blood_sugar"],
    mechanism: "同時具水溶性和脂溶性的抗氧化劑。系統性回顧顯示改善空腹血糖、胰島素、HbA1c和發炎指標。",
    timing: "下午兩餐之間（空腹吸收好+穩定下午血糖）",
    caution: "可能降血糖，有服降糖藥者監測。",
    isCore: false,
  },
  {
    id: "vitamin_d3",
    type: "supplement",
    name: "維生素 D3",
    dose: "2000-4000 IU/日",
    tags: ["insulin_resistance", "inflammation"],
    mechanism: "缺D與胰島素阻抗高度相關。補充後降低發炎指標並改善胰島素敏感性。台灣人普遍缺D。鎂是活化D3的必要輔因子。",
    timing: "早餐隨餐（脂溶性）",
    isCore: false,
  },
  {
    id: "chromium",
    type: "supplement",
    name: "鉻 Chromium Picolinate",
    dose: "200mcg × 2次/日 = 400mcg",
    tags: ["insulin_resistance", "blood_sugar"],
    mechanism: "必需微量礦物質，增強胰島素活性。研究顯示400mcg/日×8週改善胰島素阻抗和膽固醇。含量隨年齡下降。",
    timing: "早餐+午餐各200mcg隨餐",
    isCore: false,
  },
  {
    id: "vitamin_c",
    type: "supplement",
    name: "維生素 C",
    dose: "250mg × 2次/日 = 500mg",
    tags: ["antioxidant", "insulin_resistance"],
    mechanism: "支持胰島素分泌與敏感性。分次攝取吸收率更高（身體有吸收上限）。",
    timing: "下午1次 + 睡前1次（與Berberine間隔2hr）",
    isCore: false,
  },
  {
    id: "probiotics",
    type: "supplement",
    name: "益生菌 (Probiotics)",
    dose: "1顆（含Lactobacillus + Bifidobacterium）",
    tags: ["gut_health", "inflammation", "insulin_resistance"],
    mechanism: "改善腸道菌相→降低腸道發炎（全身性發炎的源頭）→改善胰島素阻抗。特定菌株有血糖控制證據。",
    timing: "早上空腹（胃酸最低，存活率最高）",
    caution: "免疫力極差者諮詢醫師。",
    isCore: false,
  },
  {
    id: "natto_monacolin",
    type: "supplement",
    name: "納豆紅麴 Q10",
    dose: "納豆激酶5000FU + Monacolin K ≤15mg + Q10 30mg",
    tags: ["cholesterol", "blood_pressure"],
    mechanism: "納豆激酶溶解纖維蛋白（血栓主成分）。Monacolin K結構似Statin藥物，抑制膽固醇合成。吃紅麴會抑制Q10合成所以必須同時補。",
    timing: "晚餐後（膽固醇合成尖峰在夜間）",
    caution: "⚠️ 絕對不能與Statin類降血脂藥同時吃。不能配葡萄柚。肝腎功能不佳者不宜。",
    isCore: false,
  },

  // ── 特殊用途 ──
  {
    id: "coq10",
    type: "supplement",
    name: "輔酶 CoQ10",
    dose: "100-200mg/日",
    tags: ["antioxidant", "insulin_resistance", "cholesterol"],
    mechanism: "線粒體能量轉換必需輔酶。統合分析(40研究/2424人)顯示降空腹血糖、胰島素和HbA1c。吃Statin或紅麴會抑制體內合成。",
    timing: "隨餐（脂溶性）",
    isCore: false,
  },
];

// ── REMEDIES（自然食療） ────────────────────────

export const NATURAL_REMEDIES: RemedyItem[] = [
  // ── 飲品類 ──
  {
    id: "acv_water",
    type: "remedy",
    name: "蘋果醋水",
    dose: "15ml醋 + 240ml水，用吸管喝",
    cal: 3,
    tags: ["blood_sugar", "insulin_resistance"],
    mechanism: "醋酸延緩胃排空，讓碳水吸收更平緩。Diabetes Care研究：改善胰島素阻抗者敏感性19-34%。對複雜碳水(飯麵)效果最好。",
    timing: "餐前10-30min（早餐+午餐前各一次）",
    caution: "用吸管喝保護牙齒琺瑯質。有胃潰瘍者不宜。",
    isCore: true,
  },
  {
    id: "roselle_tea",
    type: "remedy",
    name: "洛神花茶（無糖）",
    dose: "乾洛神花3-5朵沖熱水300ml",
    cal: 5,
    tags: ["blood_sugar", "insulin_resistance", "inflammation", "blood_pressure", "dehumidify"],
    mechanism: "抑制α-葡萄糖苷酶延緩碳水消化。系統性回顧：降血糖+改善胰島素敏感性與藥物同等有效。RCT證實降餐後血糖和胰島素反應。降MCP-1/TNF-α。",
    tcm: { effect: "清熱利濕、生津止渴", nature: "涼" },
    caution: "孕婦不宜。",
    isCore: false,
  },
  {
    id: "green_tea",
    type: "remedy",
    name: "綠茶（無糖）",
    dose: "1-2杯，兩餐之間",
    cal: 0,
    tags: ["inflammation", "insulin_resistance", "antioxidant"],
    mechanism: "EGCG提高胰島素敏感性並降血糖。高綠茶攝取地區發炎相關疾病發生率較低。",
    timing: "上午或下午，與正餐間隔1hr（避免干擾鐵/葉酸吸收）",
    isCore: false,
  },
  {
    id: "black_bean_water",
    type: "remedy",
    name: "黑豆水",
    dose: "炒黑豆泡熱水300ml",
    cal: 10,
    tags: ["inflammation", "dehumidify", "antioxidant"],
    mechanism: "黑豆皮花青素含量遠高於一般豆類，降CRP。黑豆肽改善胰島素敏感性。",
    tcm: { effect: "補腎利水、活血解毒", nature: "平" },
    isCore: false,
  },
  {
    id: "barley_water",
    type: "remedy",
    name: "薏仁水",
    dose: "薏仁煮水300ml",
    cal: 15,
    tags: ["dehumidify", "inflammation", "cholesterol", "gut_health"],
    mechanism: "人體試驗6週改善過重者脂代謝+發炎。薏仁多醣增加腸道乳桿菌/阿克曼氏菌→短鏈脂肪酸降空腹血糖。GI比白米低。",
    tcm: { effect: "利水滲濕、健脾止瀉", nature: "涼" },
    isCore: false,
  },
  {
    id: "burdock_tea",
    type: "remedy",
    name: "牛蒡茶",
    dose: "牛蒡片煮水300ml",
    cal: 10,
    tags: ["dehumidify", "gut_health", "antioxidant"],
    mechanism: "含菊糖(inulin)=益生元纖維，餵養腸道好菌。有抗氧化多酚。利尿消水腫。",
    tcm: { effect: "清熱利尿去濕", nature: "涼" },
    isCore: false,
  },
  {
    id: "corn_silk_tea",
    type: "remedy",
    name: "玉米鬚茶",
    dose: "玉米鬚煮水300ml",
    cal: 5,
    tags: ["dehumidify", "blood_sugar"],
    mechanism: "動物研究顯示降血糖。人體證據有限但傳統使用安全。利水消腫。",
    tcm: { effect: "利水消腫、清肝利膽", nature: "平" },
    isCore: false,
  },
  {
    id: "ginger_tea",
    type: "remedy",
    name: "薑茶",
    dose: "生薑片3-5片泡熱水",
    cal: 5,
    tags: ["inflammation", "blood_sugar", "dehumidify"],
    mechanism: "薑=COX-2抑制劑，直接抑制發炎路徑。RCT顯示1600mg/日改善8項糖尿病指標含胰島素敏感性。",
    tcm: { effect: "溫中散寒、化痰去濕", nature: "溫" },
    isCore: false,
  },
  {
    id: "golden_milk",
    type: "remedy",
    name: "薑黃拿鐵 (Golden Milk)",
    dose: "無糖豆漿+薑黃粉½匙+肉桂粉+一撮黑胡椒",
    cal: 60,
    tags: ["inflammation", "insulin_resistance"],
    mechanism: "把薑黃素+肉桂+胡椒鹼三種抗發炎成分合在一杯飲品裡。薑黃脂溶性靠豆漿的油脂幫助吸收。",
    isCore: false,
  },

  // ── 湯品/粥品類 ──
  {
    id: "mung_barley_soup",
    type: "remedy",
    name: "綠豆薏仁湯（不加糖）",
    dose: "一碗250ml，可加枸杞增甜",
    cal: 150,
    tags: ["insulin_resistance", "inflammation", "dehumidify", "blood_sugar"],
    mechanism: "【綠豆】牡荊素(vitexin)恢復胰島素敏感性、下調IL-6/TNF-α/CRP。【薏仁】增腸道益生菌降空腹血糖+利水去濕。⚠️不加糖！加糖完全抵消功效。",
    tcm: { effect: "清熱利濕解毒、健脾利水", nature: "涼" },
    caution: "脾胃虛寒易腹瀉者不宜天天喝冰的。不加糖！",
    isCore: false,
  },
  {
    id: "red_bean_barley_soup",
    type: "remedy",
    name: "紅豆薏仁湯（不加糖）",
    dose: "一碗250ml",
    cal: 150,
    tags: ["dehumidify", "inflammation", "blood_sugar", "blood_pressure"],
    mechanism: "【紅豆】花青素抑制飯後血糖上升；GI僅35；高鉀排鈉降血壓；皂素溶解血管壁油脂。【薏仁】去濕+降脂。",
    tcm: { effect: "利水消腫去濕、健脾", nature: "平" },
    caution: "不加糖！腎功能差者注意鉀攝取。",
    isCore: false,
  },
  {
    id: "four_spirits_soup",
    type: "remedy",
    name: "四神湯（茯苓+薏仁+山藥+芡實）",
    dose: "一碗，可加排骨或豬腸",
    cal: 200,
    tags: ["dehumidify", "gut_health", "insulin_resistance"],
    mechanism: "【茯苓】去濕第一藥+多醣免疫調節+抗發炎。【薏仁】降脂+降血糖。【山藥】薯蕷皂苷改善胰島素敏感性。【芡實】固腎澀精+抗氧化。台灣去濕國寶方。",
    tcm: { effect: "健脾去濕、補腎固精", nature: "平" },
    isCore: false,
  },

  // ── 入菜食材類 ──
  {
    id: "bitter_melon_remedy",
    type: "remedy",
    name: "苦瓜（藥用）",
    dose: "半條入菜（炒蛋/湯/涼拌）",
    cal: 30,
    tags: ["blood_sugar", "insulin_resistance"],
    mechanism: "含「植物胰島素」多肽mcIRBP-19模擬胰島素作用。活化AMPK（與Berberine/Metformin相同路徑）降血糖。改善胰島素敏感性+促進葡萄糖攝取。",
    tcm: { effect: "清熱解毒、明目降火", nature: "寒" },
    caution: "脾胃虛寒者少吃。",
    isCore: false,
  },
  {
    id: "garlic_remedy",
    type: "remedy",
    name: "大蒜（藥用劑量）",
    dose: "每餐2-3瓣入菜",
    cal: 10,
    tags: ["blood_sugar", "cholesterol", "blood_pressure", "inflammation"],
    mechanism: "大蒜素(allicin)降空腹血糖+改善胰島素敏感性+降血壓+降膽固醇。硫化物結構類似胰島素。",
    isCore: false,
  },
  {
    id: "turmeric_cooking",
    type: "remedy",
    name: "薑黃粉入菜",
    dose: "½茶匙+黑胡椒一撮",
    cal: 5,
    tags: ["inflammation", "insulin_resistance", "antioxidant"],
    mechanism: "薑黃素降NF-κB和COX-2。研究顯示可能比Metformin更有效活化葡萄糖攝取。胡椒鹼增吸收2000%。",
    isCore: false,
  },
  {
    id: "ceylon_cinnamon",
    type: "remedy",
    name: "錫蘭肉桂粉",
    dose: "½-1茶匙加入燕麥/飲品/料理",
    cal: 5,
    tags: ["blood_sugar", "insulin_resistance", "cholesterol"],
    mechanism: "統合分析：降空腹血糖+改善胰島素阻抗+降膽固醇。延緩胃排空。半茶匙就有效。",
    caution: "⚠️ 必須用錫蘭肉桂(Ceylon)，不是中國肉桂(Cassia)——後者含肝毒性香豆素。",
    isCore: false,
  },
  {
    id: "goji_berry",
    type: "remedy",
    name: "枸杞",
    dose: "10-15g（一小把）加入燕麥/湯/茶",
    cal: 40,
    tags: ["insulin_resistance", "antioxidant", "blood_sugar"],
    mechanism: "枸杞多醣(LBP)促進β細胞增殖、刺激胰島素分泌、改善胰島素阻抗。活化PI3K/AKT/Nrf2預防氧化壓力。統合分析降空腹血糖和三酸甘油脂。",
    tcm: { effect: "補腎益精、養肝明目", nature: "平" },
    caution: "已在吃降血糖藥者注意血糖可能降太低。",
    isCore: false,
  },

  // ── 發酵食品類 ──
  {
    id: "kimchi_remedy",
    type: "remedy",
    name: "泡菜 / 酸菜（發酵食品）",
    dose: "一小碟50-100g當配菜",
    cal: 15,
    tags: ["gut_health", "inflammation", "insulin_resistance"],
    mechanism: "史丹佛研究：10週高發酵食品飲食降19項發炎指標+增腸道菌相多樣性。泡菜RCT：8週降胰島素阻抗+改善胰島素敏感性。乳酸菌+醋酸降餐後血糖。",
    tcm: { effect: "開胃消食", nature: "平" },
    caution: "注意鈉含量。",
    isCore: false,
  },
];

// ── BEHAVIORS（行為） ───────────────────────────

export const BEHAVIORS: BehaviorItem[] = [
  {
    id: "eat_order",
    type: "behavior",
    name: "⚡ 進食順序：菜 → 肉 → 飯",
    dose: "每餐都執行",
    tags: ["blood_sugar", "insulin_resistance"],
    mechanism: "先吃纖維和蛋白質在胃中形成緩衝層，大幅減緩碳水吸收。同一份便當改順序就能降餐後血糖30-40%。零成本零副作用。",
  },
  {
    id: "post_meal_walk",
    type: "behavior",
    name: "🚶 飯後散步 15-20分鐘",
    dose: "輕鬆走就好，不需要快走",
    tags: ["blood_sugar", "insulin_resistance", "weight_loss"],
    mechanism: "餐後散步大幅降低餐後血糖峰值。肌肉收縮增加GLUT4轉位，讓葡萄糖不需要胰島素就能進入肌肉細胞。與Berberine的AMPK效果疊加。CP值最高的免費療法。",
  },
];

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
