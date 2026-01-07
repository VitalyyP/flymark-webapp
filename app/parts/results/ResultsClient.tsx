"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

import { decodeEvent } from "@/utils/eventPayload";

type Participant = {
  regNumber: string;
  orderType: string;
  category: string;
  name: string;
};

export default function ResultsClient() {
  const searchParams = useSearchParams();
  const eventParam = searchParams.get("event");
  const time = searchParams.get("time");

  const [eventName, setEventName] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [eventId, setEventId] = useState("");

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventParam) return;

    const decoded = decodeEvent(eventParam);

    if (!decoded) {
      console.error("Failed to decode event");
      setEventId("");
      setEventName("Подія");
      setCoverUrl("");
      return;
    }

    setEventId(decoded.id);
    setEventName(decoded.name);
    setCoverUrl(decoded.coverUrl);
  }, [eventParam]);

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
        {eventName && (
          <div className="flex flex-col items-center gap-8">
            {coverUrl && (
              <div className="flex flex-col items-center gap-31">
                <div className="w-55 h-55 rounded-full overflow-hidden">
                  <Image
                    src={coverUrl}
                    alt={eventName}
                    width={220}
                    height={220}
                    className="object-cover w-full h-full"
                    priority
                  />
                </div>
              </div>
            )}
            <h1 className="text-2xl font-semibold text-gray-900 text-center break-words">
              {eventName}
            </h1>
          </div>
        )}

        <div className="flex justify-center my-6">
          <span className="text-xl font-semibold text-black text-center">
            {time}
          </span>
        </div>

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
                  {grouped[cat].map((num) => {
                    const participant = participants.find(
                      (p) => p.regNumber === num
                    );
                    return (
                      <span
                        key={num}
                        className={
                          participant?.orderType === "Ексклюзив"
                            ? "text-green-600 mr-1"
                            : "mr-1"
                        }
                      >
                        {num}
                      </span>
                    );
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
