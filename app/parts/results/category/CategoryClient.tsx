"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { decodeEvent } from "@/utils/eventPayload";
import {
  makeCrossedStorageKey,
  makeCrossKey,
  readCrossedFromStorage,
  toggleCrossedKey,
} from "@/utils/crossedStorage";

type Participant = {
  regNumber: string;
  orderType: string;
  category: string;
  program: string;
};

const renderBackButton = (eventParam: string) => (
  <Link
    href={`/parts/results?event=${eventParam}`}
    className="inline-flex items-center justify-center px-10 py-3 bg-[#A9A9A9] text-white font-bold rounded-[18px] hover:bg-[#969696] active:scale-95 transition-all min-w-[180px] text-sm"
  >
    <ChevronLeft size={18} className="mr-1" /> Назад
  </Link>
);

function CategoryTable({
  storageKey,
  categoryParam,
  participants,
  eventParam,
  part,
  time,
}: {
  storageKey: string;
  categoryParam: string;
  participants: Participant[];
  eventParam: string;
  part: string;
  time: string;
}) {
  const [crossedKeys, setCrossedKeys] = useState<string[]>(() =>
    readCrossedFromStorage(storageKey)
  );

  const crossedSet = useMemo(() => new Set(crossedKeys), [crossedKeys]);

  const grouped = useMemo(() => {
    const result: Record<string, Participant[]> = {};

    for (const p of participants) {
      const prog = (p.program ?? "").trim() || "Невідома";
      (result[prog] ??= []).push(p);
    }

    for (const prog of Object.keys(result)) {
      result[prog].sort((a, b) =>
        (a.regNumber ?? "").localeCompare(b.regNumber ?? "", "uk", {
          numeric: true,
        })
      );
    }

    return result;
  }, [participants]);

  const programs = useMemo(
    () =>
      Object.keys(grouped).sort((a, b) =>
        a.localeCompare(b, "uk", { numeric: true })
      ),
    [grouped]
  );

  return (
    <div className="w-full max-w-2xl bg-white rounded-[32px] shadow-sm border border-zinc-100 p-3 sm:p-8 flex flex-col">
      <div className="text-center py-6 mb-4">
        <h1 className="text-[22px] font-black uppercase tracking-tight text-green-600 leading-tight">
          Відділення {part} <span className="text-zinc-300 mx-1">/</span>{" "}
          <span className="text-zinc-900">{time}</span>
        </h1>
        <div className="text-[17px] font-bold text-zinc-500 uppercase mt-2 px-4 leading-snug">
          {categoryParam}
        </div>
      </div>

      <div className="w-full overflow-hidden mt-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-zinc-100">
              <th className="py-3 px-3 text-left align-top w-1/3">
                <span className="text-[13px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
                  Програма
                </span>
              </th>
              <th className="py-3 px-3 text-left align-top">
                <span className="text-[13px] font-bold uppercase text-zinc-400 tracking-widest leading-none">
                  Номери учасників
                </span>
              </th>
            </tr>
          </thead>

          <tbody>
            {programs.map((prog) => (
              <tr key={prog} className="border-b border-zinc-50 last:border-0">
                <td className="py-6 px-3 align-top">
                  <span className="text-[15px] font-bold text-zinc-900 leading-tight block mt-1.5">
                    {prog}
                  </span>
                </td>

                <td className="py-6 px-3 align-top">
                  <div className="flex flex-wrap gap-x-3 gap-y-4">
                    {grouped[prog].map((p, idx) => {
                      const num = (p.regNumber ?? "").trim();
                      const key = makeCrossKey(categoryParam, prog, num, idx);
                      const crossed = crossedSet.has(key);

                      const isPremium =
                        (p.orderType ?? "").trim().toLowerCase() === "premium";

                      return (
                        <span
                          key={key}
                          className="text-[22px] font-semibold cursor-pointer select-none transition-all active:scale-90"
                          onClick={() =>
                            setCrossedKeys((prev) =>
                              toggleCrossedKey(prev, key, storageKey)
                            )
                          }
                        >
                          <span
                            className={`
                              ${
                                crossed
                                  ? "line-through opacity-30"
                                  : "opacity-100"
                              }
                              ${isPremium ? "text-red-600" : "text-zinc-800"}
                            `}
                          >
                            {num}
                          </span>

                          {idx < grouped[prog].length - 1 && (
                            <span className="text-zinc-400 ml-1 font-light">
                              ,
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-12 mb-4 flex justify-center border-t border-zinc-50 pt-8">
        {renderBackButton(eventParam)}
      </div>
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
  const time = decoded?.time ?? "";
  const part = decoded?.part ?? "";

  const storageKey = useMemo(() => {
    if (!eventId || !time) return "";
    return makeCrossedStorageKey(eventId, time);
  }, [eventId, time]);

  const [participants, setParticipants] = useState<Participant[] | null>(null);

  useEffect(() => {
    if (!eventId || !time || !categoryParam) return;

    const ac = new AbortController();

    fetch(
      `/api/get-participants?event=${encodeURIComponent(
        eventId
      )}&time=${encodeURIComponent(time)}`,
      { signal: ac.signal }
    )
      .then((res) => res.json())
      .then((data) => {
        const list: Participant[] = Array.isArray(data?.participants)
          ? (data.participants as Participant[])
          : [];

        const filtered = list.filter(
          (p) => (p.category ?? "").trim() === categoryParam.trim()
        );

        setParticipants(filtered);
      })
      .catch(() => setParticipants([]));

    return () => ac.abort();
  }, [eventId, time, categoryParam]);

  if (!decoded || !eventId || !time || !eventParam || !categoryParam) {
    return (
      <div className="flex justify-center p-6 bg-zinc-100 min-h-screen">
        <p className="p-6 text-center text-red-600 bg-white rounded-2xl shadow-sm h-fit">
          Помилка: некоректні дані турніру
        </p>
      </div>
    );
  }

  if (participants === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="w-8 h-8 border-4 border-zinc-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex justify-center bg-zinc-100 min-h-screen p-3 sm:p-6 font-sans">
      <CategoryTable
        storageKey={storageKey}
        categoryParam={categoryParam}
        participants={participants}
        eventParam={eventParam}
        part={part}
        time={time}
      />
    </div>
  );
}
