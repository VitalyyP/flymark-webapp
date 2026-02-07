import { ParticipantForm, ResultItem } from "./ParticipantForm";
import { decodeEvent } from "@/utils/eventPayload";

type SearchParams = {
  event?: string;
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isResultItem(v: unknown): v is ResultItem {
  if (!isRecord(v)) return false;

  return (
    typeof v.category === "string" &&
    typeof v.time === "string" &&
    typeof v.dancer1Name === "string" &&
    typeof v.dancer2Name === "string" &&
    typeof v.program === "string"
  );
}

function isResultItemArray(v: unknown): v is ResultItem[] {
  return Array.isArray(v) && v.every(isResultItem);
}

function isSufficient(results: ResultItem[]): boolean {
  return results.length > 0;
}

async function fetchJson(url: string): Promise<{ ok: boolean; data: unknown }> {
  const res = await fetch(url, { cache: "no-store" });
  const data: unknown = await res.json();
  return { ok: res.ok, data };
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  const encodedEvent = params.event ?? "";
  const event = decodeEvent(encodedEvent);
  const participant = event?.participant ?? null;

  if (!event || !participant?.id || !participant?.name) {
    return <div>Некоректні параметри</div>;
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL?.trim() ?? "";

  const fastUrl = `${base}/api/get-participant-fast?event=${encodeURIComponent(
    event.id
  )}&id=${encodeURIComponent(participant.id)}&name=${encodeURIComponent(
    participant.name
  )}`;

  const slowUrl = `${base}/api/get-participant?event=${encodeURIComponent(
    event.id
  )}&id=${encodeURIComponent(participant.id)}`;

  let results: ResultItem[] = [];

  try {
    const fast = await fetchJson(fastUrl);

    if (fast.ok && isResultItemArray(fast.data) && isSufficient(fast.data)) {
      results = fast.data;
    } else {
      const slow = await fetchJson(slowUrl);
      if (!slow.ok || !isResultItemArray(slow.data)) {
        throw new Error("Invalid slow response");
      }
      results = slow.data;
    }
  } catch (err) {
    console.error("Помилка завантаження учасника:", err);
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
