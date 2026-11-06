import type { ChangeEvent } from "react";

export const inputClass =
  "w-full rounded-xl border border-accent/30 bg-panel/60 px-4 py-3 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-[invalid=true]:border-red-400";

interface FormFieldProps {
  /** Used for the input name and id; idPrefix keeps ids unique when two forms exist on a page. */
  name: string;
  idPrefix: string;
  label: string;
  value: string;
  onChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  errors?: string[];
  optional?: boolean;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "tel" | "email" | "text";
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  /** Tailwind column span classes inside a grid-cols-6 grid, e.g. "sm:col-span-3". */
  span?: string;
}

export default function FormField({
  name,
  idPrefix,
  label,
  value,
  onChange,
  errors,
  optional,
  required,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
  maxLength,
  multiline,
  span = "",
}: FormFieldProps) {
  const id = `${idPrefix}-${name}`;
  const errorId = `${id}-error`;
  const hasError = Boolean(errors?.length);

  const shared = {
    id,
    name,
    value,
    onChange,
    required,
    autoComplete,
    placeholder,
    maxLength,
    "aria-invalid": hasError,
    "aria-describedby": hasError ? errorId : undefined,
    className: inputClass,
  };

  return (
    <div className={`col-span-6 ${span}`}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold">
        {label}
        {optional && (
          <span className="font-normal text-muted"> (optional)</span>
        )}
      </label>
      {multiline ? (
        <textarea rows={3} {...shared} />
      ) : (
        <input type={type} inputMode={inputMode} {...shared} />
      )}
      {hasError && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-red-400">
          {errors?.join(" ")}
        </p>
      )}
    </div>
  );
}
