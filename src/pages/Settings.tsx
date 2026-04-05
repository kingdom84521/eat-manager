import { useState, useRef, useEffect, useCallback } from "react";
import { SettingsService, computeAgeFromBirthday } from "../lib/settings-service";
import { ACTIVITY_LEVELS, calculateBMRResult } from "../data/bmr";
import { GUIDELINES, calculateMacroGrams, GUIDELINE_MAP } from "../data/dietary-guidelines";
import type { ActivityLevelId } from "../data/types";
import gasApiCode from "../../scripts/gas-api.js?raw";

// ── Form State Types ──────────────────────────────

interface ProfileFormState {
  birthday: string;
  sex: "male" | "female";
  heightCm: string;
  weightKg: string;
  activityLevelId: ActivityLevelId;
}

interface ProfileErrors {
  birthday?: string;
  heightCm?: string;
  weightKg?: string;
}

// ── Validation ────────────────────────────────────

function validateProfile(form: ProfileFormState): ProfileErrors {
  const errors: ProfileErrors = {};
  const height = parseFloat(form.heightCm);
  const weight = parseFloat(form.weightKg);

  if (form.birthday === "") {
    errors.birthday = "請選擇有效的生日（年齡須介於 10–120 歲）";
  } else {
    const age = computeAgeFromBirthday(form.birthday);
    if (age < 10 || age > 120) {
      errors.birthday = "請選擇有效的生日（年齡須介於 10–120 歲）";
    }
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
    form.birthday !== "" &&
    form.heightCm !== "" &&
    form.weightKg !== "" &&
    !isNaN(parseFloat(form.heightCm)) &&
    !isNaN(parseFloat(form.weightKg))
  );
}

