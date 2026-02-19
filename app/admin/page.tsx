"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Copy,
  Eye,
  EyeOff,
  Coffee,
  RefreshCw,
  ClipboardList,
  Camera,
  ExternalLink,
  LogOut,
  Check,
} from "lucide-react";
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

  const [mounted, setMounted] = useState(false);
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

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const copyToClipboard = async (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  };

  const copyLink = async (absoluteUrlOrPath: string, tooltipId: string) => {
    const url = absoluteUrlOrPath.startsWith("http")
      ? absoluteUrlOrPath
      : `${window.location.origin}${absoluteUrlOrPath}`;

    try {
      await copyToClipboard(url);
      setTooltipVisible(tooltipId);
      setTimeout(() => setTooltipVisible(null), 1500);
    } catch {
      setTooltipVisible(null);
    }
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

  const handleLogout = () => {
    window.location.href = "/admin/logout?next=/admin/login";
  };

  const safeReadJson = async <T,>(res: Response): Promise<T | null> => {
    try {
      const text = await res.text();
      if (!text) return null;
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  };

  const safeReadText = async (res: Response): Promise<string> => {
    try {
      return await res.text();
    } catch {
      return "";
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

      const resolveRes = await fetch(
        `/api/google/resolve-regnumbers?eventId=${encodeURIComponent(
          competitionId
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }
      );

      if (resolveRes.status === 401) {
        setFindUi((prev) => ({
          ...prev,
          [competitionId]: {
            ...(prev[competitionId] ?? {
              statusText: null,
              foundCount: null,
              findError: null,
            }),
            statusText: null,
            findError:
              "Сесія адміністратора закінчилась. Онови сторінку і введи пароль.",
          },
        }));
        return;
      }

      const resolveData =
        (await safeReadJson<ResolveRegnumbersResponse>(resolveRes)) ??
        ({
          ok: false,
          error: "Сервер повернув некоректну відповідь",
        } as ResolveRegnumbersErr);

      if (!resolveRes.ok) {
        const fallbackText = await safeReadText(resolveRes);
        const msg =
          (resolveData as ResolveRegnumbersErr)?.error ||
          fallbackText ||
          `Помилка запиту (${resolveRes.status})`;

        setFindUi((prev) => ({
          ...prev,
          [competitionId]: {
            ...(prev[competitionId] ?? {
              statusText: null,
              foundCount: null,
              findError: null,
            }),
            statusText: null,
            findError: msg,
          },
        }));
        return;
      }

      if (!resolveData.ok) {
        setFindUi((prev) => ({
          ...prev,
          [competitionId]: {
            ...(prev[competitionId] ?? {
              statusText: null,
              foundCount: null,
              findError: null,
            }),
            statusText: null,
            findError: resolveData.error || "Помилка запиту",
          },
        }));
        return;
      }

      setFindUi((prev) => ({
        ...prev,
        [competitionId]: {
          ...(prev[competitionId] ?? {
            statusText: null,
            foundCount: null,
            findError: null,
          }),
          statusText: "Оновлюю кеш учасників…",
        },
      }));

      const refreshRes = await fetch(
        `/api/google/refresh-participant-data?eventId=${encodeURIComponent(
          competitionId
        )}`,
        {
          method: "POST",
          cache: "no-store",
        }
      );

      if (!refreshRes.ok) {
        const refreshText = await safeReadText(refreshRes);
        setFindUi((prev) => ({
          ...prev,
          [competitionId]: {
            ...(prev[competitionId] ?? {
              statusText: null,
              foundCount: null,
              findError: null,
            }),
            statusText: null,
            findError:
              refreshText ||
              `Resolve ок, але refresh впав (${refreshRes.status})`,
          },
        }));
        return;
      }

      setFindUi((prev) => ({
        ...prev,
        [competitionId]: {
          statusText: null,
          foundCount: resolveData.updated,
          findError: resolveData.errors?.length
            ? `Не вдалося знайти номер для ${resolveData.errors.length} учасників`
            : null,
        },
      }));

      setTimeout(() => {
        setFindUi((prev) => {
          const cur = prev[competitionId];
          if (!cur) return prev;
          return {
            ...prev,
            [competitionId]: { ...cur, foundCount: null },
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
    <div className="flex min-h-screen items-start justify-center bg-zinc-50 p-4 md:p-8 text-zinc-900">
      <main className="w-full max-w-2xl flex flex-col gap-4">
        <div className="flex flex-col gap-4 bg-white p-5 rounded-4xl shadow-sm border border-zinc-200">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-extrabold tracking-tight">
              Керування змаганнями
            </h1>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setHideMarked(!hideMarked)}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all border flex items-start sm:items-center gap-2 text-left cursor-pointer ${
                  hideMarked
                    ? "bg-blue-50 border-blue-200 text-blue-600 shadow-sm"
                    : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400"
                }`}
              >
                <div className="shrink-0">
                  {hideMarked ? <Eye size={14} /> : <EyeOff size={14} />}
                </div>

                <span className="leading-tight">
                  {hideMarked ? "Показати всі" : "Сховати позначені"}
                </span>
              </button>

              <button
                onClick={() => void handleLogout()}
                className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 cursor-pointer"
                title="Вийти"
              >
                <LogOut size={22} />
              </button>
            </div>
          </div>
        </div>

        <div className="px-2 min-h-3.5">
          {(savingCount > 0 || visibleLoading) && (
            <span className="text-[10px] font-bold text-blue-500 uppercase animate-pulse flex items-center gap-1">
              <RefreshCw size={10} className="animate-spin" /> Синхронізація...
            </span>
          )}
        </div>

        {loading && (
          <p className="text-center text-gray-700">Завантаження списку...</p>
        )}

        {!loading && competitions.length > 0 && (
          <>
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

                  const isVisible = visibleEvents.has(id);
                  const isHiddenFromAdmin = hiddenEvents.has(id);

                  const selectPath = `/select?eventId=${encodeURIComponent(
                    id
                  )}`;
                  const partsPath = `/parts?eventId=${encodeURIComponent(id)}`;

                  return (
                    <li
                      key={id}
                      className={`bg-white border-[1.5px] rounded-4xl p-5 shadow-sm transition-all duration-300 ${
                        isHiddenFromAdmin
                          ? "opacity-50 grayscale bg-zinc-50 scale-[0.98] border-zinc-200"
                          : "border-zinc-200 hover:border-zinc-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-5 pb-3 border-b border-zinc-200">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${
                              isVisible
                                ? "bg-green-500 animate-pulse"
                                : "bg-zinc-300"
                            }`}
                          />
                          <span
                            className={`text-[10px] font-black uppercase ${
                              isVisible ? "text-green-600" : "text-zinc-400"
                            }`}
                          >
                            {isVisible ? "On" : "Off"}
                          </span>
                        </div>

                        <button
                          onClick={() => toggleVisible(id)}
                          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all border ${
                            isVisible
                              ? "bg-green-50 border-green-200 text-green-700 shadow-sm"
                              : "bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300"
                          }`}
                        >
                          {isVisible ? (
                            <Eye size={16} strokeWidth={2.5} />
                          ) : (
                            <EyeOff size={16} />
                          )}
                          <span className="text-[11px] font-bold cursor-pointer">
                            {isVisible ? "Опубліковано" : "Опублікувати"}
                          </span>
                        </button>
                      </div>

                      <div className="flex gap-4 mb-5">
                        <div className="relative w-20 h-20 rounded-[20px] overflow-hidden shadow-inner bg-zinc-100 shrink-0 border border-zinc-200">
                          <Image
                            src={c.CoverPhoto}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0 justify-center">
                          <h2 className="font-extrabold text-zinc-900 text-base md:text-xl leading-snug truncate">
                            {c.CompetitionName}
                          </h2>
                          <span className="text-[13px] font-semibold text-zinc-500 mt-1">
                            {formatUaDateFromISO(c.DateTo)} • {c.CityName}
                          </span>

                          <div className="flex flex-col md:flex-row md:items-center items-start gap-2 mt-2.5">
                            <a
                              href={`/api/sheet-link?id=${id}`}
                              target="_blank"
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-[11px] font-black text-blue-700 hover:bg-blue-100 transition-colors uppercase border border-blue-100"
                            >
                              ID: {id} <ExternalLink size={12} />
                            </a>

                            <button
                              onClick={() => handleFindNumbers(id)}
                              disabled={Boolean(findingId)}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-green-50 text-[11px] font-black text-green-700 hover:bg-green-100 disabled:bg-zinc-50 disabled:text-zinc-400 transition-all border border-green-100 cursor-pointer"
                            >
                              <RefreshCw
                                size={12}
                                className={
                                  findingId === id ? "animate-spin" : ""
                                }
                              />
                              <span>
                                {findingId === id
                                  ? ui?.statusText
                                  : ui?.foundCount !== null &&
                                      ui?.foundCount !== undefined
                                    ? `Оновлено: ${ui.foundCount}`
                                    : "Оновити Google"}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        <div className="relative group">
                          <button
                            onClick={() => router.push(selectPath)}
                            className="w-full flex items-center justify-center gap-3 py-4 pl-4 pr-12 bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-2xl hover:bg-zinc-100 hover:border-zinc-300 transition-all active:scale-[0.98]"
                          >
                            <ClipboardList
                              size={20}
                              className="text-blue-500 shrink-0"
                            />
                            <span className="text-sm font-extrabold text-center leading-tight cursor-pointer">
                              Форма замовлення
                            </span>
                          </button>
                          <button
                            onClick={() =>
                              void copyLink(selectPath, `${id}-select`)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-blue-500 hover:text-blue-700 transition-colors cursor-copy"
                          >
                            {tooltipVisible === `${id}-select` ? (
                              <Check size={20} className="text-green-600" />
                            ) : (
                              <Copy size={20} />
                            )}
                          </button>
                        </div>

                        <div className="relative group">
                          <button
                            onClick={() => router.push(partsPath)}
                            className="w-full flex items-center justify-center gap-3 py-4 pl-4 pr-12 bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-2xl hover:bg-zinc-100 hover:border-zinc-300 transition-all active:scale-[0.98] cursor-pointer"
                          >
                            <Camera
                              size={20}
                              className="text-purple-500 shrink-0"
                            />
                            <span className="text-sm font-extrabold text-center leading-tight">
                              Список фотографа
                            </span>
                          </button>
                          <button
                            onClick={() =>
                              void copyLink(partsPath, `${id}-parts`)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-blue-500 hover:text-blue-700 transition-colors cursor-copy"
                          >
                            {tooltipVisible === `${id}-parts` ? (
                              <Check size={20} className="text-green-600" />
                            ) : (
                              <Copy size={20} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-zinc-200 flex justify-between items-center">
                        <div className="flex-1">
                          {ui?.findError && (
                            <span className="text-[10px] font-bold text-red-500 uppercase">
                              {ui.findError}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => toggleHidden(id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                            isHiddenFromAdmin
                              ? "bg-zinc-900 text-white shadow-lg"
                              : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 border border-transparent"
                          }`}
                        >
                          <Coffee size={14} />
                          <span className="text-[11px] font-bold">
                            {isHiddenFromAdmin
                              ? "Повернути"
                              : "Не планую працювати"}
                          </span>
                        </button>
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
