import { Suspense } from "react";
import ResultsClient from "./ResultsClient";

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <p className="p-6 text-center text-gray-500">Завантаження сторінки…</p>
      }
    >
      <ResultsClient />
    </Suspense>
  );
}
