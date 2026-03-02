import { ParticipantForm, ResultItem } from "./ParticipantForm";
import { decodeEvent } from "@/utils/eventPayload";
import { headers } from "next/headers";

type SearchParams = {
  event?: string;
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  return host ? `${proto}://${host}` : "";
}

async function fetchJson<T>(
  url: string
): Promise<{ ok: boolean; data: T | null }> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { ok: false, data: null };
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, data: null };
  }
}

function isSufficient(results: ResultItem[] | null): results is ResultItem[] {
  return Array.isArray(results) && results.length > 0;
}

function uniqueByCategoryProgram(results: ResultItem[]): ResultItem[] {
  const seen = new Set<string>();

  return results.filter((r) => {
    const key = `${r.category}__${r.program}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  const encodedEvent = params.event ?? "";
  const event = decodeEvent(encodedEvent);
  const participant = event?.participant ?? null;

  if (!event || !participant?.id || !participant?.name) {
    return <div>Некоректні параметри</div>;
  }

  const base = await getBaseUrl();
  if (!base) return <div>Помилка завантаження</div>;

  const fastUrl = `${base}/api/get-participant-fast?event=${encodeURIComponent(
    event.id
  )}&id=${encodeURIComponent(participant.id)}&name=${encodeURIComponent(
    participant.name
  )}`;

  const slowUrl = `${base}/api/get-participant?event=${encodeURIComponent(
    event.id
  )}&id=${encodeURIComponent(participant.id)}&name=${encodeURIComponent(
    participant.name
  )}`;

  let results: ResultItem[] | null = null;

  try {
    const [fast, slow] = await Promise.all([
      fetchJson<ResultItem[]>(fastUrl),
      fetchJson<ResultItem[]>(slowUrl),
    ]);

    const fastData =
      fast.ok && isSufficient(fast.data)
        ? uniqueByCategoryProgram(fast.data)
        : null;

    const slowClub = slow.data?.[0]?.club;

    if (fastData) {
      results = fastData.map((r) => ({
        ...r,
        ...(slowClub ? { club: slowClub } : {}),
      }));
    } else if (slow.ok && isSufficient(slow.data)) {
      results = slow.data;
    }
  } catch (e) {
    console.error("Failed to load participant", e);
  }

  if (!results) return <div>Помилка завантаження</div>;

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
