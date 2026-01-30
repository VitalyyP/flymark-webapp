export type EventPayload = {
  id: string;
  name: string;
  coverUrl: string;

  time?: string;
  part?: string;

  participant?: {
    id: string;
    name: string;
  };
};

export const encodeEvent = (event: EventPayload): string => {
  const json = JSON.stringify(event);

  if (typeof window === "undefined") {
    return Buffer.from(json, "utf-8").toString("base64");
  }

  return btoa(unescape(encodeURIComponent(json)));
};

export const decodeEvent = (value: string): EventPayload | null => {
  try {
    let json: string;

    if (typeof window === "undefined") {
      json = Buffer.from(value, "base64").toString("utf-8");
    } else {
      json = decodeURIComponent(escape(atob(value)));
    }

    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;

    const obj = parsed as Partial<EventPayload>;

    if (!obj.id || !obj.name || !obj.coverUrl) return null;

    if (obj.participant) {
      const p = obj.participant as Partial<{ id: unknown; name: unknown }>;
      if (typeof p.id !== "string" || typeof p.name !== "string") {
        delete (obj as EventPayload).participant;
      }
    }

    return obj as EventPayload;
  } catch {
    return null;
  }
};
