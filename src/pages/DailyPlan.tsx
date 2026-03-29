import { useState, useCallback } from "react";
import { SCHEDULE } from "../data/schedule";
import { resolveItem, type ResolvedItem } from "../data/resolver";
import { HEALTH_TAG_LABELS, HEALTH_TAG_COLORS, type HealthTag, type ScheduleSlot, type ItemPool } from "../data/types";
import { DataService, todayStr } from "../lib/data-service";

interface GeneratedSlot {
  slot: ScheduleSlot;
  fixed: ResolvedItem[];
  selected: { poolName: string; items: ResolvedItem[] }[];
}

function pickFromPool(pool: ItemPool, usedIds: Set<string>): ResolvedItem[] {
  const available = pool.itemIds.filter((id) => !usedIds.has(id));
  const source = available.length >= pool.pick ? available : pool.itemIds;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, pool.pick).map(resolveItem).filter((x): x is ResolvedItem => x !== null);
}

function generatePlan(recentIds: Set<string>): GeneratedSlot[] {
  const used = new Set(recentIds);
  return SCHEDULE.map((slot) => ({
    slot,
    fixed: slot.fixedIds.map(resolveItem).filter((x): x is ResolvedItem => x !== null),
    selected: slot.pools.map((pool) => {
      const picked = pickFromPool(pool, used);
      picked.forEach((p) => used.add(p.id));
      return { poolName: pool.name, items: picked };
    }),
  }));
}

function TagBadge({ tag }: { tag: HealthTag }) {
  return (
    <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mr-0.5 mb-0.5"
      style={{ backgroundColor: HEALTH_TAG_COLORS[tag] + "20", color: HEALTH_TAG_COLORS[tag], border: `1px solid ${HEALTH_TAG_COLORS[tag]}40` }}>
      {HEALTH_TAG_LABELS[tag]}
    </span>
  );
}

const TYPE_STYLES: Record<string, { cls: string; label: string }> = {
  supplement: { cls: "bg-blue-900/40 text-blue-300", label: "💊 補品" },
  remedy: { cls: "bg-emerald-900/40 text-emerald-300", label: "🌿 食療" },
  food: { cls: "bg-amber-900/40 text-amber-300", label: "🍽️ 食物" },
  behavior: { cls: "bg-violet-900/40 text-violet-300", label: "🏃 行為" },
};

