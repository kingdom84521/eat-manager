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
import type { SupplementItem, InventoryEntry, ConsumptionEvent, HealthTag, SupplementTiming, UnitConversion } from "../data/types";
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

// ── Unit Conversion Helper ────────────────────────

/**
 * Walk a conversion chain from fromUnit to toUnit.
 * Handles both directions: multiply going baseUnit→targetUnit, divide going targetUnit→baseUnit.
 * Returns null if no path found.
 */
function convertUnits(qty: number, fromUnit: string, toUnit: string, conversions: UnitConversion[]): number | null {
  if (fromUnit === toUnit) return qty;

  // BFS over conversion graph (supports multi-hop chains)
  type State = { unit: string; qty: number };
  const queue: State[] = [{ unit: fromUnit, qty }];
  const visited = new Set<string>([fromUnit]);

  while (queue.length > 0) {
    const { unit, qty: currentQty } = queue.shift()!;
    for (const conv of conversions) {
      if (conv.baseUnit === unit && !visited.has(conv.targetUnit)) {
        const nextQty = currentQty * conv.factor;
        if (conv.targetUnit === toUnit) return nextQty;
        visited.add(conv.targetUnit);
        queue.push({ unit: conv.targetUnit, qty: nextQty });
      }
      if (conv.targetUnit === unit && !visited.has(conv.baseUnit)) {
        const nextQty = currentQty / conv.factor;
        if (conv.baseUnit === toUnit) return nextQty;
        visited.add(conv.baseUnit);
        queue.push({ unit: conv.baseUnit, qty: nextQty });
      }
    }
  }
  return null;
}

/** Extract all unique unit names from a conversion chain. */
function getAllUnits(conversions: UnitConversion[], consumptionUnit: string): string[] {
  const units = new Set<string>([consumptionUnit]);
  for (const conv of conversions) {
    units.add(conv.baseUnit);
    units.add(conv.targetUnit);
  }
  return Array.from(units);
}

// ── Inventory Helpers ─────────────────────────────

function calcRemainingUnits(suppId: string, inv: InventoryEntry[], consumption: ConsumptionEvent[]): number {
  const purchased = inv.filter((e) => e.supplementId === suppId).reduce((sum, e) => sum + e.purchasedUnits, 0);
  const consumed = consumption.filter((e) => e.supplementId === suppId).reduce((sum, e) => sum + e.units, 0);
  return Math.max(0, purchased - consumed);
}

