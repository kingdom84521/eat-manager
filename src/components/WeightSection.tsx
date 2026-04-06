import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DataService, todayStr, type WeightEntry } from "../lib/data-service";
import { SettingsService } from "../lib/settings-service";

export function WeightSection() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [inputKg, setInputKg] = useState("");

  useEffect(() => {
    DataService.getWeightLog(90).then(setEntries);
  }, []);

  const profile = SettingsService.getUserProfile();

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400 mb-4">請先完成個人設定</p>
        <button
          onClick={() => navigate("/settings")}
          className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-bold"
        >
          前往設定
        </button>
      </div>
    );
  }

  const latestKg = entries[0]?.weight_kg ?? profile.weightKg;
  const toGo = latestKg - profile.weightKg;

  const handleLog = async () => {
    const kg = parseFloat(inputKg);
    if (isNaN(kg) || kg < 40 || kg > 200) return;
    const entry: WeightEntry = { date: todayStr(), weight_kg: kg, notes: "" };
    await DataService.logWeight(entry);
    setEntries((prev) => [entry, ...prev.filter((e) => e.date !== entry.date)]);
    setInputKg("");
  };

  return (
    <div>
      {/* Progress */}
      <div className="bg-slate-800/50 rounded-xl p-5 mb-5 text-center">
        <div className="text-4xl font-black text-white mb-1">{latestKg} kg</div>
        <div className="text-sm text-slate-400">
          目前 <span className="text-amber-400 font-bold">{latestKg} kg</span> / 設定目標 <span className="text-emerald-400 font-bold">{profile.weightKg} kg</span>
        </div>
        <div className="text-sm mt-2">
          {toGo > 0 ? (
            <span className="text-amber-400">還差 {toGo.toFixed(1)} kg</span>
          ) : toGo < 0 ? (
            <span className="text-emerald-400">已低於目標 {Math.abs(toGo).toFixed(1)} kg</span>
          ) : (
            <span className="text-emerald-400">已達目標！</span>
          )}
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
