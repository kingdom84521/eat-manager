/**
 * ItemService: Offline-first CRUD for food and supplement catalogs
 *
 * Mirrors DataService pattern:
 * 1. 讀取先從 localStorage 取 (instant)
 * 2. 背景同步 Sheets
 * 3. 寫入同時寫 localStorage + Sheets
 * 4. Sheets 掛了也不影響使用
 */

import { SheetsAPI, type SheetRow } from "./sheets-api";
import type { FoodItem, HealthTag, SupplementItem, SupplementTiming, InventoryEntry, TCMInfo, ConsumptionEvent, SupplementLogEntry } from "../data/types";
import { FOODS } from "../data/foods";
import { SUPPLEMENTS } from "../data/supplements";

// ── Cache helpers ───────────────────────────────

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

// ── Sheet name constants ────────────────────────

const SHEETS = {
  FOODS: "foods",
  SUPPLEMENTS_CATALOG: "supplements",
  INVENTORY: "inventory",
  CONSUMPTION: "consumption",
} as const;

// ── Cache key constants ─────────────────────────

const CACHE_KEYS = {
  FOODS: "foods_catalog",
  SUPPLEMENTS: "supplements_catalog",
  INVENTORY: "inventory",
  CONSUMPTION: "consumption_events",
  SUPPLEMENT_LOG: "supplement_log",
} as const;

// ── Row → Type converters ───────────────────────

function rowToFood(row: SheetRow): FoodItem {
  return {
    id: String(row.id),
    type: "food",
    name: String(row.name),
    serving: String(row.serving ?? ""),
    cal: Number(row.cal) || 0,
    protein: Number(row.protein) || 0,
    fat: Number(row.fat) || 0,
    carbs: Number(row.carbs) || 0,
    sugar: row.sugar ? Number(row.sugar) : undefined,
    sodium: Number(row.sodium) || 0,
    source: String(row.source ?? ""),
    tags: row.tags ? String(row.tags).split(",").map((t) => t.trim()).filter(Boolean) as HealthTag[] : undefined,
    ingredients: row.ingredients ? JSON.parse(String(row.ingredients)) : undefined,
  };
}

function rowToSupplement(row: SheetRow): SupplementItem {
  return {
    id: String(row.id),
    type: "supplement",
    name: String(row.name),
    brand: row.brand ? String(row.brand) : undefined,
    dosagePerUnit: String(row.dosagePerUnit ?? ""),
    unitsPerDose: Number(row.unitsPerDose) || 1,
    dosesPerDay: Number(row.dosesPerDay) || 1,
    timing: row.timing ? JSON.parse(String(row.timing)) as SupplementTiming[] : [],
    tags: row.tags ? JSON.parse(String(row.tags)) as HealthTag[] : [],
    interactions: row.interactions ? JSON.parse(String(row.interactions)) as string[] : [],
    synergies: row.synergies ? JSON.parse(String(row.synergies)) as string[] : [],
    mechanism: row.mechanism ? String(row.mechanism) : undefined,
    caution: row.caution ? String(row.caution) : undefined,
    tcm: row.tcm ? JSON.parse(String(row.tcm)) as TCMInfo : undefined,
    isActive: row.isActive === "true" || row.isActive === 1,
  };
}

function rowToInventory(row: SheetRow): InventoryEntry {
  return {
    supplementId: String(row.supplementId),
    purchasedUnits: Number(row.purchasedUnits) || 0,
    purchaseDate: String(row.purchaseDate ?? ""),
  };
}

function rowToConsumption(row: SheetRow): ConsumptionEvent {
  return {
    supplementId: String(row.supplementId),
    date: String(row.date),
    units: Number(row.units) || 0,
  };
}

// ── ItemService singleton ───────────────────────

