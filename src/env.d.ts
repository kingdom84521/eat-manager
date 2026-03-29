/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Apps Script Web App URL */
  readonly VITE_GAS_URL: string;
  /** Google Sheet ID (for direct link) */
  readonly VITE_SHEET_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
