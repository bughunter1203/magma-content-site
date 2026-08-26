"use client";

import { FormEvent, useState } from "react";

const SUCCESS_MESSAGE = "구독 신청이 접수되었습니다.";
const INVALID_EMAIL_MESSAGE = "유효한 이메일을 입력하세요.";
const FAILURE_MESSAGE = "지금은 구독 신청을 저장할 수 없습니다. 잠시 후 다시 시도하세요.";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();
    if (!isValidEmail(normalizedEmail)) {
      setMessage({ type: "error", text: INVALID_EMAIL_MESSAGE });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const body = (await response.json().catch(() => null)) as { message?: unknown; error?: unknown } | null;

      if (!response.ok) {
        setMessage({ type: "error", text: typeof body?.error === "string" ? body.error : FAILURE_MESSAGE });
        return;
      }

      setMessage({ type: "success", text: typeof body?.message === "string" ? body.message : SUCCESS_MESSAGE });
    } catch {
      setMessage({ type: "error", text: FAILURE_MESSAGE });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="rounded-ui bg-card p-6" onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-4 sm:flex-row">
        <label className="flex-1 text-sm font-semibold text-ink" htmlFor="newsletter-email">
          이메일
          <input
            id="newsletter-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-ui border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-primary"
            placeholder="you@example.com"
            aria-describedby={message ? "newsletter-message" : undefined}
          />
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          className="self-end rounded-ui bg-primary px-5 py-3 text-sm font-bold text-card disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "처리 중" : "구독 신청"}
        </button>
      </div>
      {message && (
        <p
          id="newsletter-message"
          className={message.type === "success" ? "mt-4 text-sm text-accent" : "mt-4 text-sm text-primary"}
          role={message.type === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
