/**
 * FoodManager: 食材管理頁面
 *
 * Multi-view state machine for managing food items:
 * - list: search, browse, delete foods
 * - add:  add a new food by nutrition label (plan 02)
 * - edit: edit an existing food (plan 02)
 * - compose: build a composed food from atomic ingredients (plan 03)
 */

import { useState, useEffect } from "react";
import { ItemService } from "../lib/item-service";
import type { FoodItem, HealthTag } from "../data/types";
import { HEALTH_TAG_LABELS, HEALTH_TAG_COLORS } from "../data/types";

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

const ALL_TAGS = Object.keys(HEALTH_TAG_LABELS) as HealthTag[];

function NutritionLabelForm({ food, onSave, onCancel }: NutritionLabelFormProps) {
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
          {ALL_TAGS.map((tag) => {
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

  // ── Back to list ──

  function goBack() {
    setView("list");
    setEditTarget(null);
  }

  // ── Render ────────────────────────────────────────

  // Non-list views
  if (view === "add") {
    return <NutritionLabelForm onSave={handleSave} onCancel={() => setView("list")} />;
  }

  if (view === "edit" && editTarget) {
    return <NutritionLabelForm food={editTarget} onSave={handleSave} onCancel={() => setView("list")} />;
  }

  if (view === "compose") {
    return (
      <div className="px-4 pt-5 pb-4">
        <button
          onClick={goBack}
          className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          ‹ 返回
        </button>
        <div className="text-center text-slate-400 py-12">
          {/* TODO: Plan 03 will implement ComposeForm here */}
          <p>Compose form (Plan 03)</p>
        </div>
      </div>
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
