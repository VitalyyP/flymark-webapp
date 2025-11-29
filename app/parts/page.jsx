import { Suspense } from "react";
import PartsClient from "./PartsClient";

export default function PartsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Завантаження...</div>}>
      <PartsClient />
    </Suspense>
  );
}
