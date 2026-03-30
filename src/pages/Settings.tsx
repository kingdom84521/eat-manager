import { useState } from "react";
import { SettingsService } from "../lib/settings-service";
import { ACTIVITY_LEVELS, calculateBMRResult } from "../data/bmr";
import { GUIDELINES, calculateMacroGrams, GUIDELINE_MAP } from "../data/dietary-guidelines";
import type { ActivityLevelId } from "../data/types";

// ── Form State Types ──────────────────────────────

interface ProfileFormState {
  ageYears: string;
  sex: "male" | "female";
  heightCm: string;
  weightKg: string;
  activityLevelId: ActivityLevelId;
}

interface ProfileErrors {
  ageYears?: string;
  heightCm?: string;
  weightKg?: string;
}

// ── Validation ────────────────────────────────────

function validateProfile(form: ProfileFormState): ProfileErrors {
  const errors: ProfileErrors = {};
  const age = parseFloat(form.ageYears);
  const height = parseFloat(form.heightCm);
  const weight = parseFloat(form.weightKg);

  if (form.ageYears === "" || isNaN(age) || age < 10 || age > 120) {
    errors.ageYears = "年齡須介於 10–120";
  }
  if (form.heightCm === "" || isNaN(height) || height < 100 || height > 250) {
    errors.heightCm = "身高須介於 100–250 公分";
  }
  if (form.weightKg === "" || isNaN(weight) || weight < 30 || weight > 300) {
    errors.weightKg = "體重須介於 30–300 公斤";
  }
  return errors;
}

function isProfileComplete(form: ProfileFormState): boolean {
  return (
    form.ageYears !== "" &&
    form.heightCm !== "" &&
    form.weightKg !== "" &&
    !isNaN(parseFloat(form.ageYears)) &&
    !isNaN(parseFloat(form.heightCm)) &&
    !isNaN(parseFloat(form.weightKg))
  );
}

function computeTdee(form: ProfileFormState): number | null {
  const age = parseFloat(form.ageYears);
  const height = parseFloat(form.heightCm);
  const weight = parseFloat(form.weightKg);

  if (
    isNaN(age) || age < 10 || age > 120 ||
    isNaN(height) || height < 100 || height > 250 ||
    isNaN(weight) || weight < 30 || weight > 300
  ) {
    return null;
  }
  return calculateBMRResult(age, form.sex, height, weight, form.activityLevelId).tdee;
}

// ── Input Style ───────────────────────────────────

const INPUT_CLASS =
  "w-full bg-slate-800 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500";

// ── Main Component ────────────────────────────────

