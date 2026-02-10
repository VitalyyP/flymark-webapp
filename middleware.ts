import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminSessionCookie } from "./utils/adminSession";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/admin")) return NextResponse.next();

  if (pathname === "/admin/login") return NextResponse.next();
  if (pathname.startsWith("/admin/login/")) return NextResponse.next();

  const cookie = req.cookies.get("admin_session")?.value ?? "";
  const ok = await verifyAdminSessionCookie(cookie);

  if (ok) return NextResponse.next();

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.searchParams.set("next", pathname + (req.nextUrl.search || ""));
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"]
};
