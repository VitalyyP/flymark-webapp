import { NextResponse } from "next/server";
import { createAdminSessionCookieValue } from "@/utils/adminSession";

export const runtime = "nodejs";

function toTrimmedString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  return "";
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json().catch(() => ({}));
    const data = body as Record<string, unknown>;

    const user = toTrimmedString(data.user);
    const pass = toTrimmedString(data.pass);

    const ok =
      user === (process.env.ADMIN_USER ?? "") &&
      pass === (process.env.ADMIN_PASSWORD ?? "");

    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "Bad credentials" },
        { status: 401 }
      );
    }

    const cookieValue = await createAdminSessionCookieValue();

    const res = NextResponse.json({ ok: true }, { status: 200 });
    res.cookies.set({
      name: "admin_session",
      value: cookieValue,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/admin",
      maxAge: 60 * 60 * 24 * 7
    });

    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
