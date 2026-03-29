/**
 * ============================================================
 * SettingsService: 使用者設定永久儲存
 * ============================================================
 *
 * 同步讀寫 localStorage，版本化 schema，衍生值即時計算不儲存。
 * Phase 3 (SheetsAPI) 和 Phase 4 (Settings UI) 的基礎。
 */

import type { UserProfile, MacroGrams } from "../data/types";
import { calculateBMRResult } from "../data/bmr";
import { GUIDELINE_MAP, calculateMacroGrams } from "../data/dietary-guidelines";

// ── Types ─────────────────────────────────────────

/** 使用者設定儲存結構 */
export interface SheetsConfig {
  /** Google Apps Script Web App URL */
  gasUrl: string;
  /** Google Sheet ID */
  sheetId: string;
}

/** 應用程式設定根物件 */
export interface AppSettings {
  /** 結構版本號 */
  settings_version: number;
  /** 使用者基本資料 */
  userProfile: UserProfile | null;
  /** 選用的飲食指南 ID */
  activeGuidelineId: string | null;
  /** Google Sheets 連接設定 */
  sheetsConfig: SheetsConfig | null;
}

// ── Constants ─────────────────────────────────────

const SETTINGS_KEY = "eat_manager_settings";

// ── Storage Helpers ──────────────────────────────

function readRaw(): AppSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as AppSettings) : null;
  } catch {
    return null;
  }
}

function writeRaw(data: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
  } catch {
    console.warn("localStorage write failed for", SETTINGS_KEY);
  }
}

// ── Migration ────────────────────────────────────

function defaultSettings(): AppSettings {
  return {
    settings_version: 1,
    userProfile: null,
    activeGuidelineId: null,
    sheetsConfig: null,
  };
}

function migrate(raw: unknown): AppSettings {
  // Type guard: if raw is not an object, is null, or settings_version is not a number -> return defaults
  if (
    raw === null ||
    typeof raw !== "object" ||
    typeof (raw as Record<string, unknown>).settings_version !== "number"
  ) {
    return defaultSettings();
  }

  const data = raw as AppSettings;
  // Setters always spread { ...current, field }, so returning same reference is safe
  switch (data.settings_version) {
    case 1:
      break;
    default:
      return defaultSettings();
  }
  return data;
}

function loadSettings(): AppSettings {
  const raw = readRaw();
  if (raw === null) return defaultSettings();
  return migrate(raw);
}

// ── SettingsService ──────────────────────────────

export const SettingsService = {
  /** 取得使用者基本資料，未設定回傳 null */
  getUserProfile(): UserProfile | null {
    return loadSettings().userProfile;
  },

  /** 取得選用的飲食指南 ID，未設定回傳 null */
  getActiveGuidelineId(): string | null {
    return loadSettings().activeGuidelineId;
  },

  /** 取得 Google Sheets 連接設定，未設定回傳 null */
  getSheetsConfig(): SheetsConfig | null {
    return loadSettings().sheetsConfig;
  },

  /** 計算 TDEE 及三大營養素克數目標。未設定 profile 或 guideline 時回傳 null (per D-03, D-08) */
  getComputedTargets(): { tdee: number; macros: MacroGrams } | null {
    const profile = SettingsService.getUserProfile();
    const guidelineId = SettingsService.getActiveGuidelineId();
    if (!profile || !guidelineId) return null;

    const guideline = GUIDELINE_MAP.get(guidelineId);
    if (!guideline) return null;

    const { tdee } = calculateBMRResult(
      profile.ageYears,
      profile.sex,
      profile.heightCm,
      profile.weightKg,
      profile.activityLevelId,
    );

    const macros = calculateMacroGrams(tdee, guideline);
    return { tdee, macros };
  },

  /** 儲存使用者基本資料（partial update，不影響其他欄位）(per D-09) */
  saveUserProfile(profile: UserProfile): void {
    const current = loadSettings();
    writeRaw({ ...current, userProfile: profile });
  },

  /** 儲存選用的飲食指南 ID（partial update）(per D-09) */
  saveActiveGuidelineId(id: string): void {
    const current = loadSettings();
    writeRaw({ ...current, activeGuidelineId: id });
  },

  /** 儲存 Google Sheets 連接設定（partial update）(per D-09) */
  saveSheetsConfig(config: SheetsConfig): void {
    const current = loadSettings();
    writeRaw({ ...current, sheetsConfig: config });
  },
};
