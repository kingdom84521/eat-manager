import { useState } from "react";
import { SUPPLEMENTS, NATURAL_REMEDIES, BEHAVIORS } from "../data/remedies";
import { HEALTH_TAG_LABELS, HEALTH_TAG_COLORS, type HealthTag, type ItemType } from "../data/types";

type FilterType = "all" | ItemType;

const TYPE_FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "supplement", label: "💊 補品" },
  { key: "remedy", label: "🌿 食療" },
  { key: "behavior", label: "🏃 行為" },
];

const ALL_TAGS: HealthTag[] = Object.keys(HEALTH_TAG_LABELS) as HealthTag[];

export default function SupplementSchedule() {
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [tagFilter, setTagFilter] = useState<HealthTag | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpandedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const allItems = [...SUPPLEMENTS, ...NATURAL_REMEDIES, ...BEHAVIORS];
  const filtered = allItems.filter((item) => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (tagFilter && !item.tags.includes(tagFilter)) return false;
    return true;
  });

  const supplements = filtered.filter((i) => i.type === "supplement");
  const remedies = filtered.filter((i) => i.type === "remedy");
  const behaviors = filtered.filter((i) => i.type === "behavior");

  return (
    <div className="px-4 pt-5">
      <header className="text-center mb-4">
        <h1 className="text-xl font-extrabold">💊 全品項一覽</h1>
        <p className="text-xs text-slate-500 mt-1">
          補品 {SUPPLEMENTS.length} 種 · 食療 {NATURAL_REMEDIES.length} 種 · 行為 {BEHAVIORS.length} 種
        </p>
      </header>

      {/* Type filter */}
      <div className="flex gap-1.5 justify-center mb-3 flex-wrap">
        {TYPE_FILTERS.map((f) => (
          <button key={f.key} onClick={() => setTypeFilter(f.key)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${typeFilter === f.key ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Tag filter */}
      <div className="flex gap-1 justify-center mb-5 flex-wrap">
        <button onClick={() => setTagFilter(null)}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition ${!tagFilter ? "bg-slate-600 text-white" : "bg-slate-800 text-slate-500"}`}>
          全部
        </button>
        {ALL_TAGS.map((tag) => (
          <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold transition"
            style={{
              backgroundColor: tagFilter === tag ? HEALTH_TAG_COLORS[tag] + "30" : "transparent",
              color: tagFilter === tag ? HEALTH_TAG_COLORS[tag] : "#64748b",
              border: `1px solid ${tagFilter === tag ? HEALTH_TAG_COLORS[tag] + "60" : "#334155"}`,
            }}>
            {HEALTH_TAG_LABELS[tag]}
          </button>
        ))}
      </div>

      {/* Lists */}
      {supplements.length > 0 && (
        <Section title="💊 補品 (Supplements)" items={supplements} expandedIds={expandedIds} onToggle={toggle} />
      )}
      {remedies.length > 0 && (
        <Section title="🌿 自然食療 (Remedies)" items={remedies} expandedIds={expandedIds} onToggle={toggle} />
      )}
      {behaviors.length > 0 && (
        <Section title="🏃 行為 (Behaviors)" items={behaviors} expandedIds={expandedIds} onToggle={toggle} />
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-600 text-sm">沒有符合條件的項目</div>
      )}
    </div>
  );
}

function Section({ title, items, expandedIds, onToggle }: {
  title: string;
  items: any[];
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-bold text-slate-400 mb-2 border-b border-slate-800 pb-1">{title}</h2>
      {items.map((item: any) => {
        const open = expandedIds.has(item.id);
        return (
          <div key={item.id} className="py-2 border-b border-slate-800/50 cursor-pointer" onClick={() => onToggle(item.id)}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="font-semibold text-sm text-slate-200">{item.name}</span>
                  {item.isCore && <span className="text-[9px] font-bold text-red-400 bg-red-900/30 px-1 py-0.5 rounded">★核心</span>}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{item.dose}</div>
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {item.tags.map((tag: HealthTag) => (
                    <span key={tag} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: HEALTH_TAG_COLORS[tag] + "15", color: HEALTH_TAG_COLORS[tag] }}>
                      {HEALTH_TAG_LABELS[tag]}
                    </span>
                  ))}
                </div>
              </div>
              <span className={`text-slate-600 text-xs transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
            </div>
            {open && (
              <div className="mt-2 pl-2 border-l-2 border-slate-700 text-xs space-y-1">
                <p className="text-slate-300">{item.mechanism}</p>
                {item.timing && <p className="text-blue-400/70">⏰ {item.timing}</p>}
                {item.tcm && <p className="text-pink-400/70">中醫：{item.tcm.effect}（{item.tcm.nature}）</p>}
                {item.caution && <p className="text-amber-400/80">⚠️ {item.caution}</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
