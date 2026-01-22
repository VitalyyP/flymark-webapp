import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin/logout") {
    return new NextResponse("Logged out", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Secure Area", charset="UTF-8"',
        "Cache-Control": "no-store",
      },
    });
  }

  if (pathname.startsWith("/admin")) {
    const basicAuth = req.headers.get("authorization");

    if (!basicAuth) {
      return new NextResponse("Auth required", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Secure Area", charset="UTF-8"',
          "Cache-Control": "no-store",
        },
      });
    }

    const auth = basicAuth.split(" ")[1] ?? "";
    const [user, pass] = atob(auth).split(":");

    if (
      user === process.env.ADMIN_USER &&
      pass === process.env.ADMIN_PASSWORD
    ) {
      return NextResponse.next();
    }

    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Secure Area", charset="UTF-8"',
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.next();
}
