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
import type { FoodItem } from "../data/types";

// ── View State Machine ────────────────────────────

type ViewState = "list" | "add" | "edit" | "compose";

// ── Reference Guard ───────────────────────────────

function isIngredientInUse(foodId: string, allFoods: FoodItem[]): boolean {
  return allFoods.some((f) => f.ingredients?.some((ing) => ing.foodId === foodId) ?? false);
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

  // Non-list views render placeholder content (plans 02/03 will fill these in)
  if (view === "add") {
    return (
      <div className="px-4 pt-5 pb-4">
        <button
          onClick={goBack}
          className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          ‹ 返回
        </button>
        <div className="text-center text-slate-400 py-12">
          {/* TODO: Plan 02 will implement NutritionForm here */}
          <p>Add form (Plan 02)</p>
        </div>
        {/* Expose handleSave for plan 02 integration — suppress unused warning */}
        <span className="hidden" data-save={String(typeof handleSave)} />
      </div>
    );
  }

  if (view === "edit") {
    return (
      <div className="px-4 pt-5 pb-4">
        <button
          onClick={goBack}
          className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          ‹ 返回
        </button>
        <div className="text-center text-slate-400 py-12">
          {/* TODO: Plan 02 will implement NutritionForm here */}
          <p>Edit form (Plan 02)</p>
          {editTarget && <p className="text-xs mt-1">編輯：{editTarget.name}</p>}
        </div>
      </div>
    );
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
