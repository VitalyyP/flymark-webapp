"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ResultsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = searchParams.get("event");
  const time = searchParams.get("time");

  const [participants, setParticipants] = useState([]);
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

        if (res.ok) setParticipants(data.participants || []);
        else setParticipants([]);
      } catch {
        setParticipants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [eventId, time]);

  const grouped = {
    "Одне-три фото": [],
    "Чотири-сім фото": [],
    "Ексклюзив": [],
  };

  participants.forEach((p) => {
    if (grouped[p.orderType]) grouped[p.orderType].push(p.regNumber || "—");
  });

  return (
    <div className="p-6 flex flex-col items-center min-h-screen bg-zinc-100">
      <h1 className="text-2xl font-semibold mb-4 text-black text-center">
        Учасники на {time || "—"}
      </h1>

      {participants.length > 0 && (
        <table className="border-collapse border border-gray-400 text-black">
          <thead>
            <tr>
              {Object.keys(grouped).map((type) => (
                <th
                  key={type}
                  className="border border-gray-400 px-4 py-2 bg-gray-200"
                >
                  {type}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(
              {
                length: Math.max(
                  ...Object.values(grouped).map((g) => g.length)
                ),
              },
              (_, i) => i
            ).map((rowIndex) => (
              <tr key={rowIndex}>
                {Object.keys(grouped).map((type) => (
                  <td
                    key={type}
                    className="border border-gray-400 px-4 py-2 text-center"
                  >
                    {grouped[type][rowIndex] || ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button
        onClick={() => router.back()}
        disabled={loading}
        className={`mt-8 px-4 py-2 rounded text-black ${
          loading
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-gray-200 hover:bg-gray-300"
        }`}
      >
        {loading ? "Завантаження..." : "← Повернутись назад"}
      </button>
    </div>
  );
}
