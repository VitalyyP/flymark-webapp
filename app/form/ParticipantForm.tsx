"use client";

import { useState } from "react";
import Image from "next/image";

import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

type CustomPhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
};

const MAX_DIGITS = 12;

function CustomPhoneInput({ value, onChange }: CustomPhoneInputProps) {
  const handleChange = (phone?: string) => {
    if (!phone) {
      onChange("");
      return;
    }

    const digits = phone.replace(/\D/g, "").slice(0, MAX_DIGITS);
    onChange(`+${digits}`);
  };

  return (
    <PhoneInput
      international
      defaultCountry="UA"
      value={value}
      onChange={handleChange}
      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
        const digits = value.replace(/\D/g, "");
        if (digits.length >= MAX_DIGITS && /\d/.test(e.key)) {
          e.preventDefault();
        }
      }}
      className="phone-wrapper"
    />
  );
}

export type ResultItem = {
  category: string;
  time: string;
  dancer1Name: string;
  dancer2Name?: string;
  program: string;
};

type Props = {
  name: string;
  results: ResultItem[];
  eventId: string;
  eventName: string;
  coverUrl: string;
};

export function ParticipantForm({
  name,
  results = [],
  eventId,
  eventName,
  coverUrl,
}: Props) {
  const [regNumber, setRegNumber] = useState("");
  const [regNumberUnknown, setRegNumberUnknown] = useState(false);
  const [orderType, setOrderType] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const removeLastBracket = (str: string) => str.replace(/\s*\([^()]*\)$/, "");

  const getItemKey = (r: ResultItem) =>
    `${r.category}__${r.program}__${r.time}`;

  const handleItemToggle = (key: string, checked: boolean) => {
    setSelectedItems((prev) =>
      checked ? [...prev, key] : prev.filter((k) => k !== key)
    );
  };

  const isPhoneValid = phone.replace(/\D/g, "").length === 12;

  const hasRegNumber = regNumberUnknown || !!regNumber.trim();

  const hasRequiredFields = hasRegNumber && !!orderType && isPhoneValid;

  const hasItems = selectedItems.length > 0;

  const canSubmit = hasRequiredFields && hasItems && !sending;

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
        .filter((r) => selectedItems.includes(getItemKey(r)))
        .map((r) => ({
          category: removeLastBracket(r.category),
          program: r.program,
          time: r.time,
        })),
      regNumber: regNumberUnknown ? "Не знаю" : regNumber,
      orderType,
      phone,
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
      setRegNumberUnknown(false);
      setOrderType("");
      setPhone("");
      setSelectedItems([]);
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
              <span className="text-3xl tracking-wider text-gray-900 text-center">
                {eventName}
              </span>
            </div>

            <h1 className="text-2xl text-center text-black">Дані учасника</h1>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <label className="text-gray-700 text-lg w-[52px]">Імʼя:</label>
                <div className="flex-1 rounded-md border px-4 py-3 bg-gray-100 text-gray-900 text-lg text-center">
                  {name}
                </div>
              </div>

              {secondName && (
                <div className="flex items-center gap-3">
                  <div className="w-[52px]" />
                  <div className="flex-1 rounded-md border px-4 py-3 bg-gray-100 text-gray-900 text-lg text-center">
                    {secondName}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-gray-700 text-lg mb-2 font-medium">
                Категорія / Програма / Час:
              </label>

              <ul className="list-none p-4 bg-gray-100 border rounded-md flex flex-col gap-2">
                {results.map((r) => {
                  const key = getItemKey(r);

                  return (
                    <li key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(key)}
                        onChange={(e) =>
                          handleItemToggle(key, e.target.checked)
                        }
                      />
                      <label className="text-gray-900">
                        {removeLastBracket(r.category)} / {r.program} / {r.time}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <label className="block text-gray-700 text-lg mb-1 font-medium">
                Реєстраційний номер
              </label>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  inputMode="numeric"
                  value={regNumberUnknown ? "" : regNumber}
                  onChange={(e) =>
                    setRegNumber(e.target.value.replace(/\D/g, ""))
                  }
                  disabled={regNumberUnknown}
                  placeholder={regNumberUnknown ? "Не знаю" : ""}
                  className="w-2/3 rounded-md px-4 py-3 text-lg border border-gray-300 bg-gray-100 text-gray-900"
                />

                <label className="flex items-center gap-1 text-gray-900 w-1/3">
                  <input
                    type="checkbox"
                    checked={regNumberUnknown}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setRegNumberUnknown(checked);
                      if (checked) setRegNumber("");
                    }}
                  />
                  Не знаю
                </label>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-lg mb-2 font-medium">
                Вид замовлення
              </label>

              <div className="flex flex-col gap-2 text-lg text-gray-900">
                {["Одне-три фото", "Чотири-сім фото", "Ексклюзив"].map((t) => (
                  <label key={t} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="orderType"
                      checked={orderType === t}
                      onChange={() => setOrderType(t)}
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-lg mb-1 font-medium">
                Номер телефону
              </label>

              <CustomPhoneInput value={phone} onChange={setPhone} />
            </div>

            <p className="text-sm text-gray-500 mb-2">
              *Всі поля обовʼязкові для заповнення
            </p>

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
