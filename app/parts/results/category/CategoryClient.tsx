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
import {
  groupParticipantsByProgramForDisplay,
  type DisplayItem,
} from "@/utils/groupParticipantsByProgramForDisplay";

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
  roundMap,
}: {
  storageKey: string;
  categoryParam: string;
  participants: Participant[];
  eventParam: string;
  part: string;
  time: string;
  roundMap: Record<string, string[]>;
}) {
  const [crossedKeys, setCrossedKeys] = useState<string[]>(() =>
    readCrossedFromStorage(storageKey)
  );

  const crossedSet = useMemo(() => new Set(crossedKeys), [crossedKeys]);

  const groupedByRounds = useMemo<Record<string, DisplayItem[]>>(() => {
    if (!roundMap || Object.keys(roundMap).length === 0) return {};
    const byNumber = new Map(participants.map((p) => [p.regNumber, p]));
    const out: Record<string, DisplayItem[]> = {};
    for (const round of Object.keys(roundMap)) {
      out[round] = roundMap[round]
        .map((num) => byNumber.get(num))
        .filter(Boolean)
        .map((p) => ({
          regNumber: p!.regNumber,
          isPremium: p!.orderType === "premium",
          program: p!.program,
        }));
    }
    return out;
  }, [participants, roundMap]);

  const hasRounds = Object.keys(groupedByRounds).length > 0;
  const groupedByPrograms = useMemo(
    () => groupParticipantsByProgramForDisplay(participants),
    [participants]
  );

  const grouped = hasRounds ? groupedByRounds : groupedByPrograms;

  const rows = useMemo(() => {
    const keys = Object.keys(grouped);
    return hasRounds
      ? keys.sort((a, b) => +a - +b)
      : keys.sort((a, b) => a.localeCompare(b, "uk", { numeric: true }));
  }, [grouped, hasRounds]);

  const label = hasRounds ? "Захід" : "Програма";

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

      <table className="w-full border-collapse mt-4">
        <thead>
          <tr className="border-b-2 border-zinc-100">
            <th className="py-3 px-3 text-left text-[13px] font-bold text-zinc-400 uppercase">
              {label}
            </th>
            <th className="py-3 px-3 text-left text-[13px] font-bold text-zinc-400 uppercase">
              Номери учасників
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((key) => (
            <tr key={key} className="border-b border-zinc-50 last:border-0">
              <td className="py-6 px-3 font-bold text-zinc-900">
                {hasRounds ? `Захід ${key}` : key}
              </td>
              <td className="py-6 px-3">
                <div className="flex flex-wrap gap-x-3 gap-y-4">
                  {(grouped[key] ?? []).map((item, idx) => {
                    const num = item.regNumber;
                    const crossKey = makeCrossKey(
                      categoryParam,
                      item.program,
                      num,
                      idx
                    );
                    const crossed = crossedSet.has(crossKey);
                    return (
                      <span
                        key={crossKey}
                        className="text-[22px] font-semibold cursor-pointer active:scale-90"
                        onClick={() =>
                          setCrossedKeys((prev) =>
                            toggleCrossedKey(prev, crossKey, storageKey)
                          )
                        }
                      >
                        <span
                          className={`
                            ${crossed ? "line-through opacity-30" : ""}
                            ${item.isPremium ? "text-red-600" : "text-zinc-800"}
                          `}
                        >
                          {num}
                        </span>
                        {idx < (grouped[key]?.length ?? 0) - 1 && (
                          <span className="text-zinc-400 ml-1">,</span>
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
  const part = decoded?.part ?? "";
  const time = decoded?.time ?? "";

  const storageKey = useMemo(() => {
    if (!eventId || !time) return "";
    return makeCrossedStorageKey(eventId, time);
  }, [eventId, time]);

  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [roundMap, setRoundMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!eventId || !categoryParam) return;

    fetch(
      `/api/get-participants?event=${eventId}&time=${encodeURIComponent(time)}`
    )
      .then((r) => r.json())
      .then((data) => {
        const filtered: Participant[] = (data.participants ?? []).filter(
          (p: Participant) => p.category.trim() === categoryParam.trim()
        );
        setParticipants(filtered);
      })
      .catch(() => setParticipants([]));
  }, [eventId, categoryParam, time]);

  useEffect(() => {
    if (!eventId || !categoryParam || !participants?.length) return;

    const program = participants[0].program;

    fetch(
      `/api/flymark/streamdetails?id=${eventId}` +
        `&categoryName=${encodeURIComponent(categoryParam)}` +
        `&programName=${encodeURIComponent(program)}` +
        `&competitionId=${eventId}`
    )
      .then((r) => r.json())
      .then((data) => {
        const qualifications = data?.details?.Qualifications;
        if (!qualifications) return;

        const rounds: Record<string, string[]> = {};

        for (const q of qualifications) {
          for (const r of q?.Rounds ?? []) {
            Object.assign(rounds, r?.Rounds ?? {});
          }
        }

        setRoundMap(rounds);
      })
      .catch((err) => console.error("flymark error:", err));
  }, [eventId, categoryParam, participants]);

  if (!decoded || !eventId || !time || !eventParam || !categoryParam) {
    return (
      <div className="flex justify-center p-6 bg-zinc-100 min-h-screen">
        <p className="p-6 text-center text-red-600 bg-white rounded-2xl shadow-sm h-fit">
          Помилка: некоректні дані турніру
        </p>
      </div>
    );
  }

  if (!participants)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading…
      </div>
    );

  return (
    <div className="flex justify-center bg-zinc-100 min-h-screen p-3 sm:p-6 font-sans">
      <CategoryTable
        storageKey={storageKey}
        categoryParam={categoryParam}
        participants={participants}
        eventParam={eventParam}
        part={part}
        time={time}
        roundMap={roundMap}
      />
    </div>
  );
}
