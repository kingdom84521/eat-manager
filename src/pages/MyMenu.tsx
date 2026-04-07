/**
 * ============================================================
 * MyMenu — 我的菜單頁面
 * ============================================================
 *
 * 瀏覽、載入、重命名、刪除已儲存的菜單預設。
 * - MENU-02: 瀏覽並載入菜單預設
 * - MENU-03: 編輯與刪除菜單預設
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { MenuService, type MenuPreset } from "../lib/menu-service";
import { SCHEDULE } from "../data/schedule";
import { resolveItem, type ResolvedItem } from "../data/resolver";
import { saveTodayPlan, loadTodayPlan, todayStr } from "../lib/data-service";
import type { GeneratedSlot } from "../lib/data-service";

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

// ── Component ────────────────────────────────────────────────

export default function MyMenu() {
  const navigate = useNavigate();
  const [menus, setMenus] = useState<MenuPreset[]>(() => MenuService.getAll());
  const [confirmPreset, setConfirmPreset] = useState<MenuPreset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuPreset | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

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
      <h1 className="text-xl font-bold text-slate-100 mb-4">我的菜單</h1>

      {/* Empty state */}
      {menus.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-base font-medium">尚無菜單</p>
          <p className="text-sm mt-1">從今日方案儲存你的第一份菜單</p>
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
