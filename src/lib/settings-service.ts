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

// ── Age Helper ────────────────────────────────────

/**
 * 從 ISO 生日字串計算目前年齡（整數歲）。
 * 考慮今年生日是否已過；結果 clamp 在 10–120 之間。
 */
export function computeAgeFromBirthday(birthday: string): number {
  const birth = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasBirthdayOccurred =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasBirthdayOccurred) age -= 1;
  return Math.min(120, Math.max(10, age));
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
    settings_version: 3,
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

  // Cast to a mutable record for migration steps
  const data = raw as Record<string, unknown>;

  // Apply sequential migrations — each case upgrades one version step
  let version = data.settings_version as number;

  if (version === 1) {
    // Migrate v1 -> v2: convert ageYears -> birthday (approximate Jan 1 of birth year)
    const profile = data.userProfile as Record<string, unknown> | null;
    if (profile && typeof profile.ageYears === "number") {
      const birthYear = new Date().getFullYear() - (profile.ageYears as number);
      const migrated: Record<string, unknown> = { ...profile, birthday: `${birthYear}-01-01` };
      delete migrated["ageYears"];
      data.userProfile = migrated;
    }
    data.settings_version = 2;
    version = 2;
  }

  if (version === 2) {
    const profile = data.userProfile as Record<string, unknown> | null;
    if (profile) {
      if (typeof profile.displayName !== "string") profile.displayName = "";
      if (typeof profile.initials !== "string") profile.initials = "";
    }
    data.settings_version = 3;
    version = 3;
  }

  if (version === 3) {
    return data as unknown as AppSettings;
  }

  // Unknown future version — reset to defaults
  return defaultSettings();
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

    const ageYears = computeAgeFromBirthday(profile.birthday);
    const { tdee } = calculateBMRResult(
      ageYears,
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

  /** 取得顯示名稱與縮寫，供抽屜頁尾使用。未設定時回傳空字串。(per D-03) */
  getDisplayProfile(): { displayName: string; initials: string } {
    const profile = loadSettings().userProfile;
    return {
      displayName: profile?.displayName ?? "",
      initials: profile?.initials ?? "",
    };
  },
};
