"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState({
    dnipro: false,
    zaporizhzhia: false,
    kropyvnytskyi: false,
  });

  const cityMap = {
    dnipro: { id: 20, name: "Дніпро" },
    zaporizhzhia: { id: 1756, name: "Запоріжжя" },
    kropyvnytskyi: { id: 33, name: "Кропивницький" },
  };

  const router = useRouter();

  const toggleCity = (key) => {
    setCities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const load = async () => {
      const selectedCities = Object.keys(cities).filter((k) => cities[k]);
      if (selectedCities.length === 0) {
        setCompetitions([]);
        return;
      }

      setLoading(true);

      const results = [];

      for (const cityKey of selectedCities) {
        const cityId = cityMap[cityKey].id;
        const cityName = cityMap[cityKey].name;

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
  }, [cities]);

  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-100 p-6">
      <main className="w-full max-w-3xl bg-white p-8 rounded-xl shadow flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-black text-center">
          Виберіть місто
        </h1>

        <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-3 mb-6">
          {Object.keys(cities).map((key) => (
            <label
              key={key}
              className="flex items-center gap-2 text-lg text-gray-900"
            >
              <input
                type="checkbox"
                checked={cities[key]}
                onChange={() => toggleCity(key)}
              />
              {cityMap[key].name}
            </label>
          ))}
        </div>

        {loading && (
          <p className="text-center text-gray-700">Завантаження...</p>
        )}

        {!loading && competitions.length > 0 && (
          <ul className="space-y-4">
            {competitions.map((c) => (
              <li
                key={`${c.CompetitionId}-${c.DateTo}-${c.CityName}`}
                className="p-4 border rounded-lg shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2"
              >
                <div className="flex flex-col md:flex-row md:items-center md:gap-4">
                  <span className="font-semibold text-gray-900">
                    {c.CompetitionName}
                  </span>
                  <span className="text-gray-700">{c.DateTo}</span>
                  <span className="text-gray-500 md:ml-2">{c.CityName}</span>
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
                    onClick={() =>
                      router.push(`/parts?event=${c.CompetitionId}`)
                    }
                    className="flex-1 md:flex-none bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                  >
                    Виконати
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
