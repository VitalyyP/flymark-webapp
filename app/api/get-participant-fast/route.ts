import { NextRequest, NextResponse } from "next/server";
import { getFlymarkCookieHeader } from "@/utils/flymarkAuth";

type Section = {
  Id: number;
  Name: string;
};

type ResultProgram = {
  ProgramName?: string;
};

type Category = {
  Id: number;
  CategoryName: string;
  SectionId: number;
  ResultProgram?: ResultProgram;
  ResultProgramName?: string;
};

type CategoryWithTime = Category & {
  sectionTime?: string;
};

type Dancer = {
  FirstName?: string;
  LastName?: string;
  City?: string;
};

type CoupleDetails = {
  Club?: string;
  City?: string;
  Dancers?: Dancer[];
};

type DetailsResponse = {
  Couples?: CoupleDetails[];
};

type StreamResponse = {
  Sections?: Section[];
  Categories?: Category[];
};

type ResultItem = {
  category: string;
  program: string;
  time: string;
  dancer1Name: string;
  dancer2Name: string;
  club: string;
  city: string;
};

function normalize(s?: string): string {
  return (s ?? "").trim().toLowerCase();
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "Accept-Language": "uk-UA,uk;q=0.9",
    },
  });

  if (!res.ok) {
    throw new Error(`Flymark error ${res.status}`);
  }

  return res.json();
}

async function getAllCategories(eventId: string): Promise<CategoryWithTime[]> {
  const base = `https://flymark.dance/api/competitionStream/${eventId}`;

  const first = await fetchJson<StreamResponse>(`${base}/0`);
  const sections = first.Sections ?? [];

  const sectionTimeMap = new Map<number, string>();
  sections.forEach((s) => sectionTimeMap.set(s.Id, s.Name));

  const responses = await Promise.all(
    sections.map((s) =>
      fetchJson<StreamResponse>(`${base}/${s.Id}`).catch(() => null)
    )
  );

  const map = new Map<string, CategoryWithTime>();

  for (const r of responses) {
    if (!r?.Categories) continue;

    for (const c of r.Categories) {
      const program = c.ResultProgram?.ProgramName ?? c.ResultProgramName ?? "";
      if (!program) continue;

      const time = sectionTimeMap.get(c.SectionId) ?? "";

      const key = `${c.CategoryName}___${program}___${time}`;

      if (map.has(key)) continue;

      map.set(key, {
        ...c,
        sectionTime: time,
      });
    }
  }

  return Array.from(map.values());
}

type FoundDancer = {
  club: string;
  city: string;
  dancer2Name: string;
};

function hasDancer(
  details: DetailsResponse | undefined,
  fullName: string
): FoundDancer | null {
  if (!details?.Couples?.length) return null;

  const parts = fullName.trim().split(/\s+/);
  const lastName = parts[0];
  const firstName = parts.slice(1).join(" ");

  const l = normalize(lastName);
  const f = normalize(firstName);

  for (const couple of details.Couples) {
    const club = couple.Club ?? "";
    const coupleCity = couple.City ?? "";

    const dancers = couple.Dancers ?? [];

    for (let i = 0; i < dancers.length; i++) {
      const d = dancers[i];

      if (normalize(d.FirstName) === f && normalize(d.LastName) === l) {
        const partner = dancers.find((_, idx) => idx !== i);

        const dancer2Name = partner
          ? `${partner.FirstName ?? ""} ${partner.LastName ?? ""}`.trim()
          : "";

        return {
          club,
          city: coupleCity || d.City || "",
          dancer2Name,
        };
      }
    }
  }

  return null;
}

async function mapLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
) {
  const queue = [...items];

  const workers = Array.from({ length: limit }).map(async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;
      await fn(item);
    }
  });

  await Promise.all(workers);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const eventId = searchParams.get("event");
    const name = searchParams.get("name");

    if (!eventId || !name) {
      return NextResponse.json({ error: "missing params" }, { status: 400 });
    }

    const categories = await getAllCategories(eventId);

    const cookieHeader = await getFlymarkCookieHeader();

    const base = "https://flymark.dance/api/v2/competition-stream";

    const results: ResultItem[] = [];

    await mapLimit(categories, 6, async (cat) => {
      try {
        const res = await fetch(`${base}/${cat.Id}/details`, {
          headers: {
            cookie: cookieHeader,
            accept: "application/json",
            "user-agent": "Mozilla/5.0",
            referer: `${base}/${cat.Id}/details`,
            "accept-language": "uk",
          },
          cache: "no-store",
        });

        if (!res.ok) return;

        const details: DetailsResponse = await res.json();

        const found = hasDancer(details, name);

        if (!found) return;

        const program =
          cat.ResultProgram?.ProgramName ?? cat.ResultProgramName ?? "";

        results.push({
          category: cat.CategoryName,
          program,
          time: cat.sectionTime ?? "",
          dancer1Name: name,
          dancer2Name: found.dancer2Name,
          club: found.club,
          city: found.city,
        });
      } catch {
        // ignore category errors
      }
    });

    return NextResponse.json({
      ok: true,
      results,
    });
  } catch (e: unknown) {
    console.error(e);

    const message = e instanceof Error ? e.message : "Unknown error";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
