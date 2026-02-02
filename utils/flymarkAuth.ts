type CachedSession = { cookieHeader: string; expiresAt: number };

declare global {
  var __flymarkSession: CachedSession | undefined;
}

const LOGIN_URL =
  "https://flymark.dance/identity/account/login?returnUrl=&returnDomain=https://flymark.dance&language=uk";

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function extractSetCookies(res: Response): string[] {
  const sc = res.headers.getSetCookie?.() as string[] | undefined;
  if (Array.isArray(sc) && sc.length) return sc;

  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}

function cookiesToHeader(setCookies: string[]): string {
  const pairs = setCookies.map((c) => c.split(";")[0]?.trim()).filter(Boolean);
  return Array.from(new Set(pairs)).join("; ");
}

function mergeCookieHeaders(a: string, b: string): string {
  const map = new Map<string, string>();
  const add = (hdr: string) => {
    hdr
      .split(";")
      .map((x) => x.trim())
      .filter(Boolean)
      .forEach((pair) => {
        const eq = pair.indexOf("=");
        if (eq <= 0) return;
        const k = pair.slice(0, eq).trim();
        const v = pair.slice(eq + 1).trim();
        map.set(k, v);
      });
  };
  if (a) add(a);
  if (b) add(b);
  return Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function extractVerificationToken(html: string): string | null {
  const m =
    html.match(
      /name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/i
    ) || html.match(/name="__RequestVerificationToken"\s+value="([^"]+)"/i);
  return m?.[1] ?? null;
}

export async function getFlymarkCookieHeader(): Promise<string> {
  const cached = global.__flymarkSession;
  if (cached && cached.expiresAt > Date.now()) return cached.cookieHeader;

  const email = mustEnv("FLYMARK_LOGIN");
  const password = mustEnv("FLYMARK_PASSWORD");

  const getRes = await fetch(LOGIN_URL, {
    method: "GET",
    redirect: "manual",
    headers: {
      "user-agent": "Mozilla/5.0",
      accept: "text/html,*/*",
    },
    cache: "no-store",
  });

  const getHtml = await getRes.text();
  const getCookies = extractSetCookies(getRes);
  const cookieFromGet = cookiesToHeader(getCookies);

  const token = extractVerificationToken(getHtml);
  if (!token) {
    throw new Error("Cannot find __RequestVerificationToken on login page");
  }

  const form = new URLSearchParams();
  form.set("Input.Email", email);
  form.set("Input.Password", password);
  form.set("__RequestVerificationToken", token);

  const postRes = await fetch(LOGIN_URL, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "text/html,*/*",
      cookie: cookieFromGet,
      "user-agent": "Mozilla/5.0",
    },
    body: form.toString(),
    cache: "no-store",
  });

  const postCookies = extractSetCookies(postRes);
  const cookieFromPost = cookiesToHeader(postCookies);

  const merged = mergeCookieHeaders(cookieFromGet, cookieFromPost);

  if (!merged.includes(".AspNetCore.Identity.Application=")) {
    throw new Error("Login failed: auth cookie not found");
  }

  global.__flymarkSession = {
    cookieHeader: merged,
    expiresAt: Date.now() + 30 * 60 * 1000, // TTL 30m
  };

  return merged;
}
