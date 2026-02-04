"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { decodeEvent } from "@/utils/eventPayload";
import {
  makeCrossedStorageKey,
  makeCrossKey,
  readCrossedFromStorage
} from "@/utils/crossedStorage";

type Participant = {
  regNumber: string;
  orderType: string;
  category: string;
  program: string;
  name: string;
};

function CrossTable({
  storageKey,
  eventParam,
  participants,
  part,
  time,
  coverUrl,
  eventName
}: {
  storageKey: string;
  eventParam: string;
  participants: Participant[];
  part: string;
  time: string;
  coverUrl: string;
  eventName: string;
}) {
  const [crossedKeys] = useState<string[]>(() =>
    readCrossedFromStorage(storageKey)
  );

  const crossedSet = useMemo(() => new Set(crossedKeys), [crossedKeys]);

  const grouped: Record<string, Record<string, string[]>> = {};
  participants.forEach((p) => {
    if (!grouped[p.category]) grouped[p.category] = {};
    if (!grouped[p.category][p.program]) grouped[p.category][p.program] = [];
    grouped[p.category][p.program].push(p.regNumber);
  });

  const categories = Object.keys(grouped).sort((a, b) =>
    a.localeCompare(b, "uk", { numeric: true })
  );

  categories.forEach((cat) =>
    Object.keys(grouped[cat]).forEach((prog) =>
      grouped[cat][prog].sort((a, b) =>
        a.localeCompare(b, "uk", { numeric: true })
      )
    )
  );

  return (
    <div className="w-full max-w-3xl bg-white rounded-xl shadow p-0 sm:p-6 overflow-hidden">
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

      <div className="flex justify-center my-6">
        <span className="text-xl font-semibold text-black text-center">
          {part} відділення / {time}
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-200 px-4 py-2 text-black text-left">
                Категорія
              </th>
              <th className="border border-gray-200 px-4 py-2 text-black text-left">
                Програма
              </th>
              <th className="border border-gray-200 px-4 py-2 text-black text-left">
                Номери учасників
              </th>
            </tr>
          </thead>

          <tbody>
            {categories.map((cat, i) =>
              Object.keys(grouped[cat]).map((prog) => (
                <tr
                  key={`${cat}-${prog}`}
                  className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="border border-gray-200 px-4 py-2 text-black">
                    <Link
                      href={`/parts/results/category?event=${eventParam}&category=${encodeURIComponent(
                        cat
                      )}`}
                      className="text-blue-600 hover:underline"
                    >
                      {cat}
                    </Link>
                  </td>

                  <td className="border border-gray-200 px-4 py-2 text-black">
                    {prog}
                  </td>

                  <td className="border border-gray-200 px-4 py-2 text-black">
                    {grouped[cat][prog]
                      .map((num, idx) => {
                        const key = makeCrossKey(cat, prog, num, idx);
                        const crossed = crossedSet.has(key);

                        const participant = participants.find(
                          (p) =>
                            p.regNumber === num &&
                            p.program === prog &&
                            p.category === cat
                        );

                        return (
                          <span
                            key={key}
                            className={`${
                              crossed ? "line-through opacity-60" : ""
                            } ${
                              participant?.orderType === "premium"
                                ? "text-red-600"
                                : ""
                            }`}
                          >
                            {num}
                          </span>
                        );
                      })
                      .reduce(
                        (prev: React.ReactNode[], curr) =>
                          prev.length === 0 ? [curr] : [...prev, ", ", curr],
                        [] as React.ReactNode[]
                      )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ResultsClient() {
  const searchParams = useSearchParams();
  const eventParam = searchParams.get("event") ?? "";

  const decoded = useMemo(
    () => (eventParam ? decodeEvent(eventParam) : null),
    [eventParam]
  );

  const eventId = decoded?.id ?? "";
  const eventName = decoded?.name ?? "";
  const coverUrl = decoded?.coverUrl ?? "";
  const time = decoded?.time ?? "";
  const part = decoded?.part ?? "";

  const storageKey = useMemo(() => {
    if (!eventId || !time) return "";
    return makeCrossedStorageKey(eventId, time);
  }, [eventId, time]);

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
        const data: { participants?: Participant[] } = await res.json();
        setParticipants(
          Array.isArray(data?.participants) ? data.participants! : []
        );
      } catch {
        setParticipants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [eventId, time]);

  if (!decoded || !eventId || !time) {
    return (
      <p className="p-6 text-center text-red-600">
        Помилка: некоректні дані події
      </p>
    );
  }

  if (loading) {
    return (
      <p className="p-6 text-center text-gray-500">Завантаження учасників…</p>
    );
  }

  if (participants.length === 0) {
    return <p className="p-6 text-center text-gray-500">Немає учасників</p>;
  }

  return (
    <div className="flex justify-center bg-zinc-100 min-h-screen p-6">
      <CrossTable
        key={storageKey}
        storageKey={storageKey}
        eventParam={eventParam}
        participants={participants}
        part={part}
        time={time}
        coverUrl={coverUrl}
        eventName={eventName}
      />
    </div>
  );
}
