"use client";

import { useActionState } from "react";
import { createSlots, setDefaultSlotMeetingUrl } from "../../actions";
import { FormError } from "@/components/form-fields";

export function SlotGenerator({ defaultTimes }: { defaultTimes: string }) {
  const [state, action, pending] = useActionState(createSlots, {});

  return (
    <form action={action} className="card p-6 space-y-4">
      <div>
        <h2 className="font-semibold">Open more weekends</h2>
        <p className="prose-body text-sm mt-1">
          Generates 30-minute slots on Saturdays and Sundays only. Existing slots are left alone,
          so re-running just fills the gaps.
        </p>
      </div>

      <div className="grid sm:grid-cols-[7rem_1fr] gap-3">
        <div>
          <label htmlFor="weeks" className="field-label">
            Weeks ahead
          </label>
          <input
            id="weeks"
            name="weeks"
            type="number"
            min={1}
            max={12}
            defaultValue={4}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="times" className="field-label">
            Start times (IST)
          </label>
          <input id="times" name="times" defaultValue={defaultTimes} className="field-input" />
          <p className="field-help">Comma-separated, 24-hour, e.g. 10:00, 10:30, 17:00.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-[1fr_10rem] gap-3">
        <div>
          <label htmlFor="meetingUrl" className="field-label">
            Meeting link for new slots
          </label>
          <input
            id="meetingUrl"
            name="meetingUrl"
            placeholder="https://meet.google.com/… (optional)"
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="provider" className="field-label">
            Platform
          </label>
          <select id="provider" name="provider" defaultValue="GOOGLE_MEET" className="field-input">
            <option value="GOOGLE_MEET">Google Meet</option>
            <option value="ZOOM">Zoom</option>
          </select>
        </div>
      </div>

      <FormError message={state.error} />

      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary text-sm py-2" disabled={pending}>
          {pending ? "Generating…" : "Generate slots"}
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

export function DefaultLinkForm() {
  const [state, action, pending] = useActionState(setDefaultSlotMeetingUrl, {});

  return (
    <form action={action} className="card p-6 space-y-4">
      <div>
        <h2 className="font-semibold">Set your consultation room</h2>
        <p className="prose-body text-sm mt-1">
          Applies one link to every upcoming slot that does not already have one. Learners only see
          it once their payment is confirmed.
        </p>
      </div>

      <div>
        <label htmlFor="defaultMeetingUrl" className="field-label">
          Meeting link
        </label>
        <input
          id="defaultMeetingUrl"
          name="meetingUrl"
          placeholder="https://meet.google.com/abc-defg-hij"
          className="field-input"
        />
      </div>

      <FormError message={state.error} />

      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-secondary text-sm py-2" disabled={pending}>
          {pending ? "Applying…" : "Apply to upcoming slots"}
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
