/**
 * ============================================================
 * MyMenu — 我的菜單頁面
 * ============================================================
 *
 * 瀏覽、載入、重命名、刪除已儲存的菜單預設。
 * - MENU-02: 瀏覽並載入菜單預設
 * - MENU-03: 編輯與刪除菜單預設
 * - MENU-08: 菜單編輯器（新增/編輯食物）
 * - MENU-09: 儲存與更新菜單預設
 */

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { MenuService, type MenuPreset } from "../lib/menu-service";
import { SCHEDULE } from "../data/schedule";
import { resolveItem, type ResolvedItem } from "../data/resolver";
import { saveTodayPlan, loadTodayPlan, todayStr } from "../lib/data-service";
import type { GeneratedSlot } from "../lib/data-service";
import type { FoodItem, HealthTag } from "../data/types";
import { HEALTH_TAG_LABELS, HEALTH_TAG_COLORS } from "../data/types";
import { FOODS, FOOD_MAP } from "../data/foods";
import { ItemService } from "../lib/item-service";

// ── ViewState machine ────────────────────────────────────────

type ViewState = "list" | "editor";

// ── Helper ───────────────────────────────────────────────────

/** 依據儲存的 foodItemIds 重建 GeneratedSlot[] 供今日方案使用 */
function reconstructSlots(foodItemIds: string[][]): GeneratedSlot[] {
  return SCHEDULE.map((slot, idx) => {
    const ids = foodItemIds[idx] ?? [];
    const items = ids.map(resolveItem).filter((x): x is ResolvedItem => x !== null);
    return {
      slot,
      fixed: [],
      selected: [{ poolName: "", items }],
    };
  });
}

// ── MenuEditor sub-component ─────────────────────────────────

