"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function SelectParticipantPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = searchParams.get("event");

  const [participants, setParticipants] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");

  useEffect(() => {
    if (!eventId) return;

    const load = async () => {
      const res = await fetch(`/api/participants?event=${eventId}`);
      const data = await res.json();
      setParticipants(data);
      setFiltered(data);
    };

    load();
  }, [eventId]);

  const handleSearch = (value) => {
    setQuery(value);
    const f = participants.filter((name) =>
      name.toLowerCase().includes(value.toLowerCase())
    );
    setFiltered(f);
  };

  const handleSubmit = () => {
    if (!selected) return;
    router.push(
      `/form?event=${eventId}&participant=${encodeURIComponent(selected)}`
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
      <main className="w-full max-w-lg bg-white p-8 rounded-xl shadow flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-black text-center">
          Виберіть учасника
        </h1>

        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Введіть ім’я учасника"
            className="w-full rounded-md border px-4 py-3 text-lg text-gray-900"
          />

          {query.length > 0 && filtered.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border rounded-md mt-1 shadow max-h-64 overflow-y-auto">
              {filtered.map((p) => (
                <li
                  key={p}
                  onClick={() => {
                    setSelected(p);
                    setQuery(p);
                    setFiltered([]);
                  }}
                  className="px-4 py-2 cursor-pointer text-gray-900 hover:bg-gray-100"
                >
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={handleSubmit}
          className="w-full rounded-md bg-blue-600 py-3 text-white text-lg hover:bg-blue-700 disabled:bg-gray-400"
          disabled={!selected}
        >
          Відправити
        </button>
      </main>
    </div>
  );
}
