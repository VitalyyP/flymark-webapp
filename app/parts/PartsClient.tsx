"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

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
  const event = searchParams.get("event");

  const [times, setTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!event) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/get-participants?event=${event}`);
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
  }, [event]);

  const handleTimeSelect = (time: string) => {
    if (!event) return;
    router.push(
      `/parts/results?event=${event}&time=${encodeURIComponent(time)}`
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-100 p-6">
      <main className="w-full max-w-md bg-white p-8 rounded-xl shadow flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-black text-center">
          Виберіть час виступу
        </h1>

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
