"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEventFromQuery } from "@/hooks/useEventFromQuery";
import { encodeEvent } from "@/utils/eventPayload";

interface ParticipantData {
  Dancer1Name?: string;
  Dancer2Name?: string;
}

export default function SelectParticipantPage() {
  const router = useRouter();
  const event = useEventFromQuery();

  const [participants, setParticipants] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const eventId = event?.id ?? "";
  const eventName = event?.name ?? "";
  const coverUrl = event?.coverUrl ?? "";

  const normalizeText = (s: string) => s.trim().toLowerCase();

  useEffect(() => {
    if (!eventId) return;

    const loadParticipants = async () => {
      setLoadingParticipants(true);
      try {
        const res = await fetch(`/api/participants?event=${eventId}`);
        const data = await res.json();

        const rawParticipants: unknown[] = Array.isArray(data) ? data : [];

        const cleaned = Array.from(
          new Set(
            rawParticipants.flatMap((item) => {
              if (typeof item !== "object" || item === null) return [];
              const p = item as ParticipantData;
              const names: string[] = [];
              if (p.Dancer1Name) names.push(p.Dancer1Name);
              if (p.Dancer2Name) names.push(p.Dancer2Name);
              return names;
            }),
          ),
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

    return participants.filter((name) =>
      normalizeText(name)
        .split(" ")
        .some((part) => part.startsWith(q)),
    );
  }, [participants, query]);

  const handleSearch = (value: string) => {
    setQuery(value);
    setSelected("");
  };

  const handleSubmit = () => {
    if (!selected || !event) return;

    const encodedEvent = encodeEvent({
      id: event.id,
      name: event.name,
      coverUrl: event.coverUrl,
    });

    router.push(
      `/form?event=${encodeURIComponent(
        encodedEvent,
      )}&participant=${encodeURIComponent(selected)}`,
    );
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
                      key={p}
                      onClick={() => {
                        setSelected(p);
                        setQuery(p);
                      }}
                      className="px-4 py-2 cursor-pointer text-gray-900 hover:bg-gray-100"
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!selected || loadingParticipants}
              className="w-full rounded-md bg-green-600 py-3 tracking-wider text-white text-xl hover:bg-green-500 disabled:bg-gray-400 cursor-pointer"
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
