"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";

import { decodeEvent, encodeEvent } from "@/utils/eventPayload";

type SheetRow = {
  Time: string;
};

type ApiResponse = {
  rows: SheetRow[];
};

type TimeItem = {
  part: number;
  time: string;
  enabled: boolean;
};

export default function PartsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventParam = searchParams.get("event");

  const [eventId, setEventId] = useState("");
  const [eventName, setEventName] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const [times, setTimes] = useState<TimeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventParam) return;

    const decoded = decodeEvent(eventParam);
    if (!decoded) return;

    setEventId(decoded.id);
    setEventName(decoded.name);
    setCoverUrl(decoded.coverUrl);
  }, [eventParam]);

  useEffect(() => {
    if (!eventId) return;

    const load = async () => {
      setLoading(true);

      try {
        const [sheetRes, flymarkRes] = await Promise.all([
          fetch(`/api/get-participants?event=${eventId}`),
          fetch(`/api/event-times?event=${eventId}`),
        ]);

        const sheetData: ApiResponse = await sheetRes.json();
        const flymarkData: { times: string[] } = await flymarkRes.json();

        const sheetTimes = new Set(
          sheetData.rows.map((r) => r.Time).filter(Boolean)
        );

        const allTimes = Array.from(
          new Set([...flymarkData.times, ...sheetTimes])
        ).sort((a, b) => a.localeCompare(b, "uk", { numeric: true }));

        const merged: TimeItem[] = allTimes.map((time, index) => ({
          part: index + 1,
          time,
          enabled: sheetTimes.has(time),
        }));

        setTimes(merged);
      } catch {
        setTimes([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId]);

  const handleTimeSelect = (item: TimeItem) => {
    if (!item.enabled) return;

    const encoded = encodeEvent({
      id: eventId,
      name: eventName,
      coverUrl,
      time: item.time,
      part: item.part.toString(),
    });

    router.push(`/parts/results?event=${encodeURIComponent(encoded)}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-100 p-6">
      <main className="w-full max-w-md bg-white p-8 rounded-xl shadow flex flex-col gap-6">
        <div className="flex flex-col items-center gap-6">
          {coverUrl && (
            <div className="w-55 h-55 rounded-full overflow-hidden">
              <Image
                src={coverUrl}
                alt={eventName}
                width={220}
                height={220}
                className="object-cover w-full h-full"
                priority
              />
            </div>
          )}
          <h1 className="text-2xl font-semibold text-gray-900 text-center break-words">
            {eventName}
          </h1>
        </div>

        <span className="text-xl font-semibold text-black text-center">
          Виберіть час виступу
        </span>

        {loading && <p className="text-center text-gray-500">Завантаження…</p>}

        <div className="flex flex-col gap-3">
          {times.map((item) => (
            <button
              key={`${item.part}-${item.time}`}
              onClick={() => handleTimeSelect(item)}
              disabled={!item.enabled}
              className={`py-3 px-4 rounded-md text-lg font-medium border
                ${
                  item.enabled
                    ? "bg-white text-black border-gray-300 hover:bg-gray-200"
                    : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                }`}
            >
              {item.part} відділення / {item.time}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
