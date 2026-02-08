import { NextResponse } from "next/server";
import { getFlymarkCookieHeader } from "@/utils/flymarkAuth";

export const runtime = "nodejs";

function toNumber(value: string | null): number | null {
  if (!value) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, { ...init, cache: "no-store" });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Fetch failed ${response.status} for ${url}. ${text.slice(0, 200)}`
    );
  }

  return response.json();
}

function extractIds(list: unknown, key: string): number[] {
  if (!Array.isArray(list)) return [];

  const result: number[] = [];

  for (const item of list) {
    if (!isRecord(item)) continue;

    const value = item[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      result.push(value);
    }
  }

  return result;
}

function findCoupleNumber(
  detailsJson: unknown,
  dancerId: number
): number | null {
  if (!isRecord(detailsJson)) return null;

  const couples = detailsJson["Couples"];
  if (!Array.isArray(couples)) return null;

  for (const couple of couples) {
    if (!isRecord(couple)) continue;

    const numberValue = couple["Number"];
    if (typeof numberValue !== "number") continue;

    const dancers = couple["Dancers"];
    if (!Array.isArray(dancers)) continue;

    const match = dancers.some((dancer) => {
      if (!isRecord(dancer)) return false;

      const dancerValue = dancer["Id"]; // саме 1120xxx
      return typeof dancerValue === "number" && dancerValue === dancerId;
    });

    if (match) return numberValue;
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const competitionId = toNumber(searchParams.get("competitionId"));
    const dancerId = toNumber(searchParams.get("dancerId"));

    if (competitionId === null || dancerId === null) {
      return NextResponse.json(
        { error: "Invalid competitionId or dancerId" },
        { status: 400 }
      );
    }

    const baseUrl = `https://flymark.dance/api/competitionStream/${competitionId}/0`;
    const baseJson = await fetchJson(baseUrl);

    const sectionIds = extractIds(
      isRecord(baseJson) ? baseJson["Sections"] : null,
      "Id"
    );

    if (sectionIds.length === 0) {
      return NextResponse.json({ number: null }, { status: 200 });
    }

    const categoryIds: number[] = [];

    for (const sectionId of sectionIds) {
      const sectionUrl = `https://flymark.dance/api/competitionStream/${competitionId}/${sectionId}`;
      const sectionJson = await fetchJson(sectionUrl);

      categoryIds.push(
        ...extractIds(
          isRecord(sectionJson) ? sectionJson["Categories"] : null,
          "Id"
        )
      );
    }

    const uniqueCategoryIds = Array.from(new Set(categoryIds));

    if (uniqueCategoryIds.length === 0) {
      return NextResponse.json({ number: null }, { status: 200 });
    }

    const cookieHeader = await getFlymarkCookieHeader();

    for (const categoryId of uniqueCategoryIds) {
      const detailsUrl = `https://flymark.dance/api/v2/competition-stream/${categoryId}/details`;

      let detailsJson: unknown;

      try {
        detailsJson = await fetchJson(detailsUrl, {
          headers: {
            accept: "application/json",
            "x-client": "Web",
            cookie: cookieHeader
          }
        });
      } catch {
        continue;
      }

      const number = findCoupleNumber(detailsJson, dancerId);

      if (number !== null) {
        return NextResponse.json({ number }, { status: 200 });
      }
    }

    return NextResponse.json({ number: null }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
