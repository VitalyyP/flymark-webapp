import { NextResponse } from "next/server";

export const runtime = "nodejs";

type FlymarkDancer = {
  FirstName: string;
  LastName: string;
  City: string;
  Id: number;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId")?.trim();

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    const url = `https://flymark.dance/api/v2/competition-stream/${encodeURIComponent(
      eventId
    )}/dancers`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json"
      }
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Flymark request failed", status: res.status },
        { status: 500 }
      );
    }

    const data = (await res.json()) as FlymarkDancer[];

    return NextResponse.json({
      ok: true,
      count: data.length,
      dancers: data
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
