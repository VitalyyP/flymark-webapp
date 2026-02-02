"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { formatUaDateFromISO } from "@/utils/formatUaDateFromISO";
import {
  Competition,
  normalizeCompetition,
  RawCompetition,
} from "@/utils/normalizeCompetition";
import { encodeEvent } from "@/utils/eventPayload";

const CITIES_IDS: number[] =
  process.env.NEXT_PUBLIC_CITIES_IDS?.split(",")
    .map((id) => Number(id.trim()))
    .filter(Boolean) ?? [];

type VisibleEventsResponse = {
  ids?: unknown;
};

export default function HomePage() {
  const router = useRouter();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);

  const [visibleEvents, setVisibleEvents] = useState<Set<string>>(new Set());
  const [loadingVisible, setLoadingVisible] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoadingCompetitions(true);
      const results: Competition[] = [];

      try {
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

          if (!res.ok) continue;

          const data: unknown = await res.json();
          const list: Competition[] = Array.isArray(data)
            ? (data as RawCompetition[])
                .map(normalizeCompetition)
                .filter((x): x is Competition => x !== null)
            : [];

          list.forEach((c) => {
            c.CompetitionId = String(
              (c as unknown as { CompetitionId: unknown }).CompetitionId
            ).trim();
          });

          results.push(...list);
        }

        results.sort((a, b) => {
          return new Date(a.DateTo).getTime() - new Date(b.DateTo).getTime();
        });

        setCompetitions(results);
      } finally {
        setLoadingCompetitions(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const loadVisible = async () => {
      setLoadingVisible(true);
      try {
        const r = await fetch("/api/visible-events", { cache: "no-store" });
        const data: VisibleEventsResponse = await r.json();

        const raw = data?.ids;
        const ids: string[] = Array.isArray(raw)
          ? raw
              .map((x) => {
                if (typeof x === "string") return x.trim();
                if (typeof x === "number") return String(x);
                return "";
              })
              .filter(Boolean)
          : [];

        setVisibleEvents(new Set(ids));
      } catch {
        setVisibleEvents(new Set());
      } finally {
        setLoadingVisible(false);
      }
    };

    loadVisible();
  }, []);

  const filteredCompetitions = useMemo(() => {
    if (loadingVisible) return [];
    if (visibleEvents.size === 0) return [];
    return competitions.filter((c) =>
      visibleEvents.has(String(c.CompetitionId).trim())
    );
  }, [competitions, visibleEvents, loadingVisible]);

  const isLoading = loadingCompetitions || loadingVisible;

  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-100 p-6">
      <main className="w-full max-w-5xl bg-white p-8 rounded-xl shadow flex flex-col gap-6">
        <h1 className="text-2xl text-black text-center">Перелік змагань</h1>

        {isLoading && (
          <p className="text-center text-gray-700">Завантаження...</p>
        )}

        {!isLoading && visibleEvents.size === 0 && (
          <p className="text-center text-gray-700">
            Наразі немає доступних подій
          </p>
        )}

        {!isLoading &&
          visibleEvents.size > 0 &&
          filteredCompetitions.length === 0 && (
            <p className="text-center text-gray-700">
              Обрані події не знайдені (можливо, вони вже закриті або змінились)
            </p>
          )}

        {!isLoading && filteredCompetitions.length > 0 && (
          <ul className="space-y-4">
            {filteredCompetitions.map((c) => (
              <li
                key={`${c.CompetitionId}-${c.DateTo}-${c.CityName}`}
                className="p-4 border rounded-lg shadow-sm flex gap-4 items-center transition-opacity"
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
                  <span className="text-gray-700">
                    {formatUaDateFromISO(c.DateTo)}
                  </span>
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

                        router.push(
                          `/select?event=${encodeURIComponent(payload)}`
                        );
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
        )}
      </main>
    </div>
  );
}
