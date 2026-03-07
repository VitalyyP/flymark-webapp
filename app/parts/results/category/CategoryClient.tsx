"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, RefreshCw } from "lucide-react";

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
  roundsLoading,
}: {
  storageKey: string;
  categoryParam: string;
  participants: Participant[];
  eventParam: string;
  part: string;
  time: string;
  roundMap: Record<string, string[]>;
  roundsLoading: boolean;
}) {
  const [crossedKeys, setCrossedKeys] = useState<string[]>(() =>
    readCrossedFromStorage(storageKey)
  );

  const crossedSet = useMemo(() => new Set(crossedKeys), [crossedKeys]);

  const groupedByPrograms = useMemo(
    () => groupParticipantsByProgramForDisplay(participants),
    [participants]
  );

  const groupedByRounds = useMemo<Record<string, DisplayItem[]>>(() => {
    if (!roundMap || Object.keys(roundMap).length === 0) return {};

    const byNumber = new Map<string, DisplayItem>();
    Object.values(groupedByPrograms).forEach((list) => {
      list.forEach((item) => {
        if (!byNumber.has(item.regNumber)) {
          byNumber.set(item.regNumber, item);
        }
      });
    });

    const out: Record<string, DisplayItem[]> = {};
    for (const round of Object.keys(roundMap)) {
      out[round] = (roundMap[round] ?? [])
        .map((num) => byNumber.get(num))
        .filter((v): v is DisplayItem => Boolean(v));
    }
    return out;
  }, [roundMap, groupedByPrograms]);

  const hasRounds = Object.keys(groupedByRounds).length > 0;

  const programKeys = useMemo(
    () =>
      Object.keys(groupedByPrograms).sort((a, b) =>
        a.localeCompare(b, "uk", { numeric: true })
      ),
    [groupedByPrograms]
  );

  const roundKeys = useMemo(
    () => Object.keys(groupedByRounds).sort((a, b) => Number(a) - Number(b)),
    [groupedByRounds]
  );

  return (
    <div className="w-full max-w-2xl bg-white rounded-4xl shadow-sm border border-zinc-100 p-3 sm:p-8 flex flex-col">
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
              Програма
            </th>
            <th className="py-3 px-3 text-left text-[13px] font-bold text-zinc-400 uppercase">
              Номери учасників
            </th>
          </tr>
        </thead>
        <tbody>
          {programKeys.map((key) => (
            <tr key={key} className="border-b border-zinc-50 last:border-0">
              <td className="py-6 px-3 font-bold text-zinc-900">{key}</td>
              <td className="py-6 px-3">
                <div className="flex flex-wrap gap-x-3 gap-y-4">
                  {(groupedByPrograms[key] ?? []).map((item, idx) => {
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
                        {idx < (groupedByPrograms[key]?.length ?? 0) - 1 && (
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

      {roundsLoading && !hasRounds && (
        <div className="mt-8 p-6 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200 flex justify-center">
          <span className="text-[13px] font-bold text-[#00a63e] uppercase animate-pulse flex items-center gap-3">
            <RefreshCw size={16} className="animate-spin" />
            Оновлення заходів...
          </span>
        </div>
      )}

      {hasRounds && (
        <div className="mt-10 bg-zinc-50/80 rounded-3xl p-4 sm:p-6 border border-zinc-100 shadow-inner">
          <div className="text-center mb-6">
            <h2 className="text-[15px] font-bold text-zinc-500 uppercase tracking-wide">
              Розподіл по заходах
            </h2>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="py-2 px-3 text-left text-[11px] font-black uppercase text-zinc-400 tracking-widest">
                  Захід
                </th>
                <th className="py-2 px-3 text-left text-[11px] font-black uppercase text-zinc-400 tracking-widest">
                  Номери учасників
                </th>
              </tr>
            </thead>
            <tbody>
              {roundKeys.map((key) => (
                <tr
                  key={key}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="py-5 px-3 font-bold text-zinc-800 text-[16px]">
                    {`Захід ${key}`}
                  </td>
                  <td className="py-5 px-3">
                    <div className="flex flex-wrap gap-x-3 gap-y-4">
                      {(groupedByRounds[key] ?? []).map((item, idx) => {
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
                            className="text-[22px] font-bold cursor-pointer active:scale-90"
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
                            {idx < (groupedByRounds[key]?.length ?? 0) - 1 && (
                              <span className="text-zinc-300 ml-1">,</span>
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
      )}

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
  const [roundsLoading, setRoundsLoading] = useState(false);

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
    const ac = new AbortController();

    const loadRounds = async () => {
      try {
        setRoundsLoading(true);

        const res = await fetch(
          `/api/flymark/streamdetails?id=${eventId}` +
            `&categoryName=${encodeURIComponent(categoryParam)}` +
            `&programName=${encodeURIComponent(program)}` +
            `&competitionId=${eventId}`,
          { signal: ac.signal }
        );

        const data = await res.json();
        if (ac.signal.aborted) return;

        const qualifications = data?.details?.Qualifications;
        if (!qualifications) {
          setRoundMap({});
          return;
        }

        const rounds: Record<string, string[]> = {};

        for (const q of qualifications) {
          for (const r of q?.Rounds ?? []) {
            Object.assign(rounds, r?.Rounds ?? {});
          }
        }

        setRoundMap(rounds);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("flymark error:", err);
        setRoundMap({});
      } finally {
        if (!ac.signal.aborted) {
          setRoundsLoading(false);
        }
      }
    };

    void loadRounds();

    return () => ac.abort();
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
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="w-8 h-8 border-4 border-zinc-200 border-t-green-600 rounded-full animate-spin" />
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
        roundsLoading={roundsLoading}
      />
    </div>
  );
}
