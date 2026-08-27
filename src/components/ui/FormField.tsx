import type { ReactNode } from "react";

/**
 * FormField — label + controle + hint/erro. Padroniza o markup de formulário
 * que estava repetido nas páginas admin e settings.
 */
export function FormField({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist"
      >
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-caption text-mist-soft">{hint}</p>
      )}
      {error && <p className="mt-1 text-caption text-signal">{error}</p>}
    </div>
  );
}
