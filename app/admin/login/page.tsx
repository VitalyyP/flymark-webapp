"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextUrl = useMemo(() => sp.get("next") || "/admin", [sp]);

  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, pass })
      });

      if (!r.ok) {
        setErr("Невірний логін або пароль");
        return;
      }

      router.replace(nextUrl);
    } catch {
      setErr("Не вдалося виконати вхід");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
      <main className="w-full max-w-sm bg-white p-8 rounded-xl shadow flex flex-col gap-4">
        <h1 className="text-2xl text-black text-center">Admin login</h1>

        <label className="text-gray-700 text-sm">
          Логін
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-gray-900"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            autoComplete="username"
          />
        </label>

        <label className="text-gray-700 text-sm">
          Пароль
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-gray-900"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            type="password"
            autoComplete="current-password"
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
          />
        </label>

        {err && <div className="text-sm text-red-600">{err}</div>}

        <button
          onClick={() => void submit()}
          disabled={loading}
          className="rounded-md bg-green-600 hover:bg-green-500 disabled:bg-gray-400 text-white py-2"
        >
          {loading ? "Вхід..." : "Увійти"}
        </button>
      </main>
    </div>
  );
}
