import type { Metadata } from "next";
import { Clause, LegalShell, ReviewNotice } from "@/components/legal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What we collect, why, who else sees it, and how to get it deleted.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy" updated="July 2026">
      <Clause heading="What we collect">
        <p>
          From the intake form: your name, email, phone number, and optionally your city,
          LinkedIn profile, role, organisation and years of experience. We also collect what you
          tell us about your coding comfort, your experience with generative AI, and what you want
          out of the session.
        </p>
        <p>
          From payments: a Razorpay order and payment identifier, the amount, and the status. Card
          numbers, UPI IDs and bank credentials never reach our servers — they go directly to
          Razorpay.
        </p>
        <p>
          From downloads: the email you enter, the file you took, and a salted hash of your IP
          address. We store the hash rather than the address so we can spot abuse without keeping
          an identifier for everyone who downloaded a syllabus.
        </p>
      </Clause>

      <Clause heading="Why we collect it">
        <p>
          The profile fields exist for one reason: to pitch the session at the right level. The
          instructor reads your intake before a consultation. In a cohort, it is used to pair
          people sensibly for exercises. It is not used to score, rank or filter you.
        </p>
        <p>
          Contact details are used to send your confirmation, the joining link, and material for
          the programme you paid for. If you subscribed to cohort alerts, we use your email for
          that too — one message when a new cohort opens, and nothing else.
        </p>
      </Clause>

      <Clause heading="Who else sees it">
        <p>
          Razorpay, to process your payment. Our hosting and database provider, as the
          infrastructure your records sit on. The video platform you join the session on — Google
          Meet or Zoom — sees whatever you present to it when you join.
        </p>
        <p>
          Nobody else. We do not sell data, share it with advertisers, or hand your details to
          other participants. We do not run third-party analytics or advertising trackers on this
          site.
        </p>
      </Clause>

      <Clause heading="How long we keep it">
        <p>
          Booking, enrolment and payment records are kept for as long as we are required to for
          tax and accounting purposes. Intake notes are kept for the life of your relationship
          with us, so a later consultation can build on an earlier one rather than starting over.
          Subscriber emails are kept until you unsubscribe.
        </p>
      </Clause>

      <Clause heading="Your choices">
        <p>
          Write to{" "}
          <a className="text-accent hover:underline" href={`mailto:${site.email}`}>{site.email}</a>{" "}
          to see what we hold on you, correct it, or have it deleted. We will action a deletion
          request within 30 days, except for records we are legally required to retain — payment
          records, mainly — which we will tell you about specifically.
        </p>
        <p>
          Every email we send has an unsubscribe link. Unsubscribing from cohort alerts does not
          stop transactional messages about a booking you have paid for.
        </p>
      </Clause>

      <Clause heading="Cookies">
        <p>
          The public site sets no cookies. The admin area sets one signed session cookie so the
          instructor stays logged in; it holds an expiry timestamp and nothing else. Razorpay sets
          its own cookies inside its checkout window, governed by its privacy policy.
        </p>
      </Clause>

      <ReviewNotice />
    </LegalShell>
  );
}