function calcDaysRemaining(
  suppId: string,
  unitsPerDose: number,
  dosesPerDay: number,
  inv: InventoryEntry[],
  consumption: ConsumptionEvent[]
): number | null {
  const entries = inv.filter((e) => e.supplementId === suppId);
  if (entries.length === 0) return null;
  const remaining = calcRemainingUnits(suppId, inv, consumption);
  const dailyUsage = unitsPerDose * dosesPerDay;
  if (dailyUsage <= 0) return null;
  return remaining / dailyUsage;
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

// ── Bidirectional Interaction Resolvers ───────────

/** Resolve all supplements that have an interaction with s (direct + indirect). */
function resolveInteractions(s: SupplementItem, allSupps: SupplementItem[]): SupplementItem[] {
  const direct = s.interactions
    .map((id) => allSupps.find((x) => x.id === id))
    .filter((x): x is SupplementItem => x !== undefined);
  const indirect = allSupps.filter(
    (other) => other.id !== s.id && other.interactions.includes(s.id)
  );
  const seen = new Set(direct.map((x) => x.id));
  return [...direct, ...indirect.filter((x) => !seen.has(x.id))];
}

/** Resolve all supplements that have a synergy with s (direct + indirect). */
function resolveSynergies(s: SupplementItem, allSupps: SupplementItem[]): SupplementItem[] {
  const direct = s.synergies
    .map((id) => allSupps.find((x) => x.id === id))
    .filter((x): x is SupplementItem => x !== undefined);
  const indirect = allSupps.filter(
    (other) => other.id !== s.id && other.synergies.includes(s.id)
  );
  const seen = new Set(direct.map((x) => x.id));
  return [...direct, ...indirect.filter((x) => !seen.has(x.id))];
}

// ── SupplementRefSelector Sub-component ──────────

interface SupplementRefSelectorProps {
  selectedIds: string[];
  onToggle: (id: string) => void;
  allSupplements: SupplementItem[];
  currentSuppId?: string;
  chipColor: "red" | "green";
  chipPrefix: string;
  chipSuffix: string;
}

function SupplementRefSelector({
  selectedIds,
  onToggle,
  allSupplements,
  currentSuppId,
  chipColor,
  chipPrefix,
  chipSuffix,
}: SupplementRefSelectorProps) {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Resolve selected IDs to supplement objects, filtering out deleted ones (D-22)
  const resolvedSelected = selectedIds
    .map((id) => allSupplements.find((s) => s.id === id))
    .filter((s): s is SupplementItem => s !== undefined);

  // Filter options: exclude self, already selected, and match query
  const options = allSupplements
    .filter(
      (s) =>
        s.id !== currentSuppId &&
        !selectedIds.includes(s.id) &&
        s.name.includes(query)
    )
    .slice(0, 8);

  const chipStyle =
    chipColor === "red"
      ? { backgroundColor: "#ef444430", color: "#ef4444", border: "1px solid #ef444460" }
      : { backgroundColor: "#22c55e30", color: "#22c55e", border: "1px solid #22c55e60" };

  return (
    <div>
      {/* Selected chips */}
      {resolvedSelected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {resolvedSelected.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
              style={chipStyle}
            >
              {chipPrefix} {s.name} {chipSuffix}
              <button
                onClick={() => onToggle(s.id)}
                className="opacity-70 hover:opacity-100 ml-0.5"
                aria-label={`移除 ${s.name}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input + dropdown */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          placeholder="搜尋補品..."
          className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
        />
        {showDropdown && options.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {options.map((s) => (
              <div
                key={s.id}
                onMouseDown={() => {
                  onToggle(s.id);
                  setQuery("");
                }}
                className="px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                {s.name}
                {s.brand && <span className="text-slate-400 text-xs ml-1">{s.brand}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── InventorySection Sub-component ────────────────

interface InventorySectionProps {
  supplementId: string;
  unitsPerDose: number;
  dosesPerDay: number;
  consumptionUnit: string;
  unitConversions: UnitConversion[];
  inventory: InventoryEntry[];
  onRecordPurchase: (entry: InventoryEntry) => void;
}

function InventorySection({
  supplementId,
  unitsPerDose,
  dosesPerDay,
  consumptionUnit,
  unitConversions,
  inventory,
  onRecordPurchase,
}: InventorySectionProps) {
  const allUnits = getAllUnits(unitConversions, consumptionUnit);
  const [purchaseQty, setPurchaseQty] = useState("");
  const [purchaseUnit, setPurchaseUnit] = useState(allUnits[0] ?? consumptionUnit);
  const [purchaseDate, setPurchaseDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  const entries = inventory.filter((e) => e.supplementId === supplementId);
  const remainingUnits = entries.reduce((sum, e) => sum + e.purchasedUnits, 0);
  const dailyUsage = unitsPerDose * dosesPerDay;
  const daysLeft = dailyUsage > 0 && entries.length > 0 ? remainingUnits / dailyUsage : null;
  const color = inventoryColor(daysLeft);

  const history = [...entries].sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));

  // Build multi-unit remaining display (largest unit that fits)
  function buildRemainingDisplay(): string {
    if (daysLeft === null) return "尚無庫存記錄";
    const base = `剩餘 ${remainingUnits} ${consumptionUnit}`;
    const daysStr = `約 ${Math.round(daysLeft)} 天`;
    // Show largest-unit breakdown if conversions exist and purchaseUnit differs from consumptionUnit
    if (unitConversions.length > 0) {
      // Find the largest unit that has a defined path from consumptionUnit
      const nonConsumptionUnits = allUnits.filter((u) => u !== consumptionUnit);
      for (const bigUnit of nonConsumptionUnits) {
        const converted = convertUnits(remainingUnits, consumptionUnit, bigUnit, unitConversions);
        if (converted !== null && converted >= 1) {
          const rounded = Math.round(converted * 10) / 10;
          return `${base} (${rounded} ${bigUnit}) · ${daysStr}`;
        }
      }
    }
    return `${base} · ${daysStr}`;
  }

  function handleRecordPurchase() {
    const qty = parseFloat(purchaseQty);
    if (isNaN(qty) || qty <= 0) return;

    // Convert to consumption units
    let purchasedUnitsConverted = qty;
    if (purchaseUnit !== consumptionUnit && unitConversions.length > 0) {
      const converted = convertUnits(qty, purchaseUnit, consumptionUnit, unitConversions);
      if (converted !== null) {
        purchasedUnitsConverted = converted;
      }
    }

    const entry: InventoryEntry = {
      supplementId,
      purchasedUnits: Math.round(purchasedUnitsConverted),
      purchaseDate,
      unit: purchaseUnit !== consumptionUnit ? purchaseUnit : undefined,
      originalQty: purchaseUnit !== consumptionUnit ? qty : undefined,
    };
    onRecordPurchase(entry);
    setPurchaseQty("");
    setPurchaseDate(new Date().toISOString().slice(0, 10));
  }

  return (
    <div>
      {/* Remaining summary */}
      <div className={`rounded-lg p-3 mb-4 ${INV_COLORS[color]}`}>
        <p className="text-sm font-bold">{buildRemainingDisplay()}</p>
      </div>

      {/* Record purchase form */}
      <label className="block text-xs text-slate-400 mb-2">記錄購入</label>
      <div className="flex gap-2 mb-2">
        <input
          type="number"
          min="1"
          value={purchaseQty}
          onChange={(e) => setPurchaseQty(e.target.value)}
          placeholder="數量"
          className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
        />
        {/* Unit selector — shown only when conversions exist */}
        {allUnits.length > 1 && (
          <select
            value={purchaseUnit}
            onChange={(e) => setPurchaseUnit(e.target.value)}
            className="bg-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            {allUnits.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        )}
        <input
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
          className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleRecordPurchase}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded-lg transition-colors shrink-0"
        >
          記錄
        </button>
      </div>

      {/* Purchase history */}
      {history.length > 0 && (
        <div className="mt-4">
          <label className="block text-xs text-slate-400 mb-2">購入記錄</label>
          {history.map((e, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-2 border-b border-slate-700/50 text-sm"
            >
              <span className="text-slate-300">{e.purchaseDate}</span>
              <span className="text-slate-100 font-medium">
                {e.unit && e.originalQty
                  ? `${e.purchasedUnits} ${consumptionUnit}（${e.originalQty} ${e.unit}）`
                  : `${e.purchasedUnits} ${consumptionUnit}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SupplementCard Sub-component ──────────────────

interface SupplementCardProps {
  supp: SupplementItem;
  daysLeft: number | null;
  remainingUnits: number;
  allSupplements: SupplementItem[];
  onTap: () => void;
  onDelete: () => void;
}

function SupplementCard({ supp, daysLeft, remainingUnits, allSupplements, onTap, onDelete }: SupplementCardProps) {
  const color = inventoryColor(daysLeft);

  // Bidirectional interaction/synergy counts for badges
  const interactionCount = resolveInteractions(supp, allSupplements).length;
  const synergyCount = resolveSynergies(supp, allSupplements).length;

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
          <span className="text-xs text-slate-400">
            {supp.doseUnit ? `${supp.dosagePerUnit}${supp.doseUnit}` : supp.dosagePerUnit}
          </span>
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
              const tagColor = HEALTH_TAG_COLORS[tag];
              return (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: tagColor + "30", color: tagColor, borderWidth: 1, borderColor: tagColor + "60" }}
                >
                  {HEALTH_TAG_LABELS[tag]}
                </span>
              );
            })}
          </div>
        )}

        {/* Row 4: Interaction/synergy badges */}
        {(interactionCount > 0 || synergyCount > 0) && (
          <div className="flex gap-1 mb-1">
            {interactionCount > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: "#ef444420", color: "#ef4444", border: "1px solid #ef444440" }}
              >
                ⚠ {interactionCount} 衝突
              </span>
            )}
            {synergyCount > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: "#22c55e20", color: "#22c55e", border: "1px solid #22c55e40" }}
              >
                ✓ {synergyCount} 協同
              </span>
            )}
          </div>
        )}

        {/* Row 5: Inventory status */}
        <div className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full ${INV_COLORS[color]}`}>
          {daysLeft === null
            ? "尚無庫存"
            : `剩餘 ${remainingUnits} ${supp.consumptionUnit ?? "顆"} · 約 ${Math.round(daysLeft)} 天`}
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
  allSupplements: SupplementItem[];
  inventory: InventoryEntry[];
  onSave: (s: SupplementItem) => void;
  onRecordPurchase: (entry: InventoryEntry) => void;
  onCancel: () => void;
}

interface SupplementFormDraft {
  name: string;
  brand: string;
  dosagePerUnit: string;
  /** Separate unit for dosagePerUnit, e.g. "mg" */
  doseUnit: string;
  /** Consumption unit, e.g. "顆", "粒", "包" */
  consumptionUnit: string;
  unitsPerDose: string;
  dosesPerDay: string;
  timing: SupplementTiming[];
  tags: HealthTag[];
  isActive: boolean;
  mechanism: string;
  caution: string;
}

/** Draft row for unit conversion chain editor */
interface UnitConversionDraft {
  baseUnit: string;
  factor: string;
  targetUnit: string;
}

function SupplementForm({ supp, allSupplements, inventory, onSave, onRecordPurchase, onCancel }: SupplementFormProps) {
  const isEdit = supp !== undefined;

  const [draft, setDraft] = useState<SupplementFormDraft>({
    name: supp?.name ?? "",
    brand: supp?.brand ?? "",
    dosagePerUnit: supp?.dosagePerUnit ?? "",
    doseUnit: supp?.doseUnit ?? "",
    consumptionUnit: supp?.consumptionUnit ?? "",
    unitsPerDose: supp?.unitsPerDose !== undefined ? String(supp.unitsPerDose) : "1",
    dosesPerDay: supp?.dosesPerDay !== undefined ? String(supp.dosesPerDay) : "1",
    timing: supp?.timing ?? [],
    tags: supp?.tags ?? [],
    isActive: supp?.isActive ?? true,
    mechanism: supp?.mechanism ?? "",
    caution: supp?.caution ?? "",
  });

  const [unitConversionDrafts, setUnitConversionDrafts] = useState<UnitConversionDraft[]>(
    supp?.unitConversions?.map((c) => ({
      baseUnit: c.baseUnit,
      factor: String(c.factor),
      targetUnit: c.targetUnit,
    })) ?? []
  );

  const [interactionIds, setInteractionIds] = useState<string[]>(supp?.interactions ?? []);
  const [synergyIds, setSynergyIds] = useState<string[]>(supp?.synergies ?? []);

  const [nameError, setNameError] = useState("");
  const [dosageError, setDosageError] = useState("");

  // Derive available tags from all existing supplements + current draft tags
  const availableTags = useMemo(() => {
    const tagSet = new Set<HealthTag>(draft.tags);
    allSupplements.forEach((s) => s.tags.forEach((t) => tagSet.add(t)));
    return [...tagSet].sort();
  }, [allSupplements, draft.tags]);

  // Indirect interactions — other supplements that have listed this one as a conflict
  const indirectInteractions = supp
    ? allSupplements.filter(
        (other) =>
          other.id !== supp.id &&
          other.interactions.includes(supp.id) &&
          !interactionIds.includes(other.id)
      )
    : [];

  // Indirect synergies — other supplements that have listed this one as a synergy
  const indirectSynergies = supp
    ? allSupplements.filter(
        (other) =>
          other.id !== supp.id &&
          other.synergies.includes(supp.id) &&
          !synergyIds.includes(other.id)
      )
    : [];

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

    // Parse unit conversion chain — filter out rows with empty fields
    const unitConversions: UnitConversion[] = unitConversionDrafts
      .filter((d) => d.baseUnit.trim() && d.factor.trim() && d.targetUnit.trim())
      .map((d) => ({
        baseUnit: d.baseUnit.trim(),
        factor: parseFloat(d.factor) || 1,
        targetUnit: d.targetUnit.trim(),
      }));

    const item: SupplementItem = {
      id: supp?.id ?? `supp_${Date.now()}`,
      type: "supplement",
      name: draft.name.trim(),
      brand: draft.brand.trim() || undefined,
      dosagePerUnit: draft.dosagePerUnit.trim(),
      doseUnit: draft.doseUnit.trim() || undefined,
      consumptionUnit: draft.consumptionUnit.trim() || undefined,
      unitConversions: unitConversions.length > 0 ? unitConversions : undefined,
      unitsPerDose: parseFloat(draft.unitsPerDose) || 1,
      dosesPerDay: parseFloat(draft.dosesPerDay) || 1,
      timing: draft.timing,
      tags: draft.tags,
      interactions: interactionIds,
      synergies: synergyIds,
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

      {/* Dosage per unit — split into numeric value + unit */}
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-1">每顆劑量</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={draft.dosagePerUnit}
            onChange={(e) => setField("dosagePerUnit", e.target.value)}
            placeholder="500"
            className="flex-1 bg-slate-800 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={draft.doseUnit}
            onChange={(e) => setField("doseUnit", e.target.value)}
            placeholder="mg"
            className="w-24 bg-slate-800 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {dosageError && <p className="mt-1 text-xs text-red-400">{dosageError}</p>}
      </div>

      {/* Consumption unit */}
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-1">服用單位</label>
        <input
          type="text"
          value={draft.consumptionUnit}
          onChange={(e) => setField("consumptionUnit", e.target.value)}
          placeholder="顆"
          className={INPUT_CLASS}
        />
      </div>

      {/* Unit conversion chain editor */}
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-2">單位轉換</label>
        {unitConversionDrafts.length === 0 && (
          <p className="text-xs text-slate-500 mb-2">尚無轉換定義。例：1 罐 = 100 顆</p>
        )}
        {unitConversionDrafts.map((row, idx) => (
          <div key={idx} className="flex items-center gap-2 mb-2">
            <span className="text-xs text-slate-400 shrink-0">1</span>
            <input
              type="text"
              value={row.baseUnit}
              onChange={(e) => {
                const next = [...unitConversionDrafts];
                next[idx] = { ...next[idx], baseUnit: e.target.value };
                setUnitConversionDrafts(next);
              }}
              placeholder="罐"
              className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-400 shrink-0">=</span>
            <input
              type="number"
              value={row.factor}
              onChange={(e) => {
                const next = [...unitConversionDrafts];
                next[idx] = { ...next[idx], factor: e.target.value };
                setUnitConversionDrafts(next);
              }}
              placeholder="100"
              className="w-20 bg-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={row.targetUnit}
              onChange={(e) => {
                const next = [...unitConversionDrafts];
                next[idx] = { ...next[idx], targetUnit: e.target.value };
                setUnitConversionDrafts(next);
              }}
              placeholder="顆"
              className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => setUnitConversionDrafts((prev) => prev.filter((_, i) => i !== idx))}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-slate-700 hover:bg-red-900/60 text-slate-400 hover:text-red-400 text-sm transition-colors"
              aria-label="刪除此轉換"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={() => setUnitConversionDrafts((prev) => [...prev, { baseUnit: "", factor: "", targetUnit: "" }])}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          + 新增轉換
        </button>
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
          {availableTags.map((tag) => {
            const selected = draft.tags.includes(tag);
            const tagColor = HEALTH_TAG_COLORS[tag];
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                  selected ? "" : "bg-slate-700/50 text-slate-300"
                }`}
                style={
                  selected
                    ? { backgroundColor: tagColor + "30", color: tagColor, borderWidth: 1, borderColor: tagColor + "60" }
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
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-1">注意事項（選填）</label>
        <textarea
          value={draft.caution}
          onChange={(e) => setField("caution", e.target.value)}
          placeholder="注意事項（選填）"
          rows={3}
          className={INPUT_CLASS}
        />
      </div>

      {/* Interactions (conflicts) — per D-12 */}
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-2">交互作用（衝突）</label>
        <SupplementRefSelector
          selectedIds={interactionIds}
          onToggle={(id) =>
            setInteractionIds((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
            )
          }
          allSupplements={allSupplements}
          currentSuppId={supp?.id}
          chipColor="red"
          chipPrefix="⚠ 與"
          chipSuffix="衝突"
        />
        {/* Indirect interactions — bidirectional display (per D-14) */}
        {indirectInteractions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {indirectInteractions.map((other) => (
              <span
                key={other.id}
                className="inline-block text-[10px] px-2 py-0.5 rounded-full mr-1 mb-1 bg-red-500/10 text-red-400/60"
              >
                ⚠ 與 {other.name} 衝突（由對方設定）
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Synergies — per D-13 */}
      <div className="mb-6">
        <label className="block text-xs text-slate-400 mb-2">協同作用（加乘）</label>
        <SupplementRefSelector
          selectedIds={synergyIds}
          onToggle={(id) =>
            setSynergyIds((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
            )
          }
          allSupplements={allSupplements}
          currentSuppId={supp?.id}
          chipColor="green"
          chipPrefix="✓ 與"
          chipSuffix="協同"
        />
        {/* Indirect synergies — bidirectional display (per D-14) */}
        {indirectSynergies.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {indirectSynergies.map((other) => (
              <span
                key={other.id}
                className="inline-block text-[10px] px-2 py-0.5 rounded-full mr-1 mb-1 bg-emerald-500/10 text-emerald-400/60"
              >
                ✓ 與 {other.name} 協同（由對方設定）
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Save button */}
      <button
        onClick={handleSubmit}
        className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors"
      >
        儲存補品
      </button>

      {/* Inventory section — edit mode only, per D-15 */}
      {supp && (
        <>
          <div className="border-t border-slate-700 my-6" />
          <h2 className="text-lg font-bold mb-4">庫存管理</h2>
          <InventorySection
            supplementId={supp.id}
            unitsPerDose={parseFloat(draft.unitsPerDose) || 1}
            dosesPerDay={parseFloat(draft.dosesPerDay) || 1}
            consumptionUnit={draft.consumptionUnit.trim() || "顆"}
            unitConversions={
              unitConversionDrafts
                .filter((d) => d.baseUnit.trim() && d.factor.trim() && d.targetUnit.trim())
                .map((d) => ({
                  baseUnit: d.baseUnit.trim(),
                  factor: parseFloat(d.factor) || 1,
                  targetUnit: d.targetUnit.trim(),
                }))
            }
            inventory={inventory}
            onRecordPurchase={onRecordPurchase}
          />
        </>
      )}
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
  const [consumption, setConsumption] = useState<ConsumptionEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [timingFilter, setTimingFilter] = useState<SupplementTiming | "">("");
  const [tagFilter, setTagFilter] = useState<HealthTag | "">("");

  // ── Load data on mount ──

  useEffect(() => {
    ItemService.getSupplements().then(setSupplements).catch(() => {});
    ItemService.getInventory().then(setInventory).catch(() => {});
    ItemService.getConsumption().then(setConsumption).catch(() => {});
  }, []);

  // ── O(1) supplement lookup map ──

  const suppMap = useMemo(() => new Map(supplements.map((s) => [s.id, s])), [supplements]);
  void suppMap;

  // ── Unique tags derived from loaded supplements ──

  const usedTags = useMemo(() => {
    const tagSet = new Set<HealthTag>();
    for (const s of supplements) {
      for (const t of s.tags) tagSet.add(t);
    }
    return Array.from(tagSet);
  }, [supplements]);

  // ── Filtered list ──

  const filteredSupplements = supplements.filter((s) => {
    if (searchTerm && !s.name.includes(searchTerm)) return false;
    if (timingFilter && !s.timing.includes(timingFilter)) return false;
    if (tagFilter && !s.tags.includes(tagFilter)) return false;
    return true;
  });

  // ── Low inventory banner ──

  const lowInventoryCount = supplements.filter((s) => {
    const days = calcDaysRemaining(s.id, s.unitsPerDose, s.dosesPerDay, inventory, consumption);
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

  // ── Record purchase handler ──

  async function handleRecordPurchase(entry: InventoryEntry) {
    await ItemService.upsertInventory(entry);
    // Optimistic update — add to local state immediately
    setInventory((prev) => [...prev, entry]);
  }

  // ── Render ─────────────────────────────────────

  // Non-list views
  if (view === "add") {
    return (
      <SupplementForm
        allSupplements={supplements}
        inventory={inventory}
        onSave={handleSave}
        onRecordPurchase={handleRecordPurchase}
        onCancel={() => setView("list")}
      />
    );
  }

  if (view === "edit" && editTarget) {
    return (
      <SupplementForm
        supp={editTarget}
        allSupplements={supplements}
        inventory={inventory}
        onSave={handleSave}
        onRecordPurchase={handleRecordPurchase}
        onCancel={() => { setView("list"); setEditTarget(null); }}
      />
    );
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

      {/* Tag filter chips (data-derived from saved supplements) */}
      {usedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {usedTags.map((tag) => {
            const active = tagFilter === tag;
            const tagColor = HEALTH_TAG_COLORS[tag];
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setTagFilter(active ? "" : tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  active ? "text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
                style={active ? { backgroundColor: tagColor } : undefined}
              >
                {HEALTH_TAG_LABELS[tag]}
              </button>
            );
          })}
        </div>
      )}

      {/* Low inventory banner */}
      {lowInventoryCount > 0 && (
        <p className="text-xs text-amber-400 mb-3">⚠ {lowInventoryCount} 項補品即將耗盡</p>
      )}

      {/* Supplement list */}
      {filteredSupplements.length > 0 ? (
        <div>
          {filteredSupplements.map((supp) => {
            const daysLeft = calcDaysRemaining(supp.id, supp.unitsPerDose, supp.dosesPerDay, inventory, consumption);
            const remainingUnits = calcRemainingUnits(supp.id, inventory, consumption);
            return (
              <SupplementCard
                key={supp.id}
                supp={supp}
                daysLeft={daysLeft}
                remainingUnits={remainingUnits}
                allSupplements={supplements}
                onTap={() => handleTapSupplement(supp)}
                onDelete={() => handleDelete(supp.id)}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-500">
          <p className="text-sm">
            {searchTerm || timingFilter || tagFilter ? "找不到符合的補品" : "尚無補品，點擊下方按鈕新增"}
          </p>
        </div>
      )}
    </div>
  );
}
