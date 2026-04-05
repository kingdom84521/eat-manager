/**
 * Google Sheets API client via Apps Script proxy
 * Offline-first: localStorage cache + async sync
 */

import { SettingsService } from "./settings-service";

// ── Types ───────────────────────────────────────

export interface SheetRow {
  [key: string]: string | number | null;
}

interface ApiResponse<T = SheetRow[]> {
  success?: boolean;
  error?: string;
  data?: T;
}

// ── URL Resolution ──────────────────────────────

/** 取得 GAS URL：優先使用 SettingsService 的執行期設定，回退至環境變數 */
function getGasUrl(): string {
  return SettingsService.getSheetsConfig()?.gasUrl || import.meta.env.VITE_GAS_URL;
}

// ── Low-level API ───────────────────────────────

async function gasGet(
  params: Record<string, string>
): Promise<SheetRow[]> {
  const url = new URL(getGasUrl());
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function gasPost(body: Record<string, unknown>): Promise<ApiResponse> {
  // Use text/plain to avoid CORS preflight — GAS doesn't handle OPTIONS requests.
  // GAS e.postData.contents still receives the JSON string correctly.
  const res = await fetch(getGasUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ── High-level API ──────────────────────────────

export const SheetsAPI = {
  /** 讀取整個 sheet */
  async readAll(sheet: string): Promise<SheetRow[]> {
    return gasGet({ action: "read", sheet });
  },

  /** 讀取日期範圍內的資料 */
  async readRange(
    sheet: string,
    startDate: string,
    endDate: string
  ): Promise<SheetRow[]> {
    return gasGet({ action: "readRange", sheet, startDate, endDate });
  },

  /** 新增一筆 */
  async append(sheet: string, data: SheetRow): Promise<ApiResponse> {
    return gasPost({ action: "append", sheet, data });
  },

  /** 以 date 為 key 更新或新增 */
  async upsert(sheet: string, data: SheetRow): Promise<ApiResponse> {
    return gasPost({ action: "upsert", sheet, data });
  },

  /** 刪除指定日期的資料 */
  async deleteByDate(sheet: string, date: string): Promise<ApiResponse> {
    return gasPost({ action: "delete", sheet, data: { date } });
  },

  /** 以 id 為 key 更新或新增 (per D-12) */
  async upsertById(sheet: string, data: SheetRow): Promise<ApiResponse> {
    return gasPost({ action: "upsertById", sheet, data });
  },

  /** 刪除指定 id 的資料 (per D-13) */
  async deleteById(sheet: string, id: string): Promise<ApiResponse> {
    return gasPost({ action: "deleteById", sheet, data: { id } });
  },
};
