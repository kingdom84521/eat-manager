import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { todayStr } from "../lib/data-service";
import { SettingsService } from "../lib/settings-service";

/**
 * TODO: 把你的 nutrition-tracker-tw skill 的邏輯搬進來
 * 核心功能：
 * 1. 「新的一天」重置
 * 2. 記錄每餐 (搜尋食物 or 手動輸入)
 * 3. 即時顯示預算表
 * 4. 已知食物資料庫 (7-11, 早餐店等)
 */

export default function NutritionTracker() {
  const navigate = useNavigate();
  const [date] = useState(todayStr());
  const [meals, setMeals] = useState<
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

      {/* Quick add (placeholder) */}
      <div className="space-y-2">
        <button
          onClick={() =>
            setMeals([...meals, { meal: "snack", name: "茶葉蛋", cal: 75, protein: 7 }])
          }
          className="w-full py-3 rounded-lg bg-slate-800 text-sm text-slate-300 hover:bg-slate-700 transition"
        >
          + 快速記錄（TODO: 搜尋 / 拍照 / 手動）
        </button>
      </div>

      <p className="text-center text-[10px] text-slate-700 mt-8">
        TODO: 接上 DataService.logMeal() + 食物資料庫搜尋
      </p>
    </div>
  );
}
