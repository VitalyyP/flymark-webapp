"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Competition {
  CompetitionId: string;
  CompetitionName: string;
  DateTo: string;
  CityName: string;
  CoverPhoto: string;
}

const CITIES_IDS: number[] =
  process.env.NEXT_PUBLIC_CITIES_IDS?.split(",")
    .map((id) => Number(id.trim()))
    .filter(Boolean) ?? [];

export default function HomePage() {
  const router = useRouter();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);

  const encodeEvent = (event: { id: string; name: string; coverUrl: string }) =>
    btoa(unescape(encodeURIComponent(JSON.stringify(event))));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const results: Competition[] = [];

      for (const cityId of CITIES_IDS) {
        const res = await fetch("/api/flymark/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cityId,
            countryId: 1,
            organisationId: "",
            from: "",
            to: "",
            page: 1,
            type: "Opened",
          }),
        });

        const data: Competition[] = await res.json();
        results.push(...data);
      }

      results.sort((a, b) => {
        const [dA, mA, yA] = a.DateTo.split("/").map(Number);
        const [dB, mB, yB] = b.DateTo.split("/").map(Number);
        return (
          new Date(yA, mA - 1, dA).getTime() -
          new Date(yB, mB - 1, dB).getTime()
        );
      });

      console.log("RESULTS:", results);
      setCompetitions(results);
      setLoading(false);
    };

    load();
  }, []);

  const [visibleEvents, setVisibleEvents] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("visibleEvents");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    const sync = () => {
      try {
        const stored = localStorage.getItem("visibleEvents");
        setVisibleEvents(stored ? new Set(JSON.parse(stored)) : new Set());
      } catch {
        setVisibleEvents(new Set());
      }
    };

    sync();
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, []);

  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-100 p-6">
      <main className="w-full max-w-5xl bg-white p-8 rounded-xl shadow flex flex-col gap-6">
        <h1 className="text-2xl text-black text-center">Перелік змагань</h1>

        {loading && (
          <p className="text-center text-gray-700">Завантаження...</p>
        )}

        {!loading && competitions.length > 0 && (
          <>
            <ul className="space-y-4">
              {competitions
                .filter((c) => {
                  const allowedByAdmin =
                    visibleEvents.size === 0 ||
                    visibleEvents.has(c.CompetitionId);
                  return allowedByAdmin;
                })
                .map((c) => (
                  <li
                    key={`${c.CompetitionId}-${c.DateTo}-${c.CityName}`}
                    className={`p-4 border rounded-lg shadow-sm flex gap-4 items-center transition-opacity`}
                  >
                    <Image
                      src={c.CoverPhoto}
                      alt={c.CompetitionName}
                      width={60}
                      height={90}
                      className="rounded-lg object-cover"
                      priority
                    />

                    <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                      <span className="font-semibold text-gray-900 truncate">
                        {c.CompetitionName}
                      </span>
                      <span className="text-gray-700">{c.DateTo}</span>
                      <span className="text-gray-500">{c.CityName}</span>
                    </div>

                    <div className="flex flex-col md:flex-row gap-2">
                      <div className="relative flex items-center gap-2">
                        <button
                          onClick={() => {
                            const payload = encodeEvent({
                              id: c.CompetitionId,
                              name: c.CompetitionName,
                              coverUrl: c.CoverPhoto,
                            });
                            router.push(`/select?event=${payload}`);
                          }}
                          className="bg-green-600 hover:bg-green-500 text-white py-1.5 px-3 text-sm rounded-md"
                        >
                          Замовити
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