function ItemCard({ item, onSwap }: { item: ResolvedItem; onSwap?: () => void }) {
  const [open, setOpen] = useState(false);
  const border = { supplement: "border-blue-500/40", remedy: "border-emerald-500/40", behavior: "border-violet-500/40", food: "border-amber-500/30" }[item.type] ?? "border-slate-700";
  const ts = TYPE_STYLES[item.type] ?? TYPE_STYLES.food;
  return (
    <div className={`rounded-lg p-3 mb-1.5 cursor-pointer border-l-3 bg-slate-800/50 ${border}`} onClick={() => setOpen(!open)}>
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap mb-1">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${ts.cls}`}>{ts.label}</span>
            {item.isCore && <span className="text-[9px] font-bold text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded">★ 核心</span>}
          </div>
          <div className="font-bold text-sm text-slate-100">{item.name}</div>
          <div className="text-xs text-slate-400 mt-0.5">{item.dose}{item.cal > 0 && <span className="text-slate-500 ml-1">· {item.cal}kcal</span>}</div>
          {item.tags.length > 0 && <div className="mt-1">{item.tags.map((t) => <TagBadge key={t} tag={t} />)}</div>}
        </div>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {onSwap && <button onClick={(e) => { e.stopPropagation(); onSwap(); }} className="px-2 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300 hover:bg-slate-600">🔄</button>}
          <span className={`text-slate-500 text-xs transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
        </div>
      </div>
      {open && (
        <div className="mt-2 pt-2 border-t border-slate-700/50 text-xs leading-relaxed space-y-1">
          <p className="text-slate-300">{item.description}</p>
          {item.tcm && <p className="text-pink-400/70">中醫：{item.tcm.effect}（{item.tcm.nature}）</p>}
          {item.caution && <p className="text-amber-400/80">⚠️ {item.caution}</p>}
        </div>
      )}
    </div>
  );
}

export default function DailyPlan() {
  const [plan, setPlan] = useState<GeneratedSlot[] | null>(null);
  const [saved, setSaved] = useState(false);

  const generate = useCallback(async () => {
    const history = await DataService.getDailyPlans(3);
    const recentIds = new Set<string>();
    history.forEach((h) => { try { JSON.parse(h.items_json as string).forEach((id: string) => recentIds.add(id)); } catch {} });
    setPlan(generatePlan(recentIds));
    setSaved(false);
  }, []);

  const savePlan = useCallback(async () => {
    if (!plan) return;
    const ids: string[] = [];
    let totalCal = 0;
    plan.forEach((g) => g.selected.forEach((sel) => sel.items.forEach((i) => { ids.push(i.id); totalCal += i.cal; })));
    await DataService.saveDailyPlan({ date: todayStr(), items_json: JSON.stringify(ids), total_cal: totalCal, notes: "" });
    setSaved(true);
  }, [plan]);

  const swapItem = useCallback((time: string, poolIdx: number, itemIdx: number) => {
    if (!plan) return;
    setPlan(plan.map((g) => {
      if (g.slot.time !== time) return g;
      const pool = g.slot.pools[poolIdx];
      if (!pool) return g;
      const currentIds = new Set(g.selected[poolIdx].items.map((i) => i.id));
      const others = pool.itemIds.filter((id) => !currentIds.has(id));
      if (!others.length) return g;
      const resolved = resolveItem(others[Math.floor(Math.random() * others.length)]);
      if (!resolved) return g;
      const newSelected = [...g.selected];
      const newItems = [...newSelected[poolIdx].items];
      newItems[itemIdx] = resolved;
      newSelected[poolIdx] = { ...newSelected[poolIdx], items: newItems };
      return { ...g, selected: newSelected };
    }));
    setSaved(false);
  }, [plan]);

  const totalCal = plan?.reduce((t, g) => t + g.selected.reduce((s, sel) => s + sel.items.reduce((c, i) => c + i.cal, 0), 0), 0) ?? 0;

  return (
    <div className="px-4 pt-5">
      <header className="text-center mb-5">
        <h1 className="text-xl font-extrabold">🎲 每日方案</h1>
        <p className="text-xs text-slate-500 mt-1">胰島素阻抗 + 慢性發炎 + 去濕</p>
      </header>
      <div className="flex gap-2 justify-center mb-4">
        <button onClick={generate} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 font-bold text-sm shadow-lg active:scale-95 transition">
          🎲 {plan ? "重新產生" : "產生今日方案"}
        </button>
        {plan && <button onClick={savePlan} className={`px-4 py-2.5 rounded-lg font-semibold text-sm border-2 transition ${saved ? "border-emerald-500 text-emerald-400" : "border-slate-600 text-slate-300"}`}>{saved ? "✅ 已存" : "💾 儲存"}</button>}
      </div>
      {plan && totalCal > 0 && <div className="text-center mb-4 py-2 bg-slate-800/40 rounded-lg text-xs"><span className="text-slate-400">食物預估</span><span className="text-white font-bold ml-1">~{totalCal} kcal</span></div>}
      {plan ? (
        <div className="relative">
          <div className="absolute left-[17px] top-5 bottom-5 w-0.5 bg-slate-800" />
          {plan.map((g) => (
            <div key={g.slot.time} className="mb-5 relative">
              <div className="flex items-center mb-2">
                <div className="w-9 h-9 rounded-full bg-slate-900 border-2 border-blue-500 flex items-center justify-center text-base z-10 shrink-0">{g.slot.icon}</div>
                <div className="ml-2.5"><div className="text-sm font-extrabold text-blue-400 tabular-nums">{g.slot.time}</div><div className="text-[11px] text-slate-500">{g.slot.label}</div></div>
              </div>
              <div className="ml-11">
                {g.fixed.map((item) => <ItemCard key={item.id} item={item} />)}
                {g.selected.map((sel, pi) => (
                  <div key={pi}>
                    {sel.items.length > 0 && <div className="text-[10px] text-slate-600 font-semibold mt-1 mb-0.5 uppercase tracking-wider">{sel.poolName}</div>}
                    {sel.items.map((item, ii) => <ItemCard key={item.id} item={item} onSwap={() => swapItem(g.slot.time, pi, ii)} />)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-slate-600"><p className="text-4xl mb-3">🥗</p><p>按上方按鈕產生今日方案</p></div>
      )}
    </div>
  );
}
