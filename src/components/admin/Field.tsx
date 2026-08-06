import type { ReactNode } from "react";

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
      {children}
    </span>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <span className="mt-1 block text-caption text-mist">{children}</span>;
}
