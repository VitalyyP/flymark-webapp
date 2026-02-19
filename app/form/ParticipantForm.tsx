"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { CustomCheckbox } from "@/components/CustomCheckbox";
import {
  User,
  Award,
  Clock,
  Fingerprint,
  Loader2,
  LayoutList,
  ChevronDown,
} from "lucide-react";

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
  club: string;
  city: string;
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

  const programRef = useRef<HTMLDivElement>(null);
  const regNumberRef = useRef<HTMLDivElement>(null);
  const orderTypeRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  const [showValidation, setShowValidation] = useState(false);

  const scrollToError = () => {
    setShowValidation(true);

    const errors = [
      { condition: selectedItems.length === 0, ref: programRef },
      { condition: !regNumber && !regNumberUnknown, ref: regNumberRef },
      { condition: !orderType, ref: orderTypeRef },
      { condition: phone.replace(/\D/g, "").length < 10, ref: phoneRef },
    ];

    const firstError = errors.find((e) => e.condition);
    if (firstError?.ref.current) {
      firstError.ref.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

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
      ),
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
      ),
    },
  ];

  const { club, city } = (() => {
    const first = results[0];
    return {
      club: first?.club ?? "",
      city: first?.city ?? "",
    };
  })();

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
        key: getItemKey(item, index),
      }))
      .filter(({ key }) => selectedItems.includes(key))
      .map(({ item }) => ({
        category: removeLastBracket(item.category),
        program: item.program,
        time: item.time,
      }));

    const payload = {
      eventId: Number(eventId),
      eventName,
      name: participantName,
      secondName,
      club,
      city,
      items: selected,
      regNumber: regNumberUnknown ? "Не знаю" : regNumber,
      orderType,
      phone,
    };

    const response = await fetch("/api/save-form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
    <div className="flex flex-col min-h-screen bg-zinc-50 text-zinc-900 font-sans items-center px-4 py-8 md:py-12">
      <main className="w-full max-w-[440px] flex flex-col items-center gap-12 md:gap-14">
        {success ? (
          <div className="flex flex-col gap-6 py-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                <div className="w-12 h-12 bg-[#00a63e] rounded-full flex items-center justify-center shadow-md shadow-green-900/20">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-8 h-8 text-white"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
            </div>

            <h2 className="text-[26px] md:text-[30px] font-semibold text-zinc-900 tracking-tight text-center leading-tight">
              Дякуємо! <br />
              <span className="text-[#00a63e]">Ваше замовлення прийнято.</span>
            </h2>

            {lastSubmittedOrderType === "basic" && (
              <div className="flex flex-col gap-5 text-[15px] leading-relaxed text-zinc-600">
                <div className="bg-white border-2 border-zinc-100 rounded-[22px] p-5 shadow-sm">
                  <p>
                    ✅ Ви внесли всі дані –{" "}
                    <strong className="text-zinc-900 font-extrabold">
                      ЗАПИС ВИКОНАНО.
                    </strong>{" "}
                    Ви обрали пакет{" "}
                    <span className="text-[#00a63e] font-black uppercase tracking-tight">
                      {
                        orderOptions.find(
                          (o) => o.id === lastSubmittedOrderType
                        )?.title
                      }
                    </span>
                    . Очікуйте зразки!
                  </p>
                </div>

                <div className="bg-[#ffefd3] p-5 rounded-[22px] border-2 border-[#ffefd3] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
                  <p className="font-bold text-amber-900 text-[14px]">
                    ⚠️ Якщо не всі дані були введені – виконано попередній
                    запис. Для підтвердження запису повідомте номер участі та
                    уточніть категорію асистенту біля зеленого банера «А фото».
                  </p>
                </div>

                <div className="space-y-4 px-1">
                  <p className="flex gap-3">
                    <span className="shrink-0">📝</span>
                    <span>
                      Зразки фото ви отримаєте протягом{" "}
                      <span className="text-zinc-900 font-bold underline decoration-[#00a63e]/30">
                        3–7 днів
                      </span>{" "}
                      після турніру на вказаний вами номер у Viber або Telegram.
                    </span>
                  </p>

                  <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
                    <p className="font-black text-zinc-900 uppercase text-[11px] tracking-widest mb-1">
                      💳 Оплата:
                    </p>
                    <p>
                      послуги для пакету{" "}
                      <strong className="text-zinc-900">
                        {
                          orderOptions.find(
                            (o) => o.id === lastSubmittedOrderType
                          )?.title
                        }
                      </strong>{" "}
                      здійснюється на картку після вибору фото.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {lastSubmittedOrderType === "premium" && (
              <div className="flex flex-col gap-5 text-[15px] leading-relaxed text-zinc-600">
                <div className="bg-white border-2 border-zinc-100 rounded-[22px] p-5 shadow-sm">
                  <p>
                    ✅ Ви внесли всі дані у формі –{" "}
                    <span className="text-zinc-900 font-bold">
                      попередній запис виконано.
                    </span>{" "}
                    Ви обрали пакет{" "}
                    <span className="text-[#00a63e] font-black uppercase tracking-tight">
                      {
                        orderOptions.find(
                          (o) => o.id === lastSubmittedOrderType
                        )?.title
                      }
                    </span>
                  </p>
                </div>

                <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-100">
                  <p className="font-black text-zinc-900 uppercase text-[11px] tracking-widest mb-2 flex items-center gap-2">
                    <span className="text-lg">💳</span> Оплата:
                  </p>
                  <p className="text-zinc-700 font-medium">
                    📸 Фотозйомка для пакету{" "}
                    <strong className="text-zinc-900">
                      {
                        orderOptions.find(
                          (o) => o.id === lastSubmittedOrderType
                        )?.title
                      }
                    </strong>{" "}
                    здійснюється лише після{" "}
                    <span className="text-zinc-900 font-bold underline decoration-[#00a63e]/30">
                      100% оплати
                    </span>{" "}
                    у день турніру.
                  </p>
                  <div className="mt-3 p-3 bg-[#00a63e]/5 rounded-xl border-l-4 border-[#00a63e] text-[13px] italic">
                    Після реєстрації повідомте номер участі асистенту біля
                    зеленого банера «А Фото».
                  </div>
                </div>
              </div>
            )}

            <div className="py-2 text-center">
              <p className="text-zinc-400 text-[13px] mb-2 uppercase font-black tracking-widest">
                Ми в Instagram
              </p>
              <a
                href="https://www.instagram.com/aphoto2010/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-100 rounded-full text-zinc-900 font-bold hover:bg-zinc-200 transition-all text-[14px]"
              >
                <span className="text-[#00a63e]">@aphoto2010</span>
              </a>
            </div>

            <div className="pt-2">
              <Link
                href="/"
                className="w-full py-4 rounded-2xl font-semibold text-[17px] flex items-center justify-center gap-3 transition-all shadow-lg active:scale-[0.98]
              bg-green-600 text-white active:scale-95 cursor-pointer shadow-green-900/10"
              >
                На головну
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full flex flex-col gap-8">
              <h1 className="text-[28px] md:text-[32px] font-bold text-zinc-900 tracking-tight text-center">
                Дані учасника
              </h1>
            </div>

            <div className="w-full flex flex-col gap-4">
              <div className="w-full flex items-center gap-3 px-4 py-2 bg-[#ffefd3] rounded-md shadow-sm border border-transparent">
                <User size={18} className="text-[#00a63e]" />
                <span className="text-[11px] font-black uppercase tracking-widest text-zinc-600">
                  Спортсмен
                </span>
              </div>

              <div className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-100 flex flex-col items-center gap-3">
                <div className="w-full py-3.5 px-4 rounded-xl bg-zinc-50 border border-zinc-100 text-center font-bold text-zinc-900 text-lg shadow-inner">
                  {participantName}
                </div>

                {secondName && (
                  <>
                    <div className="flex items-center gap-3 w-full py-1">
                      <div className="h-px flex-1 bg-zinc-100"></div>
                      <span className="text-[12px] font-medium text-zinc-400 italic">
                        танцює у парі з
                      </span>
                      <div className="h-px flex-1 bg-zinc-100"></div>
                    </div>
                    <div className="w-full py-3.5 px-4 rounded-xl bg-zinc-50 border border-zinc-100 text-center font-bold text-zinc-900 text-lg shadow-inner">
                      {secondName}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div ref={programRef} className="w-full flex flex-col gap-5">
              <div className="flex flex-col gap-3 px-1">
                <div
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-md shadow-sm transition-all duration-300 border
                    ${
                      showValidation && selectedItems.length === 0
                        ? "bg-red-50 border-red-200 ring-2 ring-red-500/5"
                        : "bg-[#ffefd3] border-transparent"
                    }
                  `}
                >
                  <Award
                    size={16}
                    className={
                      showValidation && selectedItems.length === 0
                        ? "text-red-500"
                        : "text-[#00a63e]"
                    }
                  />
                  <span
                    className={`text-[11px] font-black uppercase tracking-widest ${
                      showValidation && selectedItems.length === 0
                        ? "text-red-700"
                        : "text-zinc-600"
                    }`}
                  >
                    Програма виступів{" "}
                    <span className="text-red-500 text-xl ml-1 leading-none inline-block transform translate-y-1">
                      *
                    </span>
                  </span>
                </div>
                <p className="text-[14px] text-zinc-500 pl-1">
                  Будь ласка, оберіть категорії, у яких ви{" "}
                  <span className="text-zinc-800 font-bold">бажаєте</span>, щоб
                  фотограф зробив знімки.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {results.map((item, index) => {
                  const key = getItemKey(item, index);
                  const checked = selectedItems.includes(key);
                  return (
                    <div
                      key={key}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleItemToggle(key, !checked)}
                      className={`flex items-start gap-4 p-4 transition-all duration-200 cursor-pointer select-none rounded-[22px] border-2
                        ${
                          checked
                            ? "bg-green-50/40 border-[#00a63e] shadow-md shadow-green-900/5"
                            : showValidation && selectedItems.length === 0
                            ? "bg-white border-red-100 shadow-sm"
                            : "bg-white border-zinc-100 hover:border-zinc-200 shadow-sm"
                        }
                      `}
                    >
                      <div className="shrink-0 mt-px">
                        <CustomCheckbox checked={checked} onChange={() => {}} />
                      </div>
                      <div className="flex flex-col gap-2 w-full">
                        <span
                          className={`text-[15px] md:text-[16px] font-bold leading-snug ${
                            checked ? "text-zinc-900" : "text-zinc-800"
                          }`}
                        >
                          {removeLastBracket(item.category)}
                        </span>
                        <div className="flex flex-wrap justify-between gap-y-2 gap-x-4">
                          <div className="flex items-center gap-1.5 py-1 px-2.5 bg-zinc-100 rounded-lg border border-zinc-200/50">
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">
                              Програма:
                            </span>
                            <span className="text-[12px] font-bold text-zinc-600">
                              {item.program}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-zinc-500">
                            <Clock size={14} className="text-zinc-400" />
                            <span className="text-[13px] font-medium">
                              Початок о{" "}
                              <span className="font-bold text-zinc-700">
                                {item.time}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div ref={regNumberRef} className="w-full flex flex-col gap-4">
              <div
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-md shadow-sm transition-all duration-300 border
                  ${
                    showValidation && !regNumber && !regNumberUnknown
                      ? "bg-red-50 border-red-200 ring-2 ring-red-500/5"
                      : "bg-[#ffefd3] border-transparent"
                  }
                `}
              >
                <Fingerprint
                  size={20}
                  className={
                    showValidation && !regNumber && !regNumberUnknown
                      ? "text-red-500"
                      : "text-[#00a63e]"
                  }
                />
                <span
                  className={`text-[11px] font-black uppercase tracking-widest ${
                    showValidation && !regNumber && !regNumberUnknown
                      ? "text-red-700"
                      : "text-zinc-600"
                  }`}
                >
                  Реєстраційний номер{" "}
                  <span className="text-red-600 text-xl ml-1 leading-none inline-block transform translate-y-1">
                    *
                  </span>
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-stretch gap-2 sm:gap-3">
                  <div className="relative flex-1 min-w-0">
                    {(() => {
                      const isSuccess =
                        regNumber.length > 0 && !regNumberUnknown;
                      const isError =
                        showValidation && !regNumber && !regNumberUnknown;

                      return (
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={regNumberUnknown ? "" : regNumber}
                          disabled={regNumberUnknown || loadingNumber}
                          placeholder={loadingNumber ? "Пошук..." : "Номер"}
                          onChange={(event) => {
                            const onlyDigits = event.target.value.replace(
                              /\D/g,
                              ""
                            );
                            setRegNumber(onlyDigits);
                          }}
                          className={`w-full border-2 rounded-[22px] py-4 px-4 sm:px-5 text-lg sm:text-xl font-bold transition-all outline-none appearance-none
                            ${
                              regNumberUnknown
                                ? "bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed"
                                : isSuccess
                                ? "bg-white border-[#00a63e] ring-4 ring-green-500/5 text-zinc-800"
                                : isError
                                ? "bg-white border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/5 text-zinc-800"
                                : "bg-white border-zinc-100 focus:border-[#00a63e] focus:ring-4 focus:ring-green-500/5 text-zinc-800"
                            }
                          `}
                        />
                      );
                    })()}
                    {loadingNumber && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2
                          size={18}
                          className="text-[#00a63e] animate-spin"
                        />
                      </div>
                    )}
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={toggleRegNumberUnknown}
                    className={`flex-none w-[115px] sm:w-[130px] flex items-center justify-center gap-2 px-2 sm:px-4 rounded-[22px] border-2 transition-all cursor-pointer select-none 
                      ${
                        regNumberUnknown
                          ? "bg-white border-[#00a63e] shadow-sm shadow-green-900/10"
                          : "bg-white border-zinc-100 text-zinc-500 hover:border-zinc-200"
                      }
                    `}
                  >
                    <div className="shrink-0 scale-90 sm:scale-100">
                      <CustomCheckbox
                        checked={regNumberUnknown}
                        onChange={() => {}}
                      />
                    </div>
                    <span
                      className={`text-[14px] font-semibold whitespace-nowrap transition-colors ${
                        regNumberUnknown ? "text-[#00a63e]" : "text-zinc-500"
                      }`}
                    >
                      Не знаю
                    </span>
                  </div>
                </div>
                <p className="text-[14px] text-zinc-500 pl-1">
                  {regNumberUnknown ? (
                    <>
                      Будь ласка, уточніть ваш номер у{" "}
                      <span className="text-zinc-800 font-bold">
                        асистента біля зеленого банера
                      </span>
                      .
                    </>
                  ) : (
                    "Введіть номер, під яким ви виступаєте на паркеті."
                  )}
                </p>
              </div>
            </div>

            <div ref={orderTypeRef} className="w-full flex flex-col gap-4">
              <label
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-md shadow-sm transition-all duration-300 border
                  ${
                    showValidation && !orderType
                      ? "bg-red-50 border-red-200 ring-2 ring-red-500/5"
                      : "bg-[#ffefd3] border-transparent"
                  }
                `}
              >
                <LayoutList
                  size={18}
                  className={
                    showValidation && !orderType
                      ? "text-red-500"
                      : "text-[#00a63e]"
                  }
                />
                <span
                  className={`text-[11px] font-black uppercase tracking-widest ${
                    showValidation && !orderType
                      ? "text-red-700"
                      : "text-zinc-600"
                  }`}
                >
                  Вид замовлення{" "}
                  <span className="text-red-500 text-xl ml-1 leading-none inline-block transform translate-y-1">
                    *
                  </span>
                </span>
              </label>

              <div className="flex flex-col gap-3">
                {orderOptions.map((option) => {
                  const isOpened = openAccordion === option.id;
                  const isSelected = orderType === option.id;
                  return (
                    <div
                      key={option.id}
                      className={`group overflow-hidden rounded-3xl border-2 transition-all duration-300
                        ${
                          isSelected
                            ? "border-green-600 bg-green-50/30 shadow-md shadow-green-900/5"
                            : showValidation && !orderType
                            ? "border-red-100 bg-white"
                            : "border-zinc-100 bg-white hover:border-zinc-200"
                        }
                      `}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenAccordion(isOpened ? null : option.id)
                        }
                        className="w-full flex justify-between items-center p-5 text-left outline-none cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                  ${
                    isSelected
                      ? "border-[#00a63e] bg-[#00a63e]"
                      : "border-zinc-200"
                  }`}
                          >
                            {isSelected && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                          <span
                            className={`text-[15px] sm:text-base font-bold ${
                              isSelected ? "text-zinc-900" : "text-zinc-700"
                            }`}
                          >
                            {option.title}
                          </span>
                        </div>
                        <div
                          className={`transition-transform duration-300 ${
                            isOpened ? "rotate-180" : ""
                          }`}
                        >
                          <ChevronDown
                            size={20}
                            className={
                              isOpened ? "text-[#00a63e]" : "text-zinc-400"
                            }
                          />
                        </div>
                      </button>
                      <div
                        className={`transition-all duration-300 ease-in-out overflow-hidden px-4 ${
                          isOpened
                            ? "max-h-[2000px] opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="px-5 pb-5 pt-0 flex flex-col gap-5">
                          <div className="h-px w-full bg-zinc-300" />
                          <div className="text-zinc-600 text-[14px] leading-relaxed">
                            {option.description}
                          </div>
                          <button
                            type="button"
                            onClick={() => setOrderType(option.id)}
                            className={`w-full py-3.5 rounded-xl font-black uppercase text-[12px] tracking-widest transition-all
                              ${
                                isSelected
                                  ? "bg-[#00a63e] text-white"
                                  : "bg-green-50/40 border-2 border-[#00a63e] shadow-md shadow-green-900/5"
                              }
                            `}
                          >
                            {isSelected ? "Пакет обрано" : "Обрати цей пакет"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div ref={phoneRef} className="w-full flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <label
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-md shadow-sm transition-all duration-300 border
                    ${
                      showValidation && phone.length < 10
                        ? "bg-red-50 border-red-200 ring-2 ring-red-500/5"
                        : "bg-[#ffefd3] border-transparent"
                    }
                  `}
                >
                  <div className="flex items-center justify-center w-5 h-5 mt-1">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className={
                        showValidation && phone.length < 10
                          ? "text-red-500 w-full h-full"
                          : "text-[#00a63e] w-full h-full"
                      }
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <span
                    className={`text-[11px] font-black uppercase tracking-widest ${
                      showValidation && phone.length < 10
                        ? "text-red-700"
                        : "text-zinc-600"
                    }`}
                  >
                    Номер телефону{" "}
                    <span className="text-red-500 text-xl ml-1 leading-none inline-block transform translate-y-1">
                      *
                    </span>
                  </span>
                </label>
                <div className="relative group">
                  <CustomPhoneInput value={phone} onChange={setPhone} />
                  <p className="mt-3 px-2 text-[14px] text-zinc-500 italic">
                    На цей номер ми надішлемо посилання на ваші фото у{" "}
                    <span className="text-zinc-800 font-bold">
                      Viber або Telegram
                    </span>
                    .
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 px-1 py-4 border-t border-zinc-200">
                <span className="text-red-600 text-xl font-bold animate-pulse select-none leading-none">
                  *
                </span>
                <p className="text-[14px] font-medium text-zinc-500">
                  Будь ласка, заповніть{" "}
                  <span className="text-zinc-800 font-bold">всі поля</span> для
                  успішного замовлення
                </p>
              </div>
            </div>

            <div
              className="w-full -mt-6"
              onClickCapture={!canSubmit ? scrollToError : undefined}
            >
              <button
                onClick={handleSubmit}
                disabled={sending}
                className={`w-full py-4 rounded-[22px] font-semibold text-[17px] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed
                  ${
                    sending || !canSubmit
                      ? "bg-zinc-200 text-zinc-400"
                      : "bg-[#00a63e] text-white active:scale-[0.98] shadow-md shadow-green-900/10"
                  }
                `}
              >
                <div className="flex items-center justify-center gap-2">
                  {sending && <Loader2 size={20} className="animate-spin" />}
                  <span>
                    {sending ? "Відправляю..." : "Відправити замовлення"}
                  </span>
                </div>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
