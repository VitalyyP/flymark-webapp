"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEventFromQuery } from "@/hooks/useEventFromQuery";
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

  const r = row as ParticipantRow;

  const d1Name = toTrimmedString(r.Dancer1Name);
  const d1Id = toTrimmedString(r.Dancer1Id);

  const d2Name = toTrimmedString(r.Dancer2Name);
  const d2Id = toTrimmedString(r.Dancer2Id);

  const out: ParticipantOption[] = [];

  if (d1Name && d1Id) out.push({ id: d1Id, name: d1Name });
  if (d2Name && d2Id) out.push({ id: d2Id, name: d2Name });

  return out;
}

export default function SelectParticipantPage() {
  const router = useRouter();
  const event = useEventFromQuery();

  const [participants, setParticipants] = useState<ParticipantOption[]>([]);
  const [query, setQuery] = useState("");
  const [selectedParticipant, setSelectedParticipant] =
    useState<ParticipantOption | null>(null);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const eventId = event?.id ?? "";
  const eventName = event?.name ?? "";
  const coverUrl = event?.coverUrl ?? "";

  useEffect(() => {
    if (!eventId) return;

    const loadParticipants = async () => {
      setLoadingParticipants(true);
      try {
        const res = await fetch(`/api/participants?event=${eventId}`);
        const data: unknown = await res.json();

        const rows: unknown[] = Array.isArray(data) ? data : [];
        const options = rows.flatMap(rowToOptions);

        const uniq = new Map<string, ParticipantOption>();
        for (const opt of options) {
          if (!uniq.has(opt.id)) uniq.set(opt.id, opt);
        }

        const cleaned = Array.from(uniq.values()).sort((a, b) =>
          a.name.localeCompare(b.name, "uk", { numeric: true })
        );

        setParticipants(cleaned);
      } catch (err) {
        console.error("Failed to load participants", err);
        setParticipants([]);
      } finally {
        setLoadingParticipants(false);
      }
    };

    loadParticipants();
  }, [eventId]);

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return [];

    return participants.filter((p) =>
      normalizeText(p.name)
        .split(" ")
        .some((part) => part.startsWith(q))
    );
  }, [participants, query]);

  const handleSearch = (value: string) => {
    setQuery(value);
    setSelectedParticipant(null);
  };

  const handlePick = (p: ParticipantOption) => {
    setSelectedParticipant(p);
    setQuery(p.name);
  };

  const handleSubmit = () => {
    if (!selectedParticipant || !event) return;

    const encoded = encodeEvent({
      id: event.id,
      name: event.name,
      coverUrl: event.coverUrl,
      participant: {
        id: selectedParticipant.id,
        name: selectedParticipant.name,
      },
    });

    router.push(`/form?event=${encodeURIComponent(encoded)}`);
  };

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-600">Подію не знайдено</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
      <main className="w-full max-w-lg bg-white p-8 rounded-xl shadow flex flex-col items-center gap-12">
        <div className="flex flex-col items-center gap-31">
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
          <span className="text-3xl tracking-wider text-gray-900 text-center break-words line-clamp-2 max-w-full">
            {eventName}
          </span>
        </div>

        <div className="flex flex-col gap-8 w-full">
          <h1 className="text-2xl tracking-wider text-black text-center">
            Запис на фото
          </h1>
          <span className="text-xl tracking-wider text-black">
            Введіть прізвище/імʼя спортсмена (-ів)
          </span>

          <div className="flex flex-col gap-6 w-full">
            <div className="relative w-full">
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={loadingParticipants ? "" : "Оберіть учасника"}
                className="w-full rounded-md border px-4 py-3 text-xl tracking-wider text-gray-900"
                disabled={loadingParticipants}
              />

              {loadingParticipants && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-400 animate-loadingDot" />
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-400 animate-loadingDot animation-delay-150" />
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-400 animate-loadingDot animation-delay-300" />
                  </div>
                </div>
              )}

              {query && filtered.length > 0 && !loadingParticipants && (
                <ul className="absolute top-full left-0 z-20 mt-1 w-full bg-white border rounded-md shadow max-h-64 overflow-y-auto">
                  {filtered.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => handlePick(p)}
                      className="px-4 py-2 cursor-pointer text-gray-900 hover:bg-gray-100"
                      title={p.id}
                    >
                      {p.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!selectedParticipant || loadingParticipants}
              className="w-full rounded-md bg-green-600 py-3 tracking-wider text-white text-xl hover:bg-green-500 disabled:bg-gray-400"
            >
              Далі
            </button>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes loadingDot {
          0% {
            opacity: 0.25;
            transform: scale(0.55);
          }
          35% {
            opacity: 1;
            transform: scale(1);
          }
          70% {
            opacity: 0.25;
            transform: scale(0.55);
          }
          100% {
            opacity: 0.25;
            transform: scale(0.55);
          }
        }
        .animate-loadingDot {
          animation: loadingDot 0.9s infinite ease-in-out;
        }
        .animation-delay-150 {
          animation-delay: 0.15s;
        }
        .animation-delay-300 {
          animation-delay: 0.3s;
        }
      `}</style>
    </div>
  );
}
