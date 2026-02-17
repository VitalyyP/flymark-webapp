export function normalizeTime(raw: unknown): string {
  if (raw === null || raw === undefined) return "";

  let s = String(raw).trim();
  if (!s) return "";

  // 09.00 -> 09:00
  s = s.replace(".", ":");

  // 9:0, 09:0, 9:00, 09:00 -> 09:00
  const m = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return s;

  const hh = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");

  return `${hh}:${mm}`;
}
