import { useState, useEffect } from "react";
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from "react-router-dom";
import DailyPlan from "./pages/DailyPlan";
import FoodManager from "./pages/FoodManager";
import NutritionTracker from "./pages/NutritionTracker";
import SupplementSchedule from "./pages/SupplementSchedule";
import SupplementManager from "./pages/SupplementManager";
import WeightLog from "./pages/WeightLog";
import Settings from "./pages/Settings";
import { SettingsService } from "./lib/settings-service";
import gasApiCode from "../scripts/gas-api.js?raw";

// Extract API_VERSION from gas-api.js at build time — single source of truth
const EXPECTED_API_VERSION = (() => {
  const match = gasApiCode.match(/API_VERSION\s*=\s*(\d+)/);
  return match ? Number(match[1]) : 0;
})();

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
  const location = useLocation();
  const [gasBroken, setGasBroken] = useState<string | false>(false);

  // Auto-check GAS connection + version on app load and after navigation (e.g. leaving Settings)
  useEffect(() => {
    const cfg = SettingsService.getSheetsConfig();
    if (!cfg?.gasUrl) return;

    const testUrl = new URL(cfg.gasUrl);
    testUrl.searchParams.set("action", "version");

    fetch(testUrl.toString())
      .then((res) => {
        if (!res.ok) throw new Error("連線失敗");
        return res.json();
      })
      .then((data) => {
        if (!data.version) {
          throw new Error("GAS 版本過舊，請重新複製程式碼並部署");
        }
        if (data.version < EXPECTED_API_VERSION) {
          throw new Error(`GAS 版本 ${data.version}，需要 ${EXPECTED_API_VERSION}。請重新複製程式碼並部署`);
        }
        setGasBroken(false);
      })
      .catch((err) => {
        SettingsService.saveSheetsConfig({ gasUrl: "", sheetId: "" });
        setGasBroken(err instanceof Error ? err.message : "GAS 連線失敗");
        navigate("/settings");
      });
  }, [navigate, location.pathname]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 max-w-xl mx-auto">
      {/* GAS connection broken banner */}
      {gasBroken && (
        <div className="bg-red-500/20 border border-red-500/40 text-red-400 text-sm px-4 py-3 text-center">
          ⚠ {gasBroken}。設定已清空��請重新設定。
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
