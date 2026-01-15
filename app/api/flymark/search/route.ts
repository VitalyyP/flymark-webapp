import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const bodyRaw: Record<string, unknown> = await req.json();
    const body = Object.fromEntries(
      Object.entries(bodyRaw).filter(
        ([_, v]) => v !== "" && v !== null && v !== undefined
      )
    );

    const response = await fetch(
      "https://flymark.dance/api/competition/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Flymark request failed" },
        { status: response.status }
      );
    }

    const data: unknown = await response.json();

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("Flymark proxy error:", err);

    return NextResponse.json(
      { error: "Flymark request failed" },
      { status: 500 }
    );
  }
}
