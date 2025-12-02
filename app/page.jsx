"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [competitions, setCompetitions] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/flymark/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      <main className="w-full max-w-3xl bg-white p-8 rounded-xl shadow flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-black text-center mb-4">
          Список змагань
        </h1>

        <ul className="space-y-4">
          {competitions.map((c) => (
            <li
              key={c.CompetitionId}
              className="p-4 border rounded-lg shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2"
            >
              <div className="flex flex-col md:flex-row md:items-center md:gap-4">
                <span className="font-semibold text-gray-900">
                  {c.CompetitionName}
                </span>
                <span className="text-gray-700">{c.DateTo}</span>
              </div>

              <div className="flex gap-2 mt-2 md:mt-0">
                <button
                  onClick={() =>
                    router.push(`/select?event=${c.CompetitionId}`)
                  }
                  className="flex-1 md:flex-none bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  Замовити
                </button>
                <button
                  onClick={() => router.push(`/parts?event=${c.CompetitionId}`)}
                  className="flex-1 md:flex-none bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                >
                  Виконати
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
