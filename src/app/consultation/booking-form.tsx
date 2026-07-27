"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SlotPicker, type SlotOption } from "@/components/slot-picker";
import {
  EMPTY_INTAKE,
  IntakeFields,
  serialiseIntake,
  type IntakeState,
} from "@/components/intake-fields";
import { CheckboxField, FormError } from "@/components/form-fields";
import { CheckoutDismissed, openCheckout, type OrderResponse } from "@/lib/checkout";
import { site } from "@/lib/site";

export function BookingForm({ slots, priceLabel }: { slots: SlotOption[]; priceLabel: string }) {
  const router = useRouter();
  const [intake, setIntake] = useState<IntakeState>(EMPTY_INTAKE);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [status, setStatus] = useState<"idle" | "submitting" | "paying" | "done">("idle");

  const busy = status === "submitting" || status === "paying";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    setFormError(undefined);
    setStatus("submitting");

    try {
      const response = await fetch("/api/consultation/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...serialiseIntake(intake), slotId, consent }),
      });
      const data = await response.json();

      if (!response.ok) {
        setErrors(data.fields ?? {});
        setFormError(data.error ?? "Please check the form.");
        // The slot list is stale once someone else takes one — refresh it.
        if (response.status === 409) router.refresh();
        setStatus("idle");
        return;
      }

      setStatus("paying");
      const redirectTo = await openCheckout(data as OrderResponse, {
        name: site.name,
        description: "30-minute Gen AI consultation",
      });
      setStatus("done");
      router.push(redirectTo);
    } catch (error) {
      if (error instanceof CheckoutDismissed) {
        setFormError(
          "Payment window closed — nothing was charged. Your slot is held for 15 minutes if you want to try again.",
        );
      } else {
        setFormError(error instanceof Error ? error.message : "Something went wrong.");
      }
      setStatus("idle");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 space-y-9" noValidate>
      <section>
        <h2 className="text-xl font-semibold mb-4">1. Choose your time</h2>
        <SlotPicker slots={slots} selectedId={slotId} onSelect={setSlotId} error={errors.slotId} />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-1">2. Tell us about you</h2>
        <p className="prose-body text-sm mb-5">
          This is what the session is built from — the more precise you are, the less time we
          spend on questions we could have answered beforehand.
        </p>
        <IntakeFields
          value={intake}
          onChange={setIntake}
          errors={errors}
          goalLabel="What do you want out of this?"
          goalPlaceholder="e.g. I lead a 6-person backend team and we've been asked to add document search to our product. I want to know whether we build RAG ourselves and what the team needs to learn first."
        />
      </section>

      <section className="space-y-5">
        <h2 className="text-xl font-semibold">3. Confirm and pay</h2>

        <CheckboxField
          name="consent"
          checked={consent}
          onChange={setConsent}
          error={errors.consent}
        >
          I agree to the{" "}
          <Link href="/terms" className="text-accent hover:underline">
            terms
          </Link>{" "}
          and the{" "}
          <Link href="/refunds" className="text-accent hover:underline">
            rescheduling policy
          </Link>
          , and I&apos;m happy to be contacted about this booking.
        </CheckboxField>

        <FormError message={formError} />

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {status === "submitting"
              ? "Holding your slot…"
              : status === "paying"
                ? "Waiting for payment…"
                : `Pay ${priceLabel} and confirm`}
          </button>
          <p className="text-sm text-faint">
            Secure checkout via Razorpay — UPI, card or netbanking.
          </p>
        </div>
      </section>
    </form>
  );
}
