import { ParticipantForm, ResultItem } from "./ParticipantForm";
import { decodeEvent } from "@/utils/eventPayload";

type SearchParams = {
  event?: string;
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  const encodedEvent = params.event ?? "";
  const event = decodeEvent(encodedEvent);

  const participant = event?.participant ?? null;

  if (!event || !participant?.id || !participant?.name) {
    return <div>Некоректні параметри</div>;
  }

  let results: ResultItem[] = [];

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/get-participant?event=${
        event.id
      }&id=${encodeURIComponent(participant.id)}`,
      { cache: "no-store" }
    );

    if (!res.ok) throw new Error("Failed to fetch participant");

    const raw: unknown = await res.json();
    results = Array.isArray(raw) ? (raw as ResultItem[]) : [];
  } catch (err: unknown) {
    console.error("Помилка завантаження учасників:", err);
    return <div>Помилка завантаження</div>;
  }

  return (
    <ParticipantForm
      participant={participant}
      results={results}
      eventId={event.id}
      eventName={event.name}
      coverUrl={event.coverUrl}
    />
  );
}
