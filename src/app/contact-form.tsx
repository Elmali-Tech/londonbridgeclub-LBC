"use client";

import React, { useState } from "react";

export default function ContactForm() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus("");

    try {
      const res = await fetch("/api/send-mail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to, subject, message }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("E-posta başarıyla gönderildi: " + data.message);

        setTo("");
        setSubject("");
        setMessage("");
      } else {
        setStatus("Hata: " + data.message);
      }
    } catch (error) {
      console.error("Gönderim hatası:", error);
      setStatus("Bir hata oluştu. Lütfen konsolu kontrol edin.");
    }

    setIsLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxWidth: "400px",
      }}
    >
      <h3>İletişim Formu</h3>
      <div>
        <label htmlFor="to">Kime:</label>
        <input
          type="email"
          id="to"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
          style={{ width: "100%", padding: "5px" }}
        />
      </div>
      <div>
        <label htmlFor="subject">Konu:</label>
        <input
          type="text"
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          style={{ width: "100%", padding: "5px" }}
        />
      </div>
      <div>
        <label htmlFor="message">Mesaj:</label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          style={{ width: "100%", padding: "5px", minHeight: "100px" }}
        />
      </div>
      <button type="submit" disabled={isLoading} style={{ padding: "10px" }}>
        {isLoading ? "Gönderiliyor..." : "Gönder"}
      </button>
      {status && (
        <p style={{ color: status.startsWith("Hata") ? "red" : "green" }}>
          {status}
        </p>
      )}
    </form>
  );
}
