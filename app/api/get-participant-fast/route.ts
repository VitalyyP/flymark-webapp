import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ResultItem = {
  category: string;
  time: string;
  dancer1Name: string;
  dancer2Name: string;
  program: string;
};

type Query = {
  event: string;
  id: string;
  name?: string;
  sectionListId?: string;
};

function normalizeText(s: string): string {
  return s.trim().normalize("NFC");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function readNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function getQuery(url: string): Query | null {
  const { searchParams } = new URL(url);

  const event = normalizeText(searchParams.get("event") ?? "");
  const id = normalizeText(searchParams.get("id") ?? "");
  const name = normalizeText(searchParams.get("name") ?? "");
  const sectionListId = normalizeText(searchParams.get("sectionListId") ?? "");

  if (!event || !id) return null;

  return {
    event,
    id,
    name: name || undefined,
    sectionListId: sectionListId || undefined
  };
}

type FlymarkCategory = {
  CategoryName: string;
  SectionId: number | null;
  ResultProgramName: string;
};

function parseCategoriesResponse(data: unknown): FlymarkCategory[] {
  if (!isRecord(data)) return [];

  const rawCats = data["Categories"];
  if (!Array.isArray(rawCats)) return [];

  const out: FlymarkCategory[] = [];

  for (const item of rawCats) {
    if (!isRecord(item)) continue;

    const CategoryName = readString(item["CategoryName"]);
    const SectionId = readNumber(item["SectionId"]);

    let ResultProgramName = "";
    const rp = item["ResultProgram"];
    if (isRecord(rp)) {
      ResultProgramName = readString(rp["ProgramName"]);
    }

    if (!CategoryName) continue;

    out.push({
      CategoryName,
      SectionId,
      ResultProgramName
    });
  }

  return out;
}

type FlymarkSection = {
  Id: number;
  Name: string;
};

function parseSectionsResponse(data: unknown): FlymarkSection[] {
  if (!isRecord(data)) return [];

  const rawSections = data["Sections"];
  if (!Array.isArray(rawSections)) return [];

  const out: FlymarkSection[] = [];

  for (const item of rawSections) {
    if (!isRecord(item)) continue;

    const Id = readNumber(item["Id"]);
    const Name = readString(item["Name"]);

    if (Id === null) continue;
    if (!Name) continue;

    out.push({ Id, Name });
  }

  return out;
}

async function fetchJson(
  url: string
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      "accept-language": "uk-UA,uk;q=0.9,en;q=0.8"
    },
    cache: "no-store"
  });

  const data: unknown = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function GET(request: Request) {
  try {
    const q = getQuery(request.url);
    if (!q) {
      return NextResponse.json(
        { error: "Missing required params: event, id" },
        { status: 400 }
      );
    }

    const categoriesUrl = `https://flymark.dance/api/competitionStream/${encodeURIComponent(
      q.event
    )}/0?dancerId=${encodeURIComponent(q.id)}`;

    const catsRes = await fetchJson(categoriesUrl);

    if (!catsRes.ok) {
      return NextResponse.json(
        { error: "Flymark categories request failed", status: catsRes.status },
        { status: 502 }
      );
    }

    const categories = parseCategoriesResponse(catsRes.data);

    if (categories.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const inferredSectionListId =
      q.sectionListId ??
      (categories[0].SectionId !== null
        ? String(categories[0].SectionId)
        : "0");

    const sectionsUrl = `https://flymark.dance/api/competitionStream/${encodeURIComponent(
      q.event
    )}/${encodeURIComponent(inferredSectionListId)}`;

    const secsRes = await fetchJson(sectionsUrl);

    const sections = secsRes.ok ? parseSectionsResponse(secsRes.data) : [];

    const sectionNameById = new Map<number, string>();
    for (const s of sections) sectionNameById.set(s.Id, s.Name);

    const dancer1Name = q.name ?? "";
    const dancer2Name = "";

    const results: ResultItem[] = categories.map((c) => {
      const time =
        c.SectionId !== null ? sectionNameById.get(c.SectionId) ?? "" : "";

      return {
        category: c.CategoryName,
        time,
        dancer1Name,
        dancer2Name,
        program: c.ResultProgramName
      };
    });

    return NextResponse.json(results, { status: 200 });
  } catch (e: unknown) {
    console.error("get-participant-fast error:", e);
    const message = e instanceof Error ? e.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
