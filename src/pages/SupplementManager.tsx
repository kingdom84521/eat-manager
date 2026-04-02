/**
 * SupplementManager: 補品管理頁面
 *
 * Multi-view state machine for managing supplement items:
 * - list: search, filter, browse, delete supplements with inventory status
 * - add:  add a new supplement
 * - edit: edit an existing supplement
 */

import { useState, useEffect, useMemo } from "react";
import { ItemService } from "../lib/item-service";
import type { SupplementItem, InventoryEntry, HealthTag, SupplementTiming } from "../data/types";
import {
  HEALTH_TAG_LABELS,
  HEALTH_TAG_COLORS,
  SUPPLEMENT_TIMING_LABELS,
} from "../data/types";

// ── View State Machine ────────────────────────────

type ViewState = "list" | "add" | "edit";

// ── Shared Input Style ────────────────────────────

const INPUT_CLASS =
  "w-full bg-slate-800 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500";

// ── Constants ─────────────────────────────────────

const ALL_TIMING_VALUES = Object.keys(SUPPLEMENT_TIMING_LABELS) as SupplementTiming[];
const ALL_TAGS = Object.keys(HEALTH_TAG_LABELS) as HealthTag[];

// ── Inventory Helpers ─────────────────────────────

function calcDaysRemaining(
  suppId: string,
  unitsPerDose: number,
  dosesPerDay: number,
  inv: InventoryEntry[]
): number | null {
  const entries = inv.filter((e) => e.supplementId === suppId);
  if (entries.length === 0) return null;
  const totalPurchased = entries.reduce((sum, e) => sum + e.purchasedUnits, 0);
  const dailyUsage = unitsPerDose * dosesPerDay;
  if (dailyUsage <= 0) return null;
  return totalPurchased / dailyUsage;
}

function calcRemainingUnits(suppId: string, inv: InventoryEntry[]): number {
  return inv.filter((e) => e.supplementId === suppId).reduce((sum, e) => sum + e.purchasedUnits, 0);
}

function inventoryColor(daysLeft: number | null): "green" | "amber" | "red" | "gray" {
  if (daysLeft === null) return "gray";
  if (daysLeft > 14) return "green";
  if (daysLeft >= 7) return "amber";
  return "red";
}

const INV_COLORS = {
  green: "bg-emerald-500/20 text-emerald-400",
  amber: "bg-amber-500/20 text-amber-400",
  red: "bg-red-500/20 text-red-400",
  gray: "bg-slate-700/50 text-slate-500",
} as const;

// ── SupplementCard Sub-component ──────────────────

interface SupplementCardProps {
  supp: SupplementItem;
  daysLeft: number | null;
  remainingUnits: number;
  onTap: () => void;
  onDelete: () => void;
}

