import { NextResponse } from "next/server";
import { getCompetitionById } from "@/utils/flymark/getCompetitionById";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const competition = await getCompetitionById(id);

  if (!competition) {
    return NextResponse.json(
      { ok: false, error: "Competition not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(competition);
}
