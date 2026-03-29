import { useState, useEffect } from "react";
import { DataService, todayStr, type WeightEntry } from "../lib/data-service";

const TARGET_KG = 80;
const START_KG = 104;

export default function WeightLog() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [inputKg, setInputKg] = useState("");

  useEffect(() => {
    DataService.getWeightLog(90).then(setEntries);
  }, []);

  const latestKg = entries[0]?.weight_kg ?? START_KG;
  const toGo = latestKg - TARGET_KG;
  const progress = ((START_KG - latestKg) / (START_KG - TARGET_KG)) * 100;

  const handleLog = async () => {
    const kg = parseFloat(inputKg);
    if (isNaN(kg) || kg < 40 || kg > 200) return;
    const entry: WeightEntry = { date: todayStr(), weight_kg: kg, notes: "" };
    await DataService.logWeight(entry);
    setEntries((prev) => [entry, ...prev.filter((e) => e.date !== entry.date)]);
    setInputKg("");
  };

  return (
    <div className="px-4 pt-5">
      <header className="text-center mb-5">
        <h1 className="text-xl font-extrabold">⚖️ 體重紀錄</h1>
        <p className="text-xs text-slate-500 mt-1">目標 {TARGET_KG}kg by 2026 年底</p>
      </header>

      {/* Progress */}
      <div className="bg-slate-800/50 rounded-xl p-5 mb-5 text-center">
        <div className="text-4xl font-black text-white mb-1">{latestKg} kg</div>
        <div className="text-sm text-slate-400">
          還差 <span className="text-amber-400 font-bold">{toGo.toFixed(1)} kg</span>
        </div>
        <div className="w-full h-3 bg-slate-700 rounded-full mt-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
        <div className="text-[10px] text-slate-600 mt-1">
          {START_KG}kg → {TARGET_KG}kg（已完成 {Math.max(0, progress).toFixed(0)}%）
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-2 mb-6">
        <input
          type="number"
          step="0.1"
          placeholder="今天幾公斤？"
          value={inputKg}
          onChange={(e) => setInputKg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLog()}
          className="flex-1 bg-slate-800 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleLog}
          className="px-5 py-3 rounded-lg bg-blue-600 font-bold text-sm active:scale-95 transition"
        >
          記錄
        </button>
      </div>

      {/* History */}
      <div>
        <h2 className="text-sm font-bold text-slate-400 mb-2">歷史紀錄</h2>
        {entries.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-8">尚無紀錄</p>
        ) : (
          <div className="space-y-1">
            {entries.map((e) => (
              <div key={e.date} className="flex justify-between py-2 border-b border-slate-800/50 text-sm">
                <span className="text-slate-500">{e.date}</span>
                <span className="font-semibold text-slate-200">{e.weight_kg} kg</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