function SupplementCard({ supp, daysLeft, remainingUnits, onTap, onDelete }: SupplementCardProps) {
  const color = inventoryColor(daysLeft);

  return (
    <div
      onClick={onTap}
      className="bg-slate-800/50 rounded-lg p-3 mb-2 cursor-pointer border-l-4 border-blue-500/50 flex items-start justify-between"
    >
      <div className="flex-1 min-w-0">
        {/* Row 1: Name + brand + isActive indicator */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-sm text-slate-100 truncate">{supp.name}</span>
          {supp.brand && (
            <span className="text-xs text-slate-400 shrink-0">{supp.brand}</span>
          )}
          <span
            className={`shrink-0 inline-block w-2 h-2 rounded-full ${supp.isActive ? "bg-emerald-500" : "bg-slate-600"}`}
            title={supp.isActive ? "啟用中" : "停用"}
          />
        </div>

        {/* Row 2: Dosage + timing badges */}
        <div className="flex items-center flex-wrap gap-1 mb-1">
          <span className="text-xs text-slate-400">{supp.dosagePerUnit}</span>
          {supp.timing.map((t) => (
            <span
              key={t}
              className="bg-blue-600/30 text-blue-300 text-[10px] px-1.5 py-0.5 rounded-full"
            >
              {SUPPLEMENT_TIMING_LABELS[t]}
            </span>
          ))}
        </div>

        {/* Row 3: Health tag chips */}
        {supp.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {supp.tags.map((tag) => {
              const color = HEALTH_TAG_COLORS[tag];
              return (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: color + "30", color, borderWidth: 1, borderColor: color + "60" }}
                >
                  {HEALTH_TAG_LABELS[tag]}
                </span>
              );
            })}
          </div>
        )}

        {/* Row 4: Inventory status */}
        <div className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full ${INV_COLORS[color]}`}>
          {daysLeft === null
            ? "尚無庫存"
            : `剩餘 ${remainingUnits} 顆 · 約 ${Math.round(daysLeft)} 天`}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="ml-3 shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-slate-700 hover:bg-red-900/60 text-slate-400 hover:text-red-400 text-sm transition-colors"
        aria-label="刪除補品"
      >
        ✕
      </button>
    </div>
  );
}

// ── SupplementForm Sub-component ──────────────────

interface SupplementFormProps {
  supp?: SupplementItem;
  onSave: (s: SupplementItem) => void;
  onCancel: () => void;
}

interface SupplementFormDraft {
  name: string;
  brand: string;
  dosagePerUnit: string;
  unitsPerDose: string;
  dosesPerDay: string;
  timing: SupplementTiming[];
  tags: HealthTag[];
  isActive: boolean;
  mechanism: string;
  caution: string;
}

function SupplementForm({ supp, onSave, onCancel }: SupplementFormProps) {
  const isEdit = supp !== undefined;

  const [draft, setDraft] = useState<SupplementFormDraft>({
    name: supp?.name ?? "",
    brand: supp?.brand ?? "",
    dosagePerUnit: supp?.dosagePerUnit ?? "",
    unitsPerDose: supp?.unitsPerDose !== undefined ? String(supp.unitsPerDose) : "1",
    dosesPerDay: supp?.dosesPerDay !== undefined ? String(supp.dosesPerDay) : "1",
    timing: supp?.timing ?? [],
    tags: supp?.tags ?? [],
    isActive: supp?.isActive ?? true,
    mechanism: supp?.mechanism ?? "",
    caution: supp?.caution ?? "",
  });

  const [nameError, setNameError] = useState("");
  const [dosageError, setDosageError] = useState("");

  function setField<K extends keyof SupplementFormDraft>(key: K, value: SupplementFormDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function toggleTiming(t: SupplementTiming) {
    setDraft((prev) => ({
      ...prev,
      timing: prev.timing.includes(t)
        ? prev.timing.filter((x) => x !== t)
        : [...prev.timing, t],
    }));
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
    if (!draft.name.trim()) {
      setNameError("請輸入補品名稱");
      return;
    }
    if (!draft.dosagePerUnit.trim()) {
      setDosageError("請輸入劑量");
      return;
    }
    setNameError("");
    setDosageError("");

    const item: SupplementItem = {
      id: supp?.id ?? `supp_${Date.now()}`,
      type: "supplement",
      name: draft.name.trim(),
      brand: draft.brand.trim() || undefined,
      dosagePerUnit: draft.dosagePerUnit.trim(),
      unitsPerDose: parseFloat(draft.unitsPerDose) || 1,
      dosesPerDay: parseFloat(draft.dosesPerDay) || 1,
      timing: draft.timing,
      tags: draft.tags,
      interactions: supp?.interactions ?? [],
      synergies: supp?.synergies ?? [],
      mechanism: draft.mechanism.trim() || undefined,
      caution: draft.caution.trim() || undefined,
      tcm: supp?.tcm,
      isActive: draft.isActive,
    };
    onSave(item);
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
        <h1 className="text-xl font-bold">{isEdit ? "編輯補品" : "新增補品"}</h1>
      </header>

      {/* Name */}
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-1">補品名稱</label>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setField("name", e.target.value)}
          placeholder="補品名稱"
          className={INPUT_CLASS}
        />
        {nameError && <p className="mt-1 text-xs text-red-400">{nameError}</p>}
      </div>

      {/* Brand */}
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-1">品牌（選填）</label>
        <input
          type="text"
          value={draft.brand}
          onChange={(e) => setField("brand", e.target.value)}
          placeholder="品牌名稱"
          className={INPUT_CLASS}
        />
      </div>

      {/* Dosage per unit */}
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-1">每顆劑量</label>
        <input
          type="text"
          value={draft.dosagePerUnit}
          onChange={(e) => setField("dosagePerUnit", e.target.value)}
          placeholder="例：500mg"
          className={INPUT_CLASS}
        />
        {dosageError && <p className="mt-1 text-xs text-red-400">{dosageError}</p>}
      </div>

      {/* Units per dose + doses per day */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">每次服用顆數</label>
          <input
            type="number"
            min="1"
            value={draft.unitsPerDose}
            onChange={(e) => setField("unitsPerDose", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">每日服用次數</label>
          <input
            type="number"
            min="1"
            value={draft.dosesPerDay}
            onChange={(e) => setField("dosesPerDay", e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {/* Timing multi-select chips */}
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-2">服用時機</label>
        <div className="flex flex-wrap gap-2">
          {ALL_TIMING_VALUES.map((t) => {
            const selected = draft.timing.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleTiming(t)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                  selected
                    ? "bg-blue-600/30 text-blue-300 border border-blue-600/60"
                    : "bg-slate-700/50 text-slate-300"
                }`}
              >
                {SUPPLEMENT_TIMING_LABELS[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Health tags */}
      <div className="mb-4">
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

      {/* isActive toggle */}
      <div className="mb-4 flex items-center justify-between">
        <label className="text-sm text-slate-300">納入每日排程</label>
        <button
          onClick={() => setField("isActive", !draft.isActive)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            draft.isActive ? "bg-blue-600" : "bg-slate-700"
          }`}
          aria-label={draft.isActive ? "停用" : "啟用"}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transform transition-transform ${
              draft.isActive ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Mechanism */}
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-1">作用機制（選填）</label>
        <textarea
          value={draft.mechanism}
          onChange={(e) => setField("mechanism", e.target.value)}
          placeholder="作用機制（選填）"
          rows={3}
          className={INPUT_CLASS}
        />
      </div>

      {/* Caution */}
      <div className="mb-6">
        <label className="block text-xs text-slate-400 mb-1">注意事項（選填）</label>
        <textarea
          value={draft.caution}
          onChange={(e) => setField("caution", e.target.value)}
          placeholder="注意事項（選填）"
          rows={3}
          className={INPUT_CLASS}
        />
      </div>

      {/* Save button */}
      <button
        onClick={handleSubmit}
        className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors"
      >
        儲存補品
      </button>
    </div>
  );
}

// ── Main Page Component ───────────────────────────

export default function SupplementManager() {
  // ── State ──

  const [view, setView] = useState<ViewState>("list");
  const [editTarget, setEditTarget] = useState<SupplementItem | null>(null);
  const [supplements, setSupplements] = useState<SupplementItem[]>([]);
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [timingFilter, setTimingFilter] = useState<SupplementTiming | "">("");

  // ── Load data on mount ──

  useEffect(() => {
    ItemService.getSupplements().then(setSupplements).catch(() => {});
    ItemService.getInventory().then(setInventory).catch(() => {});
  }, []);

  // ── O(1) supplement lookup map ──

  const suppMap = useMemo(() => new Map(supplements.map((s) => [s.id, s])), [supplements]);
  void suppMap; // used in Plan 02 for bidirectional interaction resolution

  // ── Filtered list ──

  const filteredSupplements = supplements.filter((s) => {
    if (searchTerm && !s.name.includes(searchTerm)) return false;
    if (timingFilter && !s.timing.includes(timingFilter)) return false;
    return true;
  });

  // ── Low inventory banner ──

  const lowInventoryCount = supplements.filter((s) => {
    const days = calcDaysRemaining(s.id, s.unitsPerDose, s.dosesPerDay, inventory);
    return days !== null && days < 14;
  }).length;

  // ── Delete handler ──

  async function handleDelete(id: string) {
    if (!window.confirm("確定要刪除此補品？")) return;
    await ItemService.deleteSupplement(id);
    setSupplements((prev) => prev.filter((s) => s.id !== id));
  }

  // ── Edit handler ──

  function handleTapSupplement(supp: SupplementItem) {
    setEditTarget(supp);
    setView("edit");
  }

  // ── Save handler ──

  async function handleSave(supp: SupplementItem) {
    await ItemService.saveSupplement(supp);
    const updated = await ItemService.getSupplements();
    setSupplements(updated);
    setView("list");
    setEditTarget(null);
  }

  // ── Render ─────────────────────────────────────

  // Non-list views
  if (view === "add") {
    return <SupplementForm onSave={handleSave} onCancel={() => setView("list")} />;
  }

  if (view === "edit" && editTarget) {
    return <SupplementForm supp={editTarget} onSave={handleSave} onCancel={() => setView("list")} />;
  }

  // ── List View ──────────────────────────────────

  return (
    <div className="px-4 pt-5 pb-4">
      {/* Page Header */}
      <header className="text-center mb-5">
        <h1 className="text-xl font-bold">補品管理</h1>
      </header>

      {/* Add button */}
      <button
        onClick={() => setView("add")}
        className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors mb-4"
      >
        + 新增補品
      </button>

      {/* Search bar */}
      <div className="mb-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="搜尋補品..."
          className="w-full bg-slate-800 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Timing filter */}
      <div className="mb-4">
        <select
          value={timingFilter}
          onChange={(e) => setTimingFilter(e.target.value as SupplementTiming | "")}
          className="w-full bg-slate-800 rounded-lg px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">所有時機</option>
          {ALL_TIMING_VALUES.map((t) => (
            <option key={t} value={t}>
              {SUPPLEMENT_TIMING_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {/* Low inventory banner */}
      {lowInventoryCount > 0 && (
        <p className="text-xs text-amber-400 mb-3">⚠ {lowInventoryCount} 項補品即將耗盡</p>
      )}

      {/* Supplement list */}
      {filteredSupplements.length > 0 ? (
        <div>
          {filteredSupplements.map((supp) => {
            const daysLeft = calcDaysRemaining(supp.id, supp.unitsPerDose, supp.dosesPerDay, inventory);
            const remainingUnits = calcRemainingUnits(supp.id, inventory);
            return (
              <SupplementCard
                key={supp.id}
                supp={supp}
                daysLeft={daysLeft}
                remainingUnits={remainingUnits}
                onTap={() => handleTapSupplement(supp)}
                onDelete={() => handleDelete(supp.id)}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-500">
          <p className="text-sm">
            {searchTerm || timingFilter ? "找不到符合的補品" : "尚無補品，點擊下方按鈕新增"}
          </p>
        </div>
      )}
    </div>
  );
}
