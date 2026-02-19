"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Calendar,
  MapPin,
  ClipboardList,
  RefreshCw,
  Instagram,
} from "lucide-react";

import { formatUaDateFromISO } from "@/utils/formatUaDateFromISO";
import type { Competition } from "@/utils/normalizeCompetition";

type VisibleEventsResponse = {
  ids?: unknown;
};

const BRAND_GREEN = "#00a63e";

function toTrimmedString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

export default function HomePage() {
  const router = useRouter();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);

  const [visibleEvents, setVisibleEvents] = useState<Set<string>>(new Set());
  const [loadingVisible, setLoadingVisible] = useState(true);

  useEffect(() => {
    const ac = new AbortController();

    const load = async () => {
      setLoadingCompetitions(true);
      try {
        const res = await fetch("/api/competitions-opened", {
          cache: "no-store",
          signal: ac.signal,
        });

        if (!res.ok) {
          setCompetitions([]);
          return;
        }

        const data: unknown = await res.json();
        const list: Competition[] = Array.isArray(data)
          ? (data as Competition[])
          : [];

        setCompetitions(list);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Failed to load competitions", err);
        setCompetitions([]);
      } finally {
        setLoadingCompetitions(false);
      }
    };

    void load();
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ac = new AbortController();

    const loadVisible = async () => {
      setLoadingVisible(true);
      try {
        const r = await fetch("/api/visible-events", {
          cache: "no-store",
          signal: ac.signal,
        });

        const data: VisibleEventsResponse = await r.json();

        const raw = data?.ids;
        const ids: string[] = Array.isArray(raw)
          ? raw.map((x) => toTrimmedString(x)).filter(Boolean)
          : [];

        setVisibleEvents(new Set(ids));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setVisibleEvents(new Set());
      } finally {
        setLoadingVisible(false);
      }
    };

    void loadVisible();
    return () => ac.abort();
  }, []);

  const filteredCompetitions = useMemo(() => {
    if (loadingVisible) return [];
    if (visibleEvents.size === 0) return [];
    return competitions.filter((c) =>
      visibleEvents.has(toTrimmedString(c.CompetitionId))
    );
  }, [competitions, visibleEvents, loadingVisible]);

  const isLoading = loadingCompetitions || loadingVisible;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      <header className="w-full pt-12 pb-10 px-4 relative">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <div className="relative mb-4 flex flex-col items-center">
            <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-white mb-4">
              <Image
                src="/aphoto-logo.jpg"
                alt="A-Photo Logo"
                fill
                sizes="(max-width: 768px) 96px, 128px"
                className="object-cover"
                priority
              />
            </div>

            <a
              href="https://www.instagram.com/aphoto2010"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-zinc-100 shadow-sm hover:shadow-md transition-shadow group"
            >
              <Instagram
                size={16}
                className="text-zinc-400 group-hover:text-pink-600 transition-colors"
              />
              <span className="text-sm font-semibold text-zinc-500 group-hover:text-zinc-800">
                @aphoto2010
              </span>
            </a>
          </div>

          <div className="max-w-xl text-center px-2">
            <h1 className="font-century text-lg md:text-xl font-bold leading-snug text-zinc-800 mb-4">
              <span style={{ color: BRAND_GREEN }}>«Афото»</span> репортажна
              фотозйомка виступів спортсменів на танцювальному майданчику.
            </h1>
            <p className="text-sm md:text-base font-medium text-zinc-500">
              Для запису на фото оберіть турнір:
            </p>
            <div className="flex justify-center mt-6">
              <div className="w-12 h-px bg-zinc-200 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4">
        {isLoading && (
          <p className="text-center">
            <span className="text-[14px] font-bold text-blue-500 uppercase animate-pulse flex items-center justify-center gap-1">
              <RefreshCw size={14} className="animate-spin" /> Завантаження...
            </span>
          </p>
        )}

        {!isLoading && visibleEvents.size === 0 && (
          <p className="text-center text-gray-700">
            Наразі немає активних турнірів
          </p>
        )}

        {!isLoading &&
          visibleEvents.size > 0 &&
          filteredCompetitions.length === 0 && (
            <p className="text-center text-gray-700">
              Обрані турніри не знайдені (можливо, вони вже закриті або
              змінились)
            </p>
          )}

        {!isLoading && filteredCompetitions.length > 0 && (
          <ul className="flex flex-col gap-8">
            {filteredCompetitions.map((c) => {
              const id = toTrimmedString(c.CompetitionId);

              return (
                <li
                  key={`${id}-${c.DateTo}-${c.CityName}`}
                  className="group bg-white rounded-[40px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.1)] transition-all duration-500 p-5 md:p-8 border-[1.5px] border-zinc-200"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-8">
                    <div className="relative shrink-0 flex justify-center">
                      <div className="bg-white p-2 rounded-[30px] shadow-xl border border-zinc-100 transition-transform duration-500">
                        <div className="relative w-40 h-40 md:w-44 md:h-44 rounded-[22px] overflow-hidden bg-zinc-50">
                          <Image
                            src={c.CoverPhoto}
                            alt={c.CompetitionName}
                            fill
                            sizes="(max-width: 768px) 160px, 176px"
                            className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col flex-1 text-center md:text-left">
                      <h2 className="text-xl md:text-2xl font-black text-zinc-800 leading-tight mb-4">
                        {c.CompetitionName}
                      </h2>
                      <div className="flex flex-wrap justify-center md:justify-start gap-3">
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl text-zinc-700 font-bold text-sm shadow-md border border-zinc-50">
                          <Calendar size={16} className="text-[#15803d]" />
                          {formatUaDateFromISO(c.DateTo)}
                        </div>
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl text-zinc-700 font-bold text-sm shadow-md border border-zinc-50">
                          <MapPin size={16} className="text-[#15803d]" />
                          {c.CityName}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        router.push(
                          `/select?eventId=${encodeURIComponent(id)}`
                        );
                      }}
                      className="w-full md:w-auto md:min-w-[200px] bg-[#f0fdf4] hover:bg-[#dcfce7] text-[#15803d] py-4 px-10 rounded-3xl font-black text-[15px] flex items-center justify-center gap-3 transition-all border-[1.5px] border-[#16a34a]/40 hover:border-[#16a34a] active:scale-95 shadow-sm uppercase tracking-wide cursor-pointer"
                    >
                      <ClipboardList size={20} className="text-[#16a34a]" />
                      <span>Обрати</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <footer className="w-full pt-10 pb-12 px-4 relative">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <div className="w-12 h-px bg-zinc-200 mb-8 rounded-full" />
          <div className="flex flex-col items-center gap-5">
            <a
              href="https://www.instagram.com/aphoto2010"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-zinc-400 hover:text-pink-600 transition-all duration-300"
            >
              <Instagram size={16} />
              <span className="text-[13px] font-medium tracking-wide">
                @aphoto2010
              </span>
            </a>

            <div className="text-center space-y-1">
              <p className="text-[13px] text-zinc-500 font-medium">
                &copy; 2026 Команда{" "}
                <span className="text-zinc-800">А фото</span>
              </p>
              <p className="text-[11px] text-zinc-400 font-normal flex items-center justify-center gap-2">
                <span className="w-1 h-1 rounded-full bg-green-500/40" />
                професійна репортажна фотозйомка
                <span className="w-1 h-1 rounded-full bg-green-500/40" />
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
