/**
 * SupplementSchedule — 每日補品例行清單
 *
 * 依時機槽（空腹、餐前、餐中、餐後、睡前）分組顯示當日應服補品，
 * 支援三態切換（未服用 → 已服用 → 跳過 → 未服用），
 * 自動依衝突關係調整排程，庫存即時扣除。
 */

import { useState, useEffect, useCallback } from "react";
import { ItemService } from "../lib/item-service";
import { todayStr } from "../lib/data-service";
import type { SupplementItem, InventoryEntry, ConsumptionEvent, HealthTag, SupplementTiming } from "../data/types";
import { HEALTH_TAG_LABELS, HEALTH_TAG_COLORS, SUPPLEMENT_TIMING_LABELS } from "../data/types";

// ── Constants ───────────────────────────────────

const TIMING_ORDER: SupplementTiming[] = ["empty_stomach", "before_meal", "with_meal", "after_meal", "bedtime"];

type TakenState = "untouched" | "taken" | "skipped";

// ── Pure functions ──────────────────────────────

/** 計算某補品的剩餘庫存數量 */
function calcRemainingUnits(suppId: string, inv: InventoryEntry[], consumption: ConsumptionEvent[]): number {
  const purchased = inv
    .filter((e) => e.supplementId === suppId)
    .reduce((sum, e) => sum + e.purchasedUnits, 0);
  const consumed = consumption
    .filter((e) => e.supplementId === suppId)
    .reduce((sum, e) => sum + e.units, 0);
  return Math.max(0, purchased - consumed);
}

/** 判斷兩補品是否有衝突（雙向檢查） */
function hasConflict(a: SupplementItem, b: SupplementItem): boolean {
  return a.interactions.includes(b.id) || b.interactions.includes(a.id);
}

/** 判斷候選補品放入該時機槽時是否有衝突 */
function slotHasConflict(candidate: SupplementItem, occupants: SupplementItem[]): boolean {
  return occupants.some((occ) => hasConflict(candidate, occ));
}

/** 判斷兩補品是否有協同效益（雙向檢查） */
function hasSynergy(a: SupplementItem, b: SupplementItem): boolean {
  return a.synergies.includes(b.id) || b.synergies.includes(a.id);
}

interface RoutineEntry {
  item: SupplementItem;
  movedFrom?: SupplementTiming;
  conflictWith?: string;
}

interface RoutineResult {
  slots: Map<SupplementTiming, RoutineEntry[]>;
  unscheduled: { item: SupplementItem; conflicts: string[] }[];
}

/**
 * 依補品的時機偏好與衝突關係，產生確定性的每日排程。
 *
 * 演算法：
 * 1. 篩選啟用中且有庫存的補品
 * 2. 以 id 字母順序排序（確保確定性）
 * 3. 依序放入時機槽，優先選偏好槽，有衝突時改放其他槽
 * 4. 全槽皆衝突者列入「未排入」
 */
function generateRoutine(
  supplements: SupplementItem[],
  inventory: InventoryEntry[],
  consumption: ConsumptionEvent[]
): RoutineResult {
  // Step 1: Filter active + in-stock
  const eligible = supplements.filter(
    (s) => s.isActive && calcRemainingUnits(s.id, inventory, consumption) > 0
  );

  // Step 2: Sort deterministically by id
  const sorted = [...eligible].sort((a, b) => a.id.localeCompare(b.id));

  // Step 3: Initialize slot map
  const slotMap = new Map<SupplementTiming, RoutineEntry[]>();
  for (const t of TIMING_ORDER) {
    slotMap.set(t, []);
  }

  const unscheduled: { item: SupplementItem; conflicts: string[] }[] = [];

  // Step 4: Assign each supplement
  for (const supp of sorted) {
    // Default timing if empty
    const preferredTimings: SupplementTiming[] = supp.timing.length > 0 ? supp.timing : ["with_meal"];

    let placed = false;

    // Try preferred timings first
    for (const timing of preferredTimings) {
      const occupants = slotMap.get(timing)!.map((e) => e.item);
      if (!slotHasConflict(supp, occupants)) {
        slotMap.get(timing)!.push({ item: supp });
        placed = true;
        break;
      }
    }

    if (!placed) {
      // Try all timing slots to find one without conflict
      for (const timing of TIMING_ORDER) {
        const occupants = slotMap.get(timing)!.map((e) => e.item);
        if (!slotHasConflict(supp, occupants)) {
          // Find what it conflicted with in the preferred slot
          const preferredOccupants = slotMap.get(preferredTimings[0])!.map((e) => e.item);
          const conflictingItem = preferredOccupants.find((occ) => hasConflict(supp, occ));
          slotMap.get(timing)!.push({
            item: supp,
            movedFrom: preferredTimings[0],
            conflictWith: conflictingItem?.name,
          });
          placed = true;
          break;
        }
      }
    }

    if (!placed) {
      // Cannot schedule — collect all conflicts
      const conflicts: string[] = [];
      for (const timing of TIMING_ORDER) {
        const occupants = slotMap.get(timing)!.map((e) => e.item);
        for (const occ of occupants) {
          if (hasConflict(supp, occ) && !conflicts.includes(occ.name)) {
            conflicts.push(occ.name);
          }
        }
      }
      unscheduled.push({ item: supp, conflicts });
    }
  }

  return { slots: slotMap, unscheduled };
}

