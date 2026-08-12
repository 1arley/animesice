import type { ReactNode } from "react";

/**
 * EmptyState — estado vazio consistente: ícone opcional, texto e ação.
 */
export function EmptyState({
  text,
  icon,
  action,
}: {
  text: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {icon && <div className="mb-4 text-mist/40">{icon}</div>}
      <p className="text-body text-mist">{text}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
