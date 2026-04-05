import { useState, useEffect } from "react";
import { Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom";
import DailyPlan from "./pages/DailyPlan";
import FoodManager from "./pages/FoodManager";
import NutritionTracker from "./pages/NutritionTracker";
import SupplementSchedule from "./pages/SupplementSchedule";
import SupplementManager from "./pages/SupplementManager";
import WeightLog from "./pages/WeightLog";
import Settings from "./pages/Settings";
import { SettingsService } from "./lib/settings-service";

const tabs = [
  { path: "/plan", icon: "🎲", label: "方案" },
  { path: "/foods", icon: "🍽️", label: "食材" },
  { path: "/track", icon: "📊", label: "飲食" },
  { path: "/supplements", icon: "💊", label: "補品" },
  { path: "/items", icon: "📋", label: "品項" },
  { path: "/weight", icon: "⚖️", label: "體重" },
  { path: "/settings", icon: "⚙️", label: "設定" },
];

export default function App() {
  const navigate = useNavigate();
  const [gasBroken, setGasBroken] = useState(false);

  // Auto-check GAS connection on app load
  useEffect(() => {
    const cfg = SettingsService.getSheetsConfig();
    if (!cfg?.gasUrl) return;

    const testUrl = new URL(cfg.gasUrl);
    testUrl.searchParams.set("action", "read");
    testUrl.searchParams.set("sheet", "supplements");

    fetch(testUrl.toString())
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .catch(() => {
        SettingsService.saveSheetsConfig({ gasUrl: "", sheetId: "" });
        setGasBroken(true);
        navigate("/settings");
      });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 max-w-xl mx-auto">
      {/* GAS connection broken banner */}
      {gasBroken && (
        <div className="bg-red-500/20 border border-red-500/40 text-red-400 text-sm px-4 py-3 text-center">
          ⚠ Google Sheets 連線失敗，設定已清空。請重新部署 Apps Script 並貼上新的網址。
        </div>
      )}

      {/* Page content */}
      <Routes>
        <Route path="/plan" element={<DailyPlan />} />
        <Route path="/foods" element={<FoodManager />} />
        <Route path="/track" element={<NutritionTracker />} />
        <Route path="/supplements" element={<SupplementManager />} />
        <Route path="/items" element={<SupplementSchedule />} />
        <Route path="/weight" element={<WeightLog />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/plan" replace />} />
      </Routes>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 z-50">
        <div className="max-w-xl mx-auto flex">
          {tabs.map((t) => (
            <NavLink
              key={t.path}
              to={t.path}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                  isActive
                    ? "text-blue-400"
                    : "text-slate-500 hover:text-slate-300"
                }`
              }
            >
              <span className="text-lg mb-0.5">{t.icon}</span>
              <span className="text-[10px]">{t.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
