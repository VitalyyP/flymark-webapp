import { NextResponse } from "next/server";
import { getFlymarkCookieHeader } from "@/utils/flymarkAuth";

export const runtime = "nodejs";

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
      DancerId?: number;
    }>;
  }>;
};

function normalize(s: string) {
  return s.trim().normalize("NFC").toLowerCase().replace(/\s+/g, " ");
}

function matchesByName(candidateFullName: string, queryName: string) {
  const cand = normalize(candidateFullName);
  const parts = normalize(queryName).split(" ").filter(Boolean);
  return parts.length > 0 && parts.every((p) => cand.includes(p));
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const competitionId = Number(searchParams.get("competitionId"));
    const name = (searchParams.get("name") ?? "").trim();

    if (!Number.isFinite(competitionId) || !name) {
      return NextResponse.json(
        { error: "Invalid competitionId or missing name" },
        { status: 400 }
      );
    }

    const baseUrl = `https://flymark.dance/api/competitionStream/${competitionId}/0`;
    const baseJson = await fetchJson<SectionsResponse>(baseUrl);

    const sectionIds = (baseJson.Sections ?? [])
      .map((s) => Number(s.Id))
      .filter(Number.isFinite);

    if (sectionIds.length === 0) {
      return NextResponse.json({ number: null }, { status: 200 });
    }

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
    if (uniqueCatIds.length === 0) {
      return NextResponse.json({ number: null }, { status: 200 });
    }

    const cookieHeader = await getFlymarkCookieHeader();

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
        const dancers = c.Dancers ?? [];

        const match = dancers.some((d) => {
          const first = d.FirstName ?? "";
          const last = d.LastName ?? "";

          const full1 = `${last} ${first}`.trim();
          const full2 = `${first} ${last}`.trim();

          return (
            (full1 && matchesByName(full1, name)) ||
            (full2 && matchesByName(full2, name))
          );
        });

        if (match && typeof c.Number === "number") {
          return NextResponse.json({ number: c.Number }, { status: 200 });
        }
      }
    }

    return NextResponse.json({ number: null }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
