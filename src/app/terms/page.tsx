import type { Metadata } from "next";
import Link from "next/link";
import { Clause, LegalShell, ReviewNotice } from "@/components/legal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms you agree to when you book a consultation or enrol in a programme.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of service" updated="July 2026">
      <Clause heading="What you are buying">
        <p>
          A place in a live session, delivered over Google Meet or Zoom at the times shown on this
          site, in Indian Standard Time. A consultation is 30 minutes, one-on-one. The research
          cohort is 10 live hours across five sessions; the ecosystem batch is 15 live hours across
          ten sessions.
        </p>
        <p>
          You are buying teaching time and materials, not an outcome. We do not promise a job, a
          certification recognised by anyone in particular, or that a system you build afterwards
          will work.
        </p>
      </Clause>

      <Clause heading="Booking and payment">
        <p>
          Prices are shown in Indian rupees and include any applicable taxes unless stated
          otherwise. Payment is taken at booking through Razorpay. Your seat is confirmed when the
          payment is captured, not when the form is submitted — until then a consultation slot is
          held for you for 15 minutes and then released.
        </p>
        <p>
          Discounted prices shown against a struck-through figure are introductory and may end at
          any time. The price you paid is the price on your confirmation.
        </p>
      </Clause>

      <Clause heading="Attendance">
        <p>
          Sessions start on time. The joining link is on your confirmation page and in your
          confirmation email. You are responsible for your own connection, device and a workable
          environment — for the research cohort, that means Python and an API key, as listed in the
          prerequisites.
        </p>
        <p>
          We may remove someone from a session, without refund, for behaviour that makes it worse
          for everyone else. This has never happened and we do not expect it to.
        </p>
      </Clause>

      <Clause heading="Materials and recordings">
        <p>
          Syllabi, workbooks, starter code and session notes are licensed to you personally for
          your own use, including at your workplace. You may not redistribute them, publish them,
          or use them to run your own training.
        </p>
        <p>
          Ecosystem batch sessions are recorded; by attending you consent to being recorded. If you
          would rather not appear, keep your camera off and use the chat — that is entirely
          normal. Research cohort sessions are not recorded.
        </p>
        <p>
          What you build during a programme is yours. We claim nothing over your code, your data or
          your capstone.
        </p>
      </Clause>

      <Clause heading="Changes and cancellation">
        <p>
          Session times can move. If they do, we will tell you as early as we can and offer you a
          transfer or a refund if the new time does not work for you. Refund terms are set out in
          full on the{" "}
          <Link className="text-accent hover:underline" href="/refunds">
            refunds and rescheduling
          </Link>{" "}
          page and form part of these terms.
        </p>
        <p>
          A cohort needs a minimum number of enrolments to run. If we do not reach it, we will
          cancel and refund in full, and you will hear from us before the scheduled start, not
          after it.
        </p>
      </Clause>

      <Clause heading="Liability">
        <p>
          To the extent the law allows, our liability to you is limited to the amount you paid for
          the programme in question. We are not liable for indirect or consequential loss —
          including anything that follows from a system you built after taking one of these
          programmes.
        </p>
      </Clause>

      <Clause heading="Contact and governing law">
        <p>
          Questions about these terms:{" "}
          <a className="text-accent hover:underline" href={`mailto:${site.email}`}>{site.email}</a>.
          These terms are governed by the laws of India.
        </p>
      </Clause>

      <ReviewNotice />
    </LegalShell>
  );
}
