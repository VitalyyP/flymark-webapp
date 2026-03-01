import { NextResponse } from "next/server";
import { getFlymarkCookieHeader } from "@/utils/flymarkAuth";

export async function GET() {
  const id = "421019";

  try {
    const cookieHeader = await getFlymarkCookieHeader();

    console.log("🍪 cookie:", cookieHeader);

    const res = await fetch(
      `https://flymark.dance/api/v2/competition-stream/${id}/details`,
      {
        headers: {
          cookie: cookieHeader,
          accept: "application/json",
          referer: `https://flymark.dance/competition/streamdetails/${id}`,
          "user-agent": "Mozilla/5.0",
          "x-client": "Web",
        },
        cache: "no-store",
      }
    );

    console.log("📄 status:", res.status);
    console.log("📄 headers:", Object.fromEntries(res.headers.entries()));

    const text = await res.text();
    console.log("📝 snippet:", text.slice(0, 200));

    // тепер має бути JSON
    return new NextResponse(text, {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error("💥 error:", e);
    return new NextResponse(null, { status: 204 });
  }
}
