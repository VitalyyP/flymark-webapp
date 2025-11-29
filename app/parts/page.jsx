"use client";

import { useSearchParams, useRouter } from "next/navigation";

export default function PartsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get("event");

  const times = ["8:30", "10:30", "14:30", "17:30", "19:30"];

  const handleTimeSelect = (time) => {
    if (!eventId) return;
    router.push(
      `/parts/results?event=${eventId}&time=${encodeURIComponent(time)}`
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-100 p-6">
      <main className="w-full max-w-md bg-white p-8 rounded-xl shadow flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-black text-center">
          Виберіть час виступу
        </h1>

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
