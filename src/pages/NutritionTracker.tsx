import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { todayStr } from "../lib/data-service";
import { SettingsService } from "../lib/settings-service";

export default function NutritionTracker() {
  const navigate = useNavigate();
  const [date] = useState(todayStr());
  const [meals] = useState<
    { meal: string; name: string; cal: number; protein: number }[]
  >([]);

  const targets = SettingsService.getComputedTargets();

  if (!targets) {
    return (
      <div className="px-4 pt-5">
        <header className="text-center mb-5">
          <h1 className="text-xl font-extrabold">📊 飲食追蹤</h1>
        </header>
        <div className="text-center py-12">
          <p className="text-slate-400 mb-4">請先完成個人設定</p>
          <button
            onClick={() => navigate("/settings")}
            className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-bold"
          >
            前往設定
          </button>
        </div>
      </div>
    );
  }

  const totalCal = meals.reduce((s, m) => s + m.cal, 0);
  const totalProtein = meals.reduce((s, m) => s + m.protein, 0);
  const remainCal = targets.tdee - totalCal;
  const remainProtein = targets.macros.protein - totalProtein;

  return (
    <div className="px-4 pt-5">
      <header className="text-center mb-5">
        <h1 className="text-xl font-extrabold">📊 飲食追蹤</h1>
        <p className="text-xs text-slate-500 mt-1">{date}</p>
      </header>

      {/* Budget bar */}
      <div className="bg-slate-800/50 rounded-xl p-4 mb-5">
        <div className="flex justify-between text-sm mb-2">
          <span>已用 {totalCal} kcal</span>
          <span className={remainCal < 200 ? "text-red-400" : "text-emerald-400"}>
            剩餘 {Math.max(0, remainCal)} kcal
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all"
            style={{ width: `${Math.min(100, (totalCal / targets.tdee) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <span>蛋白質 {totalProtein}g / {targets.macros.protein}g (需補 {Math.max(0, remainProtein)}g)</span>
        </div>
      </div>

      {/* Meal list */}
      {meals.length > 0 && (
        <div className="mb-5">
          {meals.map((m, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-slate-800 text-sm">
              <span className="text-slate-300">{m.name}</span>
              <span className="text-slate-500">{m.cal} kcal / P{m.protein}g</span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state when no meals logged */}
      {meals.length === 0 && (
        <p className="text-center text-sm text-slate-500 mt-8">
          尚未記錄任何餐食
        </p>
      )}
    </div>
  );
}
