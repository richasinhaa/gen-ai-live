"use client";

import { useState } from "react";
import { DownloadIcon, LockIcon } from "@/components/icons";
import { FormError, TextField } from "@/components/form-fields";

type ResourceView = {
  slug: string;
  title: string;
  description: string | null;
  audience: "PUBLIC" | "CONSULTATION" | "ENROLLED";
  programTitle: string | null;
  fileType: string;
  sizeLabel: string | null;
};

export function DownloadCard({ resource }: { resource: ResourceView }) {
  const gated = resource.audience !== "PUBLIC";
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    setStatus("sending");

    try {
      const response = await fetch("/api/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceSlug: resource.slug,
          email,
          name: name || undefined,
          reference: reference || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not fetch that file");

      setStatus("done");
      // Navigating rather than window.open keeps this working when a popup
      // blocker is in play — the click that started it is still in scope.
      window.location.href = data.url;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
      setStatus("idle");
    }
  }

  return (
    <article id={resource.slug} className="card p-6 scroll-mt-24 flex flex-col">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-accent shrink-0">
          {gated ? <LockIcon className="h-5 w-5" /> : <DownloadIcon className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold">{resource.title}</h3>
          {resource.description && (
            <p className="prose-body text-sm mt-1.5">{resource.description}</p>
          )}
          <p className="text-xs text-faint mt-2 uppercase tracking-wider">
            {resource.fileType}
            {resource.sizeLabel ? ` · ${resource.sizeLabel}` : ""}
            {resource.programTitle ? ` · ${resource.programTitle}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-5 pt-5 hairline">
        {status === "done" ? (
          <p className="text-sm text-positive" role="status">
            Download started. Check your downloads folder.
          </p>
        ) : open ? (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <TextField
              label="Email"
              name={`email-${resource.slug}`}
              type="email"
              required
              value={email}
              onChange={setEmail}
              autoComplete="email"
              inputMode="email"
            />
            {!gated && (
              <TextField
                label="Name"
                name={`name-${resource.slug}`}
                value={name}
                onChange={setName}
                autoComplete="name"
              />
            )}
            {gated && (
              <TextField
                label="Booking reference"
                name={`reference-${resource.slug}`}
                required
                value={reference}
                onChange={setReference}
                placeholder="CON-XXXXXX or ENR-XXXXXX"
                help="It's on your confirmation page and in your confirmation email."
              />
            )}
            <FormError message={error} />
            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary" disabled={status === "sending"}>
                {status === "sending" ? "Checking…" : "Download"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="btn btn-secondary w-full" onClick={() => setOpen(true)}>
            <DownloadIcon className="h-4 w-4" />
            {gated ? "Unlock and download" : "Get the file"}
          </button>
        )}
      </div>
    </article>
  );
}
