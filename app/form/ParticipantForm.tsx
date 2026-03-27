"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { CustomCheckbox } from "@/components/CustomCheckbox";
import { User, Award, Clock, Fingerprint, Loader2 } from "lucide-react";

import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  formatTournamentStartDisplay,
  normalizeTimeUniversal,
} from "@/utils/normalizeTime";

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
  eventDate: string;
  coverUrl: string;
};

export function ParticipantForm({
  participant,
  results = [],
  eventId,
  eventName,
  eventDate,
}: Props) {
  const [regNumber, setRegNumber] = useState("");
  const [regNumberUnknown, setRegNumberUnknown] = useState(false);
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loadingNumber, setLoadingNumber] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const programRef = useRef<HTMLDivElement>(null);
  const regNumberRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  const [showValidation, setShowValidation] = useState(false);
  const [error, setError] = useState(false);

  const errorRef = useRef<HTMLDivElement>(null);

  const scrollToError = () => {
    setShowValidation(true);

    const errors = [
      { condition: selectedItems.length === 0, ref: programRef },
      { condition: !regNumber && !regNumberUnknown, ref: regNumberRef },
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

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [error]);

  const participantName = participant.name;

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
  const hasRequiredFields = hasRegNumber && isPhoneValid;
  const hasItems = selectedItems.length > 0;
  const canSubmit = hasRequiredFields && hasItems && !sending;

  const { club, city } = (() => {
    const first = results[0];
    return {
      club: first?.club ?? "",
      city: first?.city ?? "",
    };
  })();

  const secondName: string = (() => {
    for (const r of results) {
      if (r.dancer1Name && r.dancer1Name !== participantName)
        return r.dancer1Name;
      if (r.dancer2Name && r.dancer2Name !== participantName)
        return r.dancer2Name;
    }
    return "";
  })();

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSending(true);
    setError(false);
    setSuccess(false);

    const selected = results
      .map((item, index) => ({
        item,
        index,
        key: getItemKey(item, index),
      }))
      .filter(({ key }) => selectedItems.includes(key))
      .map(({ item }) => ({
        category: item.category,
        program: item.program,
        time: normalizeTimeUniversal(item.time),
      }));

    const payload = {
      eventId: Number(eventId),
      eventName,
      eventDate,
      name: participantName,
      secondName,
      club,
      city,
      items: selected,
      regNumber: regNumberUnknown ? "Не знаю" : regNumber,
      orderType: "basic",
      phone,
    };

    try {
      const response = await fetch("/api/save-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setRegNumber("");
        setRegNumberUnknown(false);
        setPhone("");
        setSelectedItems([]);
      } else {
        console.log(data.error);
        setError(true);
      }
    } catch {
      console.log("Something went wrong");
      setError(true);
    } finally {
      setSending(false);
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

            <h2 className="font-century text-[26px] md:text-[30px] text-zinc-900 tracking-tight text-center leading-tight">
              Дякуємо! <br />
              <span className="text-[#00a63e]">Запис виконано.</span>
            </h2>

            <div className="flex flex-col gap-5 text-[15px] leading-relaxed text-zinc-600">
              <div className="bg-white border-2 font-semibold border-zinc-100 rounded-[22px] p-5 shadow-sm text-center">
                <p>ПОБАЧИМОСЬ на ТУРНІРІ</p>
              </div>

              <div className="space-y-4 px-1">
                <p className="flex gap-3">
                  <span>
                    Ви завжди можете перевірити або уточнити деталі замовлення у
                    нашого асистента біля зеленого банера{" "}
                    <strong className="text-zinc-900">«А Фото»</strong> прямо
                    під час турніру!
                  </span>
                </p>
              </div>
            </div>

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
                          {item.category}
                        </span>
                        <div className="flex flex-wrap justify-between gap-y-2 gap-x-1">
                          <div className="flex items-center gap-1.5 py-1 px-2 bg-zinc-100 rounded-lg border border-zinc-200/50">
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
                                {formatTournamentStartDisplay(item.time)}
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
                  Cтартовий номер учасника{" "}
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
                      Будь ласка, після отримання номера учасника на руки,
                      уточніть дані в{" "}
                      <span className="text-zinc-800 font-bold">
                        асистента фотографа біля зеленого банера «А фото»
                      </span>
                      .
                    </>
                  ) : (
                    "Введіть номер, під яким ви виступаєте на паркеті."
                  )}
                </p>
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

            <div className="w-full flex flex-col gap-6">
              <h2 className="font-black text-center text-2xl text-zinc-600">
                📸 Що далі?
              </h2>

              <div className="flex flex-col gap-5 px-2">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-green-100 text-[#00a63e] flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                  </div>
                  <p className="text-[14px] text-zinc-600 leading-relaxed">
                    Після натискання кнопки{" "}
                    <button
                      onClick={() =>
                        window.scrollTo({
                          top: document.body.scrollHeight,
                          behavior: "smooth",
                        })
                      }
                      className="font-bold text-[#00a63e] hover:underline decoration-dashed underline-offset-4 cursor-pointer"
                    >
                      «Відправити замовлення»
                    </button>{" "}
                    ми опрацьовуємо дані та передаємо їх фотографу.
                  </p>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-green-100 text-[#00a63e] flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                  </div>
                  <p className="text-[14px] text-zinc-600 leading-relaxed">
                    <b>Вибір фото:</b> протягом <strong>3–7 днів</strong> на
                    вказаний вами номер у Viber/Telegram ми надішлемо зразки
                    фото для вибору.
                  </p>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-green-100 text-[#00a63e] flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                  </div>
                  <p className="text-[14px] text-zinc-600 leading-relaxed">
                    <b>Отримання:</b> після оплати на карту ви отримаєте
                    посилання на «хмару» з оригіналами фото у високій якості.
                  </p>
                </div>

                <div className="mt-2 p-5 rounded-3xl bg-white border border-zinc-100 shadow-sm">
                  <h4 className="text-[13px] font-bold text-zinc-800 uppercase tracking-wide mb-3 flex items-center gap-2 justify-center">
                    <span>💰</span>
                    Вартість
                  </h4>
                  <ul className="space-y-2">
                    <li className="flex justify-between text-[14px]">
                      <span className="font-bold text-zinc-800">1–3 фото</span>
                      <span className="text-zinc-800">100 грн/шт</span>
                    </li>
                    <li className="flex justify-between text-[14px] border-t pt-2 border-zinc-100">
                      <span className="font-bold text-zinc-800">4+ фото</span>
                      <span className="text-zinc-800">90 грн/шт</span>
                    </li>
                    <li className="flex justify-between text-[14px] border-t pt-2 border-zinc-100">
                      <span className="font-bold text-zinc-800">Усі фото</span>
                      <span className="text-zinc-800">700–1100 грн</span>
                    </li>
                  </ul>

                  <div className="mt-4 pt-4 border-t border-dashed border-zinc-200">
                    <div className="flex gap-2">
                      <span className="text-[#00a63e] font-bold text-lg leading-none">
                        *
                      </span>

                      <p className="text-[13px] leading-relaxed text-zinc-600">
                        <span className="text-[#00a63e] font-bold text-[11px] uppercase tracking-wider mr-1">
                          Опція &quot;PREMIUM&quot;
                        </span>
                        – отримайте всі фото вже завтра!
                        <span className="text-zinc-500 italic block mt-1 text-[12px]">
                          (За особистою домовленістю з фотографом або асистентом
                          у день турніру)
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="w-full flex flex-col gap-3 mt-6"
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

              {error && (
                <div
                  ref={errorRef}
                  className="w-full bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3"
                >
                  <svg
                    className="w-5 h-5 text-red-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"
                    />
                  </svg>
                  <span className="text-red-700 text-sm sm:text-base">
                    Сталася помилка при відправці форми. Спробуйте ще раз.
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
