import { NextResponse } from "next/server";
import {
  normalizeCompetition,
  RawCompetition,
  Competition,
} from "@/utils/normalizeCompetition";

const CITIES_IDS: number[] =
  process.env.NEXT_PUBLIC_CITIES_IDS?.split(",")
    .map((id) => Number(id.trim()))
    .filter(Boolean) ?? [];

type ApiOk = {
  ok: true;
  event: {
    id: string;
    name: string;
    coverUrl: string;
    cityName: string;
    dateTo: string;
  };
};

type ApiErr = {
  ok: false;
  error: string;
};

function toStringSafe(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

function isArray<T>(v: unknown): v is T[] {
  return Array.isArray(v);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = toStringSafe(searchParams.get("eventId"));

  if (!eventId) {
    return NextResponse.json<ApiErr>(
      { ok: false, error: "Missing eventId" },
      { status: 400 }
    );
  }

  try {
    for (const cityId of CITIES_IDS) {
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

      if (!res.ok) continue;

      const data: unknown = await res.json();

      const list: Competition[] = isArray<RawCompetition>(data)
        ? data
            .map(normalizeCompetition)
            .filter((x): x is Competition => x !== null)
        : [];

      const found = list.find((c) => toStringSafe(c.CompetitionId) === eventId);

      if (found) {
        return NextResponse.json<ApiOk>({
          ok: true,
          event: {
            id: toStringSafe(found.CompetitionId),
            name: toStringSafe(found.CompetitionName),
            coverUrl: toStringSafe(found.CoverPhoto),
            cityName: toStringSafe(found.CityName),
            dateTo: toStringSafe(found.DateTo),
          },
        });
      }
    }

    return NextResponse.json<ApiErr>(
      { ok: false, error: "Event not found" },
      { status: 404 }
    );
  } catch (e) {
    return NextResponse.json<ApiErr>(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
