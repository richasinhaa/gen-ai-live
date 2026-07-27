import crypto from "node:crypto";

// Unambiguous alphabet: no O/0, no I/1 — these get read aloud over a call.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length: number): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/// Human-readable booking/enrolment reference, e.g. "CON-7QM4KD".
export function makeReference(prefix: "CON" | "ENR"): string {
  return `${prefix}-${randomCode(6)}`;
}
