/**
 * ============================================================
 * UnifiedPlan — 統一今日方案頁面
 * ============================================================
 *
 * 合併食物方案產生、補品例行清單、營養預算條為單一打勾式介面。
 * - 勾選食物 → 記錄 nutrition entry + 即時更新 NutritionBudgetBar
 * - 取消勾選 → 移除 nutrition entry
 * - 勾選補品 → 三態循環（未服用→已服用→跳過）+ 扣庫存
 * - 鎖定機制：任何 item 已勾選時，全局重新產生按鈕禁用
 * - 單一換牌：只對未勾選的食物生效
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { SCHEDULE } from "../data/schedule";
import { resolveItem, type ResolvedItem } from "../data/resolver";
import {
  HEALTH_TAG_LABELS,
  HEALTH_TAG_COLORS,
  SUPPLEMENT_TIMING_LABELS,
} from "../data/types";
import type {
  HealthTag,
  ItemPool,
  SupplementItem,
  InventoryEntry,
  ConsumptionEvent,
  SupplementTiming,
  FoodItem,
} from "../data/types";
import {
  DataService,
  todayStr,
  saveTodayPlan,
  loadTodayPlan,
} from "../lib/data-service";
import type { GeneratedSlot, TodayPlanRecord } from "../lib/data-service";
import { ItemService } from "../lib/item-service";
import { SettingsService } from "../lib/settings-service";
import { MenuService } from "../lib/menu-service";

// ── Constants ───────────────────────────────────

const TIMING_ORDER: SupplementTiming[] = [
  "empty_stomach",
  "before_meal",
  "with_meal",
  "after_meal",
  "bedtime",
];

type TakenState = "untouched" | "taken" | "skipped";

// ── Pure functions ──────────────────────────────

function pickFromPool(pool: ItemPool, usedIds: Set<string>): ResolvedItem[] {
  const available = pool.itemIds.filter((id) => !usedIds.has(id));
  const source = available.length >= pool.pick ? available : pool.itemIds;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled
    .slice(0, pool.pick)
    .map(resolveItem)
    .filter((x): x is ResolvedItem => x !== null);
}

function generatePlan(recentIds: Set<string>): GeneratedSlot[] {
  const used = new Set(recentIds);
  return SCHEDULE.map((slot) => ({
    slot,
    fixed: slot.fixedIds
      .map(resolveItem)
      .filter((x): x is ResolvedItem => x !== null),
    selected: slot.pools.map((pool) => {
      const picked = pickFromPool(pool, used);
      picked.forEach((p) => used.add(p.id));
      return { poolName: pool.name, items: picked };
    }),
  }));
}

/** 計算某補品的剩餘庫存數量 */
function calcRemainingUnits(
  suppId: string,
  inv: InventoryEntry[],
  consumption: ConsumptionEvent[]
): number {
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
function slotHasConflict(
  candidate: SupplementItem,
  occupants: SupplementItem[]
): boolean {
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
    const preferredTimings: SupplementTiming[] =
      supp.timing.length > 0 ? supp.timing : ["with_meal"];

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
          const preferredOccupants = slotMap
            .get(preferredTimings[0])!
            .map((e) => e.item);
          const conflictingItem = preferredOccupants.find((occ) =>
            hasConflict(supp, occ)
          );
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

// ── NutritionBudgetBar ──────────────────────────

interface NutritionBudgetBarProps {
  checkedFoodIds: Set<string>;
  foods: FoodItem[];
}

function NutritionBudgetBar({ checkedFoodIds, foods }: NutritionBudgetBarProps) {
  const checkedFoods = [...checkedFoodIds]
    .map((id) => foods.find((f) => f.id === id))
    .filter((f): f is FoodItem => f !== undefined);

  const totalCal = checkedFoods.reduce((sum, f) => sum + f.cal, 0);
  const totalProtein = checkedFoods.reduce((sum, f) => sum + f.protein, 0);

  const targets = SettingsService.getComputedTargets();

  if (!targets) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
        <div className="text-sm text-slate-400">
          {totalCal} kcal
          <span className="text-slate-600 ml-1">（已勾選）</span>
        </div>
      </div>
    );
  }

  const calPct = Math.min(100, (totalCal / targets.tdee) * 100);
  const calColor =
    calPct > 90
      ? "text-red-400"
      : calPct > 70
      ? "text-amber-400"
      : "text-emerald-400";
  const barGradient =
    calPct > 90
      ? "bg-gradient-to-r from-amber-500 to-red-500"
      : "bg-gradient-to-r from-blue-500 to-violet-500";

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className={`text-sm font-bold ${calColor}`}>
          {totalCal} / {targets.tdee} kcal
        </span>
        <span className="text-xs text-slate-500">
          蛋白質 {totalProtein}g / {targets.macros.protein}g
        </span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${barGradient}`}
          style={{ width: `${calPct}%` }}
        />
      </div>
    </div>
  );
}

// ── ItemCard ────────────────────────────────────

const TYPE_STYLES: Record<string, { cls: string; label: string }> = {
  supplement: { cls: "bg-blue-900/40 text-blue-300", label: "💊 補品" },
  food: { cls: "bg-amber-900/40 text-amber-300", label: "🍽️ 食物" },
};

interface ItemCardProps {
  item: ResolvedItem;
  onSwap?: () => void;
  checked: boolean;
  onCheck: () => void;
}

function ItemCard({ item, onSwap, checked, onCheck }: ItemCardProps) {
  const [open, setOpen] = useState(false);
  const border =
    { supplement: "border-blue-500/40", food: "border-amber-500/30" }[
      item.type
    ] ?? "border-slate-700";
  const ts = TYPE_STYLES[item.type] ?? TYPE_STYLES.food;

  return (
    <div
      className={`rounded-lg p-3 mb-1.5 border-l-3 bg-slate-800/50 ${border} ${checked ? "opacity-60" : ""}`}
    >
      <div className="flex justify-between items-start">
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCheck();
          }}
          className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center mr-2 transition-colors ${
            checked
              ? "bg-emerald-500 border-emerald-500"
              : "border-slate-600 bg-transparent"
          }`}
          aria-label={checked ? "取消勾選" : "勾選"}
        >
          {checked && (
            <span className="text-white text-xs font-bold leading-none">✓</span>
          )}
        </button>

        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setOpen(!open)}
        >
          <div className="flex items-center gap-1 flex-wrap mb-1">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${ts.cls}`}>
              {ts.label}
            </span>
            {item.isCore && (
              <span className="text-[9px] font-bold text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded">
                ★ 核心
              </span>
            )}
          </div>
          <div className="font-bold text-sm text-slate-100">{item.name}</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {item.dose}
            {item.cal > 0 && (
              <span className="text-slate-500 ml-1">· {item.cal}kcal</span>
            )}
          </div>
          {item.tags.length > 0 && (
            <div className="mt-1">
              {item.tags.map((t) => (
                <TagBadge key={t} tag={t} />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 ml-2 shrink-0">
          {onSwap && !checked && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSwap();
              }}
              className="px-2 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300 hover:bg-slate-600"
            >
              🔄
            </button>
          )}
          <span
            className={`text-slate-500 text-xs transition-transform cursor-pointer ${open ? "rotate-180" : ""}`}
            onClick={() => setOpen(!open)}
          >
            ▼
          </span>
        </div>
      </div>

      {open && (
        <div className="mt-2 pt-2 border-t border-slate-700/50 text-xs leading-relaxed space-y-1 ml-7">
          <p className="text-slate-300">{item.description}</p>
          {item.tcm && (
            <p className="text-pink-400/70">
              中醫：{item.tcm.effect}（{item.tcm.nature}）
            </p>
          )}
          {item.caution && (
            <p className="text-amber-400/80">⚠️ {item.caution}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── FoodPlanSection ─────────────────────────────

interface FoodPlanSectionProps {
  plan: GeneratedSlot[];
  checkedIds: Set<string>;
  onCheck: (id: string) => void;
  onSwap: (time: string, poolIdx: number, itemIdx: number) => void;
}

function FoodPlanSection({
  plan,
  checkedIds,
  onCheck,
  onSwap,
}: FoodPlanSectionProps) {
  return (
    <div className="relative">
      <div className="absolute left-[17px] top-5 bottom-5 w-0.5 bg-slate-800" />
      {plan.map((g) => (
        <div key={g.slot.time} className="mb-5 relative">
          <div className="flex items-center mb-2">
            <div className="w-9 h-9 rounded-full bg-slate-900 border-2 border-blue-500 flex items-center justify-center text-base z-10 shrink-0">
              {g.slot.icon}
            </div>
            <div className="ml-2.5">
              <div className="text-sm font-extrabold text-blue-400 tabular-nums">
                {g.slot.time}
              </div>
              <div className="text-[11px] text-slate-500">{g.slot.label}</div>
            </div>
          </div>
          <div className="ml-11">
            {g.fixed.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                checked={checkedIds.has(item.id)}
                onCheck={() => onCheck(item.id)}
              />
            ))}
            {g.selected.map((sel, pi) => (
              <div key={pi}>
                {sel.items.length > 0 && (
                  <div className="text-[10px] text-slate-600 font-semibold mt-1 mb-0.5 uppercase tracking-wider">
                    {sel.poolName}
                  </div>
                )}
                {sel.items.map((item, ii) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    checked={checkedIds.has(item.id)}
                    onCheck={() => onCheck(item.id)}
                    onSwap={() => onSwap(g.slot.time, pi, ii)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── RoutineRow ──────────────────────────────────

interface RoutineRowProps {
  item: SupplementItem;
  state: TakenState;
  movedFrom?: SupplementTiming;
  conflictWith?: string;
  synergyNames: string[];
  onToggle: (id: string) => void;
}

function RoutineRow({
  item,
  state,
  movedFrom,
  conflictWith,
  synergyNames,
  onToggle,
}: RoutineRowProps) {
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
        {isTaken && (
          <span className="text-emerald-400 font-bold text-base">✓</span>
        )}
        {isSkipped && <span className="text-slate-600 text-xs">—</span>}
        {!isTaken && !isSkipped && (
          <span className="text-slate-700 text-xs">○</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={`font-semibold text-sm ${nameClass}`}>
          {item.name}
          {item.brand && (
            <span className="ml-1 font-normal text-slate-500 text-xs">
              {item.brand}
            </span>
          )}
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
            ⚠ 避開 {conflictWith}（從{SUPPLEMENT_TIMING_LABELS[movedFrom]}
            移至此時段）
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

// ── TimingSlotCard ──────────────────────────────

interface TimingSlotCardProps {
  timing: SupplementTiming;
  items: RoutineEntry[];
  takenStates: Map<string, TakenState>;
  onToggle: (id: string) => void;
}

function TimingSlotCard({
  timing,
  items,
  takenStates,
  onToggle,
}: TimingSlotCardProps) {
  const takenCount = items.filter(
    (e) => takenStates.get(e.item.id) === "taken"
  ).length;
  const total = items.length;

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-slate-300">
          {SUPPLEMENT_TIMING_LABELS[timing]}
        </h2>
        <span className="text-xs text-slate-500">
          {takenCount}/{total}
        </span>
      </div>
      {items.map((entry) => {
        const synergyNames = items
          .filter(
            (other) =>
              other.item.id !== entry.item.id &&
              hasSynergy(entry.item, other.item)
          )
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

// ── UnscheduledCard ─────────────────────────────

function UnscheduledCard({
  items,
}: {
  items: { item: SupplementItem; conflicts: string[] }[];
}) {
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

// ── SupplementRoutineSection ────────────────────

interface SupplementRoutineSectionProps {
  routine: RoutineResult;
  takenStates: Map<string, TakenState>;
  onToggle: (id: string) => void;
}

function SupplementRoutineSection({
  routine,
  takenStates,
  onToggle,
}: SupplementRoutineSectionProps) {
  const allScheduledIds = [...routine.slots.values()]
    .flat()
    .map((e) => e.item.id);
  const takenCount = allScheduledIds.filter(
    (id) => takenStates.get(id) === "taken"
  ).length;
  const totalCount = allScheduledIds.length;

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-extrabold">💊 今日補品</h2>
        <span className="text-xs text-slate-500">
          {takenCount}/{totalCount} 已服用
        </span>
      </div>

      {/* Timing slots */}
      {TIMING_ORDER.map((timing) => {
        const items = routine.slots.get(timing) ?? [];
        if (items.length === 0) return null;
        return (
          <TimingSlotCard
            key={timing}
            timing={timing}
            items={items}
            takenStates={takenStates}
            onToggle={onToggle}
          />
        );
      })}

      {/* Unscheduled */}
      <UnscheduledCard items={routine.unscheduled} />
    </div>
  );
}

// ── Main Component ──────────────────────────────

export default function UnifiedPlan() {
  const [plan, setPlan] = useState<GeneratedSlot[] | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [skippedSupplementIds, setSkippedSupplementIds] = useState<
    Set<string>
  >(new Set());
  const [supplements, setSupplements] = useState<SupplementItem[]>([]);
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [consumption, setConsumption] = useState<ConsumptionEvent[]>([]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [menuName, setMenuName] = useState("");
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived values
  const locked = checkedIds.size > 0;
  const routine =
    supplements.length > 0
      ? generateRoutine(supplements, inventory, consumption)
      : { slots: new Map<SupplementTiming, RoutineEntry[]>(), unscheduled: [] };

  // Build takenStates map from checkedIds (taken) and skippedSupplementIds (skipped)
  const buildTakenStatesMap = useCallback((): Map<string, TakenState> => {
    const map = new Map<string, TakenState>();
    checkedIds.forEach((id) => {
      // Only mark as "taken" if it belongs to a supplement
      if (supplements.some((s) => s.id === id)) {
        map.set(id, "taken");
      }
    });
    skippedSupplementIds.forEach((id) => {
      map.set(id, "skipped");
    });
    return map;
  }, [checkedIds, skippedSupplementIds, supplements]);

  // Load all data on mount and restore plan
  useEffect(() => {
    Promise.all([
      ItemService.getFoods(),
      ItemService.getSupplements(),
      ItemService.getInventory(),
      ItemService.getConsumption(),
    ]).then(([foodList, suppList, inv, cons]) => {
      setFoods(foodList);
      setSupplements(suppList);
      setInventory(inv);
      setConsumption(cons);

      // Restore today's plan from localStorage
      const stored = loadTodayPlan();
      if (stored && stored.date === todayStr()) {
        setPlan(stored.foodSlots);
        setCheckedIds(new Set(stored.checkedIds));
        setSkippedSupplementIds(new Set(stored.skippedSupplementIds));
      }

      // Restore supplement daily log for today
      const today = todayStr();
      const log = ItemService.getDailyLog(today);
      if (log) {
        setCheckedIds((prev) => {
          const next = new Set(prev);
          log.takenIds.forEach((id) => next.add(id));
          return next;
        });
        setSkippedSupplementIds((prev) => {
          const next = new Set(prev);
          (log.skippedIds ?? []).forEach((id) => next.add(id));
          return next;
        });
      }

      setLoading(false);
    });
  }, []);

  // Persist plan record to localStorage
  const persistRecord = useCallback(
    (
      currentPlan: GeneratedSlot[] | null,
      currentCheckedIds: Set<string>,
      currentSkippedIds: Set<string>
    ) => {
      if (!currentPlan) return;
      const record: TodayPlanRecord = {
        date: todayStr(),
        foodSlots: currentPlan,
        checkedIds: [...currentCheckedIds],
        skippedSupplementIds: [...currentSkippedIds],
      };
      saveTodayPlan(record);
    },
    []
  );

  // Generate food plan
  const generate = useCallback(async () => {
    const history = await DataService.getDailyPlans(3);
    const recentIds = new Set<string>();
    history.forEach((h) => {
      try {
        JSON.parse(h.items_json as string).forEach((id: string) =>
          recentIds.add(id)
        );
      } catch {}
    });
    const newPlan = generatePlan(recentIds);
    const newChecked = new Set<string>();
    const newSkipped = new Set<string>();
    setPlan(newPlan);
    setCheckedIds(newChecked);
    setSkippedSupplementIds(newSkipped);
    persistRecord(newPlan, newChecked, newSkipped);
  }, [persistRecord]);

  // Handle food item check/uncheck
  const handleFoodCheck = useCallback(
    (itemId: string) => {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        const isChecking = !prev.has(itemId);

        if (isChecking) {
          next.add(itemId);
          // Find food data and log meal (debounced)
          const food = foods.find((f) => f.id === itemId);
          if (food) {
            if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
            syncTimerRef.current = setTimeout(() => {
              DataService.logMeal({
                date: todayStr(),
                meal: "snack",
                items_json: JSON.stringify([itemId]),
                calories: food.cal,
                protein: food.protein,
                fat: food.fat,
                carbs: food.carbs,
                sodium: food.sodium,
              });
            }, 300);
          }
        } else {
          next.delete(itemId);
          // Remove meal entry (debounced)
          if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
          syncTimerRef.current = setTimeout(() => {
            DataService.removeMealEntry(todayStr(), itemId);
          }, 300);
        }

        persistRecord(plan, next, skippedSupplementIds);
        return next;
      });
    },
    [foods, plan, skippedSupplementIds, persistRecord]
  );

  // Handle supplement toggle (three-state: untouched → taken → skipped → untouched)
  const handleSupplementToggle = useCallback(
    (suppId: string) => {
      const current = checkedIds.has(suppId)
        ? "taken"
        : skippedSupplementIds.has(suppId)
        ? "skipped"
        : "untouched";

      if (current === "untouched") {
        // untouched → taken: log consumption
        const supp = supplements.find((s) => s.id === suppId);
        if (supp) {
          ItemService.logConsumption({
            supplementId: suppId,
            date: todayStr(),
            units: supp.unitsPerDose,
          });
          // Optimistic local update
          setConsumption((c) => [
            ...c,
            { supplementId: suppId, date: todayStr(), units: supp.unitsPerDose },
          ]);
        }
        const nextChecked = new Set(checkedIds);
        nextChecked.add(suppId);
        setCheckedIds(nextChecked);

        // Persist daily log
        const takenIds = [
          ...[...nextChecked].filter((id) => supplements.some((s) => s.id === id)),
        ];
        const skippedIds = [...skippedSupplementIds];
        ItemService.saveDailyLog({ date: todayStr(), takenIds, skippedIds });
        persistRecord(plan, nextChecked, skippedSupplementIds);
      } else if (current === "taken") {
        // taken → skipped
        const nextChecked = new Set(checkedIds);
        nextChecked.delete(suppId);
        const nextSkipped = new Set(skippedSupplementIds);
        nextSkipped.add(suppId);
        setCheckedIds(nextChecked);
        setSkippedSupplementIds(nextSkipped);

        const takenIds = [
          ...[...nextChecked].filter((id) => supplements.some((s) => s.id === id)),
        ];
        const skippedIds = [...nextSkipped];
        ItemService.saveDailyLog({ date: todayStr(), takenIds, skippedIds });
        persistRecord(plan, nextChecked, nextSkipped);
      } else {
        // skipped → untouched
        const nextSkipped = new Set(skippedSupplementIds);
        nextSkipped.delete(suppId);
        setSkippedSupplementIds(nextSkipped);

        const takenIds = [
          ...[...checkedIds].filter((id) => supplements.some((s) => s.id === id)),
        ];
        const skippedIds = [...nextSkipped];
        ItemService.saveDailyLog({ date: todayStr(), takenIds, skippedIds });
        persistRecord(plan, checkedIds, nextSkipped);
      }
    },
    [checkedIds, skippedSupplementIds, supplements, plan, persistRecord]
  );

  // Swap a single food item (only for unchecked items)
  const swapItem = useCallback(
    (time: string, poolIdx: number, itemIdx: number) => {
      if (!plan) return;
      const newPlan = plan.map((g) => {
        if (g.slot.time !== time) return g;
        const pool = g.slot.pools[poolIdx];
        if (!pool) return g;
        const currentItem = g.selected[poolIdx]?.items[itemIdx];
        if (!currentItem) return g;
        // Guard: don't swap checked items
        if (checkedIds.has(currentItem.id)) return g;
        const currentIds = new Set(g.selected[poolIdx].items.map((i) => i.id));
        const others = pool.itemIds.filter((id) => !currentIds.has(id));
        if (!others.length) return g;
        const resolved = resolveItem(
          others[Math.floor(Math.random() * others.length)]
        );
        if (!resolved) return g;
        const newSelected = [...g.selected];
        const newItems = [...newSelected[poolIdx].items];
        newItems[itemIdx] = resolved;
        newSelected[poolIdx] = { ...newSelected[poolIdx], items: newItems };
        return { ...g, selected: newSelected };
      });
      setPlan(newPlan);
      persistRecord(newPlan, checkedIds, skippedSupplementIds);
    },
    [plan, checkedIds, skippedSupplementIds, persistRecord]
  );

  const takenStates = buildTakenStatesMap();

  function autoMenuName(): string {
    const d = new Date();
    return `${d.getMonth() + 1}月${d.getDate()}日 菜單`;
  }

  function handleSaveMenu() {
    if (!plan) return;
    const name = menuName.trim() || autoMenuName();
    const foodItemIds = plan.map((g) => {
      const fixedIds = g.fixed.map((i) => i.id);
      const selectedIds = g.selected.flatMap((s) => s.items.map((i) => i.id));
      return [...fixedIds, ...selectedIds];
    });
    MenuService.save({
      id: crypto.randomUUID(),
      name,
      createdAt: todayStr(),
      foodItemIds,
    });
    setMenuName("");
    setSaveDialogOpen(false);
  }

  return (
    <div className="px-4 pt-5 pb-6">
      {/* Header */}
      <header className="text-center mb-5">
        <h1 className="text-xl font-extrabold">{"🎲 每日方案"}</h1>
        <p className="text-xs text-slate-500 mt-1">{todayStr()}</p>
      </header>

      {/* Generate / re-generate button */}
      <div className="flex gap-2 justify-center mb-4">
        <button
          onClick={generate}
          disabled={locked}
          className={`px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 font-bold text-sm shadow-lg transition ${
            locked ? "opacity-50 cursor-not-allowed" : "active:scale-95"
          }`}
        >
          {"🎲"} {plan ? "重新產生" : "產生今日方案"}
        </button>
        {plan && (
          <button
            onClick={() => setSaveDialogOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm transition active:scale-95"
          >
            {"📋"} 儲存為菜單
          </button>
        )}
      </div>

      {/* Nutrition budget bar — only when plan exists */}
      {plan && <NutritionBudgetBar checkedFoodIds={checkedIds} foods={foods} />}

      {/* Food plan section */}
      {plan ? (
        <FoodPlanSection
          plan={plan}
          checkedIds={checkedIds}
          onCheck={handleFoodCheck}
          onSwap={swapItem}
        />
      ) : (
        <div className="text-center py-12 text-slate-600">
          <p className="text-4xl mb-3">{"🥗"}</p>
          <p>{"按上方按鈕產生今日方案"}</p>
        </div>
      )}

      {/* Divider between food and supplements */}
      {plan && supplements.length > 0 && (
        <div className="border-t border-slate-800 my-6" />
      )}

      {/* Supplement routine section */}
      {!loading && supplements.length > 0 && (
        <SupplementRoutineSection
          routine={routine}
          takenStates={takenStates}
          onToggle={handleSupplementToggle}
        />
      )}

      {/* Save as menu dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/50 transition duration-200 data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl p-5 transition duration-300 data-[closed]:scale-95 data-[closed]:opacity-0"
          >
            <h3 className="text-lg font-bold text-slate-100 mb-3">儲存為菜單</h3>
            <input
              type="text"
              value={menuName}
              onChange={(e) => setMenuName(e.target.value)}
              placeholder={autoMenuName()}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => { setMenuName(""); setSaveDialogOpen(false); }}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 transition"
              >
                取消
              </button>
              <button
                onClick={handleSaveMenu}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition"
              >
                儲存
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
