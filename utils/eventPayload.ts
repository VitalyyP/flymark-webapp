export type EventPayload = {
  id: string;
  name: string;
  coverUrl: string;
  dateTo: string;
  time?: string;
  part?: string;
  program?: string;
  participant?: {
    id: string;
    name: string;
  };
};

function toBase64Url(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  return b64 + pad;
}

export const encodeEvent = (event: EventPayload): string => {
  const json = JSON.stringify(event);

  const base64 =
    typeof window === "undefined"
      ? Buffer.from(json, "utf-8").toString("base64")
      : btoa(unescape(encodeURIComponent(json)));

  return toBase64Url(base64);
};

export const decodeEvent = (value: string): EventPayload | null => {
  try {
    const raw = safeDecodeURIComponent(value);

    const normalized = raw.replace(/\s/g, "+");

    const base64 = fromBase64Url(normalized);

    const json =
      typeof window === "undefined"
        ? Buffer.from(base64, "base64").toString("utf-8")
        : decodeURIComponent(escape(atob(base64)));

    const parsed = JSON.parse(json);

    if (!isEventPayload(parsed)) return null;

    return parsed;
  } catch {
    return null;
  }
};

function isEventPayload(v: unknown): v is EventPayload {
  if (!isRecord(v)) return false;

  if (
    typeof v.id !== "string" ||
    typeof v.name !== "string" ||
    typeof v.coverUrl !== "string" ||
    typeof v.dateTo !== "string"
  ) {
    return false;
  }

  if ("participant" in v && v.participant !== undefined) {
    if (!isParticipant(v.participant)) return false;
  }

  if ("time" in v && v.time !== undefined && typeof v.time !== "string") {
    return false;
  }

  if ("part" in v && v.part !== undefined && typeof v.part !== "string") {
    return false;
  }

  if (
    "program" in v &&
    v.program !== undefined &&
    typeof v.program !== "string"
  ) {
    return false;
  }

  return true;
}

function isParticipant(v: unknown): v is EventPayload["participant"] {
  if (!isRecord(v)) return false;

  return typeof v.id === "string" && typeof v.name === "string";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function safeDecodeURIComponent(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}
