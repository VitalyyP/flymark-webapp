"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEventFromQuery } from "@/hooks/useEventFromQuery";
import { encodeEvent } from "@/utils/eventPayload";

export default function SelectParticipantPage() {
  const router = useRouter();
  const event = useEventFromQuery();

  const [participants, setParticipants] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");

  const eventId = event?.id ?? "";
  const eventName = event?.name ?? "";
  const coverUrl = event?.coverUrl ?? "";

  useEffect(() => {
    if (!eventId) return;

    const load = async () => {
      const res = await fetch(`/api/participants?event=${eventId}`);
      const data = await res.json();

      const cleaned = (data || []).filter(
        (item: unknown): item is string => typeof item === "string"
      );

      setParticipants(cleaned);
      setFiltered(cleaned);
    };

    load();
  }, [eventId]);

  const handleSearch = (value: string) => {
    setQuery(value);
    setFiltered(
      participants.filter((name) =>
        name.toLowerCase().includes(value.toLowerCase())
      )
    );
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
      <main className="w-full max-w-lg bg-white p-8 rounded-xl shadow flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Image
            src={coverUrl}
            alt={eventName}
            width={60}
            height={90}
            className="rounded-lg object-cover flex-shrink-0"
            priority
          />
          <span className="font-semibold text-gray-900 truncate">
            {eventName}
          </span>
        </div>

        <h1 className="text-2xl font-semibold text-black text-center">
          Виберіть учасника
        </h1>

        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Введіть ім’я учасника"
            className="w-full rounded-md border px-4 py-3 text-lg text-gray-900"
          />

          {query.length > 0 && filtered.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border rounded-md mt-1 shadow max-h-64 overflow-y-auto">
              {filtered.map((p) => (
                <li
                  key={p}
                  onClick={() => {
                    setSelected(p);
                    setQuery(p);
                    setFiltered([]);
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
          className="w-full rounded-md bg-green-600 py-3 text-white text-lg hover:bg-green-500 disabled:bg-gray-400"
        >
          Відправити
        </button>
      </main>
    </div>
  );
}
