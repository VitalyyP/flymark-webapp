"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Search, User, ArrowRight, RefreshCw } from "lucide-react";

import { encodeEvent } from "@/utils/eventPayload";

type ParticipantOption = {
  id: string;
  name: string;
};

type ParticipantRow = {
  Dancer1Name?: unknown;
  Dancer1Id?: unknown;
  Dancer2Name?: unknown;
  Dancer2Id?: unknown;
};

function toTrimmedString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

function normalizeText(s: string): string {
  return s.trim().toLowerCase();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function rowToOptions(row: unknown): ParticipantOption[] {
  if (!isRecord(row)) return [];

  const r: ParticipantRow = row;

  const d1Name = toTrimmedString(r.Dancer1Name);
  const d1Id = toTrimmedString(r.Dancer1Id);
  const d2Name = toTrimmedString(r.Dancer2Name);
  const d2Id = toTrimmedString(r.Dancer2Id);

  const out: ParticipantOption[] = [];
  if (d1Name && d1Id) out.push({ id: d1Id, name: d1Name });
  if (d2Name && d2Id) out.push({ id: d2Id, name: d2Name });

  return out;
}

type ParticipantsFastOk = {
  ok: true;
  dancers: Array<{
    FirstName?: string;
    LastName?: string;
    Id?: number;
  }>;
};

function isParticipantsFastOk(v: unknown): v is ParticipantsFastOk {
  return isRecord(v) && v.ok === true && Array.isArray(v.dancers);
}

export default function SelectParticipantPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const eventId = (searchParams.get("eventId") ?? "").trim();

  const [eventName, setEventName] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const [participants, setParticipants] = useState<ParticipantOption[]>([]);
  const [query, setQuery] = useState("");
  const [selectedParticipant, setSelectedParticipant] =
    useState<ParticipantOption | null>(null);

  const [loadingEvent, setLoadingEvent] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!eventId) return;

    const run = async () => {
      setLoadingEvent(true);
      try {
        const res = await fetch(
          `/api/event?eventId=${encodeURIComponent(eventId)}`,
          { cache: "no-store" }
        );
        const data = await res.json();

        if (data?.ok) {
          setEventName(data.event.name ?? "");
          setCoverUrl(data.event.coverUrl ?? "");
        }
      } finally {
        setLoadingEvent(false);
      }
    };

    void run();
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;

    const run = async () => {
      const myId = ++requestIdRef.current;

      setLoadingParticipants(true);

      try {
        let options: ParticipantOption[] = [];

        const r1 = await fetch(
          `/api/participants-fast?eventId=${encodeURIComponent(eventId)}`,
          { cache: "no-store" }
        );
        const j1 = await r1.json();

        if (isParticipantsFastOk(j1)) {
          options = j1.dancers
            .map((d) => {
              const id = d.Id != null ? String(d.Id) : "";
              const name = `${d.LastName?.trim() ?? ""} ${
                d.FirstName?.trim() ?? ""
              }`.trim();
              return id && name ? { id, name } : null;
            })
            .filter((x): x is ParticipantOption => x !== null);
        }

        if (options.length === 0) {
          const r2 = await fetch(
            `/api/participants?event=${encodeURIComponent(eventId)}`,
            { cache: "no-store" }
          );
          const j2 = await r2.json();
          const rows: unknown[] = Array.isArray(j2) ? j2 : [];
          options = rows.flatMap(rowToOptions);
        }

        if (myId !== requestIdRef.current) return;

        const uniq = new Map(options.map((o) => [o.id, o]));
        setParticipants([...uniq.values()]);
      } catch (err) {
        console.error(err);
        setParticipants([]);
      } finally {
        if (myId === requestIdRef.current) {
          setLoadingParticipants(false);
        }
      }
    };

    void run();
  }, [eventId]);

  useEffect(() => {
    const match = participants.find(
      (p) => normalizeText(p.name) === normalizeText(query)
    );
    setSelectedParticipant(match ?? null);
  }, [query, participants]);

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return [];
    return participants.filter((p) => normalizeText(p.name).includes(q));
  }, [participants, query]);

  const showCover = Boolean(coverUrl) && !loadingEvent;
  const handleSearch = (value: string) => setQuery(value);
  const handlePick = (p: ParticipantOption) => setQuery(p.name);

  const handleSubmit = () => {
    if (!selectedParticipant || !eventId) return;

    const encoded = encodeEvent({
      id: eventId,
      name: eventName,
      coverUrl,
      participant: selectedParticipant,
    });

    router.push(`/form?event=${encodeURIComponent(encoded)}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 text-zinc-900 font-sans items-center px-4 py-8 md:py-12">
      <main className="w-full max-w-[440px] flex flex-col items-center gap-8 md:gap-10">
        <div className="flex flex-col items-center text-center w-full gap-8">
          <div className="flex flex-col items-center gap-2 w-full">
            <span className="px-3 py-1 bg-zinc-100 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">
              Турнір
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-zinc-800 leading-snug max-w-[260px] pt-1">
              {loadingEvent ? "Завантаження..." : eventName || `ID: ${eventId}`}
            </h2>
          </div>
          <div className="relative w-full max-w-[300px] aspect-video rounded-[22px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-4 border-white bg-white shrink-0">
            {showCover ? (
              <Image
                src={coverUrl}
                alt={eventName || "Event cover"}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-zinc-400 text-sm">
                {loadingEvent ? "..." : "No cover"}
              </div>
            )}
          </div>
        </div>

        <div className="w-full flex flex-col gap-8">
          <div className="space-y-1 text-center">
            <h1 className="font-century text-[28px] md:text-[32px] font-bold text-zinc-900 tracking-tight">
              Запис на фото
            </h1>
            <p className="text-zinc-500 font-medium text-[15px]">
              Введіть прізвище/імʼя спортсмена
            </p>
          </div>

          <div className="flex flex-col gap-6 w-full relative">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 flex flex-row items-center gap-3 z-10 pointer-events-none">
                {loadingParticipants ? (
                  <>
                    <RefreshCw
                      size={18}
                      className="animate-spin text-green-600 shrink-0"
                    />
                    <span className="text-sm font-medium text-green-600 animate-pulse whitespace-nowrap">
                      Зачекайте, підтягуємо дані...
                    </span>
                  </>
                ) : (
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Search
                      size={18}
                      className={`shrink-0 transition-colors duration-300 ${
                        isFocused ? "text-green-600" : "text-zinc-400"
                      }`}
                    />
                    {isFocused && !query && (
                      <span className="text-sm font-bold text-green-600 animate-in slide-in-from-left-2 fade-in duration-300 whitespace-nowrap">
                        Почніть вводити прізвище або імʼя
                      </span>
                    )}
                  </div>
                )}
              </div>

              <input
                id="participant-search"
                name="participantName"
                type="text"
                autoComplete="off"
                value={query}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={
                  !isFocused && !loadingParticipants ? "Оберіть учасника" : ""
                }
                disabled={loadingParticipants}
                className={`w-full bg-white border rounded-2xl py-4 pl-11 pr-5 text-[16px] font-medium text-zinc-800 transition-all shadow-sm outline-none ${
                  isFocused
                    ? "border-green-600/50 ring-4 ring-green-600/5"
                    : "border-zinc-200"
                } disabled:bg-zinc-100 disabled:cursor-not-allowed`}
              />

              {query && filtered.length > 0 && !loadingParticipants && (
                <ul className="absolute bottom-full left-0 right-0 mb-3 z-50 bg-white border border-zinc-100 rounded-2xl shadow-[0_-15px_40px_-10px_rgba(0,0,0,0.15)] p-1.5 max-h-[280px] overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
                  {filtered.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => handlePick(p)}
                      title={p.id}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer rounded-xl hover:bg-green-50 transition-all group"
                    >
                      <User
                        size={16}
                        className="text-zinc-300 group-hover:text-green-600"
                      />
                      <span className="font-semibold text-sm text-zinc-700 group-hover:text-green-900">
                        {p.name}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!selectedParticipant || loadingParticipants}
              className={`w-full py-4 rounded-2xl font-semibold text-[17px] flex items-center justify-center gap-3 transition-all shadow-lg active:scale-[0.98] ${
                selectedParticipant
                  ? "bg-green-600 text-white hover:bg-green-700 active:scale-95 cursor-pointer"
                  : "bg-zinc-300 text-white cursor-not-allowed shadow-none"
              }`}
            >
              <span>Продовжити</span>
              <div
                className={`transition-transform duration-300 ${
                  selectedParticipant ? "translate-x-1" : ""
                }`}
              >
                <ArrowRight size={20} className="text-white" />
              </div>
            </button>
          </div>
        </div>
      </main>

      <footer className="w-full mt-auto pt-12 flex flex-col items-center">
        <div className="relative w-30 h-30">
          <Image
            src="/ok-aphoto.png"
            alt="A Фото"
            fill
            sizes="120px"
            className="object-contain"
          />
        </div>
      </footer>
    </div>
  );
}
