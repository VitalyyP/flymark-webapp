"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ParticipantForm({ name, results = [] }) {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");

  const [regNumber, setRegNumber] = useState("");
  const [orderType, setOrderType] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  function removeLastBracket(str) {
    return str.replace(/\s*\([^()]*\)$/, "");
  }

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSending(true);
    setSuccess(false);

    const res = await fetch("/api/save-form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        name,
        items: results.map((r) => ({
          category: removeLastBracket(r.category),
          time: r.time,
        })),
        regNumber,
        orderType,
        phone,
        email,
      }),
    });

    setSending(false);

    if (res.ok) {
      setSuccess(true);
      setRegNumber("");
      setOrderType("");
      setPhone("");
      setEmail("");
    }
  };

  const canSubmit = regNumber && orderType && phone && email && !sending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
      <main className="w-full max-w-lg bg-white p-8 rounded-xl shadow flex flex-col gap-6">
        {success ? (
          <div className="text-blue-700 text-center py-20">
            <p className="text-2xl font-semibold">Дякуємо!</p>
            <p className="text-2xl font-semibold mt-4">
              Ваше замовлення прийнято.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-black text-center">
              Дані учасника
            </h1>

            <div className="flex items-center gap-3">
              <label className="text-gray-700 text-lg">Імʼя:</label>
              <div className="rounded-md border px-4 py-3 text-gray-900 text-lg bg-gray-100">
                {name}
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-lg mb-1">
                Категорії / Час:
              </label>

              <ul className="list-disc pl-6 text-gray-900 text-lg bg-gray-100 border rounded-md px-4 py-3">
                {results.map((r, i) => (
                  <li key={i}>
                    {removeLastBracket(r.category)} / {r.time}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label className="block text-gray-700 text-lg mb-1">
                Реєстраційний номер
              </label>
              <input
                type="number"
                value={regNumber}
                onChange={(e) =>
                  setRegNumber(e.target.value.replace(/\D/g, ""))
                }
                className="w-full rounded-md border px-4 py-3 text-gray-900 text-lg bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-gray-700 text-lg mb-2">
                Вид замовлення
              </label>

              <div className="flex flex-col gap-2 text-lg text-gray-900">
                {["Одне-три фото", "Чотири-сім фото", "Ексклюзив"].map((t) => (
                  <label key={t} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="orderType"
                      value={t}
                      onChange={() => setOrderType(t)}
                    />
                    {t}
                  </label>
                ))}
                <ul className="text-sm text-gray-600 ml-4 space-y-0.5">
                  <li>Одне-три фото — 100 грн за штуку</li>
                  <li>Чотири-сім фото — 90 грн за штуку</li>
                  <li>
                    Всі фото від 700 грн до 1000 грн (залежно від категорії і
                    кількості фото)
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-lg mb-1">
                Номер телефону
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-md border px-4 py-3 text-gray-900 text-lg bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-gray-700 text-lg mb-1">Емейл</label>
              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value.replace(/[^a-zA-Z@._-]/g, ""))
                }
                className="w-full rounded-md border px-4 py-3 text-gray-900 text-lg bg-gray-100"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-full text-white text-lg py-3 rounded-md ${
                sending
                  ? "bg-yellow-600 hover:bg-yellow-700"
                  : "bg-blue-600 hover:bg-blue-700"
              } disabled:bg-gray-400`}
            >
              {sending ? "Відправляю..." : "Відправити"}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
