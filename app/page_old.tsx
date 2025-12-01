"use client";

import { useState } from "react";

export default function Home() {
  const [eventNumber, setEventNumber] = useState("");

  const handleSubmit = async () => {
    if (!eventNumber) return;

    await fetch("/api/parse-event", {
      method: "POST",
      body: JSON.stringify({ eventId: eventNumber }),
    });

    window.location.href = `/select`;
    window.location.href = `/select?event=${eventNumber}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-6 font-sans">
      <main className="flex w-full max-w-lg flex-col items-center gap-6 bg-white p-10 rounded-xl shadow">
        <h1 className="text-2xl font-semibold text-black">
          Введіть номер івенту
        </h1>

        <>
          <input
            type="text"
            value={eventNumber}
            onChange={(e) => setEventNumber(e.target.value)}
            placeholder="Наприклад: 12345"
            className="w-full rounded-md border px-4 py-3 text-lg text-gray-900"
          />

          <button
            onClick={handleSubmit}
            className="w-full rounded-md bg-blue-600 py-3 text-white text-lg hover:bg-blue-700"
          >
            Відправити
          </button>
        </>
      </main>
    </div>
  );
}