export const ItemService = {
  // ── Foods ────────────────────────────────────────

  async getFoods(): Promise<FoodItem[]> {
    const cached = cacheGet<FoodItem[]>(CACHE_KEYS.FOODS) ?? [];

    // Background sync from Sheets (fire-and-forget)
    SheetsAPI.readAll(SHEETS.FOODS)
      .then((rows) => {
        if (rows.length > 0) {
          cacheSet(CACHE_KEYS.FOODS, rows.map(rowToFood));
        }
      })
      .catch(() => {});

    // Merge: hardcoded catalog first, user-saved items after
    return [...FOODS, ...cached];
  },

  async saveFood(food: FoodItem): Promise<void> {
    // Upsert: replace if ID exists, otherwise append
    const existing = cacheGet<FoodItem[]>(CACHE_KEYS.FOODS) ?? [];
    const filtered = existing.filter((f) => f.id !== food.id);
    filtered.push(food);
    cacheSet(CACHE_KEYS.FOODS, filtered);

    // Background Sheets sync (fire-and-forget)
    SheetsAPI.upsertById(SHEETS.FOODS, food as unknown as SheetRow).catch(() => {});
  },

  async deleteFood(id: string): Promise<void> {
    const existing = cacheGet<FoodItem[]>(CACHE_KEYS.FOODS) ?? [];
    cacheSet(CACHE_KEYS.FOODS, existing.filter((f) => f.id !== id));

    SheetsAPI.deleteById(SHEETS.FOODS, id).catch(() => {});
  },

  // ── Supplements ──────────────────────────────────

  async getSupplements(): Promise<SupplementItem[]> {
    const cached = cacheGet<SupplementItem[]>(CACHE_KEYS.SUPPLEMENTS) ?? [];

    SheetsAPI.readAll(SHEETS.SUPPLEMENTS_CATALOG)
      .then((rows) => {
        if (rows.length > 0) {
          cacheSet(CACHE_KEYS.SUPPLEMENTS, rows.map(rowToSupplement));
        }
      })
      .catch(() => {});

    return [...SUPPLEMENTS, ...cached];
  },

  async saveSupplement(supp: SupplementItem): Promise<void> {
    const existing = cacheGet<SupplementItem[]>(CACHE_KEYS.SUPPLEMENTS) ?? [];
    const filtered = existing.filter((s) => s.id !== supp.id);
    filtered.push(supp);
    cacheSet(CACHE_KEYS.SUPPLEMENTS, filtered);

    SheetsAPI.upsertById(SHEETS.SUPPLEMENTS_CATALOG, supp as unknown as SheetRow).catch(() => {});
  },

  async deleteSupplement(id: string): Promise<void> {
    const existing = cacheGet<SupplementItem[]>(CACHE_KEYS.SUPPLEMENTS) ?? [];
    cacheSet(CACHE_KEYS.SUPPLEMENTS, existing.filter((s) => s.id !== id));

    SheetsAPI.deleteById(SHEETS.SUPPLEMENTS_CATALOG, id).catch(() => {});
  },

  // ── Inventory ────────────────────────────────────

  async getInventory(supplementId?: string): Promise<InventoryEntry[]> {
    const cached = cacheGet<InventoryEntry[]>(CACHE_KEYS.INVENTORY) ?? [];

    SheetsAPI.readAll(SHEETS.INVENTORY)
      .then((rows) => {
        if (rows.length > 0) {
          cacheSet(CACHE_KEYS.INVENTORY, rows.map(rowToInventory));
        }
      })
      .catch(() => {});

    if (supplementId) {
      return cached.filter((e) => e.supplementId === supplementId);
    }
    return cached;
  },

  async upsertInventory(entry: InventoryEntry): Promise<void> {
    // Append-only: each purchase is a new record (event-sourced)
    const existing = cacheGet<InventoryEntry[]>(CACHE_KEYS.INVENTORY) ?? [];
    existing.push(entry);
    cacheSet(CACHE_KEYS.INVENTORY, existing);

    // Use append (not upsertById) — InventoryEntry has no `id` field
    SheetsAPI.append(SHEETS.INVENTORY, entry as unknown as SheetRow).catch(() => {});
  },

  // ── Consumption ──────────────────────────────────

  async logConsumption(event: ConsumptionEvent): Promise<void> {
    const existing = cacheGet<ConsumptionEvent[]>(CACHE_KEYS.CONSUMPTION) ?? [];
    existing.push(event);
    cacheSet(CACHE_KEYS.CONSUMPTION, existing);
    SheetsAPI.append(SHEETS.CONSUMPTION, event as unknown as SheetRow).catch(() => {});
  },

  async getConsumption(supplementId?: string): Promise<ConsumptionEvent[]> {
    const cached = cacheGet<ConsumptionEvent[]>(CACHE_KEYS.CONSUMPTION) ?? [];
    SheetsAPI.readAll(SHEETS.CONSUMPTION)
      .then((rows) => {
        if (rows.length > 0) {
          cacheSet(CACHE_KEYS.CONSUMPTION, rows.map(rowToConsumption));
        }
      })
      .catch(() => {});
    if (supplementId) return cached.filter((e) => e.supplementId === supplementId);
    return cached;
  },

  // ── Daily Log (localStorage only) ───────────────

  getDailyLog(date: string): SupplementLogEntry | null {
    return cacheGet<SupplementLogEntry>(CACHE_KEYS.SUPPLEMENT_LOG + "_" + date);
  },

  saveDailyLog(entry: SupplementLogEntry): void {
    cacheSet(CACHE_KEYS.SUPPLEMENT_LOG + "_" + entry.date, entry);
  },
};