// ── Sub-components ──────────────────────────────

function TagBadge({ tag }: { tag: HealthTag }) {
  return (
    <span
      className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mr-0.5 mb-0.5"
      style={{
        backgroundColor: HEALTH_TAG_COLORS[tag] + "20",
        color: HEALTH_TAG_COLORS[tag],
        border: `1px solid ${HEALTH_TAG_COLORS[tag]}40`,
      }}
    >
      {HEALTH_TAG_LABELS[tag]}
    </span>
  );
}

interface RoutineRowProps {
  item: SupplementItem;
  state: TakenState;
  movedFrom?: SupplementTiming;
  conflictWith?: string;
  synergyNames: string[];
  onToggle: (id: string) => void;
}

function RoutineRow({ item, state, movedFrom, conflictWith, synergyNames, onToggle }: RoutineRowProps) {
  const isTaken = state === "taken";
  const isSkipped = state === "skipped";

  const rowClass = isTaken
    ? "bg-emerald-500/10"
    : isSkipped
    ? "bg-slate-800/50"
    : "";

  const nameClass = isSkipped
    ? "line-through text-slate-600"
    : isTaken
    ? "text-emerald-400"
    : "text-slate-200";

  return (
    <div
      className={`flex items-start gap-3 py-2.5 px-3 rounded-lg mb-1.5 cursor-pointer transition-colors ${rowClass}`}
      onClick={() => onToggle(item.id)}
    >
      {/* State indicator */}
      <div className="mt-0.5 w-5 h-5 flex-shrink-0 flex items-center justify-center">
        {isTaken && <span className="text-emerald-400 font-bold text-base">✓</span>}
        {isSkipped && <span className="text-slate-600 text-xs">—</span>}
        {!isTaken && !isSkipped && <span className="text-slate-700 text-xs">○</span>}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={`font-semibold text-sm ${nameClass}`}>
          {item.name}
          {item.brand && <span className="ml-1 font-normal text-slate-500 text-xs">{item.brand}</span>}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">
          {item.unitsPerDose}顆 {item.dosagePerUnit}
        </div>
        <div className="mt-1 flex flex-wrap">
          {item.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>

        {/* Conflict warning badge */}
        {movedFrom && conflictWith && (
          <div className="text-amber-400 text-[10px] mt-1">
            ⚠ 避開 {conflictWith}（從{SUPPLEMENT_TIMING_LABELS[movedFrom]}移至此時段）
          </div>
        )}

        {/* Synergy notes */}
        {synergyNames.map((name) => (
          <div key={name} className="text-emerald-400 text-[10px] mt-0.5">
            ✓ 與 {name} 協同
          </div>
        ))}
      </div>
    </div>
  );
}

interface TimingSlotCardProps {
  timing: SupplementTiming;
  items: RoutineEntry[];
  takenStates: Map<string, TakenState>;
  onToggle: (id: string) => void;
}

function TimingSlotCard({ timing, items, takenStates, onToggle }: TimingSlotCardProps) {
  const takenCount = items.filter((e) => takenStates.get(e.item.id) === "taken").length;
  const total = items.length;

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-slate-300">{SUPPLEMENT_TIMING_LABELS[timing]}</h2>
        <span className="text-xs text-slate-500">{takenCount}/{total}</span>
      </div>
      {items.map((entry) => {
        // Compute synergy names for this item from others in the same slot
        const synergyNames = items
          .filter((other) => other.item.id !== entry.item.id && hasSynergy(entry.item, other.item))
          .map((other) => other.item.name);

        return (
          <RoutineRow
            key={entry.item.id}
            item={entry.item}
            state={takenStates.get(entry.item.id) ?? "untouched"}
            movedFrom={entry.movedFrom}
            conflictWith={entry.conflictWith}
            synergyNames={synergyNames}
            onToggle={onToggle}
          />
        );
      })}
    </div>
  );
}

function ProgressHeader({ taken, total }: { taken: number; total: number }) {
  const allDone = taken === total && total > 0;
  return (
    <div className="text-center mb-4">
      <p className="text-sm text-slate-400">
        今日進度：
        <span className={allDone ? "text-emerald-400 font-bold" : "text-slate-200 font-bold"}>
          {taken}/{total}
        </span>
        {" "}已服用
      </p>
    </div>
  );
}

