"use client";

import { useEffect, useState } from "react";
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
  participant: {
    name: string;
    id: string;
  };
  results: ResultItem[];
  eventId: string;
  eventName: string;
  coverUrl: string;
};

export function ParticipantForm({
  participant,
  results = [],
  eventId,
  eventName,
  coverUrl
}: Props) {
  const [regNumber, setRegNumber] = useState("");
  const [regNumberUnknown, setRegNumberUnknown] = useState(false);
  const [orderType, setOrderType] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loadingNumber, setLoadingNumber] = useState(true);

  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const dancerId = Number(participant.id);
    const competitionId = Number(eventId);

    if (!Number.isFinite(dancerId) || !Number.isFinite(competitionId)) {
      setLoadingNumber(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(
          `/api/flymark/find-number?competitionId=${competitionId}&dancerId=${dancerId}`,
          { cache: "no-store" }
        );
        const data = (await res.json()) as { number: number | null };

        if (cancelled) return;

        if (typeof data.number === "number") {
          setRegNumber(String(data.number));
          setRegNumberUnknown(false);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingNumber(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [participant.id, eventId]);

  const { name, id } = participant;
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

  const orderOptions = [
    {
      id: "basic",
      title: "📸 ВИБІР фото ЗА ЗРАЗКАМИ",
      description: (
        <div className="space-y-2">
          <ul className="list-disc ml-4 space-y-1">
            <li>
              Одне-три фото —{" "}
              <strong className="text-gray-900">100.00 грн.</strong> за штуку
            </li>
            <li>
              Чотири і більше —{" "}
              <strong className="text-gray-900">90.00 грн.</strong> за штуку
            </li>
            <li>
              Всі фото — від <strong className="text-gray-900">700.00</strong>{" "}
              до <strong className="text-gray-900">1000.00 грн.</strong>
            </li>
          </ul>
          <p className="mt-3">
            😇{" "}
            <span className="font-semibold text-green-700">
              НІЯКИХ ПЕРЕДПЛАТ
            </span>{" "}
            — оплата після вибору фото!
          </p>
          <p className="text-xs text-gray-500 italic">
            Посилання на хмару надійде на Viber/Telegram протягом 3–7 днів після
            турніру.
          </p>
        </div>
      )
    },
    {
      id: "premium",
      title: `🏆 Premium ПАКЕТ: ВСІ ФОТО вже ЗАВТРА`,
      description: (
        <div className="space-y-3">
          <div className="bg-blue-50 p-3 rounded-md border-l-4 border-blue-500">
            <p className="text-blue-900 font-bold">Вартість: 1000.00 грн.</p>
          </div>

          <ul className="space-y-2">
            <li className="flex gap-2">
              <span>⚡</span>
              <span>
                Ви отримуєте всі оригінальні світлини (мінімум{" "}
                <strong className="text-gray-900">27 шт.</strong>){" "}
                <strong className="text-gray-900">ПРОТЯГОМ ДОБИ</strong> після
                завершення турніру
              </span>
            </li>
            <li className="flex gap-2">
              <span>🔝</span>
              <span>
                Спортсмени з Premium-пакетом мають{" "}
                <strong className="text-gray-900">пріоритет</strong> під час
                зйомки перед іншими замовниками.
              </span>
            </li>
            <li className="flex gap-2">
              <span>🔒</span>
              <span>
                Вартість фіксується під час оплати й не залежить від кількості
                фото.
              </span>
            </li>
          </ul>

          <div className="bg-yellow-50 p-3 rounded-md text-gray-800 text-xs border border-yellow-200">
            <p className="font-bold mb-1 underline">УМОВИ ОПЛАТИ:</p>
            <p>
              100% оплата здійснюється у день турніру після реєстрації та
              повідомлення номера участі асистенту фотографа біля{" "}
              <strong className="text-gray-900 underline">
                зеленого рекламного банера А Фото
              </strong>
              !
            </p>
          </div>

          <p className="text-[10px] uppercase font-bold text-red-600 ">
            ⚠️ Важливо чітко вказати категорію згідно з програмою!
          </p>
        </div>
      )
    }
  ];

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
          time: r.time
        })),
      regNumber: regNumberUnknown ? "Не знаю" : regNumber,
      orderType,
      phone
    };

    const res = await fetch("/api/save-form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setSending(false);

    if (res.ok) {
      setSuccess(true);
      setRegNumber("");
      setRegNumberUnknown(false);
      setOrderType("");
      setPhone("");
      setSelectedItems([]);
      setOpenAccordion(null);
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
                      <label className="text-gray-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(key)}
                          onChange={(e) =>
                            handleItemToggle(key, e.target.checked)
                          }
                        />
                        <span className="ml-2">
                          {removeLastBracket(r.category)} / {r.program} /{" "}
                          {r.time}
                        </span>
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
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={regNumberUnknown ? "" : regNumber}
                  disabled={regNumberUnknown || loadingNumber}
                  placeholder={
                    loadingNumber
                      ? "Шукаю номер..."
                      : regNumberUnknown
                        ? "Не знаю"
                        : ""
                  }
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, "");
                    setRegNumber(onlyDigits);
                  }}
                  className="w-1/3 rounded-md px-4 py-3 text-lg border border-gray-300 bg-gray-100 text-gray-900 focus:outline-none"
                />
                <div className="flex items-center gap-1 text-gray-900 w-2/3">
                  <label className="cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regNumberUnknown}
                      onChange={(e) => {
                        setRegNumberUnknown(e.target.checked);
                        if (e.target.checked) setRegNumber("Не знаю");
                        else setRegNumber("");
                      }}
                    />
                    <span className="ml-2">Не знаю</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-lg mb-2 font-medium">
                Вид замовлення
              </label>
              <div className="border rounded-md overflow-hidden bg-white">
                {orderOptions.map((option) => (
                  <div key={option.id} className="border-b last:border-b-0">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenAccordion(
                          openAccordion === option.id ? null : option.id
                        )
                      }
                      className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <span
                        className={`text-sm sm:text-base leading-tight tracking-tight ${orderType === option.id ? "text-green-700 font-bold" : "text-gray-900 font-medium"}`}
                      >
                        {option.title} {orderType === option.id && "✓"}
                      </span>
                      <span className="text-xl text-gray-400 flex-shrink-0 w-5 text-center">
                        {openAccordion === option.id ? "−" : "+"}
                      </span>
                    </button>

                    <div
                      className={`transition-all duration-500 ease-in-out overflow-hidden ${openAccordion === option.id ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}
                    >
                      <div className="p-4 pt-2 bg-gray-50">
                        <div className="text-gray-700 text-sm mb-4 leading-normal">
                          {option.description}
                        </div>
                        <button
                          type="button"
                          onClick={() => setOrderType(option.id)}
                          className={`w-full py-2 rounded border transition-all cursor-pointer ${
                            orderType === option.id
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-green-50 text-green-600 border-green-600 hover:bg-green-600 hover:text-white"
                          }`}
                        >
                          {orderType === option.id ? "Обрано" : "Обрати"}
                        </button>
                      </div>
                    </div>
                  </div>
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
              } disabled:bg-gray-400 cursor-pointer disabled:cursor-not-allowed`}
            >
              {sending ? "Відправляю..." : "Відправити"}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
