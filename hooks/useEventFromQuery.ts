"use client";

import { useSearchParams } from "next/navigation";
import { decodeEvent } from "@/utils/eventPayload";

export const useEventFromQuery = () => {
  const params = useSearchParams();
  const encoded = params.get("event");
  return encoded ? decodeEvent(encoded) : null;
};
