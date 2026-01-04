"use client";

import { useState } from "react";
import Image from "next/image";

type ResultItem = {
  category: string;
  time: string;
  dancer1Name: string;
  dancer2Name?: string;
};

type Props = {
  name: string;
  results: ResultItem[];
  eventId: string;
  eventName: string;
  coverUrl: string;
};

export default function ParticipantForm({
  name,
  results = [],
  eventId,
  eventName,
  coverUrl,
}: Props) {
  const [regNumber, setRegNumber] = useState("");
  const [orderType, setOrderType] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const handleCategoryToggle = (category: string, checked: boolean) => {
    setSelectedCategories((prev) =>
      checked ? [...prev, category] : prev.filter((c) => c !== category)
    );
  };

  const removeLastBracket = (str: string) => str.replace(/\s*\([^()]*\)$/, "");

  const canSubmit = regNumber && orderType && phone && !sending;

  const secondName: string = (() => {
    const r = results[0];
    if (!r) return "";

    if (r.dancer1Name && r.dancer1Name !== name) return r.dancer1Name;
    if (r.dancer2Name && r.dancer2Name !== name) return r.dancer2Name;

    return "";
  })();

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSending(true);
    setSuccess(false);

    const payload = {
      eventId: Number(eventId),
      name,
      secondName,
      items: results
        .filter((r) => selectedCategories.includes(r.category))
        .map((r) => ({
          category: removeLastBracket(r.category),
          time: r.time,
        })),
      regNumber: regNumber || "",
      orderType: orderType || "",
      phone: phone || "",
    };

    const res = await fetch("/api/save-form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSending(false);

    if (res.ok) {
      setSuccess(true);
      setRegNumber("");
      setOrderType("");
      setPhone("");
      setSelectedCategories([]);
    }
  };

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
            <div className="flex flex-col items-center gap-6">
              <div className="w-55 h-55 rounded-full overflow-hidden">
                <Image
                  src={coverUrl}
                  alt={eventName}
                  width={220}
                  height={220}
                  className="object-cover w-full h-full"
                  priority
                />
              </div>
              <span className="text-3xl tracking-wider text-gray-900 text-center break-words line-clamp-2 max-w-full">
                {eventName}
              </span>
            </div>

            <h1 className="text-2xl text-center text-black">Дані учасника</h1>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <label className="text-gray-700 text-lg whitespace-nowrap w-[52px]">
                  Імʼя:
                </label>
                <div className="rounded-md border px-4 py-3 text-gray-900 text-lg bg-gray-100 text-center flex-1">
                  {name}
                </div>
              </div>

              {secondName && (
                <div className="flex items-center gap-3">
                  <div className="w-[52px]" />
                  <div className="rounded-md border px-4 py-3 text-gray-900 text-lg bg-gray-100 text-center flex-1">
                    {secondName}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-gray-700 text-lg mb-2 font-medium">
                Категорії / Час:
              </label>

              <ul className="list-none p-4 bg-gray-100 border rounded-md flex flex-col gap-2">
                {results.map((r, i) => {
                  const itemId = `category-${i}`;
                  return (
                    <li key={i} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={itemId}
                        value={r.category}
                        checked={selectedCategories.includes(r.category)}
                        onChange={(e) =>
                          handleCategoryToggle(r.category, e.target.checked)
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor={itemId}
                        className="text-gray-900 cursor-pointer select-none"
                      >
                        {removeLastBracket(r.category)} / {r.time}
                      </label>
                    </li>
                  );
                })}
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
