"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type EventData = {
  id: string;
  name: string;
  coverUrl: string;
};

type EventApiOk = {
  ok: true;
  event: {
    id: string;
    name: string;
    coverUrl: string;
    cityName: string;
    dateTo: string;
  };
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isEventApiOk(v: unknown): v is EventApiOk {
  if (!isRecord(v)) return false;
  if (v.ok !== true) return false;

  const e = v.event;
  if (!isRecord(e)) return false;

  return (
    typeof e.id === "string" &&
    typeof e.name === "string" &&
    typeof e.coverUrl === "string"
  );
}

export const useEventFromQuery = (): EventData | null => {
  const params = useSearchParams();
  const eventId = params.get("eventId")?.trim() ?? "";

  const [event, setEvent] = useState<EventData | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const ac = new AbortController();

    const load = async () => {
      try {
        const res = await fetch(
          `/api/event?eventId=${encodeURIComponent(eventId)}`,
          { cache: "no-store", signal: ac.signal }
        );

        const json: unknown = await res.json();

        if (res.ok && isEventApiOk(json)) {
          setEvent({
            id: json.event.id,
            name: json.event.name,
            coverUrl: json.event.coverUrl,
          });
        } else {
          setEvent(null);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setEvent(null);
      }
    };

    void load();
    return () => ac.abort();
  }, [eventId]);

  if (!eventId) return null;

  return event;
};
