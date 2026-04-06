import { useState } from "react";
import { SettingsService } from "../lib/settings-service";
import { WeightSection } from "../components/WeightSection";

function AvatarCircle({ initials, size }: { initials: string; size: "sm" | "lg" }) {
  const dim = size === "lg" ? "w-20 h-20 text-2xl" : "w-7 h-7 text-xs";
  return (
    <div className={`${dim} rounded-full bg-slate-700 flex items-center justify-center`}>
      {initials ? initials.toUpperCase().slice(0, 2) : "\u{1F464}"}
    </div>
  );
}

export default function Profile() {
  const { displayName: savedName, initials: savedInitials } = SettingsService.getDisplayProfile();
  const [displayName, setDisplayName] = useState(savedName);
  const [initials, setInitials] = useState(savedInitials);

  const handleBlur = () => {
    const profile = SettingsService.getUserProfile();
    if (!profile) return;
    SettingsService.saveUserProfile({ ...profile, displayName, initials });
  };

  return (
    <div className="px-4 pt-5">
      {/* Avatar hero (per D-10) */}
      <div className="flex flex-col items-center mb-6">
        <AvatarCircle initials={initials} size="lg" />
        <p className="text-slate-400 text-xs mt-2">{displayName || "未設定名稱"}</p>
      </div>

      {/* Edit form */}
      <div className="bg-slate-800/50 rounded-xl p-4 mb-6 space-y-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">顯示名稱</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onBlur={handleBlur}
            placeholder="輸入名稱"
            className="w-full bg-slate-800 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">縮寫（1-2 字）</label>
          <input
            value={initials}
            onChange={(e) => setInitials(e.target.value.slice(0, 2))}
            onBlur={handleBlur}
            maxLength={2}
            placeholder="縮寫"
            className="w-full bg-slate-800 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Weight section (per D-11) */}
      <h2 className="text-sm font-bold text-slate-400 mb-3">體重紀錄</h2>
      <WeightSection />
    </div>
  );
}
