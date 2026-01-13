import { ParticipantForm, ResultItem } from "./ParticipantForm";
import { decodeEvent } from "@/utils/eventPayload";

type SearchParams = {
  participant?: string;
  event?: string;
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  const name = params.participant ?? "";
  const encodedEvent = params.event ?? "";

  const event = decodeEvent(encodedEvent);

  if (!event || !name) {
    return <div>Некоректні параметри</div>;
  }

  let results: ResultItem[] = [];

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/get-participant?event=${
        event.id
      }&name=${encodeURIComponent(name)}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      throw new Error("Failed to fetch participants");
    }

    results = (await res.json()) as ResultItem[];
  } catch (err: unknown) {
    console.error("Помилка завантаження учасників:", err);
    return <div>Помилка завантаження</div>;
  }

  return (
    <ParticipantForm
      name={name}
      results={results}
      eventId={event.id}
      eventName={event.name}
      coverUrl={event.coverUrl}
    />
  );
}
