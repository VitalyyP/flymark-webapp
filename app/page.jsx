"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Copy } from "lucide-react";

export default function HomePage() {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(null);

  const router = useRouter();

  const copyLink = (path, id) => {
    const link = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(link);
    setTooltipVisible(id);

    setTimeout(() => setTooltipVisible(null), 1500);
  };

  const cityMap = {
    dnipro: { id: 20, name: "Дніпро" },
    zaporizhzhia: { id: 1756, name: "Запоріжжя" },
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const results = [];

      for (const cityKey of Object.keys(cityMap)) {
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

        const data = await res.json();
        data.forEach((c) => (c.CityName = cityName));

        results.push(...data);
      }

      results.sort((a, b) => {
        const [dayA, monthA, yearA] = a.DateTo.split("/").map(Number);
        const [dayB, monthB, yearB] = b.DateTo.split("/").map(Number);
        return (
          new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB)
        );
      });

      setCompetitions(results);
      setLoading(false);
    };

    load();
  }, []);

  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-100 p-6">
      <main className="w-full max-w-4xl bg-white p-8 rounded-xl shadow flex flex-col gap-6">
        {loading && (
          <p className="text-center text-gray-700">Завантаження...</p>
        )}

        {!loading && competitions.length > 0 && (
          <ul className="space-y-4">
            {competitions.map((c) => (
              <li
                key={`${c.CompetitionId}-${c.DateTo}-${c.CityName}`}
                className="p-4 border rounded-lg shadow-sm flex gap-4 items-center"
              >
                <Image
                  src={c.CoverPhoto}
                  alt="Cover photo"
                  width={60}
                  height={90}
                  className="rounded-lg object-cover flex-shrink-0"
                  priority
                />

                <div className="flex flex-col gap-2 flex-1 overflow-hidden">
                  <span className="font-semibold text-gray-900 truncate">
                    {c.CompetitionName}
                  </span>

                  <span className="text-gray-700">{c.DateTo}</span>

                  <span className="text-gray-500">{c.CityName}</span>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-2 md:w-auto">
                  <div className="relative flex items-center gap-2">
                    <button
                      onClick={() =>
                        router.push(`/select?event=${c.CompetitionId}`)
                      }
                      className="w-full bg-green-600 hover:bg-green-500 text-white py-1.5 px-3 text-sm rounded-md"
                    >
                      Замовити
                    </button>

                    <div className="relative">
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
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded-md whitespace-nowrap z-50">
                          Скопійовано!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Виконати */}
                  <div className="relative flex items-center gap-2">
                    <button
                      onClick={() =>
                        router.push(`/parts?event=${c.CompetitionId}`)
                      }
                      className="w-full bg-green-600 hover:bg-green-500 text-white py-1.5 px-3 text-sm rounded-md"
                    >
                      Виконати
                    </button>

                    <div className="relative">
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
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded-md whitespace-nowrap z-50">
                          Скопійовано!
                        </span>
                      )}
                    </div>
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
