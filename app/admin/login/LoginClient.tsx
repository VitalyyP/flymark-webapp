"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Lock,
  User,
  LogIn,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";

export default function LoginClient() {
  const sp = useSearchParams();

  const nextUrl = useMemo(() => sp.get("next") || "/admin", [sp]);

  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isFormValid = user.trim().length > 0 && pass.trim().length > 0;

  const submit = async () => {
    if (!isFormValid || loading) return;

    setErr(null);
    setLoading(true);

    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: user.trim(),
          pass: pass.trim()
        })
      });

      if (!r.ok) {
        setErr("Невірний логін або пароль");
        setLoading(false);
        return;
      }

      window.location.href = nextUrl;
    } catch {
      setErr("Помилка з'єднання з сервером");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-start sm:items-center justify-center bg-zinc-50 p-6 font-sans">
      <main className="w-full max-w-[400px] flex flex-col gap-6 sm:gap-8 mt-4 sm:mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-green-600 rounded-3xl flex items-center justify-center shadow-xl shadow-green-900/20">
            <Lock className="text-white" size={30} />
          </div>
          <div className="text-center mt-3">
            <h1 className="text-[26px] font-semibold text-zinc-900 tracking-tight uppercase leading-none">
              Вхід до системи
            </h1>
            <p className="text-zinc-500 text-sm font-medium mt-2">
              Панель керування «А Фото»
            </p>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-4xl shadow-sm border border-zinc-100 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 px-1 text-[11px] font-black uppercase tracking-widest text-zinc-400">
              <User size={14} className="text-green-600" />
              Логін
            </label>
            <input
              className="w-full border-2 border-zinc-50 bg-zinc-50/30 rounded-[20px] py-4 px-5 text-zinc-800 font-bold focus:bg-white focus:border-[#00a63e] focus:ring-4 focus:ring-green-500/5 transition-all outline-none"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Введіть логін"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 px-1 text-[11px] font-black uppercase tracking-widest text-zinc-400">
              <Lock size={14} className="text-green-600" />
              Пароль
            </label>
            <div className="relative">
              <input
                className="w-full border-2 border-zinc-50 bg-zinc-50/30 rounded-[20px] py-4 px-5 pr-14 text-zinc-800 font-bold focus:bg-white focus:border-[#00a63e] focus:ring-4 focus:ring-green-500/5 transition-all outline-none"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                type={showPass ? "text" : "password"}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-green-600 transition-colors"
              >
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {err && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-[18px] border border-red-100">
              <AlertCircle size={18} className="shrink-0" />
              <span className="text-[13px] font-bold">{err}</span>
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading || !isFormValid}
            className={`w-full py-4.5 rounded-[22px] font-black uppercase text-[14px] tracking-widest transition-all flex items-center justify-center gap-3 mt-2
              ${
                !isFormValid
                  ? "bg-zinc-100 text-zinc-500 border-2 border-zinc-100 cursor-not-allowed opacity-80"
                  : loading
                    ? "bg-zinc-100 text-zinc-400 cursor-wait"
                    : "bg-green-600 text-white hover:bg-[#009437] shadow-lg shadow-green-900/20 active:scale-[0.98] cursor-pointer"
              }
            `}
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <span className={!isFormValid ? "text-zinc-500" : "text-white"}>
                  Увійти
                </span>
                <LogIn
                  size={18}
                  className={!isFormValid ? "text-zinc-400" : "text-white"}
                />
              </>
            )}
          </button>
        </div>

        <p className="text-center text-zinc-400 text-[12px] font-medium tracking-wide">
          Тільки для авторизованого персоналу
        </p>
      </main>
    </div>
  );
}
