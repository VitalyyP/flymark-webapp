import ParticipantForm from "./ParticipantForm";
import { decodeEvent } from "@/utils/eventPayload";

type SearchParams = {
  participant?: string;
  event?: string;
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export type ParticipantResult = {
  category: string;
  time: string;
  dancer1Name: string;
  dancer2Name?: string;
  regNumber?: string;
  orderType?: string;
};

export type GetParticipantResponse = {
  results: ParticipantResult[];
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  const name = params.participant ?? "";
  const encodedEvent = params.event ?? "";

  const event = decodeEvent(encodedEvent);

  if (!event || !name) {
    return <div>Некоректні параметри</div>;
  }

  const data: GetParticipantResponse = { results: [] };

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/get-participant?event=${
        event.id
      }&name=${encodeURIComponent(name)}`,
      { cache: "no-store" }
    );

    if (res.ok) {
      const json = await res.json();
      data.results = json.results || [];
    }
  } catch (err) {
    console.error("Помилка завантаження учасників:", err);
    return <div>Помилка завантаження</div>;
  }

  return (
    <ParticipantForm
      name={name}
      results={data.results}
      eventId={event.id}
      eventName={event.name}
      coverUrl={event.coverUrl}
    />
  );
}
