import type { Metadata } from "next";
import { Clause, LegalShell, ReviewNotice } from "@/components/legal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Refunds & rescheduling",
  description:
    "When you get your money back, when you can move a booking, and how long it takes.",
};

export default function RefundsPage() {
  return (
    <LegalShell title="Refunds & rescheduling" updated="July 2026">
      <Clause heading="Consultations">
        <p>
          Cancel or reschedule a 30-minute consultation up to 12 hours before the start time and
          you pay nothing — a cancellation is refunded in full, and rescheduling into any open
          weekend slot is free.
        </p>
        <p>
          Inside 12 hours we cannot refill the slot, so the fee is not refundable. If you simply do
          not appear, the same applies. If something genuinely urgent came up, write to us anyway —
          we would rather be reasonable than rigid.
        </p>
        <p>
          If the instructor cancels or fails to appear, you get a full refund or a slot of your
          choosing, whichever you prefer.
        </p>
      </Clause>

      <Clause heading="Cohorts and batches">
        <p>
          <strong className="text-text">Before the first session:</strong> full refund, no reason
          needed. Write to us any time before the cohort or batch begins.
        </p>
        <p>
          <strong className="text-text">After the first session, before the second:</strong> 50%
          refund. You have seen a session and taken a seat someone on the waitlist could have used.
        </p>
        <p>
          <strong className="text-text">After the second session:</strong> no refund. You can
          transfer your seat to the next cohort once, at no cost, if you tell us before the third
          session.
        </p>
        <p>
          If we cancel a cohort — too few enrolments, instructor illness, anything else — you get a
          full refund, or a seat in the next one, whichever you prefer. We will always offer both.
        </p>
      </Clause>

      <Clause heading="Missing a session">
        <p>
          Ecosystem batch sessions are recorded and posted within 24 hours, so a missed session is
          recoverable. Research cohort sessions are not recorded — participants work on real code
          from real employers in them. If you miss one, bring your questions to office hours; we
          will not leave you behind, but we cannot re-run the session.
        </p>
      </Clause>

      <Clause heading="How refunds are processed">
        <p>
          Refunds go back through Razorpay to the original payment method. We initiate within two
          working days of agreeing the refund; your bank typically takes a further five to seven
          working days. We cannot refund to a different account or method.
        </p>
      </Clause>

      <Clause heading="How to ask">
        <p>
          Email <a className="text-accent hover:underline" href={`mailto:${site.email}`}>{site.email}</a>{" "}
          with your booking reference — the <span className="font-mono">CON-</span> or{" "}
          <span className="font-mono">ENR-</span> code on your confirmation page. That is all we
          need; there is no form.
        </p>
      </Clause>

      <ReviewNotice />
    </LegalShell>
  );
}
