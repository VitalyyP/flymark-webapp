export type StoredCrossed = {
  value: string[];
  expiresAt: number;
};

export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export function makeCrossedStorageKey(eventId: string, time: string) {
  return `crossed:${eventId}:${time}`;
}

export function makeCrossKey(
  category: string,
  program: string,
  regNumber: string,
  idx: number
) {
  const finalIdx = regNumber === "Не знаю" ? idx : -1;
  return `${category}|||${program}|||${regNumber}|||${finalIdx}`;
}

export function readCrossedFromStorage(storageKey: string): string[] {
  try {
    if (typeof window === "undefined") return [];

    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== "object" || parsed === null) return [];

    const obj = parsed as Partial<StoredCrossed>;

    if (typeof obj.expiresAt !== "number") return [];
    if (obj.expiresAt <= Date.now()) return [];

    if (!Array.isArray(obj.value)) return [];

    return obj.value.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function writeCrossedToStorage(
  storageKey: string,
  keys: string[],
  ttlMs: number = DEFAULT_TTL_MS
) {
  try {
    if (typeof window === "undefined") return;

    const payload: StoredCrossed = {
      value: keys,
      expiresAt: Date.now() + ttlMs,
    };

    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {}
}

export function toggleCrossedKey(
  prev: string[],
  key: string,
  storageKey: string,
  ttlMs: number = DEFAULT_TTL_MS
): string[] {
  const next = prev.includes(key)
    ? prev.filter((k) => k !== key)
    : [...prev, key];
  writeCrossedToStorage(storageKey, next, ttlMs);
  return next;
}
