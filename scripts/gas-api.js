/**
 * Google Apps Script - 部署為 Web App 作為免費 REST API
 *
 * 設定步驟：
 * 1. 開啟你的 Google Sheet
 * 2. Extensions > Apps Script
 * 3. 貼上這段程式碼
 * 4. Deploy > New deployment > Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. 複製 URL 到 .env.local
 */

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const API_VERSION = 3;

function doGet(e) {
  const action = e.parameter.action;
  const sheet = e.parameter.sheet;

  try {
    switch (action) {
      case "version":
        return jsonResponse({ version: API_VERSION });
      case "read":
        return jsonResponse(readSheet(sheet));
      case "readRange":
        return jsonResponse(
          readRange(sheet, e.parameter.startDate, e.parameter.endDate)
        );
      case "proxyOff": {
        const query = e.parameter.query || "";
        const pageSize = e.parameter.pageSize || "10";
        const fields = e.parameter.fields || "product_name,nutriments,serving_size,image_front_small_url";
        const offUrl = "https://world.openfoodfacts.org/cgi/search.pl?search_terms="
          + encodeURIComponent(query)
          + "&json=true&page_size=" + pageSize
          + "&fields=" + fields;
        const offRes = UrlFetchApp.fetch(offUrl, { muteHttpExceptions: true });
        return ContentService.createTextOutput(offRes.getContentText())
          .setMimeType(ContentService.MimeType.JSON);
      }
      default:
        return jsonResponse({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const { action, sheet, data } = body;

  try {
    switch (action) {
      case "append":
        return jsonResponse(appendRow(sheet, data));
      case "upsert":
        return jsonResponse(upsertByDate(sheet, data));
      case "delete":
        return jsonResponse(deleteByDate(sheet, data.date));
      case "upsertById":
        return jsonResponse(upsertById(sheet, data));
      case "deleteById":
        return jsonResponse(deleteById(sheet, data.id));
      default:
        return jsonResponse({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ── Auto-create sheets ──────────────────────────

const SHEET_HEADERS = {
  supplements: ["id", "type", "name", "brand", "dosagePerUnit", "unitsPerDose", "dosesPerDay", "timing", "tags", "interactions", "synergies", "mechanism", "caution", "tcm", "isActive"],
  foods: ["id", "type", "name", "serving", "cal", "protein", "fat", "carbs", "sugar", "sodium", "source", "tags", "ingredients"],
  inventory: ["supplementId", "purchasedUnits", "purchaseDate"],
  consumption: ["supplementId", "date", "units"],
  daily_plans: ["date", "selectedIds", "totalCal", "notes"],
  nutrition_log: ["date", "meal", "items"],
  weight_log: ["date", "weightKg", "notes"],
};

/**
 * 取得頁籤，若不存在則自動建立並寫入標題列
 */
function getOrCreateSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let ws = ss.getSheetByName(sheetName);
  if (ws) return ws;

  // Auto-create with headers
  ws = ss.insertSheet(sheetName);
  const headers = SHEET_HEADERS[sheetName];
  if (headers) {
    ws.getRange(1, 1, 1, headers.length).setValues([headers]);
    ws.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return ws;
}

// ── Helpers ──────────────────────────────────────

function readSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(sheetName);
  if (!ws) return []; // Sheet doesn't exist yet — return empty (will be created on first write)

  const data = ws.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0];
  return data.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i];
    });
    return obj;
  });
}

function readRange(sheetName, startDate, endDate) {
  const all = readSheet(sheetName);
  if (all.error) return all;
  return all.filter((row) => {
    const d = row.date;
    return d >= startDate && d <= endDate;
  });
}

function appendRow(sheetName, data) {
  const ws = getOrCreateSheet(sheetName);

  const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  const row = headers.map((h) => {
    const val = data[h];
    // JSON stringify objects/arrays for storage
    if (typeof val === "object" && val !== null) return JSON.stringify(val);
    return val ?? "";
  });

  ws.appendRow(row);
  return { success: true, row: data };
}

function upsertByDate(sheetName, data) {
  const ws = getOrCreateSheet(sheetName);

  const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  const dateColIdx = headers.indexOf("date");
  if (dateColIdx === -1) return { error: "No 'date' column found" };

  // Find existing row with same date
  const allData = ws.getDataRange().getValues();
  let rowIdx = -1;
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][dateColIdx] === data.date) {
      rowIdx = i + 1; // 1-indexed
      break;
    }
  }

  const rowValues = headers.map((h) => {
    const val = data[h];
    if (typeof val === "object" && val !== null) return JSON.stringify(val);
    return val ?? "";
  });

  if (rowIdx > 0) {
    // Update existing
    ws.getRange(rowIdx, 1, 1, rowValues.length).setValues([rowValues]);
    return { success: true, action: "updated", row: data };
  } else {
    // Append new
    ws.appendRow(rowValues);
    return { success: true, action: "created", row: data };
  }
}

function deleteByDate(sheetName, date) {
  const ws = getOrCreateSheet(sheetName);

  const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  const dateColIdx = headers.indexOf("date");
  const allData = ws.getDataRange().getValues();

  for (let i = allData.length - 1; i >= 1; i--) {
    if (allData[i][dateColIdx] === date) {
      ws.deleteRow(i + 1);
      return { success: true, action: "deleted" };
    }
  }
  return { success: false, action: "not_found" };
}

function upsertById(sheetName, data) {
  const ws = getOrCreateSheet(sheetName);

  const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  const idColIdx = headers.indexOf("id");
  if (idColIdx === -1) return { error: "No 'id' column found" };

  const allData = ws.getDataRange().getValues();
  let rowIdx = -1;
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][idColIdx]) === String(data.id)) {
      rowIdx = i + 1;
      break;
    }
  }

  const rowValues = headers.map((h) => {
    const val = data[h];
    if (typeof val === "object" && val !== null) return JSON.stringify(val);
    return val ?? "";
  });

  if (rowIdx > 0) {
    ws.getRange(rowIdx, 1, 1, rowValues.length).setValues([rowValues]);
    return { success: true, action: "updated", row: data };
  } else {
    ws.appendRow(rowValues);
    return { success: true, action: "created", row: data };
  }
}

function deleteById(sheetName, id) {
  const ws = getOrCreateSheet(sheetName);

  const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  const idColIdx = headers.indexOf("id");
  if (idColIdx === -1) return { error: "No 'id' column found" };
  const allData = ws.getDataRange().getValues();

  for (let i = allData.length - 1; i >= 1; i--) {
    if (String(allData[i][idColIdx]) === String(id)) {
      ws.deleteRow(i + 1);
      return { success: true, action: "deleted" };
    }
  }
  return { success: false, action: "not_found" };
}

function jsonResponse(data, code = 200) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}
