import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    const response = await fetch(
      "https://flymark.com.ua/api/competition/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    return NextResponse.json(data);
  } catch (err) {
    console.error("Flymark proxy error:", err);
    return NextResponse.json(
      { error: "Flymark request failed" },
      { status: 500 }
    );
  }
}
