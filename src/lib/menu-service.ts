/**
 * ============================================================
 * MenuService — 菜單預設 localStorage CRUD
 * ============================================================
 *
 * 提供儲存、讀取、重命名與刪除使用者自訂菜單預設的功能。
 * 僅使用 localStorage 儲存（v3.0 不同步至 Sheets）。
 * 遵循 ItemService / DataService 的 singleton 模式。
 */

// ── Cache helpers ───────────────────────────────────────────

const CACHE_PREFIX = "wellness_";

function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function cacheSet(key: string, data: unknown): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  } catch {
    console.warn("localStorage write failed for", key);
  }
}

// ── Storage key ─────────────────────────────────────────────

const MENU_KEY = "menu_presets";

// ── Types ───────────────────────────────────────────────────

/** 使用者儲存的菜單預設 */
export interface MenuPreset {
  /** crypto.randomUUID() 產生的唯一識別碼（由呼叫端產生） */
  id: string;
  /** 使用者輸入或自動產生的名稱 */
  name: string;
  /** 建立日期，格式為 "YYYY-MM-DD"（使用 todayStr()） */
  createdAt: string;
  /** 各時段食物 ID 列表：[slotIdx][itemIdx] = food ID */
  foodItemIds: string[][];
}

// ── MenuService singleton ───────────────────────────────────

export const MenuService = {
  /** 取得所有已儲存的菜單預設（最新在前） */
  getAll(): MenuPreset[] {
    return cacheGet<MenuPreset[]>(MENU_KEY) ?? [];
  },

  /** 將新預設加至列表最前方並儲存 */
  save(preset: MenuPreset): void {
    const existing = this.getAll();
    existing.unshift(preset);
    cacheSet(MENU_KEY, existing);
  },

  /** 依 id 重新命名預設 */
  rename(id: string, name: string): void {
    const updated = this.getAll().map((p) =>
      p.id === id ? { ...p, name } : p
    );
    cacheSet(MENU_KEY, updated);
  },

  /** 依 id 刪除預設 */
  delete(id: string): void {
    const filtered = this.getAll().filter((p) => p.id !== id);
    cacheSet(MENU_KEY, filtered);
  },
};
