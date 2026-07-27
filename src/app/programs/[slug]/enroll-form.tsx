"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  EMPTY_INTAKE,
  IntakeFields,
  serialiseIntake,
  type IntakeState,
} from "@/components/intake-fields";
import { CheckboxField, FormError } from "@/components/form-fields";
import { CheckoutDismissed, openCheckout, type OrderResponse } from "@/lib/checkout";
import { formatDateIST } from "@/lib/format";
import { site } from "@/lib/site";

type CohortOption = {
  id: string;
  code: string;
  startsOn: string;
  endsOn: string;
  seatsLeft: number;
};

export function EnrollForm({
  cohorts,
  priceLabel,
  programTitle,
}: {
  cohorts: CohortOption[];
  priceLabel: string;
  programTitle: string;
}) {
  const router = useRouter();
  const [intake, setIntake] = useState<IntakeState>(EMPTY_INTAKE);
  const [cohortId, setCohortId] = useState(cohorts[0]?.id ?? "");
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
      const response = await fetch("/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...serialiseIntake(intake), cohortId, consent }),
      });
      const data = await response.json();

      if (!response.ok) {
        setErrors(data.fields ?? {});
        setFormError(data.error ?? "Please check the form.");
        if (response.status === 409) router.refresh();
        setStatus("idle");
        return;
      }

      setStatus("paying");
      const redirectTo = await openCheckout(data as OrderResponse, {
        name: site.name,
        description: programTitle,
      });
      setStatus("done");
      router.push(redirectTo);
    } catch (error) {
      if (error instanceof CheckoutDismissed) {
        setFormError("Payment window closed — nothing was charged. You can try again.");
      } else {
        setFormError(error instanceof Error ? error.message : "Something went wrong.");
      }
      setStatus("idle");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-8" noValidate>
      <fieldset>
        <legend className="field-label">
          Which one? <span className="text-accent">*</span>
        </legend>
        <div className="space-y-3 mt-2">
          {cohorts.map((cohort) => {
            const selected = cohort.id === cohortId;
            const nearlyFull = cohort.seatsLeft <= 4;
            return (
              <label
                key={cohort.id}
                className={[
                  "card p-4 flex items-start gap-3 cursor-pointer transition-colors",
                  selected ? "border-accent" : "hover:border-faint",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="cohortId"
                  value={cohort.id}
                  checked={selected}
                  onChange={() => setCohortId(cohort.id)}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                />
                <span className="min-w-0">
                  <span className="block font-medium">
                    Starts {formatDateIST(cohort.startsOn)}
                  </span>
                  <span className="block text-sm text-faint mt-0.5">
                    {cohort.code} · runs to {formatDateIST(cohort.endsOn)}
                  </span>
                  <span
                    className={[
                      "block text-sm mt-1",
                      nearlyFull ? "text-accent" : "text-muted",
                    ].join(" ")}
                  >
                    {cohort.seatsLeft} {cohort.seatsLeft === 1 ? "seat" : "seats"} left
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {errors.cohortId && (
          <p className="field-error" role="alert">
            {errors.cohortId}
          </p>
        )}
      </fieldset>

      <div>
        <h3 className="text-lg font-semibold mb-1">Your details</h3>
        <p className="prose-body text-sm mb-5">
          We use this to pitch the sessions at the right level and to pair you up for exercises.
        </p>
        <IntakeFields
          value={intake}
          onChange={setIntake}
          errors={errors}
          goalLabel="What do you want to be able to do by the end?"
          goalPlaceholder="e.g. Ship a retrieval-backed assistant over our internal docs, and be able to tell when the retrieval rather than the model is what's failing."
        />
      </div>

      <CheckboxField name="consent" checked={consent} onChange={setConsent} error={errors.consent}>
        I agree to the{" "}
        <Link href="/terms" className="text-accent hover:underline">
          terms
        </Link>{" "}
        and the{" "}
        <Link href="/refunds" className="text-accent hover:underline">
          refund policy
        </Link>
        , and I&apos;m happy to be contacted about this enrolment.
      </CheckboxField>

      <FormError message={formError} />

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-primary" disabled={busy || !cohortId}>
          {status === "submitting"
            ? "Reserving…"
            : status === "paying"
              ? "Waiting for payment…"
              : `Pay ${priceLabel} and enrol`}
        </button>
        <p className="text-sm text-faint">Secure checkout via Razorpay — UPI, card or netbanking.</p>
      </div>
    </form>
  );
}
