"use client";
import { useState, useEffect } from "react";

export default function FormPage() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [tgUser, setTgUser] = useState(null);
  const [tg, setTg] = useState(null);

  useEffect(() => {
    // Page runs only in browser
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      webApp.expand();
      setTg(webApp);
      setTgUser(webApp.initDataUnsafe?.user || null);
    } else {
      console.log(
        "⚠️ Telegram WebApp API не доступний. Сторінка відкрита не у Telegram."
      );
    }
  }, []);

  const handleSubmit = async () => {
    await fetch("/api/save", {
      method: "POST",
      body: JSON.stringify({
        name,
        age,
        tgId: tgUser?.id,
      }),
    });

    // Закриваємо WebApp тільки якщо він існує
    if (tg) {
      tg.close();
    } else {
      alert("Форма відправлена. (Ви не в Telegram WebApp)");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Анкета</h2>

      {!tg && (
        <p style={{ color: "red" }}>
          ⚠️ Ви відкрили сторінку не у Telegram WebApp. Кнопка закриття не
          працюватиме.
        </p>
      )}

      <input
        placeholder="Ваше імʼя"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <br />
      <br />

      <input
        placeholder="Вік"
        value={age}
        onChange={(e) => setAge(e.target.value)}
      />
      <br />
      <br />

      <button onClick={handleSubmit}>Надіслати</button>
    </div>
  );
}
