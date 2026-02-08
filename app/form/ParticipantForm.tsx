"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CustomCheckbox } from "@/components/CustomCheckbox";

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
      onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
        const digits = value.replace(/\D/g, "");
        if (digits.length >= MAX_DIGITS && /\d/.test(event.key)) {
          event.preventDefault();
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
  const [lastSubmittedOrderType, setLastSubmittedOrderType] = useState<
    "basic" | "premium" | ""
  >("");
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
        const response = await fetch(
          `/api/flymark/find-number?competitionId=${competitionId}&dancerId=${dancerId}`,
          { cache: "no-store" }
        );
        const data = (await response.json()) as { number: number | null };

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

  useEffect(() => {
    if (success) {
      window.scrollTo(0, 0);
    }
  }, [success]);

  const participantName = participant.name;

  const removeLastBracket = (text: string) =>
    text.replace(/\s*\([^()]*\)$/, "");

  const getItemKey = (item: ResultItem, index: number) =>
    `${item.category}__${item.program}__${item.time}__${index}`;

  const handleItemToggle = (key: string, checked: boolean) => {
    setSelectedItems((previous) =>
      checked ? [...previous, key] : previous.filter((k) => k !== key)
    );
  };

  const toggleRegNumberUnknown = () => {
    setRegNumberUnknown((prev) => {
      const next = !prev;
      if (next) setRegNumber("Не знаю");
      else setRegNumber("");
      return next;
    });
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
          <div className=" bg-blue-50 p-3 rounded-md border-l-4 border-blue-500">
            <p className="text-blue-900 font-bold pb-2">Вартість:</p>
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
          </div>
          <p className="mt-3">
            😇{" "}
            <span className="font-semibold text-green-700">
              НІЯКИХ ПЕРЕДПЛАТ
            </span>{" "}
            — оплата після вибору фото!
          </p>
          <p className="text-sm text-gray-500 italic">
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

          <div className="bg-yellow-50 p-3 rounded-md text-gray-800 text-sm border border-yellow-200">
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

          <p className="text-sm uppercase font-bold text-red-600 ">
            ⚠️ Важливо чітко вказати категорію згідно з програмою!
          </p>
        </div>
      )
    }
  ];

  const secondName: string = (() => {
    const firstResult = results[0];
    if (!firstResult) return "";

    if (
      firstResult.dancer1Name &&
      firstResult.dancer1Name !== participantName
    ) {
      return firstResult.dancer1Name;
    }
    if (
      firstResult.dancer2Name &&
      firstResult.dancer2Name !== participantName
    ) {
      return firstResult.dancer2Name;
    }
    return "";
  })();

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSending(true);
    setSuccess(false);

    const selected = results
      .map((item, index) => ({
        item,
        index,
        key: getItemKey(item, index)
      }))
      .filter(({ key }) => selectedItems.includes(key))
      .map(({ item }) => ({
        category: removeLastBracket(item.category),
        program: item.program,
        time: item.time
      }));

    const payload = {
      eventId: Number(eventId),
      name: participantName,
      secondName,
      items: selected,
      regNumber: regNumberUnknown ? "Не знаю" : regNumber,
      orderType,
      phone
    };

    const response = await fetch("/api/save-form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setSending(false);

    if (response.ok) {
      setLastSubmittedOrderType(orderType as "basic" | "premium");
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
          <div className="text-gray-800 py-6 space-y-5">
            <p className="text-2xl font-semibold text-green-700 text-center">
              Дякуємо! Ваше замовлення прийнято.
            </p>
            {lastSubmittedOrderType === "basic" && (
              <div className="space-y-4 text-base leading-relaxed">
                <p>
                  ✅ Ви внесли всі дані –{" "}
                  <strong className="text-gray-900">ЗАПИС ВИКОНАНО.</strong> Ви
                  обрали пакет{" "}
                  <strong className="text-gray-900">
                    {
                      orderOptions.find((o) => o.id === lastSubmittedOrderType)
                        ?.title
                    }
                  </strong>
                  . Очікуйте зразки!
                </p>
                <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                  <p className="font-medium text-amber-900">
                    ⚠️ Якщо не всі дані були введені – виконано попередній
                    запис. Для підтвердження запису повідомте номер участі та
                    уточніть категорію асистенту біля зеленого банера «А фото».
                  </p>
                </div>
                <p>
                  📝 Зразки фото ви отримаєте протягом 3–7 днів після турніру на
                  вказаний вами номер у Viber або Telegram.
                </p>
                <div className="space-y-2">
                  <p className="font-semibold text-gray-900">💳 Оплата:</p>
                  <p>
                    послуги для пакету{" "}
                    <strong className="text-gray-900">
                      {
                        orderOptions.find(
                          (o) => o.id === lastSubmittedOrderType
                        )?.title
                      }
                    </strong>{" "}
                    здійснюється на картку після вибору фото.
                  </p>
                </div>
                <p>
                  🔗 Ознайомитися з роботами можна на нашій сторінці в Instagram
                  «А фото»:{" "}
                  <a
                    href="https://www.instagram.com/aphoto2010/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    https://www.instagram.com/aphoto2010/
                  </a>
                </p>
              </div>
            )}
            {lastSubmittedOrderType === "premium" && (
              <div className="space-y-4 text-base leading-relaxed">
                <p>
                  ✅ Ви внесли всі дані у формі – попередній запис виконано. Ви
                  обрали пакет{" "}
                  <strong className="text-gray-900">
                    {
                      orderOptions.find((o) => o.id === lastSubmittedOrderType)
                        ?.title
                    }
                  </strong>
                </p>
                <div className="space-y-2">
                  <p className="font-semibold text-gray-900">💳 Оплата:</p>
                  <p>
                    📸 Фотозйомка для пакету{" "}
                    <strong className="text-gray-900">
                      {
                        orderOptions.find(
                          (o) => o.id === lastSubmittedOrderType
                        )?.title
                      }
                    </strong>{" "}
                    здійснюється лише після 100% оплати у день турніру, після
                    реєстрації та повідомлення номера участі асистенту фотографа
                    біля зеленого рекламного банера «А Фото».
                  </p>
                </div>

                <p>
                  🔗 Ознайомитися з нашими роботами можна на Instagram-сторінці
                  «А фото»:{" "}
                  <a
                    href="https://www.instagram.com/aphoto2010/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    https://www.instagram.com/aphoto2010/
                  </a>
                </p>
              </div>
            )}
            <div className="pt-4 flex justify-center">
              <Link
                href="/"
                className="inline-block w-full sm:w-auto text-center text-white text-lg py-3 px-6 rounded-md bg-green-600 hover:bg-green-500 transition-colors"
              >
                На головну
              </Link>
            </div>
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

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <div className="text-gray-700 text-lg w-[52px]">Імʼя:</div>
                <div className="flex-1 rounded-md border px-4 py-3 bg-gray-100 text-gray-900 text-lg text-center">
                  {participantName}
                </div>
              </div>

              {secondName && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-[52px]"></div>
                    <p className="flex-1 text-gray-500 text-lg text-center">
                      танцює у парі з
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-[52px]"></div>
                    <div className="flex-1 rounded-md border px-4 py-3 bg-gray-100 text-gray-900 text-lg text-center">
                      {secondName}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-gray-700 text-lg mb-2 font-medium">
                Категорія / Програма / Час:
                <span className="text-red-500 ml-0.5" aria-hidden="true">
                  *
                </span>
              </label>

              <ul className="list-none p-4 bg-gray-100 border rounded-md flex flex-col gap-2">
                {results.map((item, index) => {
                  const key = getItemKey(item, index);
                  const checked = selectedItems.includes(key);

                  return (
                    <li key={key}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleItemToggle(key, !checked)}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            handleItemToggle(key, !checked);
                          }
                        }}
                        className="flex items-start gap-2 cursor-pointer select-none"
                      >
                        <span className="shrink-0 mt-[2px]">
                          <CustomCheckbox
                            checked={checked}
                            onChange={() => {}}
                          />
                        </span>
                        <span className="text-gray-900">
                          {removeLastBracket(item.category)} / {item.program} /{" "}
                          {item.time}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <label className="block text-gray-700 text-lg mb-1 font-medium">
                Реєстраційний номер
                <span className="text-red-500 ml-0.5" aria-hidden="true">
                  *
                </span>
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
                  onChange={(event) => {
                    const onlyDigits = event.target.value.replace(/\D/g, "");
                    setRegNumber(onlyDigits);
                  }}
                  className="w-1/3 rounded-md px-4 py-3 text-lg border border-gray-300 bg-gray-100 text-gray-900 focus:outline-none"
                />
                <div className="flex items-center gap-1 text-gray-900 w-2/3">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={toggleRegNumberUnknown}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        toggleRegNumberUnknown();
                      }
                    }}
                    className="flex items-center gap-2 cursor-pointer select-none"
                  >
                    <CustomCheckbox
                      checked={regNumberUnknown}
                      onChange={() => {}}
                    />
                    <span className="text-gray-900">Не знаю</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-lg mb-2 font-medium">
                Вид замовлення
                <span className="text-red-500 ml-0.5" aria-hidden="true">
                  *
                </span>
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
                        className={`text-sm sm:text-base leading-tight tracking-tight ${
                          orderType === option.id
                            ? "text-green-700 font-bold"
                            : "text-gray-900 font-medium"
                        }`}
                      >
                        {option.title} {orderType === option.id && "✓"}
                      </span>
                      <span className="text-xl text-gray-400 shrink-0 w-5 text-center">
                        {openAccordion === option.id ? "−" : "+"}
                      </span>
                    </button>

                    <div
                      className={`transition-all duration-500 ease-in-out overflow-hidden ${
                        openAccordion === option.id
                          ? "max-h-[1000px] opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="p-4 pt-2 bg-gray-50">
                        <div className="text-gray-700 text-base mb-4 leading-normal">
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
                <span className="text-red-500 ml-0.5" aria-hidden="true">
                  *
                </span>
              </label>

              <CustomPhoneInput value={phone} onChange={setPhone} />
            </div>

            <p className="text-base italic text-gray-500 mb-2">
              <span className="text-red-500 ml-0.5" aria-hidden="true">
                *
              </span>{" "}
              Всі поля обовʼязкові для заповнення
            </p>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-full text-white text-lg py-3 rounded-md ${
                sending
                  ? "bg-gray-400 hover:bg-gray-400"
                  : "bg-green-600 hover:bg-green-500"
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
