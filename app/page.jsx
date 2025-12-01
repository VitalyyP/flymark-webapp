"use client";

import { useEffect, useState } from "react";

export default function HomePage() {
  const [competitions, setCompetitions] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/flymark/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cityId: 20,
          countryId: 1,
          organisationId: "",
          from: "",
          to: "",
          page: 1,
          type: "Opened",
        }),
      });

      const json = await res.json();

      setCompetitions(json || []);
    };

    load();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
      <main className="w-full max-w-lg bg-white p-8 rounded-xl shadow flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-black text-center">
          Список змагань
        </h1>

        <ul className="space-y-3">
          {competitions.length === 0 && (
            <p className="text-center text-gray-600">Завантаження…</p>
          )}

          {competitions.map((c) => (
            <li
              key={c.CompetitionId}
              className="p-4 border rounded-md shadow-sm flex flex-col bg-white"
            >
              <span className="font-semibold text-lg text-gray-900">
                {c.CompetitionName}
              </span>
              <span className="text-gray-700">{c.DateTo}</span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