function MenuEditor({ preset, onSave, onCancel }: {
  preset: MenuPreset | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  // ── Load foods for lookup (do NOT use resolveItem for macros) ──
  const [allFoods, setAllFoods] = useState<FoodItem[]>([...FOODS]);
  useEffect(() => {
    ItemService.getFoods().then(setAllFoods);
  }, []);
  const foodMap = useMemo(() => new Map(allFoods.map((f) => [f.id, f])), [allFoods]);

  // ── Slot state ────────────────────────────────────────────
  const [menuName, setMenuName] = useState(preset?.name ?? "");
  const [slotFoodIds, setSlotFoodIds] = useState<string[][]>(
    () => SCHEDULE.map((_slot, idx) => preset?.foodItemIds[idx] ? [...preset.foodItemIds[idx]] : [])
  );
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null);
  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null);

  // ── Live nutritional totals ───────────────────────────────
  const totals = useMemo(() => {
    const allIds = slotFoodIds.flat();
    return allIds.reduce(
      (acc, id) => {
        const food = foodMap.get(id);
        if (!food) return acc;
        return {
          cal: acc.cal + food.cal,
          protein: acc.protein + food.protein,
          fat: acc.fat + food.fat,
          carbs: acc.carbs + food.carbs,
        };
      },
      { cal: 0, protein: 0, fat: 0, carbs: 0 }
    );
  }, [slotFoodIds, foodMap]);

  // ── Remove food handler ───────────────────────────────────
  function handleRemoveFood(slotIdx: number, foodIdx: number) {
    setSlotFoodIds((prev) =>
      prev.map((ids, i) => (i === slotIdx ? ids.filter((_, j) => j !== foodIdx) : ids))
    );
  }

  // ── Picker search/filter state ────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState<HealthTag[]>([]);

  // ── Data-derived tag list (per D-07 — NEVER hardcode) ────
  const availableTags = useMemo(() => {
    const tagSet = new Set<HealthTag>();
    allFoods.forEach((f) => (f.tags ?? []).forEach((t) => tagSet.add(t)));
    return [...tagSet].sort();
  }, [allFoods]);

  // ── Filtered food list (user-created first) ──────────────
  const filteredFoods = useMemo(() => {
    let result = [...allFoods].sort((a, b) => {
      const aIsUser = !FOOD_MAP.has(a.id) ? 0 : 1;
      const bIsUser = !FOOD_MAP.has(b.id) ? 0 : 1;
      return aIsUser - bIsUser;
    });
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }
    if (activeTags.length > 0) {
      result = result.filter((f) =>
        activeTags.every((tag) => f.tags?.includes(tag))
      );
    }
    return result;
  }, [allFoods, searchQuery, activeTags]);

  // ── Tag toggle ────────────────────────────────────────────
  function toggleTag(tag: HealthTag) {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  // ── Close picker ──────────────────────────────────────────
  function closePicker() {
    setActiveSlotIdx(null);
    setSearchQuery("");
    setActiveTags([]);
  }

  // ── Add food handler ──────────────────────────────────────
  function handleAddFood(foodId: string) {
    if (activeSlotIdx === null) return;
    setSlotFoodIds((prev) =>
      prev.map((ids, i) => (i === activeSlotIdx ? [...ids, foodId] : ids))
    );
    setActiveSlotIdx(null);
    setSearchQuery("");
    setActiveTags([]);
  }

  // ── Save handler ──────────────────────────────────────────
  function handleSave() {
    const name = menuName.trim() || `菜單 ${todayStr()}`;
    if (preset) {
      MenuService.update({ ...preset, name, foodItemIds: slotFoodIds });
    } else {
      MenuService.save({
        id: crypto.randomUUID(),
        name,
        createdAt: todayStr(),
        foodItemIds: slotFoodIds,
      });
    }
    onSave();
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Sticky totals bar */}
      <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            ← 返回
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition"
          >
            儲存
          </button>
        </div>
        <input
          type="text"
          value={menuName}
          onChange={(e) => setMenuName(e.target.value)}
          placeholder="菜單名稱"
          className="w-full px-3 py-2 mb-3 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
        />
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div>
            <span className="text-slate-400">熱量</span>
            <br />
            <span className="text-amber-400 font-bold">{totals.cal}</span>
          </div>
          <div>
            <span className="text-slate-400">蛋白質</span>
            <br />
            <span className="text-red-400 font-bold">{totals.protein}g</span>
          </div>
          <div>
            <span className="text-slate-400">脂肪</span>
            <br />
            <span className="text-yellow-400 font-bold">{totals.fat}g</span>
          </div>
          <div>
            <span className="text-slate-400">碳水</span>
            <br />
            <span className="text-green-400 font-bold">{totals.carbs}g</span>
          </div>
        </div>
      </div>

      {/* Slot cards or empty state */}
      {SCHEDULE.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-base font-medium">尚無時段排程</p>
          <p className="text-sm mt-1">請先透過 Google Sheets 設定排程</p>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          {SCHEDULE.map((slot, idx) => (
            <div
              key={idx}
              className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpandedSlot(expandedSlot === idx ? null : idx)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-slate-100 font-medium">{slot.label}</span>
                <span className="text-slate-400 text-sm">
                  {slotFoodIds[idx]?.length ?? 0} 項
                </span>
              </button>
              {expandedSlot === idx && (
                <div className="px-4 pb-3 border-t border-slate-700/50">
                  {(slotFoodIds[idx] ?? []).map((foodId, foodIdx) => {
                    const food = foodMap.get(foodId);
                    return (
                      <div
                        key={foodIdx}
                        className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0"
                      >
                        <span className="text-slate-200 text-sm">
                          {food?.name ?? foodId}
                        </span>
                        <button
                          onClick={() => handleRemoveFood(idx, foodIdx)}
                          className="text-red-400 hover:text-red-300 text-xs px-2 py-1"
                        >
                          移除
                        </button>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => setActiveSlotIdx(idx)}
                    className="mt-2 w-full py-2 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-400 text-sm transition"
                  >
                    + 新增食物
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Backdrop — closes picker on tap */}
      {activeSlotIdx !== null && (
        <div
          className="fixed inset-0 bg-black/30 z-30"
          onClick={closePicker}
        />
      )}

      {/* FoodPickerPanel — slide-up panel (NOT a headlessui Dialog) */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 bg-slate-900 border-t border-slate-700 rounded-t-2xl
          transition-transform duration-300 ease-in-out max-h-[70vh] flex flex-col
          ${activeSlotIdx !== null ? "translate-y-0" : "translate-y-full pointer-events-none"}`}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mt-3 mb-2" />

        {/* Header with slot name */}
        <div className="px-4 pb-2 flex items-center justify-between">
          <span className="text-slate-200 font-medium text-sm">
            {activeSlotIdx !== null ? SCHEDULE[activeSlotIdx]?.label ?? "選擇食物" : "選擇食物"}
          </span>
          <button onClick={closePicker} className="text-slate-400 hover:text-slate-200 text-sm">關閉</button>
        </div>

        {/* Search field (per D-06) */}
        <div className="px-4 pb-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋食物..."
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Tag filter chips (per D-07) */}
        {availableTags.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                  activeTags.includes(tag)
                    ? "text-white"
                    : "text-slate-300 bg-slate-800 hover:bg-slate-700"
                }`}
                style={activeTags.includes(tag) ? {
                  backgroundColor: HEALTH_TAG_COLORS[tag],
                } : undefined}
              >
                {HEALTH_TAG_LABELS[tag]}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable food list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {filteredFoods.length === 0 ? (
            <p className="text-center text-slate-500 py-8 text-sm">找不到符合的食物</p>
          ) : (
            filteredFoods.map((food) => (
              <button
                key={food.id}
                onClick={() => handleAddFood(food.id)}
                className="w-full flex items-center justify-between py-3 border-b border-slate-700/30 last:border-0 text-left hover:bg-slate-800/50 transition"
              >
                <div>
                  <span className="text-slate-100 text-sm">{food.name}</span>
                  <span className="text-slate-500 text-xs ml-2">{food.serving}</span>
                </div>
                <span className="text-slate-400 text-xs">{food.cal} kcal</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── MyMenu component ─────────────────────────────────────────

export default function MyMenu() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewState>("list");
  const [editingPreset, setEditingPreset] = useState<MenuPreset | null>(null);
  const [menus, setMenus] = useState<MenuPreset[]>(() => MenuService.getAll());
  const [confirmPreset, setConfirmPreset] = useState<MenuPreset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuPreset | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // ── Editor view ──────────────────────────────────────────

  if (view === "editor") {
    return (
      <MenuEditor
        preset={editingPreset}
        onSave={() => { setMenus(MenuService.getAll()); setView("list"); }}
        onCancel={() => setView("list")}
      />
    );
  }

  // ── Load logic ───────────────────────────────────────────

  function handleLoad(preset: MenuPreset) {
    const current = loadTodayPlan();
    const isLocked = current?.date === todayStr() && (current.checkedIds?.length ?? 0) > 0;
    if (isLocked) {
      setConfirmPreset(preset);
      return;
    }
    applyPreset(preset);
  }

  function applyPreset(preset: MenuPreset) {
    const foodSlots = reconstructSlots(preset.foodItemIds);
    saveTodayPlan({
      date: todayStr(),
      foodSlots,
      checkedIds: [],
      skippedSupplementIds: [],
    });
    navigate("/plan");
  }

  // ── Rename logic ─────────────────────────────────────────

  function startRename(preset: MenuPreset) {
    setEditingId(preset.id);
    setEditName(preset.name);
  }

  function confirmRename() {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (trimmed) {
      MenuService.rename(editingId, trimmed);
      setMenus(MenuService.getAll());
    }
    setEditingId(null);
    setEditName("");
  }

  // ── Delete logic ─────────────────────────────────────────

  function confirmDelete() {
    if (!deleteTarget) return;
    MenuService.delete(deleteTarget.id);
    setMenus(MenuService.getAll());
    setDeleteTarget(null);
  }

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-100">我的菜單</h1>
        <button
          onClick={() => { setEditingPreset(null); setView("editor"); }}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition"
        >
          + 新增菜單
        </button>
      </div>

      {/* Empty state */}
      {menus.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-base font-medium">尚無菜單</p>
          <p className="text-sm mt-1">點擊上方「+ 新增菜單」建立你的第一份菜單</p>
        </div>
      )}

      {/* Menu list (newest first — MenuService.save() unshifts so already newest-first) */}
      {menus.map((preset) => (
        <div
          key={preset.id}
          className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-3 cursor-pointer hover:border-slate-500 transition"
          onClick={() => {
            if (editingId !== preset.id) handleLoad(preset);
          }}
        >
          <div className="flex items-start justify-between gap-2">
            {/* Name / edit input */}
            <div className="flex-1 min-w-0">
              {editingId === preset.id ? (
                <div
                  className="flex gap-2 items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmRename();
                      if (e.key === "Escape") { setEditingId(null); setEditName(""); }
                    }}
                    autoFocus
                    className="flex-1 px-2 py-1 rounded-lg bg-slate-700 border border-slate-500 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={confirmRename}
                    className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
                  >
                    儲存
                  </button>
                  <button
                    onClick={() => { setEditingId(null); setEditName(""); }}
                    className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-xs transition"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <p className="font-bold text-slate-100 truncate">{preset.name}</p>
              )}
              <p className="text-sm text-slate-400 mt-1">
                {preset.foodItemIds.flat().length} 項食物
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{preset.createdAt}</p>
            </div>

            {/* Action buttons */}
            <div
              className="flex gap-1 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { setEditingPreset(preset); setView("editor"); }}
                className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition text-base"
                title="編輯菜單"
              >
                📝
              </button>
              <button
                onClick={() => startRename(preset)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition text-base"
                title="重命名"
              >
                ✏️
              </button>
              <button
                onClick={() => setDeleteTarget(preset)}
                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 transition text-base"
                title="刪除"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Load confirmation dialog */}
      <Dialog open={confirmPreset !== null} onClose={() => setConfirmPreset(null)} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/50 transition duration-200 data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl p-5 transition duration-300 data-[closed]:scale-95 data-[closed]:opacity-0"
          >
            <h3 className="text-lg font-bold text-slate-100 mb-2">載入菜單</h3>
            <p className="text-sm text-slate-400 mb-4">
              目前已有已勾選項目，載入菜單將清除紀錄。確定要載入嗎？
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmPreset(null)}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 transition"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (confirmPreset) applyPreset(confirmPreset);
                  setConfirmPreset(null);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition"
              >
                確定載入
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/50 transition duration-200 data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl p-5 transition duration-300 data-[closed]:scale-95 data-[closed]:opacity-0"
          >
            <h3 className="text-lg font-bold text-slate-100 mb-2">刪除菜單</h3>
            <p className="text-sm text-slate-400 mb-4">
              確定要刪除「{deleteTarget?.name}」嗎？
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 transition"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition"
              >
                刪除
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
