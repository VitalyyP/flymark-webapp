import { getCompetitionById } from "@/utils/flymark/getCompetitionById";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
    const c = await getCompetitionById(eventId);

    if (!c) {
      return NextResponse.json<ApiErr>(
        { ok: false, error: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiOk>({
      ok: true,
      event: {
        id: String(c.Id),
        name: c.Name,
        coverUrl: c.CoverPhoto,
        cityName: c.CityName,
        dateTo: c.DateTo,
      },
    });
  } catch (e) {
    return NextResponse.json<ApiErr>(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
