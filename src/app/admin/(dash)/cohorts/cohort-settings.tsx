"use client";

import { useActionState } from "react";
import { updateCohort } from "../../actions";
import { FormError } from "@/components/form-fields";

const STATUSES = ["DRAFT", "OPEN", "FULL", "RUNNING", "COMPLETED", "CANCELLED"] as const;

export function CohortSettings({
  cohort,
}: {
  cohort: {
    id: string;
    status: string;
    meetingUrl: string | null;
    meetingNotes: string | null;
    meetingProvider: string;
  };
}) {
  const [state, action, pending] = useActionState(updateCohort, {});

  return (
    <form action={action} className="mt-5 pt-5 hairline space-y-4">
      <input type="hidden" name="cohortId" value={cohort.id} />

      <div className="grid sm:grid-cols-[1fr_10rem_10rem] gap-3">
        <div>
          <label htmlFor={`url-${cohort.id}`} className="field-label">
            Recurring meeting link
          </label>
          <input
            id={`url-${cohort.id}`}
            name="meetingUrl"
            defaultValue={cohort.meetingUrl ?? ""}
            placeholder="https://meet.google.com/…"
            className="field-input"
          />
          <p className="field-help">Only confirmed learners can see this.</p>
        </div>

        <div>
          <label htmlFor={`provider-${cohort.id}`} className="field-label">
            Platform
          </label>
          <select
            id={`provider-${cohort.id}`}
            name="provider"
            defaultValue={cohort.meetingProvider}
            className="field-input"
          >
            <option value="GOOGLE_MEET">Google Meet</option>
            <option value="ZOOM">Zoom</option>
          </select>
        </div>

        <div>
          <label htmlFor={`status-${cohort.id}`} className="field-label">
            Status
          </label>
          <select
            id={`status-${cohort.id}`}
            name="status"
            defaultValue={cohort.status}
            className="field-input"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor={`notes-${cohort.id}`} className="field-label">
          Joining notes
        </label>
        <input
          id={`notes-${cohort.id}`}
          name="meetingNotes"
          defaultValue={cohort.meetingNotes ?? ""}
          placeholder="Shown on the confirmation page when there is no link yet"
          className="field-input"
        />
      </div>

      <FormError message={state.error} />

      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-secondary text-sm py-1.5" disabled={pending}>
          {pending ? "Saving…" : "Save cohort"}
        </button>
        {state.message && (
          <span className="text-sm text-positive" role="status">
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
