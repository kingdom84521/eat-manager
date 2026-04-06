/**
 * FoodManager: 食材管理頁面
 *
 * Multi-view state machine for managing food items:
 * - list: search, browse, delete foods
 * - add:  add a new food by nutrition label (plan 02)
 * - edit: edit an existing food (plan 02)
 * - compose: build a composed food from atomic ingredients (plan 03)
 */

import { useState, useEffect, useMemo } from "react";
import { ItemService } from "../lib/item-service";
import { SettingsService } from "../lib/settings-service";
import type { FoodItem, HealthTag } from "../data/types";
import { HEALTH_TAG_LABELS, HEALTH_TAG_COLORS } from "../data/types";

// ── Open Food Facts Types ─────────────────────────

interface OffProduct {
  product_name: string;
  serving_size?: string;
  image_front_small_url?: string;
  nutriments: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    fat_100g?: number;
    carbohydrates_100g?: number;
    sodium_100g?: number;
  };
}

// ── View State Machine ────────────────────────────

type ViewState = "list" | "add" | "edit" | "compose";

// ── Reference Guard ───────────────────────────────

function isIngredientInUse(foodId: string, allFoods: FoodItem[]): boolean {
  return allFoods.some((f) => f.ingredients?.some((ing) => ing.foodId === foodId) ?? false);
}

// ── Shared Input Style ────────────────────────────

const INPUT_CLASS =
  "w-full bg-slate-800 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500";

// ── NutritionLabelForm Sub-component ─────────────

interface NutritionLabelFormProps {
  food?: FoodItem;
  allFoods: FoodItem[];
  onSave: (food: FoodItem) => void;
  onCancel: () => void;
}

interface FoodFormDraft {
  name: string;
  serving: string;
  cal: string;
  protein: string;
  fat: string;
  carbs: string;
  sugar: string;
  sodium: string;
  source: string;
  tags: HealthTag[];
}

