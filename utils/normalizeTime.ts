export function normalizeTime(raw: unknown): string {
  if (raw === null || raw === undefined) return "";

  let s = String(raw).trim();
  if (!s) return "";

  s = s.replace(/^'+/, "").trim();

  // 09.00 / 09-00 -> 09:00
  s = s.replace(/[.\-]/g, ":").trim();

  // 3:00 PM / 3:00:00 PM / 15:00 / 08:30 / 11:00:00 AM
  const m = s.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)?$/i);
  if (!m) return s;

  let hh = Number(m[1]);
  const mmNum = Number(m[2]);
  const ap = (m[4] ?? "").toUpperCase();

  if (!Number.isFinite(hh) || !Number.isFinite(mmNum)) return s;
  if (hh < 0 || hh > 23) return s;
  if (mmNum < 0 || mmNum > 59) return s;

  if (ap === "AM") {
    if (hh === 12) hh = 0;
  } else if (ap === "PM") {
    if (hh !== 12) hh += 12;
  }

  const HH = String(hh).padStart(2, "0");
  const MM = String(mmNum).padStart(2, "0");
  return `${HH}:${MM}`;
}
