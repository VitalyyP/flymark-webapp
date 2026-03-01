import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ResultItem = {
  category: string;
  time: string;
  dancer1Name: string;
  dancer2Name: string;
  program: string;
  city?: string;
  club?: string;
};

type Query = {
  event: string;
  id: string;
  name?: string;
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

  if (!event || !id) return null;

  return {
    event,
    id,
    name: name || undefined,
  };
}

type FlymarkCategory = {
  CategoryName: string;
  SectionId: number | null;
  ResultProgramName: string;
  Id: number;
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
    const Id = readNumber(item["Id"]);

    let ResultProgramName = "";
    const rp = item["ResultProgram"];
    if (isRecord(rp)) {
      ResultProgramName = readString(rp["ProgramName"]);
    }

    if (!CategoryName || Id === null) continue;

    out.push({
      CategoryName,
      SectionId,
      ResultProgramName,
      Id,
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

    if (Id === null || !Name) continue;

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
      "accept-language": "uk-UA,uk;q=0.9,en;q=0.8",
    },
    cache: "no-store",
  });

  const data: unknown = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// --- кеш для профілів ---
const profileCache = new Map<
  string,
  { fetchedAt: number; profile: { city: string; club: string } }
>();
const PROFILE_TTL_MS = 10 * 60 * 1000;

async function getDancerProfile(
  dancerId: string
): Promise<{ city: string; club: string }> {
  const now = Date.now();
  const cached = profileCache.get(dancerId);
  if (cached && now - cached.fetchedAt < PROFILE_TTL_MS) return cached.profile;

  const url = `https://flymark.dance/api/dancer/${encodeURIComponent(
    dancerId
  )}/profile`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { city: "", club: "" };
    const data: unknown = await res.json();
    if (!isRecord(data)) return { city: "", club: "" };

    const clubs = Array.isArray(data["Clubs"]) ? data["Clubs"] : [];
    const clubName =
      clubs.length > 0 && isRecord(clubs[0])
        ? readString(clubs[0]["Name"])
        : "";

    const cityName =
      clubs.length > 0 && isRecord(clubs[0]) && isRecord(clubs[0]["City"])
        ? readString(clubs[0]["City"]["Name"])
        : "";

    const profile = { city: cityName, club: clubName };
    profileCache.set(dancerId, { fetchedAt: now, profile });
    return profile;
  } catch {
    return { city: "", club: "" };
  }
}

// --- функція для отримання реального dancerId з реєстрації ---
async function getRealDancerId(
  eventId: string,
  categoryId: number,
  dancerName: string
): Promise<string | undefined> {
  const url = `https://flymark.dance/api/registration?competitionId=${encodeURIComponent(
    eventId
  )}&categoryId=${encodeURIComponent(categoryId)}`;
  const res = await fetch(url);
  if (!res.ok) return undefined;

  const data: unknown = await res.json();
  if (!isRecord(data)) return undefined;

  const registrations = Array.isArray(data["Registration"])
    ? data["Registration"]
    : [];
  for (const reg of registrations) {
    if (!isRecord(reg)) continue;
    const dancers = Array.isArray(reg["Dancers"]) ? reg["Dancers"] : [];
    for (const dancer of dancers) {
      if (!isRecord(dancer)) continue;
      const fullName = readString(dancer["FullName"]);
      const id = readNumber(dancer["Id"]);
      if (fullName === dancerName && id !== null) return String(id);
    }
  }
  return undefined;
}

export async function GET(request: Request) {
  try {
    const q = getQuery(request.url);
    if (!q)
      return NextResponse.json(
        { error: "Missing required params: event, id" },
        { status: 400 }
      );

    const categoriesUrl = `https://flymark.dance/api/competitionStream/${encodeURIComponent(
      q.event
    )}/0?dancerId=${encodeURIComponent(q.id)}`;
    const catsRes = await fetchJson(categoriesUrl);
    if (!catsRes.ok)
      return NextResponse.json(
        { error: "Flymark categories request failed", status: catsRes.status },
        { status: 502 }
      );

    const categories = parseCategoriesResponse(catsRes.data);
    if (categories.length === 0) return NextResponse.json([], { status: 200 });

    const inferredSectionListId =
      categories[0].SectionId !== null ? String(categories[0].SectionId) : "0";
    const sectionsUrl = `https://flymark.dance/api/competitionStream/${encodeURIComponent(
      q.event
    )}/${encodeURIComponent(inferredSectionListId)}`;
    const secsRes = await fetchJson(sectionsUrl);
    const sections = secsRes.ok ? parseSectionsResponse(secsRes.data) : [];
    const sectionNameById = new Map<number, string>();
    for (const s of sections) sectionNameById.set(s.Id, s.Name);

    const dancer1Name = q.name ?? "";
    const dancer2Name = "";

    // --- отримати реальний dancerId ---
    const dancerRealId =
      (await getRealDancerId(q.event, categories[0].Id, dancer1Name)) ?? q.id;
    console.log("DancerRealId:", dancerRealId);
    const profile = await getDancerProfile(dancerRealId);

    const results: ResultItem[] = categories.map((c) => {
      const time =
        c.SectionId !== null ? sectionNameById.get(c.SectionId) ?? "" : "";
      return {
        category: c.CategoryName,
        time,
        dancer1Name,
        dancer2Name,
        program: c.ResultProgramName,
        city: profile.city,
        club: profile.club,
      };
    });

    return NextResponse.json(results, { status: 200 });
  } catch (e: unknown) {
    console.error("get-participant-fast error:", e);
    const message = e instanceof Error ? e.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
