"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Participant = {
  regNumber: string;
  orderType: string;
  category: string;
  name: string;
};

export default function ResultsClient() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");
  const time = searchParams.get("time");

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId || !time) return;

    const fetchParticipants = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/get-participants?event=${eventId}&time=${encodeURIComponent(
            time
          )}`
        );
        const data = await res.json();
        setParticipants(data.participants ?? []);
      } catch (err) {
        console.error("Failed to fetch participants:", err);
        setParticipants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [eventId, time]);

  if (!eventId || !time)
    return (
      <p className="p-6 text-center text-red-600">
        Помилка: не вказано event або time
      </p>
    );

  if (loading)
    return (
      <p className="p-6 text-center text-gray-500">Завантаження учасників…</p>
    );

  if (participants.length === 0)
    return <p className="p-6 text-center text-gray-500">Немає учасників</p>;

  const grouped: Record<string, string[]> = {};
  participants.forEach((p) => {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p.regNumber);
  });

  const categories = Object.keys(grouped).sort((a, b) =>
    a.localeCompare(b, "uk", { numeric: true })
  );

  categories.forEach((cat) => {
    grouped[cat].sort((a, b) => a.localeCompare(b, "uk", { numeric: true }));
  });

  return (
    <div className="flex justify-center bg-zinc-100 min-h-screen p-6">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-semibold text-black text-center mb-6">
          Результати виступу — {time}
        </h1>

        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-200 px-4 py-2 text-black text-left">
                Категорія
              </th>
              <th className="border border-gray-200 px-4 py-2 text-black text-left">
                Номери учасників
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, i) => (
              <tr key={cat} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border border-gray-200 px-4 py-2 text-black">
                  {cat}
                </td>
                <td className="border border-gray-200 px-4 py-2 text-black">
                  {grouped[cat].join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
