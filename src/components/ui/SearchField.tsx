import type { InputHTMLAttributes } from "react";

type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Classes for the layout wrapper, separate from the input styling. */
  containerClassName?: string;
  icon?: boolean;
};

/** Shared search input appearance; callers keep control of search behavior. */
export function SearchField({
  className = "",
  containerClassName = "",
  icon = true,
  ...inputProps
}: SearchFieldProps) {
  return (
    <span className={`relative block min-w-0 ${containerClassName}`}>
      {icon && (
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist-soft"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M11 11l3.5 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )}
      <input
        {...inputProps}
        type="search"
        className={`field min-h-11 ${icon ? "pl-9" : ""} ${className}`.trim()}
      />
    </span>
  );
}
