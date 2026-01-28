"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { decodeEvent } from "@/utils/eventPayload";

type Participant = {
  regNumber: string;
  orderType: string;
  category: string;
  program: string;
};

type StoredCrossed = { value: string[]; expiresAt: number };

function makeCrossKey(
  category: string,
  program: string,
  regNumber: string,
  idx: number
) {
  return `${category}|||${program}|||${regNumber}|||${idx}`;
}

function readCrossedFromStorage(storageKey: string): string[] {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== "object" || parsed === null) return [];

    const obj = parsed as Partial<StoredCrossed>;
    if (typeof obj.expiresAt !== "number" || obj.expiresAt <= Date.now())
      return [];

    if (!Array.isArray(obj.value)) return [];
    return obj.value.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function CrossTable({
  storageKey,
  categoryParam,
  participants,
}: {
  storageKey: string;
  categoryParam: string;
  participants: Participant[];
}) {
  const [crossedKeys, setCrossedKeys] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return readCrossedFromStorage(storageKey);
  });

  const crossedSet = useMemo(() => new Set(crossedKeys), [crossedKeys]);

  const toggleKey = (key: string) => {
    setCrossedKeys((prev) => {
      const next = prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key];

      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            value: next,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000,
          })
        );
      } catch {}

      return next;
    });
  };

  const grouped: Record<string, string[]> = {};
  participants.forEach((p) => {
    if (!grouped[p.program]) grouped[p.program] = [];
    grouped[p.program].push(p.regNumber);
  });

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
                        onClick={() => toggleKey(key)}
                        className={`cursor-pointer ${
                          crossed ? "line-through opacity-60" : ""
                        } ${
                          participant?.orderType === "Ексклюзив"
                            ? "text-green-600"
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
  const eventParam = searchParams.get("event");
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
    if (!decoded?.id || !decoded?.time) return null;
    return `crossed:${decoded.id}:${decoded.time}`;
  }, [decoded?.id, decoded?.time]);

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

  if (!eventParam || !categoryParam || !decoded) {
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

  if (!storageKey) {
    return (
      <p className="p-6 text-center text-red-600">Помилка: немає storageKey</p>
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

          <h1 className="text-2xl font-semibold text-gray-900 text-center break-words">
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

        {/* ✅ key={storageKey} => при зміні event/time CrossTable перемонтується і перечитає localStorage */}
        <CrossTable
          key={storageKey}
          storageKey={storageKey}
          categoryParam={categoryParam}
          participants={participants}
        />
      </div>
    </div>
  );
}
