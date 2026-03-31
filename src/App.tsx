import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import DailyPlan from "./pages/DailyPlan";
import FoodManager from "./pages/FoodManager";
import NutritionTracker from "./pages/NutritionTracker";
import SupplementSchedule from "./pages/SupplementSchedule";
import WeightLog from "./pages/WeightLog";
import Settings from "./pages/Settings";

const tabs = [
  { path: "/plan", icon: "🎲", label: "方案" },
  { path: "/foods", icon: "🍽️", label: "食材" },
  { path: "/track", icon: "📊", label: "飲食" },
  { path: "/schedule", icon: "💊", label: "時程" },
  { path: "/weight", icon: "⚖️", label: "體重" },
  { path: "/settings", icon: "⚙️", label: "設定" },
];

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 max-w-xl mx-auto">
      {/* Page content */}
      <Routes>
        <Route path="/plan" element={<DailyPlan />} />
        <Route path="/foods" element={<FoodManager />} />
        <Route path="/track" element={<NutritionTracker />} />
        <Route path="/schedule" element={<SupplementSchedule />} />
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
              <span>{t.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
