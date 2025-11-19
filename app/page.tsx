"use client";

import { useState } from "react";

export default function Home() {
  const [eventNumber, setEventNumber] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!eventNumber.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-6 font-sans">
      <main className="flex w-full max-w-lg flex-col items-center gap-6 bg-white p-10 rounded-xl shadow">
        <h1 className="text-2xl font-semibold text-black">
          Введіть номер івенту
        </h1>

        {!submitted && (
          <>
            <input
              type="text"
              value={eventNumber}
              onChange={(e) => setEventNumber(e.target.value)}
              placeholder="Наприклад: 12345"
              className="w-full rounded-md border px-4 py-3 text-lg"
            />

            <button
              onClick={handleSubmit}
              className="w-full rounded-md bg-blue-600 py-3 text-white text-lg hover:bg-blue-700"
            >
              Відправити
            </button>
          </>
        )}

        {submitted && (
          <div className="flex flex-col w-full gap-4">
            <a
              href={`/form?event=${eventNumber}`}
              className="w-full rounded-md bg-green-600 py-3 text-white text-lg text-center hover:bg-green-700"
            >
              Заповнити форму
            </a>

            <a
              href={`/results?event=${eventNumber}`}
              className="w-full rounded-md bg-purple-600 py-3 text-white text-lg text-center hover:bg-purple-700"
            >
              Результати
            </a>

            <button
              onClick={() => setSubmitted(false)}
              className="mt-4 w-full rounded-md border border-gray-300 py-3 text-gray-700 hover:bg-gray-100"
            >
              Змінити номер івенту
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
