import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { NavLink } from "react-router-dom";
import { SettingsService } from "../lib/settings-service";

// ── Nav Items ──────────────────────────────────────────────────────────────────
/** 側邊選單的 4 個主要導航項目 */
const NAV_ITEMS = [
  { path: "/plan",        icon: "🎲", label: "今日方案" },
  { path: "/foods",       icon: "🍽️", label: "我的食材" },
  { path: "/menu",        icon: "📋", label: "我的菜單" },
  { path: "/supplements", icon: "💊", label: "營養補充" },
];

// ── Props ──────────────────────────────────────────────────────────────────────
interface SidebarDrawerProps {
  open: boolean;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
/** 側邊抽屜導航元件，使用 headlessui Dialog 提供焦點陷阱、Escape 關閉及捲動鎖定 */
export function SidebarDrawer({ open, onClose }: SidebarDrawerProps) {
  const { displayName, initials } = SettingsService.getDisplayProfile();
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      {/* 背景遮罩 */}
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 transition duration-200 data-[closed]:opacity-0"
      />

      {/* 面板容器 */}
      <div className="fixed inset-0 flex">
        <DialogPanel
          transition
          className="flex flex-col w-72 max-w-[80vw] h-full bg-slate-900 border-r border-slate-800 transition duration-300 ease-in-out data-[closed]:-translate-x-full"
        >
          {/* 標題列 */}
          <div className="flex items-center justify-between px-4 h-10 border-b border-slate-800">
            <span className="text-sm font-medium text-slate-200">選單</span>
            <button
              onClick={onClose}
              aria-label="關閉選單"
              className="text-slate-400 hover:text-slate-200 p-1"
            >
              ✕
            </button>
          </div>

          {/* 導航項目 */}
          <nav className="flex-1 overflow-y-auto py-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors text-sm ${
                    isActive
                      ? "bg-blue-500/20 text-blue-400"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* 頁尾：使用者與設定 */}
          <div className="border-t border-slate-800 p-3 flex items-center justify-between">
            <NavLink
              to="/profile"
              onClick={onClose}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-200"
            >
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                {initials ? initials.toUpperCase().slice(0, 2) : "\u{1F464}"}
              </div>
              <span className="text-sm">{displayName || "使用者"}</span>
            </NavLink>
            <NavLink
              to="/settings"
              onClick={onClose}
              aria-label="設定"
              className="text-slate-400 hover:text-slate-200 p-1"
            >
              ⚙️
            </NavLink>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
