import type { ReactNode } from "react";

export const inputClass =
  "mt-1.5 block w-full rounded-md border border-ink/25 bg-white px-3 py-2.5 text-ink placeholder:text-ink/45 disabled:bg-ink/5 aria-invalid:border-red-700";

/** id of the element that should describe an input: its error, else its hint. */
export function describedBy(id: string, hint?: string, error?: string) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Hidden from people; bots that fill every field reveal themselves. */
export function Honeypot({ label }: { label: string }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
      <label>
        {label}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
