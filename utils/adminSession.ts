type SessionPayload = { exp: number };

function bytesToBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  const b64 = btoa(s);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i];
  return out === 0;
}

async function hmacSha256(
  secret: string,
  data: Uint8Array
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, data);
  return new Uint8Array(sig);
}

export async function createAdminSessionCookieValue(
  ttlMs = 1000 * 60 * 60 * 24 * 7
) {
  const secret = process.env.ADMIN_COOKIE_SECRET;
  if (!secret) throw new Error("ADMIN_COOKIE_SECRET is missing");

  const payload: SessionPayload = { exp: Date.now() + ttlMs };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));

  const payloadPart = bytesToBase64Url(payloadBytes);
  const sigBytes = await hmacSha256(secret, payloadBytes);
  const sigPart = bytesToBase64Url(sigBytes);

  return `${payloadPart}.${sigPart}`;
}

export async function verifyAdminSessionCookie(
  value: string
): Promise<boolean> {
  const secret = process.env.ADMIN_COOKIE_SECRET;
  if (!secret) return false;

  const [payloadPart, sigPart] = value.split(".");
  if (!payloadPart || !sigPart) return false;

  let payloadBytes: Uint8Array;
  let sigBytes: Uint8Array;

  try {
    payloadBytes = base64UrlToBytes(payloadPart);
    sigBytes = base64UrlToBytes(sigPart);
  } catch {
    return false;
  }

  const expectedSig = await hmacSha256(secret, payloadBytes);
  if (!timingSafeEqual(sigBytes, expectedSig)) return false;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(payloadBytes)
    ) as SessionPayload;
    if (!payload?.exp || typeof payload.exp !== "number") return false;
    if (Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}
