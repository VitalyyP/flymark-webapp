"use client";

import { Suspense } from "react";
import SelectParticipantPage from "./SelectParticipantPage";

export default function Page() {
  return (
    <Suspense fallback={<div>Завантаження...</div>}>
      <SelectParticipantPage />
    </Suspense>
  );
}
