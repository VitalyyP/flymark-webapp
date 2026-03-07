import { NextResponse } from "next/server";
import { getFlymarkCookieHeader } from "@/utils/flymarkAuth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("id");
  const categoryName = searchParams.get("categoryName");
  const programName = searchParams.get("programName");

  if (!eventId || !categoryName || !programName) {
    return NextResponse.json(
      { error: "Missing id, categoryName or programName" },
      { status: 400 }
    );
  }

  try {
    const origin = new URL(req.url).origin;

    const categoryRes = await fetch(
      `${origin}/api/flymark/get-categoryId?id=${eventId}&categoryName=${encodeURIComponent(
        categoryName
      )}&programName=${encodeURIComponent(programName)}`,
      { cache: "no-store" }
    );

    if (!categoryRes.ok) {
      return NextResponse.json({
        categoryId: null,
        details: null,
      });
    }

    const { categoryId } = await categoryRes.json();
    if (!categoryId) {
      return NextResponse.json({
        categoryId: null,
        details: null,
      });
    }

    const cookieHeader = await getFlymarkCookieHeader();

    const res = await fetch(
      `https://flymark.dance/api/v2/competition-stream/${categoryId}/details`,
      {
        headers: {
          cookie: cookieHeader,
          accept: "application/json",
          referer: `https://flymark.dance/competition/streamdetails/${categoryId}`,
          "user-agent": "Mozilla/5.0",
          "x-client": "Web",
        },
        cache: "no-store",
      }
    );

    const text = await res.text();

    // const mock = {
    //   "Qualifications": [
    //     {
    //       "Rounds": [
    //         {
    //           "Rounds": {
    //             "1": ["40", "49", "57", "68", "90", "94", "109", "123", "148"],
    //             "2": ["37", "50", "55", "56", "60", "61", "100"],
    //           },
    //         },
    //       ],
    //     },
    //   ],
    // };

    return NextResponse.json({
      categoryId,
      details: JSON.parse(text),
      //   details: mock,
    });
  } catch (e) {
    console.error("💥 error:", e);
    return new NextResponse(null, { status: 500 });
  }
}