function UnscheduledCard({ items }: { items: { item: SupplementItem; conflicts: string[] }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-3">
      <h2 className="text-sm font-bold text-amber-400 mb-2">未排入</h2>
      {items.map(({ item, conflicts }) => (
        <div key={item.id} className="mb-2 last:mb-0">
          <div className="font-semibold text-sm text-slate-300">{item.name}</div>
          <div className="text-xs text-amber-500/80 mt-0.5">
            無法排入：與 {conflicts.join("、")} 衝突
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page component ──────────────────────────────

export default function SupplementSchedule() {
  const [supplements, setSupplements] = useState<SupplementItem[]>([]);
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [consumption, setConsumption] = useState<ConsumptionEvent[]>([]);
  const [takenStates, setTakenStates] = useState<Map<string, TakenState>>(new Map());
  const [loading, setLoading] = useState(true);

  // Load all data on mount and restore daily log
  useEffect(() => {
    Promise.all([
      ItemService.getSupplements(),
      ItemService.getInventory(),
      ItemService.getConsumption(),
    ]).then(([supps, inv, cons]) => {
      setSupplements(supps);
      setInventory(inv);
      setConsumption(cons);

      // Restore daily log for today
      const today = todayStr();
      const log = ItemService.getDailyLog(today);
      if (log) {
        const states = new Map<string, TakenState>();
        log.takenIds.forEach((id) => states.set(id, "taken"));
        (log.skippedIds ?? []).forEach((id) => states.set(id, "skipped"));
        setTakenStates(states);
      }
      setLoading(false);
    });
  }, []);

  // Three-state toggle: untouched → taken → skipped → untouched
  const handleToggle = useCallback((suppId: string) => {
    setTakenStates((prev) => {
      const next = new Map(prev);
      const current = prev.get(suppId) ?? "untouched";
      let newState: TakenState;

      if (current === "untouched") {
        newState = "taken";
        // Deduct inventory only on untouched → taken transition
        const supp = supplements.find((s) => s.id === suppId);
        if (supp) {
          ItemService.logConsumption({
            supplementId: suppId,
            date: todayStr(),
            units: supp.unitsPerDose,
          });
          // Optimistic local update of consumption state
          setConsumption((c) => [...c, { supplementId: suppId, date: todayStr(), units: supp.unitsPerDose }]);
        }
      } else if (current === "taken") {
        newState = "skipped";
      } else {
        newState = "untouched";
      }

      if (newState === "untouched") {
        next.delete(suppId);
      } else {
        next.set(suppId, newState);
      }

      // Persist daily log
      const takenIds = [...next.entries()].filter(([, s]) => s === "taken").map(([id]) => id);
      const skippedIds = [...next.entries()].filter(([, s]) => s === "skipped").map(([id]) => id);
      ItemService.saveDailyLog({ date: todayStr(), takenIds, skippedIds });

      return next;
    });
  }, [supplements]);

  // Compute routine from current state (deterministic — same inputs = same output)
  const routine = generateRoutine(supplements, inventory, consumption);

  // Progress totals
  const allScheduledIds = [...routine.slots.values()].flat().map((e) => e.item.id);
  const takenCount = allScheduledIds.filter((id) => takenStates.get(id) === "taken").length;
  const totalCount = allScheduledIds.length;

  if (loading) {
    return (
      <div className="px-4 pt-8 text-center text-slate-500 text-sm">載入中...</div>
    );
  }

  const isEmpty = totalCount === 0 && routine.unscheduled.length === 0;

  return (
    <div className="px-4 pt-5 pb-6">
      {/* Header */}
      <header className="text-center mb-4">
        <h1 className="text-xl font-extrabold">💊 今日補品時程</h1>
        <p className="text-xs text-slate-500 mt-1">{todayStr()}</p>
      </header>

      {/* Progress */}
      <ProgressHeader taken={takenCount} total={totalCount} />

      {/* Empty state */}
      {isEmpty && (
        <div className="text-center py-12 text-slate-600 text-sm">
          目前沒有已啟用的補品
        </div>
      )}

      {/* Timing slots — empty slots are hidden */}
      {TIMING_ORDER.map((timing) => {
        const items = routine.slots.get(timing) ?? [];
        if (items.length === 0) return null;
        return (
          <TimingSlotCard
            key={timing}
            timing={timing}
            items={items}
            takenStates={takenStates}
            onToggle={handleToggle}
          />
        );
      })}

      {/* Unscheduled supplements */}
      <UnscheduledCard items={routine.unscheduled} />
    </div>
  );
}
