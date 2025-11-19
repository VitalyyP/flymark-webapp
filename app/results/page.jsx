"use client";
import { useEffect, useState } from "react";

export default function ResultsPage() {
  const [data, setData] = useState([]);
  const [filterAge, setFilterAge] = useState("");

  const load = async () => {
    const res = await fetch("/api/data?age=" + filterAge);
    const json = await res.json();
    setData(json);
  };

  useEffect(() => {
    load();
  }, [filterAge]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Результати</h2>

      <input
        placeholder="Фільтр: вік"
        value={filterAge}
        onChange={(e) => setFilterAge(e.target.value)}
      />

      <ul>
        {data.map((r, i) => (
          <li key={i}>
            {r.name} — {r.age}
          </li>
        ))}
      </ul>
    </div>
  );
}
