"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
import { formatTournamentTimeOnly } from "@/utils/normalizeTime";

type Participant = {
  regNumber: string;
  orderType: string;
  category: string;
  program: string;
};

type StageData = {
  rounds: Record<string, string[]>;
  winners: string[];
};

type FlymarkQualification = {
  Title: string;
  Rounds?: { Rounds?: Record<string, string[]> }[];
  Winners?: { Number: number }[];
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
  stageOrder,
}: {
  storageKey: string;
  categoryParam: string;
  participants: Participant[];
  eventParam: string;
  part: string;
  time: string;
  roundMap: Record<string, StageData>;
  roundsLoading: boolean;
  stageOrder: string[];
}) {
  const [crossedKeys, setCrossedKeys] = useState<string[]>(() =>
    readCrossedFromStorage(storageKey)
  );

  const crossedSet = useMemo(() => new Set(crossedKeys), [crossedKeys]);
  const groupedByPrograms = useMemo(
    () => groupParticipantsByProgramForDisplay(participants),
    [participants]
  );

  const groupedByRounds = useMemo<
    Record<string, { items: DisplayItem[] | "empty"; hasRealRounds: boolean }>
  >(() => {
    if (!roundMap || Object.keys(roundMap).length === 0) return {};

    const byNumber = new Map<string, DisplayItem>();
    Object.values(groupedByPrograms).forEach((list) =>
      list.forEach((item) => byNumber.set(item.regNumber, item))
    );

    const out: Record<
      string,
      { items: DisplayItem[] | "empty"; hasRealRounds: boolean }
    > = {};

    const sortedStages = Object.keys(roundMap).sort((a, b) => {
      const ai = stageOrder.indexOf(a);
      const bi = stageOrder.indexOf(b);

      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;

      return ai - bi;
    });

    let emptyNextStages = false;

    for (let i = 0; i < sortedStages.length; i++) {
      const stage = sortedStages[i];
      const current = roundMap[stage];
      const hasRounds = Object.keys(current.rounds).length > 0;

      if (i > 0) {
        const prevStage = sortedStages[i - 1];
        const prevWinners = roundMap[prevStage]?.winners ?? [];

        const hasRounds = Object.keys(current.rounds).length > 0;

        const nextStage = sortedStages[i + 1];
        const nextHasRounds =
          nextStage &&
          Object.keys(roundMap[nextStage]?.rounds ?? {}).length > 0;

        if (!prevWinners.length && !hasRounds && !nextHasRounds) {
          continue;
        }

        const byNumber = new Map<string, DisplayItem>();
        Object.values(groupedByPrograms).forEach((list) =>
          list.forEach((item) => byNumber.set(item.regNumber, item))
        );

        if (hasRounds) {
          for (const [roundKey, numbers] of Object.entries(current.rounds)) {
            let sourceNumbers: string[];

            if (prevWinners.length > 0) {
              sourceNumbers = numbers.filter((n) => prevWinners.includes(n));
            } else {
              sourceNumbers = numbers;
            }

            const items = sourceNumbers
              .filter((num) => byNumber.has(num))
              .map((num) => byNumber.get(num)!);

            out[`${stage}-${roundKey}`] =
              items.length > 0
                ? { items, hasRealRounds: true }
                : { items: "empty", hasRealRounds: true };

            if (
              shouldMarkEmptyNextStages({
                prevWinners,
                itemsLength: items.length,
                nextStage: sortedStages[i + 1],
                roundMap,
                sortedStages,
                currentIndex: i,
              })
            ) {
              emptyNextStages = true;
            }
          }
        } else {
          const items = prevWinners
            .filter((num) => byNumber.has(num))
            .map((num) => byNumber.get(num)!);

          out[`${stage}-all`] =
            items.length > 0
              ? { items, hasRealRounds: false }
              : { items: "empty", hasRealRounds: false };

          if (
            shouldMarkEmptyNextStages({
              prevWinners,
              itemsLength: items.length,
              nextStage: sortedStages[i + 1],
              roundMap,
              sortedStages,
              currentIndex: i,
            })
          ) {
            emptyNextStages = true;
          }
        }

        if (emptyNextStages) {
          for (let j = i + 1; j < sortedStages.length; j++) {
            const nextStage = sortedStages[j];
            const next = roundMap[nextStage];
            const nextHasRounds = Object.keys(next.rounds).length > 0;

            if (nextHasRounds) {
              for (const roundKey of Object.keys(next.rounds)) {
                out[`${nextStage}-${roundKey}`] = {
                  items: "empty",
                  hasRealRounds: true,
                };
              }
            } else {
              out[`${nextStage}-all`] = {
                items: "empty",
                hasRealRounds: false,
              };
            }
          }
          break;
        }

        continue;
      }

      let stageItems: DisplayItem[] = [];
      if (hasRounds) {
        for (const numbers of Object.values(current.rounds)) {
          numbers.forEach((num) => {
            if (
              byNumber.has(num) &&
              !stageItems.find((i) => i.regNumber === num)
            ) {
              stageItems.push(byNumber.get(num)!);
            }
          });
        }
        for (const [roundKey, numbers] of Object.entries(current.rounds)) {
          const items = numbers
            .filter((num) => byNumber.has(num))
            .map((num) => byNumber.get(num)!);

          out[`${stage}-${roundKey}`] =
            items.length > 0
              ? { items, hasRealRounds: true }
              : { items: "empty", hasRealRounds: true };
        }
      } else {
        stageItems = Array.from(byNumber.values());
        out[`${stage}-all`] =
          stageItems.length > 0
            ? { items: stageItems, hasRealRounds: false }
            : { items: "empty", hasRealRounds: false };

        if (stageItems.length === 0) emptyNextStages = true;
      }
    }

    return out;
  }, [roundMap, groupedByPrograms, stageOrder]);

  const groupedByStageForRender = useMemo(() => {
    const out: Record<
      string,
      { key: string; items: DisplayItem[] | "empty"; hasRealRounds: boolean }[]
    > = {};
    Object.entries(groupedByRounds).forEach(([key, value]) => {
      const [stage] = key.split("-");
      if (!out[stage]) out[stage] = [];
      out[stage].push({
        key,
        items: value.items,
        hasRealRounds: value.hasRealRounds,
      });
    });
    return out;
  }, [groupedByRounds]);

  const hasRounds = Object.keys(groupedByRounds).length > 0;

  const programKeys = useMemo(
    () =>
      Object.keys(groupedByPrograms).sort((a, b) =>
        a.localeCompare(b, "uk", { numeric: true })
      ),
    [groupedByPrograms]
  );

  return (
    <div className="w-full max-w-2xl bg-white rounded-4xl shadow-sm border border-zinc-100 p-3 sm:p-8 flex flex-col">
      <div className="text-center py-6 mb-4">
        <h1 className="text-[22px] font-black uppercase tracking-tight text-green-600 leading-tight">
          Відділення {part} <span className="text-zinc-300 mx-1">/</span>{" "}
          <span className="text-zinc-900">
            {formatTournamentTimeOnly(time)}
          </span>
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
                          className={`${
                            crossed ? "line-through opacity-30" : ""
                          } ${
                            item.isPremium ? "text-red-600" : "text-zinc-800"
                          }`}
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
            {Object.entries(groupedByStageForRender)
              .sort(([a], [b]) => {
                const ai = stageOrder.indexOf(a);
                const bi = stageOrder.indexOf(b);
                if (ai === -1 && bi === -1) return a.localeCompare(b);
                if (ai === -1) return 1;
                if (bi === -1) return -1;
                return ai - bi;
              })
              .map(([stage, rounds]) => (
                <tbody key={stage}>
                  <tr>
                    <td
                      colSpan={2}
                      className="py-4 px-3 text-center font-black text-green-600 text-[15px]"
                    >
                      {stage}
                    </td>
                  </tr>

                  {rounds
                    .sort((a, b) =>
                      a.key.endsWith("-all")
                        ? -1
                        : b.key.endsWith("-all")
                        ? 1
                        : 0
                    )
                    .map(({ key, items, hasRealRounds }) => {
                      const [, round] = key.split("-");
                      return (
                        <tr
                          key={key}
                          className="border-b border-zinc-100 last:border-0"
                        >
                          <td className="py-5 px-3 font-bold text-zinc-800 text-[16px]">
                            {hasRealRounds ? `Захід ${round}` : ""}
                          </td>
                          <td className="py-5 px-3">
                            <div className="flex flex-wrap gap-x-3 gap-y-4">
                              {items === "empty" ? (
                                <span className="text-zinc-400 italic">
                                  Замовлень не існує
                                </span>
                              ) : (
                                items.map((item, idx) => {
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
                                          toggleCrossedKey(
                                            prev,
                                            crossKey,
                                            storageKey
                                          )
                                        )
                                      }
                                    >
                                      <span
                                        className={`${
                                          crossed
                                            ? "line-through opacity-30"
                                            : ""
                                        } ${
                                          item.isPremium
                                            ? "text-red-600"
                                            : "text-zinc-800"
                                        }`}
                                      >
                                        {num}
                                      </span>
                                      {idx < items.length - 1 && (
                                        <span className="text-zinc-300 ml-1">
                                          ,
                                        </span>
                                      )}
                                    </span>
                                  );
                                })
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              ))}
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
  const programParam = searchParams.get("program") ?? "";

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
  const [roundsLoading, setRoundsLoading] = useState(false);
  const [roundData, setRoundData] = useState<{
    roundMap: Record<string, StageData>;
    stageOrder: string[];
  }>({ roundMap: {}, stageOrder: [] });

  const finishedRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!eventId || !categoryParam) return;

    fetch(
      `/api/get-participants?event=${eventId}&time=${encodeURIComponent(time)}`
    )
      .then((r) => r.json())
      .then((data) => {
        const filtered: Participant[] = (data.participants ?? []).filter(
          (p: Participant) =>
            p.category.trim() === categoryParam.trim() &&
            p.program.trim() === programParam.trim()
        );
        setParticipants(filtered);
      })
      .catch(() => setParticipants([]));
  }, [eventId, categoryParam, time, programParam]);

  useEffect(() => {
    if (!eventId || !categoryParam || !participants?.length) return;

    finishedRef.current = false;
    const ac = new AbortController();

    const loadRounds = async (withLoading = false) => {
      try {
        if (withLoading) setRoundsLoading(true);

        const res = await fetch(
          `/api/flymark/streamdetails?id=${eventId}` +
            `&categoryName=${encodeURIComponent(categoryParam)}` +
            `&programName=${encodeURIComponent(programParam)}` +
            `&competitionId=${eventId}`,
          { signal: ac.signal }
        );

        const data = await res.json();
        if (ac.signal.aborted) return;

        const qualifications: FlymarkQualification[] =
          data?.details?.Qualifications ?? [];

        const stages: Record<string, StageData> = {};
        for (const q of qualifications) {
          const stageTitle = q?.Title;
          if (!stageTitle) continue;

          const stageRounds: Record<string, string[]> = {};
          for (const r of q?.Rounds ?? []) {
            for (const [roundKey, numbers] of Object.entries(r?.Rounds ?? {})) {
              if (!stageRounds[roundKey]) stageRounds[roundKey] = [];
              stageRounds[roundKey].push(...(numbers as string[]));
            }
          }

          const winners =
            q?.Winners?.map((w: { Number: number }) => String(w.Number)) ?? [];
          stages[stageTitle] = { rounds: stageRounds, winners };
        }

        const participantSet = new Set(participants.map((p) => p.regNumber));
        if (stages["F"]?.winners?.length) {
          finishedRef.current = true;
        } else {
          const hasAnyWinners = Object.values(stages).some(
            (stage) => stage.winners.length > 0
          );

          const hasAnyRelevant = Object.values(stages).some((stage) =>
            stage.winners.some((num) => participantSet.has(num))
          );
          if (hasAnyWinners && !hasAnyRelevant) {
            finishedRef.current = true;
          }
        }

        setRoundData({
          roundMap: stages,
          stageOrder: qualifications.map((q) => q.Title),
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("flymark error:", err);
      } finally {
        if (withLoading && !ac.signal.aborted) setRoundsLoading(false);
      }
    };

    loadRounds(true);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (finishedRef.current) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      loadRounds(false);
    }, 2 * 60 * 1000);

    return () => {
      ac.abort();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [eventId, categoryParam, programParam, participants]);

  if (!participants) {
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
        roundMap={roundData.roundMap}
        roundsLoading={roundsLoading}
        stageOrder={roundData.stageOrder}
      />
    </div>
  );
}

function shouldMarkEmptyNextStages(params: {
  prevWinners: string[];
  itemsLength: number;
  nextStage?: string;
  roundMap: Record<string, StageData>;
  sortedStages: string[];
  currentIndex: number;
}) {
  const { prevWinners, itemsLength, nextStage, roundMap } = params;

  const nextHasRounds =
    nextStage && Object.keys(roundMap[nextStage]?.rounds ?? {}).length > 0;

  const isRealElimination = prevWinners.length > 0 && itemsLength === 0;

  return isRealElimination && !nextHasRounds;
}
