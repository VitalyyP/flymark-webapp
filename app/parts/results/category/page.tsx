import { Suspense } from "react";
import CategoryClient from "./CategoryClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <p className="p-6 text-center text-gray-500">Завантаження сторінки…</p>
      }
    >
      <CategoryClient />
    </Suspense>
  );
}
