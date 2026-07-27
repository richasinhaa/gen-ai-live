"use client";

import { useState } from "react";

export function SubscribeForm({ source, interest }: { source: string; interest?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setState("saving");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source, interest }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not sign you up");
      setState("done");
      setMessage("Done — we'll email you when the next one opens.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  if (state === "done") {
    return (
      <p className="text-sm text-positive" role="status">
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <label htmlFor={`subscribe-${source}`} className="sr-only">
        Email address
      </label>
      <div className="flex gap-2">
        <input
          id={`subscribe-${source}`}
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@work.com"
          className="field-input flex-1 min-w-0"
          autoComplete="email"
        />
        <button type="submit" className="btn btn-secondary shrink-0" disabled={state === "saving"}>
          {state === "saving" ? "…" : "Notify me"}
        </button>
      </div>
      {state === "error" && (
        <p className="field-error" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
