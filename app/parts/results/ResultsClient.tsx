"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { decodeEvent } from "@/utils/eventPayload";
import { normalizeTime } from "@/utils/normalizeTime";
import {
  groupParticipantsByProgramForDisplay,
  type DisplayItem,
} from "@/utils/groupParticipantsByProgramForDisplay";
import {
  makeCrossedStorageKey,
  makeCrossKey,
  readCrossedFromStorage,
} from "@/utils/crossedStorage";

type Participant = {
  regNumber: string;
  orderType: string;
  category: string;
  program: string;
  name: string;
};

const renderBackButton = (eventId: string) => (
  <div className="flex justify-center my-3">
    <Link
      href={`/parts?eventId=${encodeURIComponent(eventId)}`}
      className="inline-flex items-center justify-center px-10 py-3 bg-[#A9A9A9] text-white font-bold rounded-[18px] hover:bg-[#969696] active:scale-95 transition-all min-w-[180px] text-sm"
    >
      <ChevronLeft size={18} className="mr-1" /> Назад
    </Link>
  </div>
);

function CrossTable({
  storageKey,
  eventParam,
  eventId,
  participants,
  part,
  time,
}: {
  storageKey: string;
  eventParam: string;
  eventId: string;
  participants: Participant[];
  part: string;
  time: string;
}) {
  const [crossedKeys] = useState<string[]>(() =>
    readCrossedFromStorage(storageKey)
  );

  const crossedSet = useMemo(() => new Set(crossedKeys), [crossedKeys]);

  const byCategory: Record<string, Participant[]> = {};
  for (const p of participants) {
    const cat = (p.category ?? "").trim();
    if (!cat) continue;
    (byCategory[cat] ??= []).push(p);
  }

  const grouped: Record<string, Record<string, DisplayItem[]>> = {};
  for (const [cat, list] of Object.entries(byCategory)) {
    grouped[cat] = groupParticipantsByProgramForDisplay(list);
  }

  const categories = Object.keys(grouped).sort((a, b) =>
    a.localeCompare(b, "uk", { numeric: true })
  );

  return (
    <div className="w-full max-w-2xl bg-white rounded-[32px] shadow-sm border border-zinc-100 p-2 sm:p-6 flex flex-col">
      <div className="text-center py-4 border-b border-zinc-50 mb-2">
        <h1 className="text-[22px] font-black uppercase tracking-tight text-green-600">
          Відділення {part}{" "}
          <span className="text-zinc-400 font-light text-base mx-2 items-center">
            /
          </span>{" "}
          <span className="text-zinc-900">{time}</span>
        </h1>
      </div>

      {renderBackButton(eventId)}

      <div className="w-full overflow-hidden mt-2">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-zinc-100">
              <th className="py-3 px-3 text-left align-top">
                <div className="flex flex-col min-h-10">
                  <span className="text-[14px] font-bold text-zinc-900 uppercase leading-none">
                    Категорія
                  </span>
                  <span className="text-[11px] font-medium text-zinc-400 uppercase mt-1">
                    Програма
                  </span>
                </div>
              </th>
              <th className="py-3 px-3 text-left align-top">
                <div className="flex flex-col min-h-10">
                  <span className="text-[14px] font-bold uppercase text-zinc-900 leading-none">
                    Номери учасників
                  </span>
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            {categories.map((cat, i) =>
              Object.keys(grouped[cat]).map((prog) => (
                <tr
                  key={`${cat}-${prog}`}
                  className={`border-b border-zinc-100 last:border-0 ${
                    i % 2 === 0 ? "bg-white" : "bg-zinc-50/30"
                  }`}
                >
                  <td className="py-5 px-3 align-top max-w-[170px]">
                    <Link
                      href={`/parts/results/category?event=${eventParam}&category=${encodeURIComponent(
                        cat
                      )}&program=${encodeURIComponent(prog)}`}
                      className="group flex flex-col decoration-zinc-300 underline-offset-[6px] hover:decoration-green-500 transition-all"
                    >
                      <span className="text-[14px] font-bold text-zinc-800 group-hover:text-green-600 transition-colors leading-snug underline decoration-dotted decoration-1">
                        {cat}
                      </span>

                      {prog !== "Невідома" && (
                        <span className="text-[12px] font-medium text-zinc-400 uppercase mt-1.5 tracking-tight">
                          {prog}
                        </span>
                      )}
                    </Link>
                  </td>

                  <td className="py-5 px-3 align-top">
                    <div className="flex flex-wrap gap-x-1 gap-y-1.5">
                      {grouped[cat][prog].map((item, idx) => {
                        const num = item.regNumber;
                        const key = makeCrossKey(cat, prog, num, idx);
                        const crossed = crossedSet.has(key);

                        return (
                          <span key={key} className="text-[16px] font-semibold">
                            <span
                              className={`
                                ${
                                  crossed
                                    ? "line-through opacity-50"
                                    : "opacity-100"
                                }
                                ${
                                  item.isPremium
                                    ? "text-red-600"
                                    : "text-zinc-800"
                                }
                                transition-opacity
                              `}
                            >
                              {num}
                            </span>
                            {idx < grouped[cat][prog].length - 1 && (
                              <span className="text-zinc-800 mr-1">,</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4">{renderBackButton(eventId)}</div>
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
  const timeRaw = decoded?.time ?? "";
  const part = decoded?.part ?? "";

  const time = useMemo(() => normalizeTime(timeRaw), [timeRaw]);

  const storageKey = useMemo(() => {
    if (!eventId || !time) return "";
    return makeCrossedStorageKey(eventId, time);
  }, [eventId, time]);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId || !time) return;

    const ac = new AbortController();

    const fetchParticipants = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/get-participants?event=${encodeURIComponent(
            eventId
          )}&time=${encodeURIComponent(time)}`,
          { signal: ac.signal }
        );

        const data: { participants?: Participant[] } = await res.json();
        setParticipants(
          Array.isArray(data?.participants) ? data.participants : []
        );
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setParticipants([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchParticipants();
    return () => ac.abort();
  }, [eventId, time]);

  if (!decoded || !eventId || !time) {
    return (
      <div className="flex justify-center bg-zinc-100 min-h-screen p-6">
        <p className="p-6 text-center text-red-600 bg-white rounded-2xl shadow-sm h-fit">
          Помилка: некоректні дані події
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="w-8 h-8 border-4 border-zinc-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex justify-center bg-zinc-100 min-h-screen p-3 sm:p-6 font-sans">
      <CrossTable
        storageKey={storageKey}
        eventParam={eventParam}
        eventId={eventId}
        participants={participants}
        part={part}
        time={time}
      />
    </div>
  );
}
