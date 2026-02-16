"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Clock, Calendar, ChevronRight, Loader2, Camera } from "lucide-react";

import { decodeEvent, encodeEvent } from "@/utils/eventPayload";

type SheetRow = {
  Time: string;
};

type ApiResponse = {
  rows: SheetRow[];
};

type TimeItem = {
  part: number;
  time: string;
  enabled: boolean;
};

export default function PartsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventParam = searchParams.get("event");

  const [eventId, setEventId] = useState("");
  const [eventName, setEventName] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const [times, setTimes] = useState<TimeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventParam) return;
    const decoded = decodeEvent(eventParam);
    if (!decoded) return;
    setEventId(decoded.id);
    setEventName(decoded.name);
    setCoverUrl(decoded.coverUrl);
  }, [eventParam]);

  useEffect(() => {
    if (!eventId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [sheetRes, flymarkRes] = await Promise.all([
          fetch(`/api/get-participants?event=${eventId}`),
          fetch(`/api/event-times?event=${eventId}`)
        ]);
        const sheetData: ApiResponse = await sheetRes.json();
        const flymarkData: { times: string[] } = await flymarkRes.json();
        const sheetTimes = new Set(
          sheetData.rows.map((r) => r.Time).filter(Boolean)
        );
        const allTimes = Array.from(
          new Set([...flymarkData.times, ...sheetTimes])
        ).sort((a, b) => a.localeCompare(b, "uk", { numeric: true }));
        const merged: TimeItem[] = allTimes.map((time, index) => ({
          part: index + 1,
          time,
          enabled: sheetTimes.has(time)
        }));
        setTimes(merged);
      } catch {
        setTimes([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [eventId]);

  const handleTimeSelect = (item: TimeItem) => {
    if (!item.enabled) return;
    const encoded = encodeEvent({
      id: eventId,
      name: eventName,
      coverUrl,
      time: item.time,
      part: item.part.toString()
    });
    router.push(`/parts/results?event=${encodeURIComponent(encoded)}`);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-zinc-50 p-4 sm:p-6">
      <main className="w-full max-w-md flex flex-col gap-6">
        <div className="flex flex-col items-center gap-5 pt-4">
          {coverUrl && (
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md">
                <Image
                  src={coverUrl}
                  alt={eventName}
                  width={128}
                  height={128}
                  className="object-cover w-full h-full"
                  priority
                />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-green-600 text-white p-2 rounded-full shadow-lg">
                <Camera size={20} />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-[22px] md:text-[24px] font-black text-zinc-900 tracking-tight leading-tight px-4">
              {eventName}
            </h1>
            <div className="inline-flex items-center justify-center gap-2 text-zinc-500 text-sm font-medium">
              <Calendar size={14} className="text-green-600" />
              <span>Панель фотографа</span>
            </div>
          </div>
        </div>

        <div className="w-full flex items-center gap-3 px-4 py-2.5 bg-[#ffefd3] rounded-md shadow-sm border border-transparent">
          <Clock size={18} className="text-green-600" />
          <span className="text-[11px] font-black uppercase tracking-widest text-zinc-600">
            Виберіть відділення
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-400">
            <Loader2 size={32} className="animate-spin text-green-600" />
            <p className="text-sm font-bold uppercase tracking-widest">
              Завантаження...
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {" "}
            {times.length > 0 ? (
              times.map((item) => (
                <button
                  key={`${item.part}-${item.time}`}
                  onClick={() => handleTimeSelect(item)}
                  disabled={!item.enabled}
                  className={`group relative flex items-center justify-between py-3 px-4 transition-all duration-200 rounded-[18px] border-2 text-left
          ${
            item.enabled
              ? "bg-white border-zinc-100 hover:border-green-600 shadow-sm active:scale-[0.98]"
              : "bg-zinc-100 border-zinc-200 opacity-60 cursor-not-allowed"
          }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[12px] font-black uppercase ${
                        item.enabled ? "text-green-600" : "text-zinc-400"
                      }`}
                    >
                      Відділення{" "}
                      <span className={`text-[16px] font-black uppercase`}>
                        {" "}
                        {item.part}{" "}
                      </span>
                    </span>
                    <span className="text-zinc-400 font-light text-sm">/</span>
                    <span
                      className={`text-[16px] font-bold ${
                        item.enabled ? "text-zinc-800" : "text-zinc-500"
                      }`}
                    >
                      {item.time}
                    </span>
                  </div>

                  {item.enabled ? (
                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center group-hover:bg-green-600 transition-colors">
                      <ChevronRight
                        size={18}
                        className="text-green-600 group-hover:text-white transition-colors"
                      />
                    </div>
                  ) : (
                    <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-200/50 px-2 py-1 rounded-lg border border-zinc-200">
                      Немає записів
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="text-center py-8 px-6 bg-white rounded-[22px] border-2 border-dashed border-zinc-200">
                <p className="text-zinc-500 font-medium text-sm">
                  Списки учасників ще не завантажені.
                </p>
              </div>
            )}
          </div>
        )}

        <p className="text-start text-sm text-zinc-400 font-medium px-1">
          Натисніть на активне відділення, щоб переглянути список учасників та
          їх реєстраційні номери.
        </p>
      </main>
    </div>
  );
}
