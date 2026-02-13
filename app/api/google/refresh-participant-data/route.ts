import { google } from "googleapis";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SheetRow = (string | number | boolean | null | undefined)[];

type ApiOk = {
  ok: true;
  updated: number;
  tried: number;
  checked: number;
  errors?: Array<{ row: number; name: string; reason: string }>;
};

type ApiErr = { ok: false; error: string };

function normalizePrivateKey(key?: string): string | undefined {
  if (!key) return undefined;
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

function toStr(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

function normKey(s: string) {
  return s.trim().normalize("NFC").toLowerCase().replace(/\s+/g, " ");
}

function colToA1(colIndex0: number) {
  let n = colIndex0 + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

async function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);
  const spreadsheetId = process.env.SHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error("Missing Google Sheets env");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  return {
    sheets: google.sheets({ version: "v4", auth }),
    spreadsheetId
  };
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

/** ---------- Flymark ---------- */

type FlyCat = {
  CategoryName: string;
  SectionId: number | null;
  ResultProgramName: string;
};

function parseCats(data: unknown): FlyCat[] {
  if (!isRecord(data)) return [];
  const raw = data["Categories"];
  if (!Array.isArray(raw)) return [];

  const out: FlyCat[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;

    const CategoryName = readString(item["CategoryName"]);
    const SectionId = readNumber(item["SectionId"]);

    let ResultProgramName = "";
    const rp = item["ResultProgram"];
    if (isRecord(rp)) ResultProgramName = readString(rp["ProgramName"]);

    if (!CategoryName) continue;

    out.push({ CategoryName, SectionId, ResultProgramName });
  }
  return out;
}

type FlySection = { Id: number; Name: string };

function parseSections(data: unknown): FlySection[] {
  if (!isRecord(data)) return [];
  const raw = data["Sections"];
  if (!Array.isArray(raw)) return [];

  const out: FlySection[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;

    const Id = readNumber(item["Id"]);
    const Name = readString(item["Name"]);

    if (Id === null || !Name) continue;
    out.push({ Id, Name });
  }
  return out;
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      "accept-language": "uk-UA,uk;q=0.9,en;q=0.8"
    },
    cache: "no-store"
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** ---------- participants-fast index ---------- */

type DancerIndexItem = { id: string; key: string; fullName: string };

async function buildDancerIndex(eventId: string): Promise<DancerIndexItem[]> {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

  const r = await fetch(
    `${base}/api/participants-fast?eventId=${encodeURIComponent(eventId)}`,
    { cache: "no-store" }
  );
  const j = await r.json().catch(() => ({}));

  const out: DancerIndexItem[] = [];

  if (Array.isArray(j?.dancers)) {
    for (const d of j.dancers) {
      const fullName = `${toStr(d.LastName)} ${toStr(d.FirstName)}`.trim();
      const id = toStr(d.Id);
      if (!fullName || !id) continue;

      out.push({ id, fullName, key: normKey(fullName) });
    }
  }

  // uniq by key (якщо дублікати — беремо перший)
  const uniq = new Map<string, DancerIndexItem>();
  for (const x of out) if (!uniq.has(x.key)) uniq.set(x.key, x);
  return Array.from(uniq.values());
}

function findDancerId(
  name: string,
  idx: DancerIndexItem[]
): { id: string } | { error: string } {
  const q = normKey(name);

  const exact = idx.find((x) => x.key === q);
  if (exact) return { id: exact.id };

  const tokens = q.split(" ").filter(Boolean);
  const matches = idx.filter((x) => tokens.every((t) => x.key.includes(t)));

  if (matches.length === 1) return { id: matches[0].id };
  if (matches.length === 0) return { error: "dancerId not found" };

  return { error: `ambiguous dancer name (${matches.length})` };
}

/** ---------- matching row <-> flycat ---------- */

function normLoose(s: string) {
  return normKey(s)
    .replace(/[()[\],.;:!?'"“”«»]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreMatch(rowCat: string, rowProg: string, fly: FlyCat) {
  // Пріоритет: program, бо він зазвичай стабільніший
  const rP = normLoose(rowProg);
  const fP = normLoose(fly.ResultProgramName);

  const rC = normLoose(rowCat);
  const fC = normLoose(fly.CategoryName);

  let score = 0;

  if (rP && fP && rP === fP) score += 10;
  else if (rP && fP && (fP.includes(rP) || rP.includes(fP))) score += 6;

  if (rC && fC && rC === fC) score += 5;
  else if (rC && fC && (fC.includes(rC) || rC.includes(fC))) score += 2;

  return score;
}

function pickBestFlyCat(rowCat: string, rowProg: string, cats: FlyCat[]) {
  let best: FlyCat | null = null;
  let bestScore = -1;

  for (const c of cats) {
    const s = scoreMatch(rowCat, rowProg, c);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }

  // мінімальний поріг, щоб не оновити “не те”
  if (!best || bestScore < 6) return null; // 6 = хоча б частковий збіг program
  return best;
}

/** ---------- route ---------- */

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = toStr(searchParams.get("eventId"));

    if (!eventId) {
      const body: ApiErr = { ok: false, error: "Missing eventId" };
      return NextResponse.json(body, { status: 400 });
    }

    const sheetName = `${eventId}/B`;

    const { sheets, spreadsheetId } = await getSheetsClient();

    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`
    });

    const rows = (resp.data.values ?? []) as SheetRow[];
    if (rows.length < 2) {
      const body: ApiOk = { ok: true, updated: 0, tried: 0, checked: 0 };
      return NextResponse.json(body, { status: 200 });
    }

    const headers = rows[0].map((h) => (typeof h === "string" ? h.trim() : ""));

    const idxName = headers.indexOf("DancerName");
    const idxCat = headers.indexOf("Category");
    const idxTime = headers.indexOf("Time");
    const idxProg = headers.indexOf("Program");

    if (idxName === -1 || idxCat === -1 || idxTime === -1 || idxProg === -1) {
      const body: ApiErr = { ok: false, error: "Required columns missing" };
      return NextResponse.json(body, { status: 500 });
    }

    const colCat = colToA1(idxCat);
    const colTime = colToA1(idxTime);
    const colProg = colToA1(idxProg);

    const dancerIndex = await buildDancerIndex(eventId);

    // кеш: dancerId -> cats
    const catsByDancer = new Map<string, FlyCat[]>();

    // кеш: sectionListId -> map(sectionId -> timeName)
    const sectionNameByIdCache = new Map<string, Map<number, string>>();

    async function getCats(dancerId: string) {
      if (catsByDancer.has(dancerId)) return catsByDancer.get(dancerId)!;

      const url = `https://flymark.dance/api/competitionStream/${encodeURIComponent(
        eventId
      )}/0?dancerId=${encodeURIComponent(dancerId)}`;

      const r = await fetchJson(url);
      const cats = r.ok ? parseCats(r.data) : [];
      catsByDancer.set(dancerId, cats);
      return cats;
    }

    async function getSectionNameById(sectionListId: string) {
      const cached = sectionNameByIdCache.get(sectionListId);
      if (cached) return cached;

      const url = `https://flymark.dance/api/competitionStream/${encodeURIComponent(
        eventId
      )}/${encodeURIComponent(sectionListId)}`;

      const r = await fetchJson(url);
      const secs = r.ok ? parseSections(r.data) : [];

      const m = new Map<number, string>();
      for (const s of secs) m.set(s.Id, s.Name);

      sectionNameByIdCache.set(sectionListId, m);
      return m;
    }

    const updates: Array<{ range: string; values: string[][] }> = [];
    const errors: Array<{ row: number; name: string; reason: string }> = [];
    let tried = 0;

    // rows[1...] data
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const sheetRow = i + 1;

      const name = toStr(row[idxName]);
      if (!name) continue;

      tried++;

      const found = findDancerId(name, dancerIndex);
      if ("error" in found) {
        errors.push({ row: sheetRow, name, reason: found.error });
        continue;
      }

      const dancerId = found.id;

      const rowCat = toStr(row[idxCat]);
      const rowProg = toStr(row[idxProg]);

      const cats = await getCats(dancerId);
      if (!cats.length) continue;

      const best = pickBestFlyCat(rowCat, rowProg, cats);
      if (!best) {
        errors.push({
          row: sheetRow,
          name,
          reason: "No matching category/program in Flymark"
        });
        continue;
      }

      // time from sections via SectionId
      let newTime = "";
      if (best.SectionId !== null) {
        const sectionListId = String(best.SectionId); // як у твоєму get-participant-fast (inferredSectionListId)
        const map = await getSectionNameById(sectionListId);
        newTime = map.get(best.SectionId) ?? "";
      }

      const newCat = best.CategoryName;
      const newProg = best.ResultProgramName;

      const oldCat = toStr(row[idxCat]);
      const oldProg = toStr(row[idxProg]);
      const oldTime = toStr(row[idxTime]);

      const needsCat = newCat && oldCat !== newCat;
      const needsProg = newProg && oldProg !== newProg;
      const needsTime = newTime && oldTime !== newTime;

      if (!needsCat && !needsProg && !needsTime) continue;

      if (needsCat) {
        updates.push({
          range: `${sheetName}!${colCat}${sheetRow}`,
          values: [[newCat]]
        });
      }

      if (needsProg) {
        updates.push({
          range: `${sheetName}!${colProg}${sheetRow}`,
          values: [[newProg]]
        });
      }

      if (needsTime) {
        updates.push({
          range: `${sheetName}!${colTime}${sheetRow}`,
          values: [[newTime]]
        });
      }
    }

    if (updates.length) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: "RAW", data: updates }
      });
    }

    const body: ApiOk = {
      ok: true,
      updated: updates.length,
      tried,
      checked: rows.length - 1,
      errors: errors.length ? errors : undefined
    };

    return NextResponse.json(body, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const body: ApiErr = { ok: false, error: msg };
    return NextResponse.json(body, { status: 500 });
  }
}
