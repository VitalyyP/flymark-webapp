"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEventFromQuery } from "@/hooks/useEventFromQuery";
import { encodeEvent } from "@/utils/eventPayload";

export default function SelectParticipantPage() {
  const router = useRouter();
  const event = useEventFromQuery();

  const [participants, setParticipants] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");

  const eventId = event?.id ?? "";
  const eventName = event?.name ?? "";
  const coverUrl = event?.coverUrl ?? "";

  const normalizeText = (s: string) => s.trim().toLowerCase();

  useEffect(() => {
    if (!eventId) return;

    const loadParticipants = async () => {
      try {
        const res = await fetch(`/api/participants?event=${eventId}`);
        const data = await res.json();

        const rawParticipants: unknown[] = Array.isArray(data) ? data : [];
        const cleaned = rawParticipants.filter(
          (item): item is string => typeof item === "string"
        );

        setParticipants(cleaned);
      } catch {
        setParticipants([]);
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
        .some((part) => part.startsWith(q))
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
        encodedEvent
      )}&participant=${encodeURIComponent(selected)}`
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
                placeholder="Оберіть учасника"
                className="w-full rounded-md border px-4 py-3 text-xl tracking-wider text-gray-900"
              />
              {query && filtered.length > 0 && (
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
              disabled={!selected}
              className="w-full rounded-md bg-green-600 py-3 tracking-wider text-white text-xl hover:bg-green-500 disabled:bg-gray-400"
            >
              Далі
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
