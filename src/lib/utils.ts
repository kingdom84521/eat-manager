/** Parse a cal string like "~280" or "~80(含蛋)" to number */
export function parseCal(cal?: string): number {
  if (!cal) return 0;
  const match = cal.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/** Format date for display: "2026-03-29" → "3/29 (日)" */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["日", "一", "二", "三", "四", "五", "六"];
  return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
}

/** Clamp number */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