export default function Settings() {
  // ── Profile Form State ──

  const savedProfile = SettingsService.getUserProfile();
  const [form, setForm] = useState<ProfileFormState>({
    ageYears: savedProfile ? String(savedProfile.ageYears) : "",
    sex: savedProfile ? savedProfile.sex : "male",
    heightCm: savedProfile ? String(savedProfile.heightCm) : "",
    weightKg: savedProfile ? String(savedProfile.weightKg) : "",
    activityLevelId: savedProfile ? savedProfile.activityLevelId : "sedentary",
  });
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});

  // ── Guideline State ──

  const [activeGuidelineId, setActiveGuidelineId] = useState<string | null>(
    SettingsService.getActiveGuidelineId()
  );

  // ── Sheets Config State ──

  const savedSheets = SettingsService.getSheetsConfig();
  const [gasUrl, setGasUrl] = useState(savedSheets?.gasUrl ?? "");
  const [sheetId, setSheetId] = useState(savedSheets?.sheetId ?? "");
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [sheetsSaved, setSheetsSaved] = useState(false);

  // ── Profile Handlers ──

  function handleProfileChange(patch: Partial<ProfileFormState>) {
    const next = { ...form, ...patch };
    setForm(next);
    const errors = validateProfile(next);
    setProfileErrors(errors);

    if (Object.keys(errors).length === 0 && isProfileComplete(next)) {
      SettingsService.saveUserProfile({
        ageYears: parseFloat(next.ageYears),
        sex: next.sex,
        heightCm: parseFloat(next.heightCm),
        weightKg: parseFloat(next.weightKg),
        activityLevelId: next.activityLevelId,
      });
    }
  }

  // ── TDEE (live preview from form, not SettingsService) ──

  const liveTdee = computeTdee(form);

  // ── Guideline Handler ──

  function handleGuidelineSelect(id: string) {
    SettingsService.saveActiveGuidelineId(id);
    setActiveGuidelineId(id);
  }

  // ── Macro display when both TDEE and guideline are set ──

  const selectedGuideline = activeGuidelineId ? GUIDELINE_MAP.get(activeGuidelineId) ?? null : null;
  const liveMacros =
    liveTdee !== null && selectedGuideline
      ? calculateMacroGrams(liveTdee, selectedGuideline)
      : null;

  // ── Sheets Config Handler ──

  function handleSheetsSave() {
    if (gasUrl !== "" && !gasUrl.startsWith("https://script.google.com/")) {
      setSheetsError("GAS 網址必須以 https://script.google.com/ 開頭");
      return;
    }
    SettingsService.saveSheetsConfig({ gasUrl, sheetId });
    setSheetsError(null);
    setSheetsSaved(true);
    setTimeout(() => setSheetsSaved(false), 2000);
  }

  // ── Render ────────────────────────────────────────

  return (
    <div className="px-4 pt-5 pb-4">
      {/* Page Header */}
      <header className="text-center mb-5">
        <h1 className="text-xl font-extrabold">⚙️ 設定</h1>
      </header>

      {/* Section 1: BMR Profile */}
      <div className="bg-slate-800/50 rounded-xl p-4 mb-5">
        <h2 className="text-sm font-bold text-slate-300 mb-4">個人資料</h2>

        {/* Age */}
        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1">年齡</label>
          <input
            type="number"
            placeholder="年齡"
            value={form.ageYears}
            onChange={(e) => handleProfileChange({ ageYears: e.target.value })}
            className={INPUT_CLASS}
          />
          {profileErrors.ageYears && (
            <p className="text-red-400 text-xs mt-1">{profileErrors.ageYears}</p>
          )}
        </div>

        {/* Sex */}
        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1">性別</label>
          <div className="flex gap-2">
            <button
              onClick={() => handleProfileChange({ sex: "male" })}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                form.sex === "male" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"
              }`}
            >
              男
            </button>
            <button
              onClick={() => handleProfileChange({ sex: "female" })}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                form.sex === "female" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"
              }`}
            >
              女
            </button>
          </div>
        </div>

        {/* Height */}
        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1">身高</label>
          <input
            type="number"
            placeholder="公分"
            value={form.heightCm}
            onChange={(e) => handleProfileChange({ heightCm: e.target.value })}
            className={INPUT_CLASS}
          />
          {profileErrors.heightCm && (
            <p className="text-red-400 text-xs mt-1">{profileErrors.heightCm}</p>
          )}
        </div>

        {/* Weight */}
        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1">體重</label>
          <input
            type="number"
            placeholder="公斤"
            value={form.weightKg}
            onChange={(e) => handleProfileChange({ weightKg: e.target.value })}
            className={INPUT_CLASS}
          />
          {profileErrors.weightKg && (
            <p className="text-red-400 text-xs mt-1">{profileErrors.weightKg}</p>
          )}
        </div>

        {/* Activity Level */}
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-1">活動量</label>
          <select
            value={form.activityLevelId}
            onChange={(e) =>
              handleProfileChange({ activityLevelId: e.target.value as ActivityLevelId })
            }
            className={INPUT_CLASS}
          >
            {ACTIVITY_LEVELS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        {/* TDEE Live Display */}
        <div className="pt-3 border-t border-slate-700/50 text-center">
          {liveTdee !== null ? (
            <div>
              <p className="text-xs text-slate-500 mb-0.5">每日總消耗熱量（TDEE）</p>
              <span className="text-emerald-400 text-2xl font-black">
                {liveTdee.toLocaleString()} kcal
              </span>
            </div>
          ) : (
            <div>
              <p className="text-xs text-slate-500 mb-0.5">每日總消耗熱量（TDEE）</p>
              <span className="text-slate-500 text-2xl font-black">—</span>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Dietary Guideline Selector */}
      <div className="bg-slate-800/50 rounded-xl p-4 mb-5">
        <h2 className="text-sm font-bold text-slate-300 mb-4">飲食指南</h2>

        {GUIDELINES.map((g) => {
          const isSelected = activeGuidelineId === g.id;
          return (
            <div
              key={g.id}
              onClick={() => handleGuidelineSelect(g.id)}
              className={`rounded-xl p-4 mb-3 cursor-pointer border transition-colors ${
                isSelected
                  ? "bg-blue-900/30 border-blue-500/60"
                  : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600"
              }`}
            >
              <div className="font-bold text-sm text-slate-100 mb-0.5">{g.name}</div>
              <div className="text-xs text-slate-400 mb-1">
                {g.authority}・{g.year} 年版
              </div>
              <div className="text-xs text-slate-500">
                蛋白質 {g.macroRatios.protein}%・脂肪 {g.macroRatios.fat}%・碳水{" "}
                {g.macroRatios.carb}%
              </div>
            </div>
          );
        })}

        {/* Macro gram display when both TDEE and guideline selected */}
        {liveMacros !== null ? (
          <div className="mt-3 pt-3 border-t border-slate-700/50 text-center">
            <p className="text-xs text-slate-500 mb-1">建議每日攝取量</p>
            <p className="text-lg font-bold text-slate-200">
              蛋白質 {liveMacros.protein}g・脂肪 {liveMacros.fat}g・碳水 {liveMacros.carb}g
            </p>
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-slate-700/50 text-center">
            <p className="text-xs text-slate-600">
              {liveTdee === null ? "請先填寫個人資料以計算克數目標" : "請選擇飲食指南以顯示克數目標"}
            </p>
          </div>
        )}
      </div>

      {/* Section 3: Google Sheets Connection */}
      <div className="bg-slate-800/50 rounded-xl p-4 mb-5">
        <h2 className="text-sm font-bold text-slate-300 mb-4">Google Sheets 連接</h2>

        {/* GAS URL */}
        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1">GAS 網址</label>
          <input
            type="text"
            placeholder="https://script.google.com/..."
            value={gasUrl}
            onChange={(e) => setGasUrl(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        {/* Sheet ID */}
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-1">Sheet ID</label>
          <input
            type="text"
            placeholder="Sheet ID"
            value={sheetId}
            onChange={(e) => setSheetId(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSheetsSave}
          className="w-full py-3 rounded-lg bg-blue-600 font-bold text-sm active:scale-95 transition"
        >
          {sheetsSaved ? (
            <span className="text-emerald-400">已儲存</span>
          ) : (
            "儲存連接設定"
          )}
        </button>

        {/* Error */}
        {sheetsError && (
          <p className="text-red-400 text-xs mt-2">{sheetsError}</p>
        )}
      </div>
    </div>
  );
}
