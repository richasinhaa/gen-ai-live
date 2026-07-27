"use client";

import { useActionState } from "react";
import { login } from "../actions";
import { FormError } from "@/components/form-fields";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});

  return (
    <form action={action} className="mt-8 space-y-4">
      <div>
        <label htmlFor="admin-password" className="field-label">
          Password
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="field-input"
        />
      </div>
      <FormError message={state.error} />
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
