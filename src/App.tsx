import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import UnifiedPlan from "./pages/UnifiedPlan";
import FoodManager from "./pages/FoodManager";
import SupplementManager from "./pages/SupplementManager";
import Settings from "./pages/Settings";
import MyMenu from "./pages/MyMenu";
import Profile from "./pages/Profile";
import { SidebarDrawer } from "./components/SidebarDrawer";
import { SettingsService } from "./lib/settings-service";
import gasApiCode from "../scripts/gas-api.js?raw";

// Extract API_VERSION from gas-api.js at build time — single source of truth
const EXPECTED_API_VERSION = (() => {
  const match = gasApiCode.match(/API_VERSION\s*=\s*(\d+)/);
  return match ? Number(match[1]) : 0;
})();

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [gasBroken, setGasBroken] = useState<string | false>(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  // Auto-close drawer on route navigation (NAV-04)
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 max-w-xl mx-auto">
      <SidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Fixed top bar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-xl mx-auto flex items-center px-3 h-10">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="開啟選單"
            className="text-slate-400 hover:text-slate-200 p-1"
          >
            ☰
          </button>
        </div>
      </header>

      {/* Content offset for top bar */}
      <div className="pt-10">
        {/* GAS connection broken banner */}
        {gasBroken && (
          <div className="bg-red-500/20 border border-red-500/40 text-red-400 text-sm px-4 py-3 text-center">
            ⚠ {gasBroken}。設定已清空，請重新設定。
          </div>
        )}

        {/* Page content */}
        <Routes>
          <Route path="/plan" element={<UnifiedPlan />} />
          <Route path="/foods" element={<FoodManager />} />
          <Route path="/supplements" element={<SupplementManager />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/menu" element={<MyMenu />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/plan" replace />} />
        </Routes>
      </div>
    </div>
  );
}
