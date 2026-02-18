import { NextResponse } from "next/server";
import {
  normalizeCompetition,
  RawCompetition,
  Competition,
} from "@/utils/normalizeCompetition";

export const runtime = "nodejs";

const CITIES_IDS: number[] =
  process.env.NEXT_PUBLIC_CITIES_IDS?.split(",")
    .map((id) => Number(id.trim()))
    .filter(Boolean) ?? [];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toTrimmedString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let i = 0;

  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  });

  await Promise.all(workers);
  return results;
}

export async function GET() {
  try {
    const chunks = await mapLimit(CITIES_IDS, 4, async (cityId) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/flymark/search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cityId,
            countryId: 1,
            organisationId: "",
            from: "",
            to: "",
            page: 1,
            type: "Opened",
          }),
          cache: "no-store",
        }
      );

      if (!res.ok) return [] as Competition[];

      const data: unknown = await res.json();

      const list: Competition[] = Array.isArray(data)
        ? (data as RawCompetition[])
            .map(normalizeCompetition)
            .filter((x): x is Competition => x !== null)
        : [];

      for (const c of list) {
        c.CompetitionId = toTrimmedString(c.CompetitionId);
        if (isRecord(c) && "CityName" in c) {
          (c as unknown as { CityName?: string }).CityName = toTrimmedString(
            (c as unknown as { CityName?: unknown }).CityName
          );
        }
      }

      return list;
    });

    const results = chunks.flat();

    results.sort(
      (a, b) => new Date(a.DateTo).getTime() - new Date(b.DateTo).getTime()
    );

    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
