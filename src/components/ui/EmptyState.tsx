import type { ReactNode } from "react";

/**
 * EmptyState — estado vazio consistente: ícone opcional, texto e ação.
 * Enhanced with animations and better visual hierarchy.
 */
export function EmptyState({
  text,
  icon,
  action,
  variant = "default",
}: {
  text: string;
  icon?: ReactNode;
  action?: ReactNode;
  variant?: "default" | "compact";
}) {
  const isCompact = variant === "compact";

  return (
    <div
      className={`reveal flex flex-col items-center justify-center text-center ${
        isCompact ? "py-10" : "py-20"
      }`}
      role="status"
      aria-label={text}
    >
      {icon ? (
        <div className="mb-4 text-mist/50 transition-transform duration-500 hover:scale-110">
          {icon}
        </div>
      ) : (
        <div className="mb-4 text-mist/30">
          <svg
            width={isCompact ? 32 : 48}
            height={isCompact ? 32 : 48}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 15s1.5-2 4-2 4 2 4 2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </div>
      )}
      <p
        className={`font-sans text-mist ${
          isCompact ? "text-body-sm" : "text-body"
        }`}
      >
        {text}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
