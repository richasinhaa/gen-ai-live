"use client";

import { useId } from "react";

type BaseProps = {
  label: string;
  name: string;
  error?: string;
  help?: string;
  required?: boolean;
};

function Wrapper({
  label,
  id,
  error,
  help,
  required,
  children,
}: BaseProps & { id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="text-accent ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : help ? (
        <p className="field-help">{help}</p>
      ) : null}
    </div>
  );
}

export function TextField({
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  inputMode,
  ...base
}: BaseProps & {
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "numeric" | "url";
}) {
  const id = useId();
  return (
    <Wrapper {...base} id={id}>
      <input
        id={id}
        name={base.name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={base.error ? true : undefined}
        className="field-input"
      />
    </Wrapper>
  );
}

export function TextareaField({
  value,
  onChange,
  placeholder,
  rows = 4,
  ...base
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const id = useId();
  return (
    <Wrapper {...base} id={id}>
      <textarea
        id={id}
        name={base.name}
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={base.error ? true : undefined}
        className="field-input resize-y"
      />
    </Wrapper>
  );
}

export function SelectField({
  value,
  onChange,
  options,
  placeholder,
  ...base
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const id = useId();
  return (
    <Wrapper {...base} id={id}>
      <select
        id={id}
        name={base.name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={base.error ? true : undefined}
        className="field-input"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

export function CheckboxField({
  checked,
  onChange,
  children,
  error,
  name,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  error?: string;
  name: string;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex gap-3 items-start">
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={error ? true : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
        />
        <label htmlFor={id} className="text-sm text-muted leading-relaxed">
          {children}
        </label>
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
    >
      {message}
    </div>
  );
}
