export type EventPayload = {
  id: string;
  name: string;
  coverUrl: string;
  time?: string;
  part?: string;
};

export const encodeEvent = (event: EventPayload): string => {
  const json = JSON.stringify(event);
  return Buffer.from(json, "utf-8").toString("base64");
};

export const decodeEvent = (value: string): EventPayload | null => {
  try {
    const json = Buffer.from(value, "base64").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
};
