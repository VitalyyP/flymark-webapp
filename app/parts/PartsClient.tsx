"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function PartsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get("event");

  const [times, setTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    const loadTimes = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/eventTimes?event=${eventId}`);
        const data = await res.json();

        if (Array.isArray(data?.times)) {
          setTimes(data.times);
        } else {
          console.warn("Invalid times data from API:", data);
          setTimes([]);
        }
      } catch (err) {
        console.error("Failed to load times:", err);
        setTimes([]);
      } finally {
        setLoading(false);
      }
    };

    loadTimes();
  }, [eventId]);

  const handleTimeSelect = (time: string) => {
    if (!eventId) return;
    router.push(
      `/parts/results?event=${eventId}&time=${encodeURIComponent(time)}`
    );
  };

  if (!eventId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Event not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-100 p-6">
      <main className="w-full max-w-md bg-white p-8 rounded-xl shadow flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-black text-center">
          Виберіть час виступу
        </h1>

        {loading ? (
          <p className="text-center text-gray-500">Завантаження...</p>
        ) : times.length === 0 ? (
          <p className="text-center text-gray-500">Часи не знайдено</p>
        ) : (
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
        )}
      </main>
    </div>
  );
}
