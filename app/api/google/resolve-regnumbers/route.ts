import { NextResponse } from "next/server";

import { getCompetitionNumbers } from "@/utils/flymark/getCompetitionNumbers";
import { getSheetsClient } from "@/utils/googleSheets";

export const runtime = "nodejs";

type SheetRow = (string | undefined)[];

type ApiOk = {
  ok: true;
  updated: number;
  tried: number;
  checked: number;
  errors?: Array<{ name: string; reason: string }>;
};

type ApiErr = {
  ok: false;
  error: string;
  details?: unknown;
};

function normalizePrivateKey(key?: string): string | undefined {
  if (!key) return undefined;
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

function toTrimmedString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
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

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = toTrimmedString(searchParams.get("eventId"));

    if (!eventId) {
      const body: ApiErr = { ok: false, error: "Missing eventId" };
      return NextResponse.json(body, { status: 400 });
    }

    const sheetName = `${eventId}/B`;

    const { sheets, spreadsheetId } = await getSheetsClient("write");

    let resp;
    try {
      resp = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("Unable to parse range")) {
        const body: ApiErr = {
          ok: false,
          error: `Аркуш ${sheetName} не існує`,
        };
        return NextResponse.json(body, { status: 404 });
      }

      throw error;
    }

    const rows = (resp.data.values ?? []) as SheetRow[];
    if (rows.length < 3) {
      const body: ApiOk = { ok: true, updated: 0, checked: 0, tried: 0 };
      return NextResponse.json(body, { status: 200 });
    }

    const headers = (rows[2] ?? []).map((h) =>
      typeof h === "string" ? h.trim() : ""
    );
    const dataRows = rows.slice(3);

    const idxName = headers.indexOf("DancerName");
    const idxReg = headers.indexOf("RegNumber");

    if (idxName === -1 || idxReg === -1) {
      const body: ApiErr = {
        ok: false,
        error: "Required columns not found",
        details: { idxName, idxReg },
      };
      return NextResponse.json(body, { status: 500 });
    }

    const regColA1 = colToA1(idxReg);

    const tasks = dataRows
      .map((row, i) => {
        const rowNumberInSheet = i + 4;
        const name = (row[idxName] ?? "").toString().trim();
        const reg = (row[idxReg] ?? "").toString().trim();

        if (!name) return null;
        if (reg !== "Не знаю") return null;

        return { name, rowNumberInSheet };
      })
      .filter(Boolean) as Array<{ name: string; rowNumberInSheet: number }>;

    if (tasks.length === 0) {
      const body: ApiOk = {
        ok: true,
        updated: 0,
        checked: dataRows.length,
        tried: 0,
      };
      return NextResponse.json(body, { status: 200 });
    }

    const updates: Array<{ range: string; values: string[][] }> = [];
    const errors: Array<{ name: string; reason: string }> = [];
    const numbersMap = await getCompetitionNumbers(eventId);

    function normalize(s: string) {
      return s.trim().normalize("NFC").toLowerCase().replace(/\s+/g, " ");
    }

    for (const t of tasks) {
      const normalized = normalize(t.name);
      const parts = normalized.split(" ").filter(Boolean);

      let foundNumber: number | undefined;

      for (const [candidate, num] of numbersMap.entries()) {
        if (parts.every((p) => candidate.includes(p))) {
          foundNumber = num;
          break;
        }
      }

      if (typeof foundNumber === "number") {
        updates.push({
          range: `${sheetName}!${regColA1}${t.rowNumberInSheet}`,
          values: [[String(foundNumber)]],
        });
      } else {
        errors.push({
          name: t.name,
          reason: "Number not found",
        });
      }
    }

    if (updates.length === 0) {
      const body: ApiOk = {
        ok: true,
        updated: 0,
        checked: dataRows.length,
        tried: tasks.length,
        errors,
      };
      return NextResponse.json(body, { status: 200 });
    }

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: updates,
      },
    });

    const body: ApiOk = {
      ok: true,
      updated: updates.length,
      checked: dataRows.length,
      tried: tasks.length,
      errors,
    };
    return NextResponse.json(body, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const body: ApiErr = { ok: false, error: msg };
    return NextResponse.json(body, { status: 500 });
  }
}