function computeTdee(form: ProfileFormState): number | null {
  if (form.birthday === "") return null;
  const age = computeAgeFromBirthday(form.birthday);
  const height = parseFloat(form.heightCm);
  const weight = parseFloat(form.weightKg);

  if (
    age < 10 || age > 120 ||
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

// ── BirthdayPicker Component ──────────────────────

const DOW_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

function formatDisplayDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${y} / ${m} / ${d}`;
}

interface BirthdayPickerProps {
  value: string; // ISO date "YYYY-MM-DD" or ""
  onChange: (date: string) => void;
}

function BirthdayPicker({ value, onChange }: BirthdayPickerProps) {
  const today = new Date();
  const currentYear = today.getFullYear();

  // Default view: if value set show that month; otherwise show January 30 years ago
  const defaultViewYear = value ? parseInt(value.split("-")[0], 10) : currentYear - 30;
  const defaultViewMonth = value ? parseInt(value.split("-")[1], 10) - 1 : 0;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(defaultViewYear);
  const [viewMonth, setViewMonth] = useState(defaultViewMonth); // 0-indexed
  const [showYearList, setShowYearList] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const yearListRef = useRef<HTMLDivElement>(null);

  // Close calendar on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowYearList(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Scroll the selected year into view when year list opens
  useEffect(() => {
    if (showYearList && yearListRef.current) {
      const selectedEl = yearListRef.current.querySelector("[data-selected='true']");
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "center" });
      }
    }
  }, [showYearList]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleDayClick(day: number) {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
    setShowYearList(false);
  }

  function handleYearSelect(year: number) {
    setViewYear(year);
    setShowYearList(false);
  }

  // Build calendar grid
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // 6 rows x 7 cols = 42 cells
  const cells: { day: number; month: "prev" | "curr" | "next" }[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push({ day: daysInPrevMonth - firstDayOfMonth + 1 + i, month: "prev" });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: "curr" });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, month: "next" });
  }

  // Determine selected ISO components
  const selectedYear = value ? parseInt(value.split("-")[0], 10) : null;
  const selectedMonth = value ? parseInt(value.split("-")[1], 10) - 1 : null;
  const selectedDay = value ? parseInt(value.split("-")[2], 10) : null;

  // Today components
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  // Year list range: current year - 120 to current year - 10
  const minYear = currentYear - 120;
  const maxYear = currentYear - 10;
  const yearRange: number[] = [];
  for (let y = maxYear; y >= minYear; y--) {
    yearRange.push(y);
  }

  const monthLabel = `${viewYear} 年 ${viewMonth + 1} 月`;

  return (
    <div ref={containerRef} className="relative">
      {/* Date display input */}
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setShowYearList(false);
        }}
        className={`${INPUT_CLASS} text-left cursor-pointer`}
      >
        {value ? (
          <span>{formatDisplayDate(value)}</span>
        ) : (
          <span className="text-slate-600">選擇生日</span>
        )}
      </button>

      {/* Inline calendar block */}
      {open && (
        <div className="mt-2 rounded-xl bg-slate-800 border border-slate-700/60 p-3 select-none">
          {/* Month/Year header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setShowYearList((s) => !s)}
              className="text-sm font-semibold text-slate-200 hover:text-white px-2 py-1 rounded hover:bg-slate-700"
            >
              {monthLabel}
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm"
            >
              ›
            </button>
          </div>

          {/* Year selector overlay */}
          {showYearList && (
            <div
              ref={yearListRef}
              className="h-48 overflow-y-auto rounded-lg bg-slate-900 border border-slate-700 mb-3"
            >
              {yearRange.map((y) => {
                const isSelected = y === viewYear;
                return (
                  <button
                    key={y}
                    type="button"
                    data-selected={isSelected}
                    onClick={() => handleYearSelect(y)}
                    className={`w-full text-center py-1.5 text-sm transition-colors ${
                      isSelected
                        ? "bg-blue-600 text-white font-bold"
                        : "text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DOW_LABELS.map((d) => (
              <div key={d} className="text-center text-xs text-slate-500 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((cell, idx) => {
              const isCurr = cell.month === "curr";
              const isSelected =
                isCurr &&
                selectedYear === viewYear &&
                selectedMonth === viewMonth &&
                selectedDay === cell.day;
              const isToday =
                isCurr &&
                todayYear === viewYear &&
                todayMonth === viewMonth &&
                todayDay === cell.day;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!isCurr}
                  onClick={() => isCurr && handleDayClick(cell.day)}
                  className={`
                    w-full aspect-square flex items-center justify-center rounded-full text-xs transition-colors
                    ${!isCurr ? "text-slate-700 cursor-default" : "text-slate-300 hover:bg-slate-700 cursor-pointer"}
                    ${isSelected ? "!bg-blue-600 !text-white font-bold" : ""}
                    ${isToday && !isSelected ? "ring-1 ring-blue-400" : ""}
                  `}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sheet ID Extraction ──────────────────────────

/** Extract Sheet ID from a Google Sheets URL, or return the input as-is if it looks like a raw ID */
function extractSheetId(input: string): string {
  const trimmed = input.trim();
  // Match: https://docs.google.com/spreadsheets/d/{ID}/...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  // If no URL pattern, return as-is (might be a raw ID)
  return trimmed;
}

// ── Copy Code Button ─────────────────────────────

const GAS_API_GITHUB_URL = "https://github.com/kingdom84521/eat-manager/blob/master/scripts/gas-api.js";

function CopyCodeButton({ code }: { code: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("failed");
    }
  }, [code]);

  return (
    <div className="mb-4">
      <button
        onClick={handleCopy}
        className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
          status === "copied"
            ? "bg-emerald-600/30 text-emerald-400"
            : "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
        }`}
      >
        {status === "copied" ? "✓ 已複製" : "📋 複製 API 程式碼"}
      </button>
      {status === "failed" && (
        <p className="text-amber-400 text-xs mt-2">
          複製失敗，請直接前往{" "}
          <a
            href={GAS_API_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            GitHub 手動複製
          </a>
        </p>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────

export default function Settings() {
  // ── Profile Form State ──

  const savedProfile = SettingsService.getUserProfile();
  const [form, setForm] = useState<ProfileFormState>({
    birthday: savedProfile ? savedProfile.birthday : "",
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
  const [sheetInput, setSheetInput] = useState(savedSheets?.sheetId ?? "");
  const [rawIdMode, setRawIdMode] = useState(false);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [sheetsSaved, setSheetsSaved] = useState(false);
  const [showSheetsHelp, setShowSheetsHelp] = useState(false);

  // ── Profile Handlers ──

  function handleProfileChange(patch: Partial<ProfileFormState>) {
    const next = { ...form, ...patch };
    setForm(next);
    const errors = validateProfile(next);
    setProfileErrors(errors);

    if (Object.keys(errors).length === 0 && isProfileComplete(next)) {
      SettingsService.saveUserProfile({
        birthday: next.birthday,
        sex: next.sex,
        heightCm: parseFloat(next.heightCm),
        weightKg: parseFloat(next.weightKg),
        activityLevelId: next.activityLevelId,
      });
    }
  }

  // ── TDEE (live preview from form, not SettingsService) ──

  const liveTdee = computeTdee(form);

  // ── Computed age display ──

  const computedAge = form.birthday ? computeAgeFromBirthday(form.birthday) : null;

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
    const finalSheetId = rawIdMode ? sheetInput.trim() : extractSheetId(sheetInput);
    if (sheetInput.trim() && !finalSheetId) {
      setSheetsError("無法從網址中解析 Sheet ID，請確認格式");
      return;
    }
    SettingsService.saveSheetsConfig({ gasUrl, sheetId: finalSheetId });
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

        {/* Birthday */}
        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1">
            生日
            {computedAge !== null && (
              <span className="text-slate-500 ml-2">（{computedAge} 歲）</span>
            )}
          </label>
          <BirthdayPicker
            value={form.birthday}
            onChange={(d) => handleProfileChange({ birthday: d })}
          />
          {profileErrors.birthday && (
            <p className="text-red-400 text-xs mt-1">{profileErrors.birthday}</p>
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

      {/* Help Dialog: Google Sheets Setup */}
      {showSheetsHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowSheetsHelp(false)}
        >
          <div
            className="bg-slate-800 rounded-2xl p-5 mx-4 max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dialog Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">如何連接 Google Sheets</h3>
              <button
                onClick={() => setShowSheetsHelp(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Step 1 */}
            <div>
              <p className="text-blue-400 font-bold text-sm mb-1">步驟 1：建立 Google 試算表</p>
              <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                開啟 Google Sheets，建立一個新的試算表（或使用現有的）。記下網址列中的 Sheet ID — 它是{" "}
                <span className="text-slate-400 font-mono text-xs">
                  https://docs.google.com/spreadsheets/d/
                </span>{" "}
                後面那段長字串。
              </p>
            </div>

            {/* Step 2 */}
            <div>
              <p className="text-blue-400 font-bold text-sm mb-1">步驟 2：開啟 Apps Script 編輯器</p>
              <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                在試算表中，點選「擴充功能」&gt;「Apps Script」，這會開啟 Apps Script 編輯器。
              </p>
            </div>

            {/* Step 3 */}
            <div>
              <p className="text-blue-400 font-bold text-sm mb-1">步驟 3：貼上 API 程式碼</p>
              <p className="text-slate-300 text-sm mb-2 leading-relaxed">
                複製下方程式碼，貼入編輯器中取代預設內容，然後儲存。
              </p>
              <CopyCodeButton code={gasApiCode} />
            </div>

            {/* Step 4 */}
            <div>
              <p className="text-blue-400 font-bold text-sm mb-1">步驟 4：部署為 Web App</p>
              <p className="text-slate-300 text-sm mb-2 leading-relaxed">
                點選「部署」&gt;「新增部署」&gt;「網頁應用程式」。設定：
              </p>
              <div className="bg-slate-700/50 rounded-lg px-3 py-2 mb-2">
                <p className="text-slate-300 text-sm leading-relaxed">・「執行身分」→ 我</p>
                <p className="text-slate-300 text-sm leading-relaxed">・「誰可以存取」→ 任何人</p>
              </div>
              <p className="text-amber-400/80 text-xs mb-4 leading-relaxed">
                ⚠ 必須設為「任何人」，因為本網頁從瀏覽器直接呼叫 API，無法通過 Google 登入驗證。你的資料安全由 Web App 網址保護 — 僅你知道此網址。
              </p>
            </div>

            {/* Step 5 */}
            <div>
              <p className="text-blue-400 font-bold text-sm mb-1">步驟 5：複製網址</p>
              <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                部署完成後，複製產生的 Web App 網址，貼到下方「GAS 網址」欄位。試算表網址直接貼入即可，系統會自動擷取 Sheet ID。
              </p>
            </div>

            {/* Tip */}
            <p className="text-slate-500 text-xs leading-relaxed">
              提示：每次修改程式碼後需重新部署才會生效。
            </p>
          </div>
        </div>
      )}

      {/* Section 3: Google Sheets Connection */}
      <div className="bg-slate-800/50 rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-300">Google Sheets 連接</h2>
          <button
            onClick={() => setShowSheetsHelp(true)}
            className="w-6 h-6 rounded-full bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white text-xs font-bold flex items-center justify-center"
            aria-label="顯示設定說明"
          >
            ?
          </button>
        </div>

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
          <label className="block text-xs text-slate-400 mb-1">
            {rawIdMode ? "Sheet ID" : "Google 試算表網址"}
          </label>
          <input
            type="text"
            placeholder={rawIdMode ? "直接輸入 Sheet ID" : "貼上試算表網址，自動擷取 ID"}
            value={sheetInput}
            onChange={(e) => setSheetInput(e.target.value)}
            className={INPUT_CLASS}
          />
          {!rawIdMode && sheetInput.trim() && (
            <p className="text-xs text-slate-500 mt-1">
              擷取到的 ID：<span className="text-slate-300 font-mono">{extractSheetId(sheetInput) || "—"}</span>
            </p>
          )}
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rawIdMode}
              onChange={(e) => setRawIdMode(e.target.checked)}
              className="accent-blue-500"
            />
            <span className="text-xs text-slate-500">直接輸入 Sheet ID</span>
          </label>
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
