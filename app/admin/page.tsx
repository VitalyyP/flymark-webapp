"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Copy } from "lucide-react";
import { CustomCheckbox } from "@/components/CustomCheckbox";

interface Competition {
  CompetitionId: string;
  CompetitionName: string;
  DateTo: string;
  CityName: string;
  CoverPhoto: string;
}

const cityMap = {
  dnipro: { id: 20, name: "Дніпро" },
  zaporizhzhia: { id: 1756, name: "Запоріжжя" },
};

type CityKey = keyof typeof cityMap;

export default function HomePage() {
  const router = useRouter();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState<string | null>(null);

  const [hiddenEvents, setHiddenEvents] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("hiddenEvents");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [hideMarked, setHideMarked] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("hideMarked") === "true";
  });

  const [visibleEvents, setVisibleEvents] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("visibleEvents");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const encodeEvent = (event: { id: string; name: string; coverUrl: string }) =>
    btoa(unescape(encodeURIComponent(JSON.stringify(event))));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const results: Competition[] = [];

      for (const cityKey of Object.keys(cityMap) as CityKey[]) {
        const { id: cityId, name: cityName } = cityMap[cityKey];

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
        data.forEach((c) => (c.CityName = cityName));
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

  useEffect(() => {
    localStorage.setItem(
      "hiddenEvents",
      JSON.stringify(Array.from(hiddenEvents))
    );
  }, [hiddenEvents]);

  useEffect(() => {
    localStorage.setItem("hideMarked", String(hideMarked));
  }, [hideMarked]);

  useEffect(() => {
    localStorage.setItem(
      "visibleEvents",
      JSON.stringify(Array.from(visibleEvents))
    );
  }, [visibleEvents]);

  const copyLink = (path: string, id: string) => {
    const link = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(link);
    setTooltipVisible(id);
    setTimeout(() => setTooltipVisible(null), 1500);
  };

  const toggleHidden = (competitionId: string) => {
    setHiddenEvents((prev) => {
      const next = new Set(prev);

      if (next.has(competitionId)) {
        next.delete(competitionId);
      } else {
        next.add(competitionId);
      }

      return next;
    });
  };

  const toggleVisible = (competitionId: string) => {
    setVisibleEvents((prev) => {
      const next = new Set(prev);
      if (next.has(competitionId)) next.delete(competitionId);
      else next.add(competitionId);
      return next;
    });
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-100 p-6">
      <main className="w-full max-w-5xl bg-white p-8 rounded-xl shadow flex flex-col gap-6">
        <h1 className="text-2xl text-black text-center">Перелік змагань</h1>

        {loading && (
          <p className="text-center text-gray-700">Завантаження...</p>
        )}

        {!loading && competitions.length > 0 && (
          <>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  window.location.href = "/admin/logout";
                }}
                className="rounded-md bg-gray-200 px-3 py-2 text-sm hover:bg-gray-300 text-gray-700"
              >
                Вийти
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <CustomCheckbox
                checked={hideMarked}
                onChange={() => setHideMarked((v) => !v)}
              />
              <span className="text-gray-700">Ховати позначені події</span>
            </div>

            <ul className="space-y-4">
              {competitions
                .filter(
                  (c) => !(hideMarked && hiddenEvents.has(c.CompetitionId))
                )
                .map((c) => (
                  <li
                    key={`${c.CompetitionId}-${c.DateTo}-${c.CityName}`}
                    className={`p-4 border rounded-lg shadow-sm flex gap-4 items-center transition-opacity ${
                      hiddenEvents.has(c.CompetitionId)
                        ? "opacity-50"
                        : "opacity-100"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2">
                        <CustomCheckbox
                          checked={visibleEvents.has(c.CompetitionId)}
                          onChange={() => toggleVisible(c.CompetitionId)}
                        />
                        <span className="text-gray-700 text-sm">
                          Показувати
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <CustomCheckbox
                          checked={hiddenEvents.has(c.CompetitionId)}
                          onChange={() => toggleHidden(c.CompetitionId)}
                        />
                        <span className="text-gray-700 text-sm">Приховати</span>
                      </div>
                    </div>

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

                        <Copy
                          className="w-5 h-5 text-gray-500 hover:text-black cursor-pointer"
                          onClick={() =>
                            copyLink(
                              `/select?event=${c.CompetitionId}`,
                              `${c.CompetitionId}-select`
                            )
                          }
                        />

                        {tooltipVisible === `${c.CompetitionId}-select` && (
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded">
                            Скопійовано!
                          </span>
                        )}
                      </div>

                      <div className="relative flex items-center gap-2">
                        <button
                          onClick={() => {
                            const payload = encodeEvent({
                              id: c.CompetitionId,
                              name: c.CompetitionName,
                              coverUrl: c.CoverPhoto,
                            });
                            router.push(`/parts?event=${payload}`);
                          }}
                          className="bg-green-600 hover:bg-green-500 text-white py-1.5 px-3 text-sm rounded-md"
                        >
                          Виконати
                        </button>

                        <Copy
                          className="w-5 h-5 text-gray-500 hover:text-black cursor-pointer"
                          onClick={() =>
                            copyLink(
                              `/parts?event=${c.CompetitionId}`,
                              `${c.CompetitionId}-parts`
                            )
                          }
                        />

                        {tooltipVisible === `${c.CompetitionId}-parts` && (
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded">
                            Скопійовано!
                          </span>
                        )}
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
