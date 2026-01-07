"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";

import { decodeEvent } from "@/utils/eventPayload";

type SheetRow = {
  DancerName: string;
  Category: string;
  Time: string;
  RegNumber: string;
  OrderType: string;
  Phone: string;
};

type ApiResponse = { headers: string[]; rows: SheetRow[] };

export default function PartsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventParam = searchParams.get("event");
  const [eventName, setEventName] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [eventId, setEventId] = useState("");

  const [times, setTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventParam) return;

    const decoded = decodeEvent(eventParam);

    if (!decoded) {
      console.error("Failed to decode event");
      setEventId("");
      setEventName("Подія");
      setCoverUrl("");
      return;
    }

    setEventId(decoded.id);
    setEventName(decoded.name);
    setCoverUrl(decoded.coverUrl);
  }, [eventParam]);

  useEffect(() => {
    if (!eventId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/get-participants?event=${eventId}`);
        if (!res.ok) throw new Error("Failed to fetch participants");

        const data: ApiResponse = await res.json();

        if (!Array.isArray(data.rows)) {
          setTimes([]);
          return;
        }

        const extractedTimes = data.rows
          .map((row) => row.Time)
          .filter((t): t is string => Boolean(t));

        const uniqueTimes = Array.from(new Set(extractedTimes)).sort((a, b) =>
          a.localeCompare(b, "uk", { numeric: true })
        );

        setTimes(uniqueTimes);
      } catch (error) {
        console.error("Failed to load times:", error);
        setTimes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  const handleTimeSelect = (time: string) => {
    if (!eventId) return;
    router.push(
      `/parts/results?event=${encodeURIComponent(
        eventParam!
      )}&time=${encodeURIComponent(time)}`
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-100 p-6">
      <main className="w-full max-w-md bg-white p-8 rounded-xl shadow flex flex-col gap-6">
        {eventName && (
          <div className="flex flex-col items-center gap-8">
            {coverUrl && (
              <div className="flex flex-col items-center gap-31">
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
              </div>
            )}
            <h1 className="text-2xl font-semibold text-gray-900 text-center break-words">
              {eventName}
            </h1>
          </div>
        )}

        <span className="text-xl font-semibold text-black text-center">
          Виберіть час виступу
        </span>

        {loading && <p className="text-center text-gray-500">Завантаження…</p>}

        {!loading && times.length === 0 && (
          <p className="text-center text-gray-500">Немає доступних виступів</p>
        )}

        <div className="flex flex-col gap-3">
          {times.map((time) => (
            <button
              key={time}
              onClick={() => handleTimeSelect(time)}
              className="py-3 px-4 rounded-md text-lg font-medium border bg-white text-black border-gray-300 hover:bg-gray-200"
            >
              {time}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
