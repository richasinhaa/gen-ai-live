"use client";

import { SelectField, TextField, TextareaField } from "./form-fields";
import {
  AI_EXPOSURE,
  AI_EXPOSURE_LABELS,
  CODING_COMFORT,
  CODING_COMFORT_LABELS,
  REFERRAL_LABELS,
  REFERRAL_SOURCES,
} from "@/lib/validation";

/// The intake form is the same for a consultation and an enrolment — the only
/// difference is the prompt on the "goal" field, which is what the instructor
/// actually reads before the session.

export type IntakeState = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  linkedin: string;
  role: string;
  organisation: string;
  experienceYears: string;
  codingComfort: string;
  aiExposure: string;
  goal: string;
  referredBy: string;
};

export const EMPTY_INTAKE: IntakeState = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  linkedin: "",
  role: "",
  organisation: "",
  experienceYears: "",
  codingComfort: "",
  aiExposure: "",
  goal: "",
  referredBy: "",
};

/// Strips blanks so optional fields arrive as absent rather than "".
export function serialiseIntake(state: IntakeState): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(state)) {
    if (value !== "") out[key] = value;
  }
  return out;
}

export function IntakeFields({
  value,
  onChange,
  errors,
  goalLabel,
  goalPlaceholder,
}: {
  value: IntakeState;
  onChange: (next: IntakeState) => void;
  errors: Record<string, string>;
  goalLabel: string;
  goalPlaceholder: string;
}) {
  const set = <K extends keyof IntakeState>(key: K) => (next: string) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <TextField
          label="Full name"
          name="fullName"
          required
          value={value.fullName}
          onChange={set("fullName")}
          error={errors.fullName}
          autoComplete="name"
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          required
          value={value.email}
          onChange={set("email")}
          error={errors.email}
          autoComplete="email"
          inputMode="email"
          help="Your confirmation and joining link go here."
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <TextField
          label="Phone"
          name="phone"
          type="tel"
          required
          value={value.phone}
          onChange={set("phone")}
          error={errors.phone}
          autoComplete="tel"
          inputMode="tel"
          placeholder="+91 98765 43210"
        />
        <TextField
          label="City"
          name="city"
          value={value.city}
          onChange={set("city")}
          error={errors.city}
          autoComplete="address-level2"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <TextField
          label="Current role"
          name="role"
          value={value.role}
          onChange={set("role")}
          error={errors.role}
          placeholder="Backend engineer, product manager…"
        />
        <TextField
          label="Organisation"
          name="organisation"
          value={value.organisation}
          onChange={set("organisation")}
          error={errors.organisation}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <TextField
          label="Years of experience"
          name="experienceYears"
          type="number"
          value={value.experienceYears}
          onChange={set("experienceYears")}
          error={errors.experienceYears}
          inputMode="numeric"
        />
        <TextField
          label="LinkedIn profile"
          name="linkedin"
          type="url"
          value={value.linkedin}
          onChange={set("linkedin")}
          error={errors.linkedin}
          placeholder="https://linkedin.com/in/…"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <SelectField
          label="How comfortable are you with code?"
          name="codingComfort"
          required
          value={value.codingComfort}
          onChange={set("codingComfort")}
          error={errors.codingComfort}
          placeholder="Choose one"
          options={CODING_COMFORT.map((key) => ({
            value: key,
            label: CODING_COMFORT_LABELS[key],
          }))}
        />
        <SelectField
          label="Where are you with generative AI?"
          name="aiExposure"
          required
          value={value.aiExposure}
          onChange={set("aiExposure")}
          error={errors.aiExposure}
          placeholder="Choose one"
          options={AI_EXPOSURE.map((key) => ({
            value: key,
            label: AI_EXPOSURE_LABELS[key],
          }))}
        />
      </div>

      <TextareaField
        label={goalLabel}
        name="goal"
        required
        value={value.goal}
        onChange={set("goal")}
        error={errors.goal}
        placeholder={goalPlaceholder}
        rows={4}
      />

      <SelectField
        label="How did you hear about us?"
        name="referredBy"
        value={value.referredBy}
        onChange={set("referredBy")}
        error={errors.referredBy}
        placeholder="Optional"
        options={REFERRAL_SOURCES.map((key) => ({ value: key, label: REFERRAL_LABELS[key] }))}
      />
    </div>
  );
}
