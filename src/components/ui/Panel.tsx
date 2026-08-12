import type { ReactNode } from "react";

/**
 * Panel — superfície padrão do design system: borda hairline + fundo panel.
 * Substitui o `border border-hairline bg-panel p-6` repetido no codebase.
 */
export function Panel({
  children,
  className = "",
  padding = "p-6",
}: {
  children: ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <div className={`border border-hairline bg-panel ${padding} ${className}`}>
      {children}
    </div>
  );
}