function NutritionLabelForm({ food, allFoods, onSave, onCancel }: NutritionLabelFormProps) {
  const isEdit = food !== undefined;

  const [draft, setDraft] = useState<FoodFormDraft>({
    name: food?.name ?? "",
    serving: food?.serving ?? "",
    cal: food?.cal !== undefined ? String(food.cal) : "0",
    protein: food?.protein !== undefined ? String(food.protein) : "0",
    fat: food?.fat !== undefined ? String(food.fat) : "0",
    carbs: food?.carbs !== undefined ? String(food.carbs) : "0",
    sugar: food?.sugar !== undefined ? String(food.sugar) : "",
    sodium: food?.sodium !== undefined ? String(food.sodium) : "0",
    source: food?.source ?? "",
    tags: food?.tags ?? [],
  });

  const [nameError, setNameError] = useState("");
  const [servingError, setServingError] = useState("");

  // Derive available tags from all existing foods + current draft tags
  const availableTags = useMemo(() => {
    const tagSet = new Set<HealthTag>(draft.tags);
    allFoods.forEach((f) => (f.tags ?? []).forEach((t) => tagSet.add(t)));
    return [...tagSet].sort();
  }, [allFoods, draft.tags]);

  function setField<K extends keyof FoodFormDraft>(key: K, value: FoodFormDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function toggleTag(tag: HealthTag) {
    setDraft((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  }

  function handleSubmit() {
    let hasError = false;
    if (!draft.name.trim()) {
      setNameError("請輸入食材名稱");
      hasError = true;
    } else {
      setNameError("");
    }
    if (!draft.serving.trim()) {
      setServingError("請輸入份量");
      hasError = true;
    } else {
      setServingError("");
    }
    if (hasError) return;

    const foodItem: FoodItem = {
      id: food?.id ?? `food_${Date.now()}`,
      type: "food",
      name: draft.name.trim(),
      serving: draft.serving.trim(),
      cal: parseFloat(draft.cal) || 0,
      protein: parseFloat(draft.protein) || 0,
      fat: parseFloat(draft.fat) || 0,
      carbs: parseFloat(draft.carbs) || 0,
      sugar: draft.sugar.trim() ? parseFloat(draft.sugar) : undefined,
      sodium: parseFloat(draft.sodium) || 0,
      source: draft.source.trim(),
      tags: draft.tags.length > 0 ? draft.tags : undefined,
      ingredients: food?.ingredients,
    };
    onSave(foodItem);
  }

  return (
    <div className="px-4 pt-5 pb-24">
      {/* Header */}
      <header className="flex items-center gap-3 mb-5">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="返回"
        >
          ‹
        </button>
        <h1 className="text-xl font-bold">{isEdit ? "編輯食材" : "新增食材"}</h1>
      </header>

      {/* Name */}
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-1">食材名稱</label>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setField("name", e.target.value)}
          placeholder="食材名稱"
          className={INPUT_CLASS}
        />
        {nameError && <p className="mt-1 text-xs text-red-400">{nameError}</p>}
      </div>

      {/* Serving */}
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-1">份量</label>
        <input
          type="text"
          value={draft.serving}
          onChange={(e) => setField("serving", e.target.value)}
          placeholder="份量 (例：100g, 1片)"
          className={INPUT_CLASS}
        />
        {servingError && <p className="mt-1 text-xs text-red-400">{servingError}</p>}
      </div>

      {/* Numeric fields in 2-column grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">熱量 (kcal)</label>
          <input
            type="number"
            min="0"
            value={draft.cal}
            onChange={(e) => setField("cal", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">蛋白質 (g)</label>
          <input
            type="number"
            min="0"
            value={draft.protein}
            onChange={(e) => setField("protein", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">脂肪 (g)</label>
          <input
            type="number"
            min="0"
            value={draft.fat}
            onChange={(e) => setField("fat", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">碳水化合物 (g)</label>
          <input
            type="number"
            min="0"
            value={draft.carbs}
            onChange={(e) => setField("carbs", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">糖 (g)</label>
          <input
            type="number"
            min="0"
            value={draft.sugar}
            onChange={(e) => setField("sugar", e.target.value)}
            placeholder="選填"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">鈉 (mg)</label>
          <input
            type="number"
            min="0"
            value={draft.sodium}
            onChange={(e) => setField("sodium", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {/* Source */}
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-1">資料來源</label>
        <input
          type="text"
          value={draft.source}
          onChange={(e) => setField("source", e.target.value)}
          placeholder="資料來源 (例：7-11 標示)"
          className={INPUT_CLASS}
        />
      </div>

      {/* Tags */}
      <div className="mb-6">
        <label className="block text-xs text-slate-400 mb-2">健康標籤</label>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => {
            const selected = draft.tags.includes(tag);
            const color = HEALTH_TAG_COLORS[tag];
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                  selected ? "" : "bg-slate-700/50 text-slate-300"
                }`}
                style={
                  selected
                    ? { backgroundColor: color + "30", color, borderWidth: 1, borderColor: color + "60" }
                    : {}
                }
              >
                {HEALTH_TAG_LABELS[tag]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSubmit}
        className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors"
      >
        儲存食材
      </button>
    </div>
  );
}

// ── ComposeForm Helpers ───────────────────────────

interface IngredientEntry {
  foodId: string;
  grams: number;
}

interface TotalsResult {
  cal: number;
  protein: number;
  fat: number;
  carbs: number;
  sodium: number;
}

function calcTotals(ings: IngredientEntry[], foodMap: Map<string, FoodItem>): TotalsResult {
  return ings.reduce<TotalsResult>(
    (acc, ing) => {
      const food = foodMap.get(ing.foodId);
      if (!food) return acc;
      const ratio = ing.grams / 100;
      return {
        cal: acc.cal + food.cal * ratio,
        protein: acc.protein + food.protein * ratio,
        fat: acc.fat + food.fat * ratio,
        carbs: acc.carbs + food.carbs * ratio,
        sodium: acc.sodium + food.sodium * ratio,
      };
    },
    { cal: 0, protein: 0, fat: 0, carbs: 0, sodium: 0 }
  );
}

function offProductToFood(p: OffProduct): FoodItem {
  const n = p.nutriments;
  return {
    id: `food_${Date.now()}`,
    type: "food",
    name: p.product_name ?? "未知食品",
    serving: "100g",
    cal: Math.round(n["energy-kcal_100g"] ?? 0),
    protein: Math.round((n.proteins_100g ?? 0) * 10) / 10,
    fat: Math.round((n.fat_100g ?? 0) * 10) / 10,
    carbs: Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
    sodium: Math.round((n.sodium_100g ?? 0) * 1000),
    source: "Open Food Facts",
  };
}

// ── IngredientRow Sub-component ───────────────────

interface IngredientRowProps {
  entry: IngredientEntry;
  atomicFoods: FoodItem[];
  onChange: (updated: IngredientEntry) => void;
  onRemove: () => void;
}

function IngredientRow({ entry, atomicFoods, onChange, onRemove }: IngredientRowProps) {
  const [query, setQuery] = useState(() => {
    const found = atomicFoods.find((f) => f.id === entry.foodId);
    return found ? found.name : "";
  });
  const [showDropdown, setShowDropdown] = useState(false);

  const matches = query.trim()
    ? atomicFoods.filter((f) => f.name.includes(query)).slice(0, 8)
    : [];

  function selectFood(food: FoodItem) {
    setQuery(food.name);
    setShowDropdown(false);
    onChange({ ...entry, foodId: food.id });
  }

  return (
    <div className="flex items-start gap-2 mb-2">
      {/* Food selector */}
      <div className="relative flex-1">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          placeholder="選擇食材..."
          className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
        />
        {showDropdown && matches.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {matches.map((food) => (
              <li
                key={food.id}
                onMouseDown={() => selectFood(food)}
                className="px-3 py-2 text-sm text-slate-100 cursor-pointer hover:bg-slate-700"
              >
                {food.name}
                <span className="ml-2 text-xs text-slate-400">{food.cal} kcal/100g</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Grams input */}
      <input
        type="number"
        min="0"
        value={entry.grams}
        onChange={(e) => onChange({ ...entry, grams: parseFloat(e.target.value) || 0 })}
        placeholder="克"
        className="w-20 bg-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
      />
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="w-8 h-9 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-red-900/60 text-slate-400 hover:text-red-400 text-sm transition-colors shrink-0"
        aria-label="移除食材"
      >
        ✕
      </button>
    </div>
  );
}

// ── OffSearchPanel Sub-component ──────────────────

interface OffSearchPanelProps {
  onAddFood: (food: FoodItem) => Promise<void>;
  onClose: () => void;
}

function OffSearchPanel({ onAddFood, onClose }: OffSearchPanelProps) {
  const [offQuery, setOffQuery] = useState("");
  const [offResults, setOffResults] = useState<OffProduct[]>([]);
  const [offLoading, setOffLoading] = useState(false);
  const [offError, setOffError] = useState("");

  useEffect(() => {
    if (!offQuery.trim()) {
      setOffResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setOffLoading(true);
      setOffError("");
      try {
        const gasUrl = SettingsService.getSheetsConfig()?.gasUrl || import.meta.env.VITE_GAS_URL;
        const url = `${gasUrl}?action=proxyOff&query=${encodeURIComponent(offQuery)}&pageSize=10`;
        const res = await fetch(url);
        const data = await res.json() as { products?: OffProduct[]; error?: string };
        if (data.error) {
          setOffError(data.error);
          setOffResults([]);
        } else {
          setOffResults(data.products ?? []);
        }
      } catch {
        setOffError("無法連線 Open Food Facts");
        setOffResults([]);
      } finally {
        setOffLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [offQuery]);

  return (
    <div className="bg-slate-800 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-200">搜尋 Open Food Facts</span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 text-sm transition-colors"
        >
          關閉
        </button>
      </div>
      <input
        type="text"
        value={offQuery}
        onChange={(e) => setOffQuery(e.target.value)}
        placeholder="輸入食品名稱..."
        className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 mb-3"
        autoFocus
      />
      {offLoading && (
        <p className="text-xs text-slate-400 text-center py-2">搜尋中（OFF 不穩定時可能需要幾秒）...</p>
      )}
      {offError && (
        <p className="text-xs text-amber-400 text-center py-2">⚠ {offError}</p>
      )}
      {!offLoading && offQuery.trim() && offResults.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-2">找不到結果</p>
      )}
      {offResults.map((product, idx) => (
        <button
          key={idx}
          onClick={async () => {
            const food = offProductToFood(product);
            await onAddFood(food);
            onClose();
          }}
          className="w-full bg-slate-700/30 rounded-lg p-2 mb-1 cursor-pointer hover:bg-slate-700/50 transition-colors flex items-center gap-2 text-left"
        >
          {product.image_front_small_url && (
            <img
              src={product.image_front_small_url}
              alt=""
              className="w-6 h-6 rounded object-cover shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-100 truncate">{product.product_name || "未知食品"}</p>
            <p className="text-xs text-slate-400">
              {Math.round(product.nutriments["energy-kcal_100g"] ?? 0)} kcal / 100g
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── ComposeForm Sub-component ─────────────────────

interface ComposeFormProps {
  foods: FoodItem[];
  onSave: (food: FoodItem) => void;
  onCancel: () => void;
  onAddFromOff: (food: FoodItem) => Promise<void>;
}

function ComposeForm({ foods, onSave, onCancel, onAddFromOff }: ComposeFormProps) {
  const [name, setName] = useState("");
  const [serving, setServing] = useState("");
  const [ingredients, setIngredients] = useState<IngredientEntry[]>([]);
  const [showOffSearch, setShowOffSearch] = useState(false);
  const [nameError, setNameError] = useState("");
  const [ingredientError, setIngredientError] = useState("");

  // Only non-composed (atomic) foods can be used as ingredients
  const atomicFoods = foods.filter((f) => !f.ingredients?.length);

  // Build lookup map for O(1) access
  const foodMap = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);

  // Live macro recalculation on every render
  const totals = calcTotals(ingredients, foodMap);

  function addIngredientRow() {
    setIngredients((prev) => [...prev, { foodId: "", grams: 100 }]);
  }

  function updateIngredient(idx: number, updated: IngredientEntry) {
    setIngredients((prev) => prev.map((row, i) => (i === idx ? updated : row)));
  }

  function removeIngredient(idx: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleComposeSave() {
    let hasError = false;
    if (!name.trim()) {
      setNameError("請輸入食材名稱");
      hasError = true;
    } else {
      setNameError("");
    }

    const validIngredients = ingredients.filter((i) => i.foodId && i.grams > 0);
    if (validIngredients.length === 0) {
      setIngredientError("請至少新增一個食材");
      hasError = true;
    } else {
      setIngredientError("");
    }

    if (hasError) return;

    const t = calcTotals(validIngredients, foodMap);
    const food: FoodItem = {
      id: `food_${Date.now()}`,
      type: "food",
      name: name.trim(),
      serving: serving.trim() || `${validIngredients.length} 種食材`,
      cal: Math.round(t.cal * 10) / 10,
      protein: Math.round(t.protein * 10) / 10,
      fat: Math.round(t.fat * 10) / 10,
      carbs: Math.round(t.carbs * 10) / 10,
      sodium: Math.round(t.sodium),
      source: "自行組合",
      ingredients: validIngredients,
    };
    onSave(food);
  }

  return (
    <div className="px-4 pt-5 pb-24">
      {/* Header */}
      <header className="flex items-center gap-3 mb-5">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="返回"
        >
          ‹
        </button>
        <h1 className="text-xl font-bold">組合食材</h1>
      </header>

      {/* Name */}
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-1">組合名稱</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：健身午餐便當"
          className={INPUT_CLASS}
        />
        {nameError && <p className="mt-1 text-xs text-red-400">{nameError}</p>}
      </div>

      {/* Serving (optional) */}
      <div className="mb-5">
        <label className="block text-xs text-slate-400 mb-1">份量（選填）</label>
        <input
          type="text"
          value={serving}
          onChange={(e) => setServing(e.target.value)}
          placeholder="例：1 份便當"
          className={INPUT_CLASS}
        />
      </div>

      {/* Macro Totals Card */}
      <div className="bg-slate-700/30 rounded-lg p-3 mb-3">
        <p className="text-sm font-bold text-white mb-1">
          熱量: {Math.round(totals.cal * 10) / 10} kcal
        </p>
        <p className="text-xs text-slate-400">
          蛋白質: {totals.protein.toFixed(1)} g &nbsp;|&nbsp; 脂肪: {totals.fat.toFixed(1)} g &nbsp;|&nbsp; 碳水: {totals.carbs.toFixed(1)} g
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          鈉: {Math.round(totals.sodium)} mg
        </p>
      </div>

      {/* Ingredient List */}
      <div className="mb-2">
        <label className="block text-xs text-slate-400 mb-2">食材清單</label>
        {ingredients.map((entry, idx) => (
          <IngredientRow
            key={idx}
            entry={entry}
            atomicFoods={atomicFoods}
            onChange={(updated) => updateIngredient(idx, updated)}
            onRemove={() => removeIngredient(idx)}
          />
        ))}
        {ingredientError && <p className="mb-2 text-xs text-red-400">{ingredientError}</p>}
        <button
          onClick={addIngredientRow}
          className="w-full py-2 rounded-lg border border-dashed border-slate-600 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors"
        >
          + 新增食材
        </button>
      </div>

      {/* OFF Search Toggle */}
      <div className="mb-5 mt-4">
        {!showOffSearch ? (
          <button
            onClick={() => setShowOffSearch(true)}
            className="w-full py-2 rounded-lg bg-emerald-900/30 border border-emerald-700/30 text-sm text-emerald-400 hover:bg-emerald-900/50 transition-colors"
          >
            搜尋 Open Food Facts
          </button>
        ) : (
          <OffSearchPanel
            onAddFood={async (food) => {
              await onAddFromOff(food);
              setIngredients((prev) => [...prev, { foodId: food.id, grams: 100 }]);
            }}
            onClose={() => setShowOffSearch(false)}
          />
        )}
      </div>

      {/* Save button */}
      <button
        onClick={handleComposeSave}
        className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-colors"
      >
        儲存組合食材
      </button>
    </div>
  );
}

// ── FoodCard Sub-component ────────────────────────

interface FoodCardProps {
  food: FoodItem;
  onTap: () => void;
  onDelete: () => void;
}

function FoodCard({ food, onTap, onDelete }: FoodCardProps) {
  const isComposed = (food.ingredients?.length ?? 0) > 0;

  return (
    <div
      onClick={onTap}
      className={`rounded-lg p-3 mb-2 cursor-pointer bg-slate-800/50 border-l-4 flex items-center justify-between ${
        isComposed ? "border-violet-500/50" : "border-amber-500/30"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-bold text-sm text-slate-100 truncate">{food.name}</span>
          {isComposed && (
            <span className="shrink-0 text-xs bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded font-medium">
              組合
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400">
          {food.serving} &middot; {food.cal} kcal
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="ml-3 shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-slate-700 hover:bg-red-900/60 text-slate-400 hover:text-red-400 text-sm transition-colors"
        aria-label="刪除食材"
      >
        ✕
      </button>
    </div>
  );
}

// ── FAB (Floating Action Button) ──────────────────

interface FabProps {
  onAddNutrition: () => void;
  onCompose: () => void;
}

function Fab({ onAddNutrition, onCompose }: FabProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-24 right-4 flex flex-col items-end gap-2">
      {expanded && (
        <>
          <button
            onClick={() => {
              setExpanded(false);
              onCompose();
            }}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg transition-colors"
          >
            組合食材
          </button>
          <button
            onClick={() => {
              setExpanded(false);
              onAddNutrition();
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg transition-colors"
          >
            營養標示
          </button>
        </>
      )}
      <button
        onClick={() => setExpanded((e) => !e)}
        className={`w-14 h-14 rounded-full shadow-lg text-white text-2xl font-bold flex items-center justify-center transition-all ${
          expanded ? "bg-slate-600 rotate-45" : "bg-blue-600 hover:bg-blue-500"
        }`}
        aria-label="新增食材"
      >
        +
      </button>
    </div>
  );
}

// ── Main Page Component ───────────────────────────

export default function FoodManager() {
  // ── State ──

  const [view, setView] = useState<ViewState>("list");
  const [editTarget, setEditTarget] = useState<FoodItem | null>(null);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // ── Load foods on mount ──

  useEffect(() => {
    ItemService.getFoods().then(setFoods).catch(() => {});
  }, []);

  // ── Filtered list ──

  const filteredFoods = searchTerm
    ? foods.filter((f) => f.name.includes(searchTerm))
    : foods;

  // ── Delete handler ──

  async function handleDelete(id: string) {
    if (isIngredientInUse(id, foods)) {
      alert("此食材被其他組合食材使用中");
      return;
    }
    if (!window.confirm("確定要刪除此食材？")) return;
    await ItemService.deleteFood(id);
    setFoods((prev) => prev.filter((f) => f.id !== id));
  }

  // ── Edit handler ──

  function handleTapFood(food: FoodItem) {
    setEditTarget(food);
    setView("edit");
  }

  // ── Save handler (used by add/edit/compose sub-forms in plans 02/03) ──

  async function handleSave(food: FoodItem) {
    await ItemService.saveFood(food);
    const updated = await ItemService.getFoods();
    setFoods(updated);
    setView("list");
    setEditTarget(null);
  }

  // ── Add from OFF handler (saves food, refreshes list, returns food for ingredient wiring) ──

  async function handleAddFromOff(food: FoodItem): Promise<void> {
    await ItemService.saveFood(food);
    const updated = await ItemService.getFoods();
    setFoods(updated);
  }

  // ── Back to list ──

  function goBack() {
    setView("list");
    setEditTarget(null);
  }

  // ── Render ────────────────────────────────────────

  // Non-list views
  if (view === "add") {
    return <NutritionLabelForm allFoods={foods} onSave={handleSave} onCancel={() => setView("list")} />;
  }

  if (view === "edit" && editTarget) {
    return <NutritionLabelForm food={editTarget} allFoods={foods} onSave={handleSave} onCancel={() => setView("list")} />;
  }

  if (view === "compose") {
    return (
      <ComposeForm
        foods={foods}
        onSave={handleSave}
        onCancel={goBack}
        onAddFromOff={handleAddFromOff}
      />
    );
  }

  // ── List View ──────────────────────────────────

  return (
    <div className="px-4 pt-5 pb-4">
      {/* Page Header */}
      <header className="text-center mb-5">
        <h1 className="text-xl font-bold">食材管理</h1>
      </header>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="搜尋食材..."
          className="w-full bg-slate-800 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Food List */}
      {filteredFoods.length > 0 ? (
        <div>
          {filteredFoods.map((food) => (
            <FoodCard
              key={food.id}
              food={food}
              onTap={() => handleTapFood(food)}
              onDelete={() => handleDelete(food.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-500">
          <p className="text-sm">
            {searchTerm ? "找不到符合的食材" : "尚無食材，點擊下方「+」新增"}
          </p>
        </div>
      )}

      {/* FAB */}
      <Fab
        onAddNutrition={() => setView("add")}
        onCompose={() => setView("compose")}
      />
    </div>
  );
}
