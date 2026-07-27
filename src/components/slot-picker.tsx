"use client";

import { useMemo } from "react";
import { formatDayIST, formatTimeIST } from "@/lib/format";
import { istDateKey } from "@/lib/slots";
import { site } from "@/lib/site";

export type SlotOption = { id: string; startsAt: string; durationMin: number };

/// Weekend availability, grouped into day cards. The instructor only opens
/// weekend slots, so the grid is short by design — showing a full month
/// calendar would be mostly empty cells.
export function SlotPicker({
  slots,
  selectedId,
  onSelect,
  error,
}: {
  slots: SlotOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  error?: string;
}) {
  const days = useMemo(() => {
    const grouped = new Map<string, SlotOption[]>();
    for (const slot of slots) {
      const key = istDateKey(new Date(slot.startsAt));
      const bucket = grouped.get(key);
      if (bucket) bucket.push(slot);
      else grouped.set(key, [slot]);
    }
    return [...grouped.entries()].map(([key, items]) => ({ key, items }));
  }, [slots]);

  return (
    <fieldset>
      <legend className="field-label">
        Pick a slot <span className="text-accent">*</span>
      </legend>
      <p className="field-help mb-4">
        All times are {site.timezoneLabel}. Sessions run on weekends only.
      </p>

      <div className="space-y-4">
        {days.map((day) => (
          <div key={day.key} className="card p-4">
            <h3 className="text-sm font-semibold">{formatDayIST(day.items[0].startsAt)}</h3>
            <div className="flex flex-wrap gap-2 mt-3">
              {day.items.map((slot) => {
                const selected = slot.id === selectedId;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => onSelect(slot.id)}
                    aria-pressed={selected}
                    className={[
                      "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                      selected
                        ? "bg-accent text-ink border-accent"
                        : "border-line text-muted hover:text-text hover:border-faint",
                    ].join(" ")}
                  >
                    {formatTimeIST(slot.startsAt)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
