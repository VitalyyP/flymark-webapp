"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { decodeEvent } from "@/utils/eventPayload";
import { groupRegNumbersByProgram } from "@/utils/groupParticipantsByProgram";
import {
  makeCrossedStorageKey,
  makeCrossKey,
  readCrossedFromStorage,
  toggleCrossedKey
} from "@/utils/crossedStorage";

type Participant = {
  regNumber: string;
  orderType: string;
  category: string;
  program: string;
};

function CrossTable({
  storageKey,
  categoryParam,
  participants
}: {
  storageKey: string;
  categoryParam: string;
  participants: Participant[];
}) {
  const [crossedKeys, setCrossedKeys] = useState<string[]>(() =>
    readCrossedFromStorage(storageKey)
  );

  const crossedSet = useMemo(() => new Set(crossedKeys), [crossedKeys]);

  const grouped = useMemo(
    () => groupRegNumbersByProgram(participants, "Не знаю"),
    [participants]
  );

  Object.keys(grouped).forEach((prog) =>
    grouped[prog].sort((a, b) => a.localeCompare(b, "uk", { numeric: true }))
  );

  return (
    <div className="w-full overflow-x-auto mt-6">
      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-200 px-4 py-2 text-left text-black">
              Програма
            </th>
            <th className="border border-gray-200 px-4 py-2 text-left text-black">
              Номери учасників
            </th>
          </tr>
        </thead>

        <tbody>
          {Object.keys(grouped).map((prog, i) => (
            <tr key={prog} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="border border-gray-200 px-4 py-2 text-black">
                {prog}
              </td>

              <td className="border border-gray-200 px-4 py-2 text-black">
                {grouped[prog]
                  .map((num, idx) => {
                    const key = makeCrossKey(categoryParam, prog, num, idx);
                    const crossed = crossedSet.has(key);

                    const participant = participants.find(
                      (p) => p.regNumber === num && p.program === prog
                    );

                    return (
                      <span
                        key={key}
                        onClick={() =>
                          setCrossedKeys((prev) =>
                            toggleCrossedKey(prev, key, storageKey)
                          )
                        }
                        className={`cursor-pointer ${
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
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CategoryClient() {
  const searchParams = useSearchParams();

  const eventParam = searchParams.get("event") ?? "";
  const categoryParam = searchParams.get("category") ?? "";

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

  const [participants, setParticipants] = useState<Participant[] | null>(null);

  useEffect(() => {
    if (!eventId || !time || !categoryParam) return;

    fetch(
      `/api/get-participants?event=${eventId}&time=${encodeURIComponent(time)}`
    )
      .then((res) => res.json())
      .then((data) => {
        const list: Participant[] = Array.isArray(data?.participants)
          ? (data.participants as Participant[])
          : [];
        setParticipants(list.filter((p) => p.category === categoryParam));
      })
      .catch(() => setParticipants([]));
  }, [eventId, time, categoryParam]);

  if (!decoded || !eventId || !time || !eventParam || !categoryParam) {
    return (
      <p className="p-6 text-center text-red-600">Помилка: некоректні дані</p>
    );
  }

  if (participants === null) {
    return <p className="p-6 text-center text-gray-500">Завантаження…</p>;
  }

  if (participants.length === 0) {
    return (
      <p className="p-6 text-center text-gray-500">
        Немає учасників у цій категорії
      </p>
    );
  }

  return (
    <div className="flex justify-center bg-zinc-100 min-h-screen p-6">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow p-0 sm:p-6 overflow-hidden">
        <div className="flex flex-col items-center gap-6">
          {coverUrl && (
            <div className="flex flex-col items-center">
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

          <h1 className="text-2xl font-semibold text-gray-900 text-center wrap-break-word">
            {eventName}
          </h1>

          <div className="flex justify-center my-6">
            <span className="text-xl font-semibold text-black text-center">
              {part} відділення / {time}
            </span>
          </div>

          <div className="text-xl font-bold text-black text-center">
            {categoryParam}
          </div>
        </div>

        <CrossTable
          key={storageKey}
          storageKey={storageKey}
          categoryParam={categoryParam}
          participants={participants}
        />

        <div className="mt-4 mb-4 flex justify-center">
          <Link
            href={`/parts/results?event=${eventParam}`}
            className="inline-flex items-center justify-center px-8 py-3 bg-[#a9a9a9] text-white font-bold rounded-[15px] hover:bg-[#969696] transition-colors min-w-[180px]"
          >
            ← Назад
          </Link>
        </div>
      </div>
    </div>
  );
}
