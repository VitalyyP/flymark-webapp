export function normalizeTimeUniversal(input?: string): string {
  if (!input || typeof input !== "string") return "";

  const value = input.trim();

  if (/^\d{1,2}:\d{2}$/.test(value)) {
    const [h, m] = value.split(":");
    return `0000:00:00 ${h.padStart(2, "0")}:${m}`;
  }

  const parts = value.split(" ");
  if (parts.length < 2) return "";

  const [datePart, timePart] = parts;

  const dateMatch = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return "";

  const [, y, mo, d] = dateMatch;

  const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})/);
  if (!timeMatch) return "";

  const [, h, m] = timeMatch;

  return `${y}:${mo}:${d} ${h.padStart(2, "0")}:${m}`;
}
