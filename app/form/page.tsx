import ParticipantForm from "./ParticipantForm";
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

  let data: any;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/get-participant?event=${
        event.id
      }&name=${encodeURIComponent(name)}`,
      { cache: "no-store" }
    );

    if (res.ok) {
      data = await res.json();
    }
  } catch {
    return <div>Помилка завантаження</div>;
  }

  return (
    <ParticipantForm
      name={name}
      results={data?.results}
      eventId={event.id}
      eventName={event.name}
      eventCoverUrl={event.coverUrl}
    />
  );
}
