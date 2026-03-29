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

function doGet(e) {
  const action = e.parameter.action;
  const sheet = e.parameter.sheet;

  try {
    switch (action) {
      case "read":
        return jsonResponse(readSheet(sheet));
      case "readRange":
        return jsonResponse(
          readRange(sheet, e.parameter.startDate, e.parameter.endDate)
        );
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
      default:
        return jsonResponse({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ── Helpers ──────────────────────────────────────

function readSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(sheetName);
  if (!ws) return { error: `Sheet "${sheetName}" not found` };

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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(sheetName);
  if (!ws) return { error: `Sheet "${sheetName}" not found` };

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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(sheetName);
  if (!ws) return { error: `Sheet "${sheetName}" not found` };

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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(sheetName);
  if (!ws) return { error: `Sheet "${sheetName}" not found` };

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

function jsonResponse(data, code = 200) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}
