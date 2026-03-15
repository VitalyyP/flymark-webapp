import { getFlymarkCookieHeader } from "@/utils/flymarkAuth";

type SectionsResponse = {
  Sections?: { Id?: number }[];
};

type StreamResponse = {
  Categories?: { Id?: number }[];
};

type DetailsResponse = {
  Couples?: Array<{
    Number?: number;
    Dancers?: Array<{
      FirstName?: string;
      LastName?: string;
    }>;
  }>;
};

function normalize(s: string) {
  return s.trim().normalize("NFC").toLowerCase().replace(/\s+/g, " ");
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Fetch failed ${res.status} for ${url}. ${text.slice(0, 200)}`
    );
  }

  return (await res.json()) as T;
}

export async function getCompetitionNumbers(competitionId: string) {
  const baseUrl = `https://flymark.dance/api/competitionStream/${competitionId}/0`;

  const baseJson = await fetchJson<SectionsResponse>(baseUrl);

  const sectionIds = (baseJson.Sections ?? [])
    .map((s) => Number(s.Id))
    .filter(Number.isFinite);

  const catIds: number[] = [];

  for (const sectionId of sectionIds) {
    const sectionUrl = `https://flymark.dance/api/competitionStream/${competitionId}/${sectionId}`;

    const sectionJson = await fetchJson<StreamResponse>(sectionUrl);

    const ids = (sectionJson.Categories ?? [])
      .map((c) => Number(c.Id))
      .filter(Number.isFinite);

    catIds.push(...ids);
  }

  const uniqueCatIds = Array.from(new Set(catIds));

  const cookieHeader = await getFlymarkCookieHeader();

  const nameToNumber = new Map<string, number>();

  for (const catId of uniqueCatIds) {
    const detailsUrl = `https://flymark.dance/api/v2/competition-stream/${catId}/details`;

    let details: DetailsResponse;

    try {
      details = await fetchJson<DetailsResponse>(detailsUrl, {
        headers: {
          accept: "application/json",
          "x-client": "Web",
          cookie: cookieHeader,
        },
      });
    } catch {
      continue;
    }

    const couples = details.Couples ?? [];

    for (const c of couples) {
      if (typeof c.Number !== "number") continue;

      const dancers = c.Dancers ?? [];

      for (const d of dancers) {
        const first = d.FirstName ?? "";
        const last = d.LastName ?? "";

        const full1 = normalize(`${last} ${first}`);
        const full2 = normalize(`${first} ${last}`);

        if (full1) nameToNumber.set(full1, c.Number);
        if (full2) nameToNumber.set(full2, c.Number);
      }
    }
  }

  return nameToNumber;
}
