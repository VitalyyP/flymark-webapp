"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Copy } from "lucide-react";
import { CustomCheckbox } from "@/components/CustomCheckbox";
import { formatUaDateFromISO } from "@/utils/formatUaDateFromISO";
import {
  Competition,
  normalizeCompetition,
  RawCompetition,
} from "@/utils/normalizeCompetition";

type VisibleEventsResponse = {
  ids?: unknown;
};

type ResolveRegnumbersOk = {
  ok: true;
  updated: number;
  tried: number;
  checked: number;
  errors?: Array<{ name: string; reason: string }>;
};

type ResolveRegnumbersErr = {
  ok: false;
  error: string;
  details?: unknown;
};

type ResolveRegnumbersResponse = ResolveRegnumbersOk | ResolveRegnumbersErr;

const CITIES_IDS: number[] =
  process.env.NEXT_PUBLIC_CITIES_IDS?.split(",")
    .map((id) => Number(id.trim()))
    .filter(Boolean) ?? [];

export default function HomePage() {
  const router = useRouter();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState<string | null>(null);

  const [hiddenEvents, setHiddenEvents] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("hiddenEvents");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [hideMarked, setHideMarked] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("hideMarked") === "true";
  });

  const [visibleEvents, setVisibleEvents] = useState<Set<string>>(new Set());
  const [visibleLoading, setVisibleLoading] = useState(true);

  const [savingCount, setSavingCount] = useState(0);

  const [findingId, setFindingId] = useState<string | null>(null);

  const [findUi, setFindUi] = useState<
    Record<
      string,
      {
        statusText: string | null;
        foundCount: number | null;
        findError: string | null;
      }
    >
  >({});

  const encodeEvent = (event: { id: string; name: string; coverUrl: string }) =>
    btoa(unescape(encodeURIComponent(JSON.stringify(event))));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const results: Competition[] = [];

      try {
        for (const cityId of CITIES_IDS) {
          const res = await fetch("/api/flymark/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cityId,
              countryId: 1,
              organisationId: "",
              from: "",
              to: "",
              page: 1,
              type: "Opened",
            }),
          });

          if (!res.ok) continue;

          const data: unknown = await res.json();
          const list: Competition[] = Array.isArray(data)
            ? (data as RawCompetition[])
                .map(normalizeCompetition)
                .filter((x): x is Competition => x !== null)
            : [];

          list.forEach((c) => {
            c.CompetitionId = String(
              (c as unknown as { CompetitionId: unknown }).CompetitionId
            ).trim();
            c.CityName = String(
              (c as unknown as { CityName?: unknown }).CityName ?? ""
            ).trim();
          });

          results.push(...list);
        }

        results.sort((a, b) => {
          return new Date(a.DateTo).getTime() - new Date(b.DateTo).getTime();
        });

        setCompetitions(results);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "hiddenEvents",
      JSON.stringify(Array.from(hiddenEvents))
    );
  }, [hiddenEvents]);

  useEffect(() => {
    localStorage.setItem("hideMarked", String(hideMarked));
  }, [hideMarked]);

  const loadVisibleEvents = async () => {
    setVisibleLoading(true);
    try {
      const res = await fetch("/api/visible-events", { cache: "no-store" });
      const data: VisibleEventsResponse = await res.json();

      const idsRaw = data?.ids;
      const ids: string[] = Array.isArray(idsRaw)
        ? idsRaw
            .map((x) =>
              typeof x === "string"
                ? x.trim()
                : typeof x === "number"
                ? String(x)
                : ""
            )
            .filter(Boolean)
        : [];

      setVisibleEvents(new Set(ids));
    } catch {
      setVisibleEvents(new Set());
    } finally {
      setVisibleLoading(false);
    }
  };

  useEffect(() => {
    void loadVisibleEvents();
  }, []);

  const copyLink = (path: string, id: string) => {
    const link = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(link);
    setTooltipVisible(id);
    setTimeout(() => setTooltipVisible(null), 1500);
  };

  const toggleHidden = (competitionId: string) => {
    setHiddenEvents((prev) => {
      const next = new Set(prev);
      if (next.has(competitionId)) next.delete(competitionId);
      else next.add(competitionId);
      return next;
    });
  };

  const persistVisibleEvents = async (next: Set<string>) => {
    setSavingCount((c) => c + 1);
    try {
      const res = await fetch("/api/visible-events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(next) }),
      });

      if (res.status === 401) {
        alert(
          "Сесія адміністратора закінчилась. Онови сторінку і введи пароль."
        );
        return;
      }

      if (!res.ok) {
        alert("Не вдалося зберегти. Спробуй ще раз.");
        return;
      }

      await loadVisibleEvents();
    } catch {
      alert("Не вдалося зберегти. Спробуй ще раз.");
    } finally {
      setSavingCount((c) => Math.max(0, c - 1));
    }
  };

  const toggleVisible = (competitionId: string) => {
    setVisibleEvents((prev) => {
      const next = new Set(prev);
      if (next.has(competitionId)) next.delete(competitionId);
      else next.add(competitionId);

      void persistVisibleEvents(next);

      return next;
    });
  };

  const handleLogout = async () => {
    try {
      await fetch("/admin/logout", { cache: "no-store" });
    } finally {
      window.location.href = "/admin";
    }
  };

  const handleFindNumbers = async (competitionId: string) => {
    if (findingId) return;

    setFindUi((prev) => ({
      ...prev,
      [competitionId]: {
        statusText: "Шукаю рядки з «Не знаю»…",
        foundCount: null,
        findError: null,
      },
    }));

    setFindingId(competitionId);

    try {
      setFindUi((prev) => ({
        ...prev,
        [competitionId]: {
          ...(prev[competitionId] ?? {
            statusText: null,
            foundCount: null,
            findError: null,
          }),
          statusText: "Зчитую Google таблицю…",
        },
      }));

      const res = await fetch(
        `/api/google/resolve-regnumbers?eventId=${encodeURIComponent(
          competitionId
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }
      );

      setFindUi((prev) => ({
        ...prev,
        [competitionId]: {
          ...(prev[competitionId] ?? {
            statusText: null,
            foundCount: null,
            findError: null,
          }),
          statusText: "Обробляю учасників…",
        },
      }));

      const data = (await res.json()) as ResolveRegnumbersResponse;

      if (!data.ok) {
        setFindUi((prev) => ({
          ...prev,
          [competitionId]: {
            ...(prev[competitionId] ?? {
              statusText: null,
              foundCount: null,
              findError: null,
            }),
            statusText: null,
            findError: data.error || "Помилка запиту",
          },
        }));
        return;
      }

      setFindUi((prev) => ({
        ...prev,
        [competitionId]: {
          statusText: null,
          foundCount: data.updated,
          findError: data.errors?.length
            ? `Не вдалося знайти номер для ${data.errors.length} учасників`
            : null,
        },
      }));

      setTimeout(() => {
        setFindUi((prev) => {
          const cur = prev[competitionId];
          if (!cur) return prev;

          return {
            ...prev,
            [competitionId]: {
              ...cur,
              foundCount: null,
            },
          };
        });
      }, 10000);
    } catch (e) {
      setFindUi((prev) => ({
        ...prev,
        [competitionId]: {
          ...(prev[competitionId] ?? {
            statusText: null,
            foundCount: null,
            findError: null,
          }),
          statusText: null,
          findError: e instanceof Error ? e.message : "Невідома помилка",
        },
      }));
    } finally {
      setFindingId(null);
    }
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-100 p-6">
      <main className="w-full max-w-5xl bg-white p-8 rounded-xl shadow flex flex-col gap-6">
        <h1 className="text-2xl text-black text-center">Перелік змагань</h1>

        {loading && (
          <p className="text-center text-gray-700">Завантаження...</p>
        )}

        {!loading && competitions.length > 0 && (
          <>
            <div className="flex justify-end items-center gap-3">
              {savingCount > 0 && (
                <span className="text-sm text-gray-500">Збереження…</span>
              )}

              {visibleLoading && (
                <span className="text-sm text-gray-500">Синхронізація…</span>
              )}

              <button
                onClick={() => void handleLogout()}
                className="rounded-md bg-gray-200 px-3 py-2 text-sm hover:bg-gray-300 text-gray-700"
              >
                Вийти
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 mb-4">
              <CustomCheckbox
                checked={hideMarked}
                onChange={() => setHideMarked((v) => !v)}
              />
              <span className="text-gray-700">Ховати позначені події</span>
            </div>

            <ul className="space-y-4">
              {competitions
                .filter(
                  (c) =>
                    !(
                      hideMarked &&
                      hiddenEvents.has(String(c.CompetitionId).trim())
                    )
                )
                .map((c) => {
                  const id = String(c.CompetitionId).trim();
                  const ui = findUi[id];
                  const isFindingThis = findingId === id;

                  const buttonLabel = isFindingThis
                    ? ui?.statusText || "Шукаю..."
                    : ui?.foundCount !== null && ui?.foundCount !== undefined
                    ? `Оновлено номерів: ${ui.foundCount}`
                    : "Оновити номери";

                  return (
                    <li
                      key={`${id}-${c.DateTo}-${c.CityName}`}
                      className={`p-4 border rounded-lg shadow-sm flex flex-col md:flex-row gap-2 md:gap-4 items-start md:items-center transition-opacity ${
                        hiddenEvents.has(id) ? "opacity-50" : "opacity-100"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                          <CustomCheckbox
                            checked={visibleEvents.has(id)}
                            onChange={() => toggleVisible(id)}
                            disabled={visibleLoading || savingCount > 0}
                          />
                          <span className="text-gray-700 text-sm">
                            Показувати
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <CustomCheckbox
                            checked={hiddenEvents.has(id)}
                            onChange={() => toggleHidden(id)}
                          />
                          <span className="text-gray-700 text-sm">
                            Приховати
                          </span>
                        </div>
                      </div>

                      <Image
                        src={c.CoverPhoto}
                        alt={c.CompetitionName}
                        width={60}
                        height={90}
                        className="rounded-lg object-cover"
                        priority
                      />

                      <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                        <span className="font-semibold text-gray-900 truncate">
                          {c.CompetitionName}
                        </span>
                        <span className="text-gray-700">
                          {formatUaDateFromISO(c.DateTo)}
                        </span>
                        <span className="text-gray-500">{c.CityName}</span>
                      </div>

                      <div>
                        <a
                          href={`/api/sheet-link?id=${encodeURIComponent(id)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                          title={`Відкрити аркуш ${id}/B`}
                        >
                          {id}
                        </a>
                      </div>

                      <div className="flex flex-col gap-2 w-fit">
                        <div className="flex flex-col md:flex-row gap-2">
                          <div className="relative flex items-center gap-2">
                            <button
                              onClick={() => {
                                const payload = encodeEvent({
                                  id,
                                  name: c.CompetitionName,
                                  coverUrl: c.CoverPhoto,
                                });
                                router.push(`/select?event=${payload}`);
                              }}
                              className="bg-green-600 hover:bg-green-500 text-white py-1.5 px-3 text-sm rounded-md"
                            >
                              Замовити
                            </button>

                            <Copy
                              className="w-5 h-5 text-gray-500 hover:text-black cursor-pointer"
                              onClick={() =>
                                copyLink(`/select?event=${id}`, `${id}-select`)
                              }
                            />

                            {tooltipVisible === `${id}-select` && (
                              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                Скопійовано!
                              </span>
                            )}
                          </div>

                          <div className="relative flex items-center gap-2">
                            <button
                              onClick={() => {
                                const payload = encodeEvent({
                                  id,
                                  name: c.CompetitionName,
                                  coverUrl: c.CoverPhoto,
                                });
                                router.push(`/parts?event=${payload}`);
                              }}
                              className="bg-green-600 hover:bg-green-500 text-white py-1.5 px-3 text-sm rounded-md"
                            >
                              Виконати
                            </button>

                            <Copy
                              className="w-5 h-5 text-gray-500 hover:text-black cursor-pointer"
                              onClick={() =>
                                copyLink(`/parts?event=${id}`, `${id}-parts`)
                              }
                            />

                            {tooltipVisible === `${id}-parts` && (
                              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                Скопійовано!
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleFindNumbers(id)}
                          disabled={Boolean(findingId)}
                          className="bg-green-600 hover:bg-green-500 disabled:bg-gray-400 text-white py-1.5 text-sm rounded-md w-full whitespace-nowrap"
                        >
                          {buttonLabel}
                        </button>

                        {ui?.findError && (
                          <div className="text-sm text-red-600 mt-1">
                            {ui.findError}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
